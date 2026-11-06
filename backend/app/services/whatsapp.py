import os
import logging
import requests
from app.core.config import settings

logger = logging.getLogger("WhatsAppService")

class WhatsAppBridge:
    def __init__(self):
        self.node_url = "http://localhost:3000" # Local Habana NodeJS Baileys API
    
    def send_message(self, jid: str, text: str):
        # Asegurar formato JID correcto (no duplicar si ya es @s.whatsapp.net o es un @lid)
        if not jid.endswith("@s.whatsapp.net") and not jid.endswith("@lid"):
            jid = f"{jid}@s.whatsapp.net"
            
        try:
            logger.info(f"Enviando WA a {jid}: {text}")
            res = requests.post(f"{self.node_url}/send", json={"jid": jid, "text": text}, timeout=5)
            return res.status_code == 200
        except Exception as e:
            logger.error(f"Fallo al enviar WhatsApp: {e}")
            from app.core.state import state_manager
            if state_manager.get_state().server_mode == "local":
                logger.info("[SIMULADO] WhatsApp enviado con éxito en modo local.")
                return True
            return False

    def send_document(self, jid: str, file_path: str, caption: str = "", mime: str = None):
        if not jid.endswith("@s.whatsapp.net") and not jid.endswith("@lid"):
            jid = f"{jid}@s.whatsapp.net"
            
        try:
            logger.info(f"Enviando Documento WA a {jid}: {file_path}")
            if not mime:
                import mimetypes
                mime, _ = mimetypes.guess_type(file_path)
                if not mime:
                    if file_path.endswith(".apk"):
                        mime = "application/vnd.android.package-archive"
                    else:
                        mime = "application/octet-stream"
            
            payload = {
                "jid": jid,
                "filePath": file_path,
                "fileName": os.path.basename(file_path),
                "caption": caption,
                "mimetype": mime
            }
            res = requests.post(f"{self.node_url}/send-document", json=payload, timeout=30)
            return res.status_code == 200
        except Exception as e:
            logger.error(f"Fallo al enviar documento WhatsApp: {e}")
            from app.core.state import state_manager
            if state_manager.get_state().server_mode == "local":
                logger.info(f"[SIMULADO] Documento {file_path} enviado a {jid}")
                return True
            return False

    def reset(self):
        try:
            res = requests.post(f"{self.node_url}/reset", timeout=5)
            if res.status_code == 200:
                return res.json()
            return {"status": "error", "code": res.status_code}
        except Exception as e:
            logger.error(f"Fallo al resetear WhatsApp: {e}")
            return {"status": "error", "detail": str(e)}

    def get_status(self):
        try:
            res = requests.get(f"{self.node_url}/status", timeout=5)
            if res.status_code == 200:
                data = res.json()
                return {"status": data.get("status", "unknown")}
            
            from app.core.state import state_manager
            if state_manager.get_state().server_mode == "local":
                return {"status": "connected"}
            return {"status": "error"}
        except Exception as e:
            from app.core.state import state_manager
            if state_manager.get_state().server_mode == "local":
                return {"status": "connected"}
            return {"status": "error"}

wa_bridge = WhatsAppBridge()
