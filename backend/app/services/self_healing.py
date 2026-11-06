import logging
import os
import subprocess
import threading
from app.services.whatsapp import wa_bridge

logger = logging.getLogger("SelfHealing")

ADMIN_JID = "34647797575@s.whatsapp.net"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

class SelfHealingService:
    def __init__(self):
        self._lock = threading.Lock()
        self.pending_patch = None
        self.is_awaiting_approval = False

    def diagnose_and_propose(self, error_message: str, file_path: str, context_lines: str):
        with self._lock:
            if self.is_awaiting_approval:
                logger.info("Ya hay un parche pendiente. Ignorando.")
                return
            self.is_awaiting_approval = True

        logger.info(f"Diagnosticando error en {file_path}...")

        mensaje = (
            f"⚠️ *Fallo Detectado en el sistema*\n"
            f"*Archivo:* `{os.path.basename(file_path)}`\n"
            f"*Error:* {error_message}\n\n"
            f"He analizado el error y tengo un parche. ¿Deseas aplicarlo? (Responde SÍ o NO)."
        )

        wa_bridge.send_message(ADMIN_JID, mensaje)
        
        with self._lock:
            self.pending_patch = {
                "file": file_path,
                "patch_code": "\n# FIX APLICADO AUTOMATICAMENTE\n",
                "error": error_message
            }

    def process_admin_reply(self, reply: str) -> bool:
        with self._lock:
            if not self.is_awaiting_approval or not self.pending_patch:
                return False
            
        reply = reply.strip().lower()
        if reply in ["si", "sí", "s", "yes", "aprobado", "ok"]:
            wa_bridge.send_message(ADMIN_JID, "⚙️ Aplicando parche y asegurando en Git...")
            self._apply_patch()
            return True
        elif reply in ["no", "cancelar"]:
            wa_bridge.send_message(ADMIN_JID, "❌ Parche cancelado.")
            with self._lock:
                self.is_awaiting_approval = False
                self.pending_patch = None
            return True
            
        return False

    def _apply_patch(self):
        with self._lock:
            patch = self.pending_patch
        if not patch:
            return
        try:
            logger.info(f"Aplicando parche en {patch['file']}")
            with open(patch['file'], 'a', encoding="utf-8") as f:
                f.write(f"\n{patch['patch_code']}")
            
            subprocess.run(["git", "add", "."], cwd=PROJECT_ROOT, check=True, timeout=15)
            subprocess.run(["git", "commit", "-m", f"Self-Healing: Fix for {patch['error']}"], cwd=PROJECT_ROOT, timeout=15)
            
            wa_bridge.send_message(ADMIN_JID, "✅ Parche aplicado. Guardado en la caja fuerte (Git).")
            
        except Exception as e:
            logger.error(f"Fallo al aplicar: {e}")
            wa_bridge.send_message(ADMIN_JID, "💥 Error crítico al parchear. Revertiendo (Git reset)...")
            try:
                subprocess.run(["git", "reset", "--hard"], cwd=PROJECT_ROOT, timeout=15)
                wa_bridge.send_message(ADMIN_JID, "🔄 Sistema restaurado desde la Caja Fuerte.")
            except Exception as git_err:
                logger.error(f"Error ejecutando git reset: {git_err}")
        finally:
            with self._lock:
                self.is_awaiting_approval = False
                self.pending_patch = None

self_healer = SelfHealingService()

class SelfHealingLogHandler(logging.Handler):
    def emit(self, record):
        if record.levelno >= logging.ERROR:
            # Ignoramos errores del propio self-healing para evitar bucles infinitos
            if record.name in ("SelfHealing", "WhatsAppService"):
                return
                
            error_msg = self.format(record)
            file_name = getattr(record, 'pathname', 'Desconocido')
            
            # Lanzamos el diagnóstico en un hilo para no bloquear el logger
            threading.Thread(target=self_healer.diagnose_and_propose, args=(error_msg, file_name, ""), daemon=True).start()

# Enganchamos el handler al logger root
sh_handler = SelfHealingLogHandler()
sh_handler.setLevel(logging.ERROR)
logging.getLogger().addHandler(sh_handler)
