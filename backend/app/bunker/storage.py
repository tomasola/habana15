import os
import json
import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("BunkerStorage")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_DIR = os.path.join(BASE_DIR, "config")
MANIFEST_FILE = os.path.join(CONFIG_DIR, "bunker_manifest.json")
SNAPSHOTS_DIR = os.path.join(CONFIG_DIR, "bunker_snapshots")

os.makedirs(CONFIG_DIR, exist_ok=True)
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

DEFAULT_MANIFEST = {
    "enabled": True,
    "version": "1.0.0",
    "last_updated": time.time(),
    "widgets": [
        {
            "id": "bunker_demo_master_night",
            "title": "Macro Buenas Noches (Experimental)",
            "icon": "🌙",
            "category": "macro",
            "author": "IA Local",
            "description": "Apaga todas las luces secundarias, baja persianas al 10% y fija iluminación tenue en el pasillo.",
            "color": "#8b5cf6",
            "actions": [
                {"entity_id": "all_lights", "action": "turn_off_all"},
                {"entity_id": "led_pasillo_central", "action": "turn_on", "brightness": 15}
            ],
            "created_at": time.time(),
            "updated_at": time.time(),
            "run_count": 0
        },
        {
            "id": "bunker_quick_terrace_relax",
            "title": "Ambiente Terraza & Salón Cálido",
            "icon": "🍹",
            "category": "scene",
            "author": "IA Local",
            "description": "Luz tenue dorada para desconexión en el salón y terraza exterior.",
            "color": "#f59e0b",
            "actions": [
                {"entity_id": "luz_techo_salon", "action": "turn_on"},
                {"entity_id": "led_sofa_salon", "action": "turn_on", "brightness": 35}
            ],
            "created_at": time.time(),
            "updated_at": time.time(),
            "run_count": 0
        }
    ]
}

