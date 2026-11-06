import sqlite3
import time
import logging
from typing import List, Dict

logger = logging.getLogger("Tracker")

class SystemTracker:
    def __init__(self, db_path="tracker.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp REAL,
                        module TEXT,
                        level TEXT,
                        message TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp REAL,
                        sender TEXT,
                        source TEXT,
                        message TEXT,
                        media_path TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_preferences (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT,
                        key TEXT,
                        value TEXT,
                        UNIQUE(user_id, key)
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS authorized_users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE,
                        pin TEXT,
                        face_encoding BLOB
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS avatar_responses (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        trigger_phrase TEXT UNIQUE,
                        response_text TEXT,
                        video_filename TEXT,
                        generation_prompt TEXT
                    )
                """)
                conn.commit()
        except Exception as e:
            logger.error(f"Fallo al inicializar Tracker DB: {e}")

    def log(self, module: str, level: str, message: str):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO logs (timestamp, module, level, message) VALUES (?, ?, ?, ?)",
                    (time.time(), module, level, message)
                )
                conn.commit()
            
            # Prune old logs (> 7 days) para mantenerlo ligero
            self._prune_old_logs()
        except Exception as e:
            logger.error(f"Tracker error: {e}")

    def get_history(self, limit: int = 50) -> List[Dict]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT timestamp, module, level, message FROM logs ORDER BY timestamp DESC LIMIT ?", 
                    (limit,)
                )
                rows = cursor.fetchall()
                return [dict(row) for row in rows][::-1] # Invertir para orden cronológico UI
        except Exception as e:
            logger.error(f"Error leyendo tracker: {e}")
            return []

    def save_message(self, sender: str, source: str, message: str, media_path: str = ""):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO conversations (timestamp, sender, source, message, media_path) VALUES (?, ?, ?, ?, ?)",
                    (time.time(), sender, source, message, media_path)
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Error guardando conversacion: {e}")

    def get_conversations(self, limit: int = 100) -> List[Dict]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT timestamp, sender, source, message, media_path FROM conversations ORDER BY timestamp DESC LIMIT ?", 
                    (limit,)
                )
                rows = cursor.fetchall()
                return [dict(row) for row in rows][::-1]
        except Exception as e:
            logger.error(f"Error leyendo conversaciones: {e}")
            return []

    def _prune_old_logs(self):
        # 7 days = 604800 seconds
        cutoff = time.time() - 604800
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM logs WHERE timestamp < ?", (cutoff,))
                conn.commit()
        except Exception:
            pass

tracker = SystemTracker()
