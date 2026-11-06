import json
import logging
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("InstallerSecurity")

CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "installer_security.json"

DEFAULT_CONFIG = {
    "pin_enabled": False,
    "pin_hash": "",
    "updated_at": 0
}

def _hash_pin(pin: str) -> str:
    if not pin:
        return ""
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()

class InstallerSecurityService:
    def __init__(self):
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.config = self._load()

    def _load(self) -> Dict[str, Any]:
        if CONFIG_PATH.exists():
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error cargando installer_security.json: {e}")
        return dict(DEFAULT_CONFIG)

    def _save(self):
        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            logger.error(f"Error guardando installer_security.json: {e}")

    def get_status(self) -> Dict[str, Any]:
        return {
            "pin_enabled": bool(self.config.get("pin_enabled", False)),
            "has_pin": bool(self.config.get("pin_hash", ""))
        }

    def set_config(self, pin_enabled: bool, pin: Optional[str] = None) -> Dict[str, Any]:
        self.config["pin_enabled"] = bool(pin_enabled)
        if pin is not None:
            clean_pin = str(pin).strip()
            if clean_pin:
                self.config["pin_hash"] = _hash_pin(clean_pin)
            else:
                self.config["pin_hash"] = ""
                self.config["pin_enabled"] = False
        self._save()
        logger.info(f"🔒 [Installer Security] PIN enabled={self.config['pin_enabled']}, has_pin={bool(self.config['pin_hash'])}")
        return self.get_status()

    def verify_pin(self, pin: str) -> bool:
        if not self.config.get("pin_enabled", False):
            return True
        stored_hash = self.config.get("pin_hash", "")
        if not stored_hash:
            return True
        return _hash_pin(str(pin).strip()) == stored_hash

installer_security = InstallerSecurityService()