class BunkerStorage:
    def __init__(self):
        self._lock = False
        self._load()

    def _load(self):
        if not os.path.exists(MANIFEST_FILE):
            self._save_raw(DEFAULT_MANIFEST)
            self._manifest = dict(DEFAULT_MANIFEST)
        else:
            try:
                with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                    self._manifest = json.load(f)
            except Exception as e:
                logger.error(f"Error cargando bunker_manifest.json: {e}")
                self._manifest = dict(DEFAULT_MANIFEST)

    def _save_raw(self, data: Dict[str, Any]):
        try:
            with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error guardando bunker_manifest.json: {e}")

    def get_status(self) -> Dict[str, Any]:
        self._load()
        return {
            "enabled": self._manifest.get("enabled", True),
            "version": self._manifest.get("version", "1.0.0"),
            "widget_count": len(self._manifest.get("widgets", [])),
            "last_updated": self._manifest.get("last_updated", time.time()),
            "snapshots_count": len(self.list_snapshots())
        }

    def set_kill_switch(self, enabled: bool) -> bool:
        self._load()
        self._manifest["enabled"] = bool(enabled)
        self._manifest["last_updated"] = time.time()
        self._save_raw(self._manifest)
        logger.info(f"🔌 [BÚNKER KILL SWITCH] Estado cambiado a: {'CONECTADO' if enabled else 'AISLADO'}")
        return self._manifest["enabled"]

    def is_enabled(self) -> bool:
        return bool(self._manifest.get("enabled", True))

    def get_widgets(self) -> List[Dict[str, Any]]:
        self._load()
        return self._manifest.get("widgets", [])

    def get_widget(self, widget_id: str) -> Optional[Dict[str, Any]]:
        self._load()
        for w in self._manifest.get("widgets", []):
            if w.get("id") == widget_id:
                return w
        return None

    def save_widget(self, widget_data: Dict[str, Any]) -> Dict[str, Any]:
        self._load()
        now = time.time()
        w_id = widget_data.get("id")

        if not w_id:
            title = widget_data.get("title", "Widget")
            w_id = "bunker_" + "".join(c if c.isalnum() else "_" for c in title.lower()) + f"_{int(now)}"
            widget_data["id"] = w_id

        # Crear snapshot automático antes de modificar
        self.create_snapshot(f"Auto-snapshot antes de guardar widget {w_id}")

        # Asegurar referencia fresca a widgets
        widgets = self._manifest.setdefault("widgets", [])

        existing_idx = next((i for i, w in enumerate(widgets) if w.get("id") == w_id), None)
        if existing_idx is not None:
            widget_data["updated_at"] = now
            widget_data["run_count"] = widgets[existing_idx].get("run_count", 0)
            widgets[existing_idx] = widget_data
        else:
            widget_data.setdefault("created_at", now)
            widget_data["updated_at"] = now
            widget_data.setdefault("run_count", 0)
            widget_data.setdefault("author", "IA Local")
            widgets.append(widget_data)

        self._manifest["last_updated"] = now
        self._save_raw(self._manifest)
        return widget_data

    def delete_widget(self, widget_id: str) -> bool:
        self._load()
        widgets = self._manifest.get("widgets", [])
        init_len = len(widgets)
        
        # Snapshot antes de borrar
        self.create_snapshot(f"Auto-snapshot antes de borrar widget {widget_id}")

        self._manifest["widgets"] = [w for w in widgets if w.get("id") != widget_id]
        if len(self._manifest["widgets"]) < init_len:
            self._manifest["last_updated"] = time.time()
            self._save_raw(self._manifest)
            return True
        return False

    def increment_run_count(self, widget_id: str):
        self._load()
        for w in self._manifest.get("widgets", []):
            if w.get("id") == widget_id:
                w["run_count"] = w.get("run_count", 0) + 1
                w["last_run"] = time.time()
                self._save_raw(self._manifest)
                break

    # Time Machine / Snapshots
    def create_snapshot(self, description: str = "") -> Dict[str, Any]:
        self._load()
        now = time.time()
        s_id = f"snap_{int(now)}_{int(time.time()*1000)%1000}"
        snapshot_data = {
            "id": s_id,
            "timestamp": now,
            "datetime_str": datetime.fromtimestamp(now).strftime("%Y-%m-%d %H:%M:%S"),
            "description": description or "Punto de guardado manual",
            "manifest_copy": dict(self._manifest)
        }
        snap_file = os.path.join(SNAPSHOTS_DIR, f"{s_id}.json")
        try:
            with open(snap_file, "w", encoding="utf-8") as f:
                json.dump(snapshot_data, f, indent=2, ensure_ascii=False)
            logger.info(f"📸 [BÚNKER TIME MACHINE] Creado snapshot {s_id}: {description}")
            return {"ok": True, "snapshot": snapshot_data}
        except Exception as e:
            logger.error(f"Error creando snapshot de búnker: {e}")
            return {"ok": False, "error": str(e)}

    def list_snapshots(self) -> List[Dict[str, Any]]:
        snaps = []
        try:
            for fname in os.listdir(SNAPSHOTS_DIR):
                if fname.endswith(".json") and fname.startswith("snap_"):
                    fpath = os.path.join(SNAPSHOTS_DIR, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        snaps.append({
                            "id": data.get("id"),
                            "timestamp": data.get("timestamp"),
                            "datetime_str": data.get("datetime_str"),
                            "description": data.get("description"),
                            "widget_count": len(data.get("manifest_copy", {}).get("widgets", []))
                        })
        except Exception as e:
            logger.error(f"Error listando snapshots: {e}")
        snaps.sort(key=lambda s: s.get("timestamp", 0), reverse=True)
        return snaps[:20]

    def restore_snapshot(self, snapshot_id: str) -> Dict[str, Any]:
        snap_file = os.path.join(SNAPSHOTS_DIR, f"{snapshot_id}.json")
        if not os.path.exists(snap_file):
            return {"ok": False, "error": "Snapshot no encontrado"}
        try:
            with open(snap_file, "r", encoding="utf-8") as f:
                snap_data = json.load(f)
            self._manifest = snap_data.get("manifest_copy", {})
            self._manifest["last_updated"] = time.time()
            self._save_raw(self._manifest)
            logger.info(f"⏪ [BÚNKER TIME MACHINE] Restaurado snapshot {snapshot_id}")
            return {"ok": True, "message": f"Restaurado a versión {snapshot_id}"}
        except Exception as e:
            logger.error(f"Error restaurando snapshot: {e}")
            return {"ok": False, "error": str(e)}

    def promote_to_official(self, widget_id: str) -> Dict[str, Any]:
        """Graduación a Producción: Convierte un widget del Búnker en una automatización/escena oficial de HABANA."""
        widget = self.get_widget(widget_id)
        if not widget:
            return {"ok": False, "error": "Widget no encontrado en el Búnker"}

        from app.services.automation_service import automation_service

        official_id = "scene_" + widget["id"].replace("bunker_", "")
        official_payload = {
            "id": official_id,
            "name": widget.get("title", "Escena Promocionada"),
            "description": widget.get("description", "Creada originalmente en el Búnker IA"),
            "icon": widget.get("icon", "🌟"),
            "category": "scene",
            "enabled": True,
            "trigger": {"type": "manual"},
            "actions": widget.get("actions", []),
            "is_quick_scene": True,
            "quick_color": widget.get("color", "#00f3ff")
        }

        saved = automation_service.save_automation(official_payload)
        logger.info(f"🎓 [BÚNKER GRADUACIÓN] Widget '{widget_id}' promocionado a escena oficial '{official_id}'")
        return {
            "ok": True,
            "message": f"¡Widget graduado a oficial con éxito! ID: {official_id}",
            "automation": saved
        }

bunker_storage = BunkerStorage()
