import os
import re
import shutil
import sqlite3
import logging
import datetime
import unicodedata
from typing import List, Dict, Optional
from app.core.config import settings
from groq import Groq

logger = logging.getLogger("AvatarService")

class AvatarService:
    def __init__(self, db_path=None):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        self.base_dir = base_dir
        if not db_path or db_path == "tracker.db":
            self.db_path = os.path.join(base_dir, "backend", "tracker.db")
        else:
            self.db_path = db_path
        self.groq_client = None
        self._last_obsidian_sync = 0
        
        # Carpetas de medios
        self.media_dir = os.path.join(base_dir, "media")
        self.videos_dir = os.path.join(self.media_dir, "videos")
        self.dist_videos_dir = os.path.join(base_dir, "frontend", "dist", "media", "videos")
        self.public_videos_dir = os.path.join(base_dir, "frontend", "public", "media", "videos")
        
        os.makedirs(self.videos_dir, exist_ok=True)
        os.makedirs(self.dist_videos_dir, exist_ok=True)
        os.makedirs(self.public_videos_dir, exist_ok=True)

        # Bóveda Obsidian
        self.vault_avatar_dir = os.path.join(base_dir, "vault", "Avatar")
        os.makedirs(self.vault_avatar_dir, exist_ok=True)

        if settings.GROQ_API_KEY:
            try:
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
            except Exception as e:
                logger.error(f"Error al inicializar cliente de Groq en AvatarService: {e}")

    def _safe_filename(self, text: str) -> str:
        norm = unicodedata.normalize('NFD', text)
        clean = ''.join(c for c in norm if unicodedata.category(c) != 'Mn')
        s = re.sub(r'[^a-zA-Z0-9_\-\s]', '', clean).strip()
        s = re.sub(r'\s+', '_', s)
        return s[:45] if s else "clip_avatar"

    def _write_obsidian_avatar_note(self, rid: int, trigger: str, resp_text: str, video_fn: str, prompt: str):
        """Escribe o actualiza la ficha markdown correspondiente en vault/Avatar."""
        try:
            os.makedirs(self.vault_avatar_dir, exist_ok=True)
            fname_base = self._safe_filename(trigger)
            filepath = os.path.join(self.vault_avatar_dir, f"{fname_base}.md")

            now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            video_basename = os.path.basename(video_fn)

            clean_resp = (resp_text or "").replace('"', "'")
            clean_prompt = (prompt or "").replace('"', "'")

            content = f"""---
id: {rid}
trigger_phrase: "{trigger}"
video_filename: "{video_fn}"
response_text: "{clean_resp}"
generation_prompt: "{clean_prompt}"
creado: "{now_iso}"
tags:
  - avatar
  - veo_prompts
  - lola
---

# 🎬 Clip de Avatar: "{trigger}"

> [!INFO] Ficha Técnica del Clip
> - **Frase de Activación (Trigger)**: `{trigger}`
> - **Archivo de Vídeo**: `{video_basename}`
> - **Ruta en Servidor**: `{video_fn}`
> - **ID en Base de Datos**: `{rid}`

## 🗣️ Respuesta Hablada (Voz TTS)
> *"{resp_text}"*

## 🎥 Prompt de Generación Google Veo 3.1
```text
{prompt}
```

---
*Ficha generada y sincronizada automáticamente por HABANA Holographic Avatar & Obsidian Vault.*
"""
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)

            self._update_obsidian_avatar_index()
            logger.info(f"Nota Obsidian para Avatar guardada: {filepath}")
        except Exception as e:
            logger.error(f"Error escribiendo nota de Obsidian para avatar {trigger}: {e}")

    def _delete_obsidian_avatar_note(self, trigger: str):
        try:
            fname_base = self._safe_filename(trigger)
            filepath = os.path.join(self.vault_avatar_dir, f"{fname_base}.md")
            if os.path.exists(filepath):
                os.remove(filepath)
            self._update_obsidian_avatar_index()
        except Exception as e:
            logger.error(f"Error eliminando nota de Obsidian para avatar {trigger}: {e}")

    def _update_obsidian_avatar_index(self):
        """Actualiza el índice maestro 00_INDICE_AVATAR_Y_PROMPTS_VEO.md con todos los clips."""
        try:
            os.makedirs(self.vault_avatar_dir, exist_ok=True)
            index_path = os.path.join(self.vault_avatar_dir, "00_INDICE_AVATAR_Y_PROMPTS_VEO.md")

            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                cur.execute("SELECT id, trigger_phrase, response_text, video_filename, generation_prompt FROM avatar_responses ORDER BY id ASC")
                rows = cur.fetchall()

            index_rows = []
            for r in rows:
                trigger = r["trigger_phrase"] or "sin_frase"
                resp_text = (r["response_text"] or "").strip()
                video_fn = (r["video_filename"] or "").strip()
                prompt = (r["generation_prompt"] or "").strip()

                fname_base = self._safe_filename(trigger)
                short_prompt = prompt.replace("\n", " ").replace("|", "/")
                if len(short_prompt) > 60:
                    short_prompt = short_prompt[:57] + "..."

                short_resp = resp_text.replace("\n", " ").replace("|", "/")
                if len(short_resp) > 40:
                    short_resp = short_resp[:37] + "..."

                video_basename = os.path.basename(video_fn)
                index_rows.append(f"| [[{fname_base}|{trigger}]] | {short_resp} | `{video_basename}` | {short_prompt} |")

            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            table_body = "\n".join(index_rows)
            index_md = f"""# 🎬 Catálogo Maestro de Avatar Holográfico & Prompts Veo

> [!NOTE] Sincronización Automática con HABANA
> Esta carpeta contiene todas las frases de activación, respuestas de voz, vídeos generados y prompts cinematográficos para Google Veo 3.1 / Lola.
> **Total de Clips Registrados**: `{len(rows)}`
> Última actualización: `{now_str}`.

## 📋 Tabla de Clips y Prompts

| Frase de Activación (Trigger) | Respuesta de Voz | Vídeo Asociado | Prompt Google Veo |
| :--- | :--- | :--- | :--- |
{table_body}

---
### 💡 ¿Cómo añadir nuevos vídeos y prompts?
1. **Desde HABANA**: En la pestaña **Sistemas > Gestor de Avatar Holográfico**, usa el formulario (o sube el archivo .mp4) para registrar el comando, el vídeo y el prompt. Se guardará al instante tanto en el motor como en esta carpeta.
2. **Desde Obsidian**: Puedes duplicar cualquier nota de esta carpeta, asignarle una nueva `trigger_phrase`, su vídeo en `media/videos/` y su prompt; HABANA la detectará e integrará automáticamente en su base de datos.
"""
            with open(index_path, "w", encoding="utf-8") as f:
                f.write(index_md)
        except Exception as e:
            logger.error(f"Error actualizando 00_INDICE_AVATAR_Y_PROMPTS_VEO.md: {e}")

    def sync_from_obsidian(self) -> int:
        """Lee notas markdown en vault/Avatar e inserta en la BD las que no existan."""
        try:
            import time
            if time.time() - self._last_obsidian_sync < 3.0:
                return 0
            self._last_obsidian_sync = time.time()

            if not os.path.exists(self.vault_avatar_dir):
                return 0

            added = 0
            with sqlite3.connect(self.db_path) as conn:
                cur = conn.cursor()
                for fname in os.listdir(self.vault_avatar_dir):
                    if not fname.endswith(".md") or fname.startswith("00_"):
                        continue
                    fpath = os.path.join(self.vault_avatar_dir, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            text = f.read()

                        match = re.search(r'^---\s*\n(.*?)\n---\s*\n', text, re.DOTALL)
                        if match:
                            yaml_text = match.group(1)
                            data = {}
                            for line in yaml_text.splitlines():
                                if ":" in line and not line.strip().startswith("-"):
                                    k, v = line.split(":", 1)
                                    data[k.strip()] = v.strip().strip('"').strip("'")

                            trigger = data.get("trigger_phrase")
                            video_fn = data.get("video_filename", "")
                            resp_text = data.get("response_text", "")
                            prompt = data.get("generation_prompt", "")

                            if trigger:
                                cur.execute("SELECT id FROM avatar_responses WHERE trigger_phrase = ?", (trigger.strip().lower(),))
                                row = cur.fetchone()
                                if not row:
                                    cur.execute(
                                        "INSERT INTO avatar_responses (trigger_phrase, response_text, video_filename, generation_prompt) VALUES (?, ?, ?, ?)",
                                        (trigger.strip().lower(), resp_text, video_fn, prompt)
                                    )
                                    added += 1
                                    logger.info(f"Nota importada de Obsidian a Avatar: '{trigger}'")
                    except Exception as e:
                        logger.warning(f"Error leyendo nota {fname}: {e}")
                conn.commit()

            if added > 0:
                self._update_obsidian_avatar_index()
            return added
        except Exception as e:
            logger.error(f"Error en sync_from_obsidian para Avatar: {e}")
            return 0

    def add_response(self, trigger_phrase: str, response_text: str, video_filename: str, generation_prompt: str) -> bool:
        """Añade una nueva respuesta predeterminada para el avatar, descargando el vídeo si es URL y guardando en Obsidian."""
        clean_trigger = trigger_phrase.strip().lower()
        local_video_path = video_filename.strip()
        
        # Si es URL de internet, descargar localmente
        if local_video_path.startswith("http://") or local_video_path.startswith("https://"):
            try:
                safe_name = "".join([c if c.isalnum() or c in ("-", "_") else "_" for c in clean_trigger])
                filename = f"avatar_{safe_name}.mp4"
                dest_path = os.path.join(self.videos_dir, filename)
                
                logger.info(f"Descargando vídeo de avatar desde {local_video_path} a {dest_path}...")
                import requests
                headers = {"User-Agent": "Mozilla/5.0"}
                r = requests.get(local_video_path, headers=headers, timeout=60)
                if r.status_code == 200:
                    with open(dest_path, "wb") as f:
                        f.write(r.content)
                    # Sincronizar copias en frontend
                    shutil.copy2(dest_path, os.path.join(self.dist_videos_dir, filename))
                    shutil.copy2(dest_path, os.path.join(self.public_videos_dir, filename))
                    local_video_path = f"/media/videos/{filename}"
            except Exception as e:
                logger.error(f"Error al descargar vídeo de avatar: {e}")
        else:
            if not local_video_path.startswith("/") and not local_video_path.startswith("http"):
                if local_video_path.endswith(".mp4"):
                    local_video_path = f"/media/videos/{local_video_path}"
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO avatar_responses (trigger_phrase, response_text, video_filename, generation_prompt) VALUES (?, ?, ?, ?)",
                    (clean_trigger, response_text, local_video_path, generation_prompt)
                )
                rid = cursor.lastrowid
                conn.commit()

            # Guardar automáticamente en Obsidian
            self._write_obsidian_avatar_note(rid, clean_trigger, response_text, local_video_path, generation_prompt)
            return True
        except sqlite3.IntegrityError:
            # Si ya existía, actualizar
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE avatar_responses SET response_text = ?, video_filename = ?, generation_prompt = ? WHERE trigger_phrase = ?",
                        (response_text, local_video_path, generation_prompt, clean_trigger)
                    )
                    cursor.execute("SELECT id FROM avatar_responses WHERE trigger_phrase = ?", (clean_trigger,))
                    row = cursor.fetchone()
                    rid = row[0] if row else 0
                    conn.commit()
                self._write_obsidian_avatar_note(rid, clean_trigger, response_text, local_video_path, generation_prompt)
                return True
            except Exception as e:
                logger.error(f"Error actualizando respuesta avatar: {e}")
                return False
        except Exception as e:
            logger.error(f"Error al añadir respuesta de avatar: {e}")
            return False

    def upload_video_file(self, file_bytes: bytes, filename: str, trigger_phrase: str, response_text: str, generation_prompt: str) -> bool:
        """Guarda un archivo .mp4 subido, lo sincroniza a carpetas públicas, añade la respuesta y la guarda en Obsidian."""
        try:
            clean_name = self._safe_filename(os.path.splitext(filename)[0]) + ".mp4"
            dest_path = os.path.join(self.videos_dir, clean_name)

            with open(dest_path, "wb") as f:
                f.write(file_bytes)

            # Sincronizar en public y dist
            try:
                shutil.copy2(dest_path, os.path.join(self.dist_videos_dir, clean_name))
                shutil.copy2(dest_path, os.path.join(self.public_videos_dir, clean_name))
            except Exception:
                pass

            video_rel_path = f"/media/videos/{clean_name}"
            return self.add_response(trigger_phrase, response_text, video_rel_path, generation_prompt)
        except Exception as e:
            logger.error(f"Error guardando vídeo subido: {e}")
            return False

    def list_responses(self) -> List[Dict]:
        """Devuelve todas las respuestas de avatar configuradas, sincronizando con Obsidian."""
        self.sync_from_obsidian()
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT id, trigger_phrase, response_text, video_filename, generation_prompt, aliases FROM avatar_responses ORDER BY id DESC")
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error al listar respuestas de avatar: {e}")
            return []

    def delete_response(self, response_id: int) -> bool:
        """Elimina una respuesta de avatar por su ID y de Obsidian."""
        try:
            trigger = None
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT trigger_phrase FROM avatar_responses WHERE id = ?", (response_id,))
                row = cursor.fetchone()
                if row:
                    trigger = row[0]
                cursor.execute("DELETE FROM avatar_responses WHERE id = ?", (response_id,))
                conn.commit()

            if trigger:
                self._delete_obsidian_avatar_note(trigger)
            return True
        except Exception as e:
            logger.error(f"Error al eliminar respuesta de avatar: {e}")
            return False

    def _normalize_text(self, text: str) -> str:
        if not text:
            return ""
        norm = unicodedata.normalize('NFD', text)
        clean = ''.join(c for c in norm if unicodedata.category(c) != 'Mn')
        clean = clean.lower()
        clean = re.sub(r'[^a-z0-9\s]', ' ', clean)
        return " ".join(clean.split())

    def match_response(self, user_text: str) -> Optional[Dict]:
        """Busca coincidencia inteligente en BD por trigger_phrase, sinónimos y lematización, con fallback a archivos."""
        user_norm = self._normalize_text(user_text)
        if not user_norm:
            return None

        STOP_WORDS = {"la", "el", "de", "en", "y", "a", "o", "un", "una", "los", "las",
                      "del", "al", "su", "que", "no", "se", "por", "con", "para", "como"}

        def word_overlap(text_a, text_b):
            words_a = set(text_a.split()) - STOP_WORDS
            words_b = set(text_b.split()) - STOP_WORDS
            if not words_a or not words_b:
                return 0.0
            return len(words_a & words_b) / max(len(words_a), len(words_b))

        responses = self.list_responses()

        # Nivel 1: Coincidencia EXACTA (prioridad máxima)
        for r in responses:
            trig_norm = self._normalize_text(r.get("trigger_phrase", ""))
            if trig_norm and trig_norm == user_norm:
                return r
            raw_aliases = r.get("aliases") or ""
            for alias in [a.strip() for a in raw_aliases.split(",") if a.strip()]:
                alias_norm = self._normalize_text(alias)
                if alias_norm and alias_norm == user_norm:
                    return r

        # Nivel 2: Coincidencia de frase contenida con límites de palabra
        for r in responses:
            trig_norm = self._normalize_text(r.get("trigger_phrase", ""))
            if trig_norm and len(trig_norm) >= 4 and f" {trig_norm} " in f" {user_norm} ":
                return r
            raw_aliases = r.get("aliases") or ""
            for alias in [a.strip() for a in raw_aliases.split(",") if a.strip()]:
                alias_norm = self._normalize_text(alias)
                if alias_norm and len(alias_norm) >= 4 and f" {alias_norm} " in f" {user_norm} ":
                    return r

        # Nivel 3: Subcadena
        for r in responses:
            trig_norm = self._normalize_text(r.get("trigger_phrase", ""))
            if trig_norm and len(trig_norm) >= 5 and trig_norm in user_norm:
                return r
            raw_aliases = r.get("aliases") or ""
            for alias in [a.strip() for a in raw_aliases.split(",") if a.strip()]:
                alias_norm = self._normalize_text(alias)
                if alias_norm and len(alias_norm) >= 5 and alias_norm in user_norm:
                    return r

        # Nivel 4: Coincidencia difusa de palabras clave
        best_r = None
        best_score = 0.0
        for r in responses:
            trig_norm = self._normalize_text(r.get("trigger_phrase", ""))
            score = word_overlap(user_norm, trig_norm)
            raw_aliases = r.get("aliases") or ""
            for alias in raw_aliases.split(","):
                a_norm = self._normalize_text(alias)
                if a_norm:
                    s_alias = word_overlap(user_norm, a_norm)
                    if s_alias > score:
                        score = s_alias
            if score > best_score:
                best_score = score
                best_r = r

        if best_score >= 0.55 and best_r:
            return best_r

        # Nivel 5: Búsqueda por archivo físico en videos_dir como fallback
        if os.path.exists(self.videos_dir):
            best_file = None
            best_file_score = 0.0
            for f in os.listdir(self.videos_dir):
                if f.endswith(".mp4"):
                    name_clean = self._normalize_text(os.path.splitext(f)[0])
                    if name_clean and (name_clean in user_norm or user_norm in name_clean):
                        return {"video_filename": f"/media/videos/{f}", "response_text": "", "trigger_phrase": name_clean}
                    score = word_overlap(user_norm, name_clean)
                    if score > best_file_score:
                        best_file_score = score
                        best_file = f
            if best_file_score >= 0.55 and best_file:
                return {"video_filename": f"/media/videos/{best_file}", "response_text": "", "trigger_phrase": os.path.splitext(best_file)[0]}

        return None

    def generate_avatar_suggestion(self, trigger_phrase: str) -> Dict[str, str]:
        """Genera automáticamente response_text y generation_prompt para Google Veo 3.1."""
        clean_name = self._safe_filename(trigger_phrase)
        default_resp = {
            "response_text": f"Entendido, procesando orden de {trigger_phrase}.",
            "generation_prompt": f"A realistic, professional female AI assistant character on a sleek cyberpunk control room background, looking at the camera and speaking naturally with perfect lip sync: '{trigger_phrase}'. Starts and ends in a neutral attentive idle pose for seamless looping.",
            "video_filename": f"Female_AI_{clean_name}.mp4"
        }
        if not self.groq_client:
            return default_resp

        try:
            prompt_system = (
                "Eres el director cinematográfico de HABANA especializado en Google Veo 3.1. "
                "Para un comando dado del usuario, devuelve ÚNICAMENTE un JSON válido con dos campos: "
                "'response_text' (la frase corta que el avatar dirá en español neutro, conciso y elegante) y "
                "'generation_prompt' (un prompt en inglés cinematográfico y fotorrealista para Google Veo 3.1, "
                "describiendo a la mujer IA mirando a cámara, con lip-sync realista diciendo esa frase exacta, "
                "iluminación cibernética sutil, y arrancando y terminando en pose idle idéntica para loop perfecto)."
            )
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": prompt_system},
                    {"role": "user", "content": f"Comando: '{trigger_phrase}'"}
                ],
                model="qwen/qwen3.8-27b",
                temperature=0.5,
                max_tokens=350,
                response_format={"type": "json_object"}
            )
            import json
            result = json.loads(chat_completion.choices[0].message.content)
            result["video_filename"] = f"Female_AI_{clean_name}.mp4"
            return result
        except Exception as e:
            logger.error(f"Error generando sugerencia con Groq: {e}")
            return default_resp

avatar_service = AvatarService()
