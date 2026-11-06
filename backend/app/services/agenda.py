import sqlite3
import os
import re
import logging
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger("Agenda")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "habana.db")
VAULT_DIR = os.path.join(PROJECT_DIR, "vault")
VAULT_AGENDA_DIR = os.path.join(VAULT_DIR, "Agenda")

class AgendaService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._last_sync_ts = 0
        self.init_db()
        self._init_obsidian_vault()

    def _init_obsidian_vault(self):
        try:
            os.makedirs(VAULT_AGENDA_DIR, exist_ok=True)
            self._update_obsidian_index()
            logger.info(f"Agenda vinculada con Obsidian Vault en: {VAULT_AGENDA_DIR}")
        except Exception as e:
            logger.error(f"Error inicializando directorio Obsidian Agenda: {e}")

    def init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT,
                    message TEXT NOT NULL,
                    due_date TEXT NOT NULL,
                    event_type TEXT DEFAULT 'recordatorio',
                    status TEXT DEFAULT 'pending'
                )
            ''')
            cursor.execute("PRAGMA table_info(reminders)")
            existing_cols = {row[1] for row in cursor.fetchall()}
            if "title" not in existing_cols:
                cursor.execute("ALTER TABLE reminders ADD COLUMN title TEXT")
            if "message" not in existing_cols:
                cursor.execute("ALTER TABLE reminders ADD COLUMN message TEXT DEFAULT ''")
            if "due_date" not in existing_cols:
                cursor.execute("ALTER TABLE reminders ADD COLUMN due_date TEXT DEFAULT ''")
            if "event_type" not in existing_cols:
                cursor.execute("ALTER TABLE reminders ADD COLUMN event_type TEXT DEFAULT 'recordatorio'")
            if "status" not in existing_cols:
                cursor.execute("ALTER TABLE reminders ADD COLUMN status TEXT DEFAULT 'pending'")

            cursor.execute('''
                CREATE TABLE IF NOT EXISTS routines (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    execute_at TEXT NOT NULL,
                    status TEXT DEFAULT 'pending'
                )
            ''')
            conn.commit()

    def _safe_filename(self, text: str) -> str:
        import unicodedata
        norm = unicodedata.normalize('NFD', text)
        clean = ''.join(c for c in norm if unicodedata.category(c) != 'Mn')
        s = re.sub(r'[^a-zA-Z0-9_\-\s]', '', clean).strip()
        s = re.sub(r'\s+', '_', s)
        return s[:40] if s else "evento"

    def _write_obsidian_note(self, event_id: int, title: str, desc: str, due_date: str, event_type: str, status: str):
        try:
            os.makedirs(VAULT_AGENDA_DIR, exist_ok=True)
            date_prefix = due_date.split("T")[0] if "T" in due_date else due_date.split(" ")[0]
            date_prefix = re.sub(r'[^0-9\-]', '', date_prefix) or datetime.date.today().isoformat()
            
            clean_title = self._safe_filename(title)
            filename = f"{date_prefix}_{clean_title}.md"
            filepath = os.path.join(VAULT_AGENDA_DIR, filename)

            status_icon = "⏳ Pendiente" if status == "pending" else "✅ Completado"
            now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            content = f"""---
id: {event_id}
titulo: "{title}"
fecha_inicio: "{due_date}"
tipo: "{event_type}"
estado: "{status}"
creado: "{now_iso}"
tags:
  - agenda
  - {event_type.lower().replace(' ', '_')}
---

# 📅 {title}

> [!INFO] Detalles del Evento
> - **Fecha y Hora**: `{due_date if due_date else 'Sin especificar'}`
> - **Categoría**: `{event_type}`
> - **Estado**: `{status_icon}`
> - **ID Interno**: `{event_id}`

## 📝 Descripción y Notas
{desc if desc else "_Sin notas adicionales._"}

---
*Nota gestionada automáticamente por HABANA Neural Agenda y sincronizada con Obsidian Vault.*
"""
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)

            self._update_obsidian_index()
            logger.info(f"Nota de Obsidian creada/actualizada: {filepath}")
        except Exception as e:
            logger.error(f"Error escribiendo nota de Obsidian para evento {event_id}: {e}")

    def _update_obsidian_index(self):
        try:
            os.makedirs(VAULT_AGENDA_DIR, exist_ok=True)
            index_path = os.path.join(VAULT_AGENDA_DIR, "00_INDICE_AGENDA.md")

            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, title, message, due_date, event_type, status
                    FROM reminders
                    ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, due_date ASC
                ''')
                rows = cursor.fetchall()

            pending_rows = []
            completed_rows = []
            for r in rows:
                d = dict(r)
                title = d.get("title") or "Recordatorio"
                due = d.get("due_date") or "-"
                tipo = d.get("event_type") or "recordatorio"
                status = d.get("status") or "pending"
                date_prefix = due.split("T")[0] if "T" in due else due.split(" ")[0]
                date_prefix = re.sub(r'[^0-9\-]', '', date_prefix) or "evento"
                clean_t = self._safe_filename(title)
                link = f"[[{date_prefix}_{clean_t}|{title}]]"

                line = f"| {link} | `{due}` | {tipo} | {'⏳ Pendiente' if status == 'pending' else '✅ Completado'} |"
                if status == 'pending':
                    pending_rows.append(line)
                else:
                    completed_rows.append(line)

            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            md = f"""# 📑 Índice Maestro de Agenda & Recordatorios

> [!NOTE] Sincronización en Tiempo Real
> Este archivo está conectado bidireccionalmente con el cerebro domótico HABANA.
> Última sincronización: `{now_str}`.

## ⏳ Eventos y Recordatorios Activos ({len(pending_rows)})

| Evento | Fecha Programada | Tipo | Estado |
| :--- | :--- | :--- | :--- |
"""
            if pending_rows:
                md += "\n".join(pending_rows) + "\n\n"
            else:
                md += "| _No hay eventos pendientes_ | - | - | - |\n\n"

            md += f"""## ✅ Historial de Eventos Completados ({len(completed_rows)})

| Evento | Fecha Programada | Tipo | Estado |
| :--- | :--- | :--- | :--- |
"""
            if completed_rows:
                md += "\n".join(completed_rows[:20]) + "\n\n"
            else:
                md += "| _No hay eventos archivados_ | - | - | - |\n\n"

            with open(index_path, "w", encoding="utf-8") as f:
                f.write(md)
        except Exception as e:
            logger.error(f"Error actualizando 00_INDICE_AGENDA.md: {e}")

    def sync_from_obsidian(self):
        """Lee notas creadas manualmente en vault/Agenda e integra las que no existan en la BD."""
        try:
            import time
            if time.time() - self._last_sync_ts < 4.0:
                return
            self._last_sync_ts = time.time()

            if not os.path.exists(VAULT_AGENDA_DIR):
                return

            for fname in os.listdir(VAULT_AGENDA_DIR):
                if not fname.endswith(".md") or fname.startswith("00_"):
                    continue
                fpath = os.path.join(VAULT_AGENDA_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        content = f.read()

                    # Parse YAML frontmatter if exists
                    match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
                    if match:
                        yaml_text = match.group(1)
                        data = {}
                        for line in yaml_text.splitlines():
                            if ":" in line and not line.strip().startswith("-"):
                                k, v = line.split(":", 1)
                                data[k.strip()] = v.strip().strip('"').strip("'")

                        title = data.get("titulo")
                        due_date = data.get("fecha_inicio", "")
                        tipo = data.get("tipo", "recordatorio")
                        status = data.get("estado", "pending")
                        event_id = data.get("id")

                        if title and not event_id:
                            # Nota creada manualmente en Obsidian!
                            desc_match = re.search(r'## 📝 Descripción y Notas\s*\n(.*?)(?:\n---|---\s*$)', content, re.DOTALL)
                            desc = desc_match.group(1).strip() if desc_match else ""
                            logger.info(f"Detectada nueva nota en Obsidian: '{title}'. Añadiendo a HABANA Agenda...")
                            res = self.add_event(title=title, due_date=due_date, event_type=tipo, description=desc)
                            new_id = res.get("id")
                            if new_id:
                                # Re-escribir nota con su id
                                self._write_obsidian_note(new_id, title, desc, due_date, tipo, status)
                except Exception as file_err:
                    logger.warning(f"Error procesando nota {fname} para sync: {file_err}")
        except Exception as e:
            logger.error(f"Error en sync_from_obsidian: {e}")

    def add_event(
        self,
        title: Optional[str] = None,
        due_date: Optional[str] = None,
        event_type: str = "recordatorio",
        description: str = "",
        titulo: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        descripcion: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        tipo: Optional[str] = None,
        attachment_url: Optional[str] = None
    ) -> Dict[str, Any]:
        final_title = title or titulo or "Recordatorio"
        final_due_date = due_date or fecha_inicio or ""
        final_type = tipo or event_type or "recordatorio"
        final_desc = descripcion if descripcion is not None else description
        msg = f"{final_title}: {final_desc}" if final_desc else final_title

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO reminders (title, message, due_date, event_type, status)
                VALUES (?, ?, ?, ?, 'pending')
            ''', (final_title, msg, final_due_date, final_type))
            event_id = cursor.lastrowid
            conn.commit()

        logger.info(f"Agenda: Evento añadido '{final_title}' para {final_due_date} (ID: {event_id})")

        # Sincronizar automáticamente con Obsidian Vault
        self._write_obsidian_note(event_id, final_title, final_desc, final_due_date, final_type, "pending")

        return {
            "status": "success",
            "id": event_id,
            "title": final_title,
            "titulo": final_title,
            "due_date": final_due_date,
            "fecha_inicio": final_due_date,
            "event_type": final_type,
            "tipo": final_type,
            "description": final_desc,
            "descripcion": final_desc
        }

    def add_routine(self, entity_id: str, action: str, execute_at: str) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO routines (entity_id, action, execute_at, status)
                VALUES (?, ?, ?, 'pending')
            ''', (entity_id, action, execute_at))
            routine_id = cursor.lastrowid
            conn.commit()
        logger.info(f"Rutina añadida: {action} sobre {entity_id} a las {execute_at}")
        return {"status": "success", "id": routine_id}

    def get_pending_reminders(self) -> List[Dict[str, Any]]:
        # Sincronizar notas manuales de Obsidian si existen
        self.sync_from_obsidian()

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, title, message, due_date, event_type, status
                FROM reminders
                WHERE status = 'pending'
                ORDER BY due_date ASC
            ''')
            rows = cursor.fetchall()

        results = []
        for row in rows:
            d = dict(row)
            title = d.get("title") or "Recordatorio"
            msg = d.get("message") or ""
            desc = msg[len(title) + 2:] if msg.startswith(f"{title}: ") else (msg if msg != title else "")
            d["titulo"] = title
            d["descripcion"] = desc
            d["fecha_inicio"] = d.get("due_date", "")
            d["tipo"] = d.get("event_type", "recordatorio")
            results.append(d)
        return results

    def get_pending_routines(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, entity_id, action, execute_at, status
                FROM routines
                WHERE status = 'pending'
            ''')
            rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def update_reminder_status(self, reminder_id: int, status: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT title, message, due_date, event_type FROM reminders WHERE id = ?', (reminder_id,))
            row = cursor.fetchone()
            cursor.execute('''
                UPDATE reminders
                SET status = ?
                WHERE id = ?
            ''', (status, reminder_id))
            conn.commit()

        if row:
            d = dict(row)
            title = d.get("title") or "Recordatorio"
            msg = d.get("message") or ""
            desc = msg[len(title) + 2:] if msg.startswith(f"{title}: ") else (msg if msg != title else "")
            due = d.get("due_date", "")
            tipo = d.get("event_type", "recordatorio")
            # Actualizar nota en Obsidian
            self._write_obsidian_note(reminder_id, title, desc, due, tipo, status)

    def update_routine_status(self, routine_id: int, status: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE routines
                SET status = ?
                WHERE id = ?
            ''', (status, routine_id))
            conn.commit()

agenda_service = AgendaService()
