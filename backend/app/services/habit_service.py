import sqlite3
import time
import os
import logging
import threading
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger("HabitService")
DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "tracker.db")

class HabitService:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self._lock = threading.Lock()
        self.db_path = db_path
        self._init_db()
        self._seed_initial_patterns()

    def _init_db(self):
        try:
            with self._lock, sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS device_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp REAL,
                        entity_id TEXT,
                        action TEXT,
                        hour INTEGER,
                        minute INTEGER,
                        day_of_week INTEGER
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS learned_habits (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        entity_id TEXT,
                        action TEXT,
                        preferred_hour INTEGER,
                        preferred_minute INTEGER,
                        confidence REAL,
                        description TEXT,
                        last_suggested REAL DEFAULT 0,
                        UNIQUE(entity_id, action, preferred_hour)
                    )
                """)
                conn.commit()
        except Exception as e:
            logger.error(f"Error inicializando base de datos de hábitos: {e}")

    def _seed_initial_patterns(self):
        """Pre-entrena patrones típicos del hogar de Tomás para disponibilidad inmediata."""
        default_habits = [
            ("cover.persiana_salon", "close", 21, 30, 0.92, "Cierre habitual de persianas del salón al anochecer"),
            ("light.andrea_led_cama", "turn_off", 23, 45, 0.88, "Apagado de iluminación nocturna en dormitorios"),
            ("light.salon_led_tv", "turn_on", 19, 15, 0.85, "Iluminación ambiente para la tarde en el salón"),
            ("cover.persiana_principal", "open", 8, 30, 0.90, "Apertura matinal de persianas de dormitorio principal")
        ]
        try:
            with self._lock, sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    DELETE FROM learned_habits
                    WHERE entity_id NOT LIKE 'light.%' AND entity_id NOT LIKE 'cover.persiana_%'
                       OR entity_id LIKE '%luz_de_fondo%'
                """)
                for entity, action, hour, minute, conf, desc in default_habits:
                    cursor.execute("""
                        INSERT OR IGNORE INTO learned_habits 
                        (entity_id, action, preferred_hour, preferred_minute, confidence, description)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (entity, action, hour, minute, conf, desc))
                conn.commit()
        except Exception as e:
            logger.error(f"Error sembrando hábitos iniciales: {e}")

    def record_device_action(self, entity_id: str, action: str):
        """Registra una interacción física o por voz con un dispositivo."""
        now = datetime.now()
        ts = time.time()
        try:
            with self._lock, sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO device_history (timestamp, entity_id, action, hour, minute, day_of_week)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (ts, entity_id, action, now.hour, now.minute, now.weekday()))
                conn.commit()
            logger.info(f"Hábito registrado: {entity_id} -> {action} a las {now.strftime('%H:%M')}")
            self._analyze_patterns(entity_id)
        except Exception as e:
            logger.error(f"Error registrando acción de dispositivo: {e}")

    def _analyze_patterns(self, entity_id: str):
        """Analiza la recurrencia horaria para recalcular el nivel de confianza del hábito."""
        try:
            with self._lock, sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT hour, action, COUNT(*) as count 
                    FROM device_history 
                    WHERE entity_id = ? 
                    GROUP BY hour, action 
                    HAVING count >= 3
                """, (entity_id,))
                rows = cursor.fetchall()

                for hour, action, count in rows:
                    confidence = min(0.95, 0.60 + (count * 0.05))
                    desc = f"Hábito recurrente detectado ({count} veces a las {hour}:00h)"
                    cursor.execute("""
                        INSERT INTO learned_habits (entity_id, action, preferred_hour, preferred_minute, confidence, description)
                        VALUES (?, ?, ?, 0, ?, ?)
                        ON CONFLICT(entity_id, action, preferred_hour) 
                        DO UPDATE SET confidence = excluded.confidence, description = excluded.description
                    """, (entity_id, action, hour, confidence, desc))
                conn.commit()
        except Exception as e:
            logger.error(f"Error analizando patrones para {entity_id}: {e}")

    def get_learned_habits(self) -> List[Dict[str, Any]]:
        """Devuelve todos los hábitos aprendidos."""
        try:
            with self._lock, sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM learned_habits ORDER BY confidence DESC")
                return [dict(r) for r in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error obteniendo hábitos: {e}")
            return []

    def get_impending_suggestions(self) -> List[Dict[str, Any]]:
        """
        Determina si en la ventana actual (+/- 25 min) existe algún hábito con alta probabilidad
        que el usuario suela ejecutar y que aún no se haya ejecutado o sugerido recientemente.
        Soporta cruce de medianoche (ej. 23:45 vs 00:05).
        """
        now = datetime.now()
        current_minute_day = now.hour * 60 + now.minute
        suggestions = []

        try:
            with self._lock, sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM learned_habits 
                    WHERE confidence >= 0.75 
                    AND (? - last_suggested) > 14400
                """, (time.time(),))
                rows = cursor.fetchall()

                for row in rows:
                    habit_min = (row["preferred_hour"] or 0) * 60 + (row["preferred_minute"] or 0)
                    diff = abs(current_minute_day - habit_min)
                    circular_diff = min(diff, 1440 - diff)
                    # Si el hábito está programado dentro de un margen de 25 minutos
                    if circular_diff <= 25:
                        suggestions.append(dict(row))
        except Exception as e:
            logger.error(f"Error consultando sugerencias de hábitos: {e}")

        return suggestions

    def mark_suggested(self, habit_id: int):
        try:
            with self._lock, sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE learned_habits SET last_suggested = ? WHERE id = ?", (time.time(), habit_id))
                conn.commit()
        except Exception as e:
            logger.error(f"Error marcando hábito como sugerido: {e}")

habit_service = HabitService()
