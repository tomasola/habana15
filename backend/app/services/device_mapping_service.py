import os
import json
import logging
import threading
import unicodedata
import shutil
import glob
from datetime import datetime
from typing import Dict, Any, List, Optional, Set

logger = logging.getLogger("DeviceMappingService")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_DIR = os.path.join(BASE_DIR, "config")
MAPPING_FILE = os.path.join(CONFIG_DIR, "device_mapping.json")
BACKUP_MIRROR = os.path.join(CONFIG_DIR, "device_mapping.bak.json")
MAPPING_BACKUPS_DIR = os.path.join(CONFIG_DIR, "backups")
WALL_PLATES_FILE = os.path.join(CONFIG_DIR, "wall_plates.json")


def normalize_text(text: str) -> str:
    """Elimina tildes, signos de puntuación y pasa a minúsculas para matching fonético."""
    if not text:
        return ""
    text = text.lower().strip()
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    for ch in [".", ",", ";", ":", "-", "_", "/", "'", '"', "(", ")", "[", "]", "¿", "?", "¡", "!"]:
        text = text.replace(ch, " ")
    return " ".join(text.split())


DEFAULT_DEVICE_MAPPINGS: Dict[str, Dict[str, Any]] = {
    "luz_lazos_andrea": {
        "entity_id": "luz_lazos_andrea",
        "name": "Lámpara de Lazos Cama Andrea",
        "alias_ai": "lámpara de lazos de Andrea",
        "alias": "lámpara de lazos de Andrea",
        "room": "andrea",
        "device_type": "light_ceiling",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 15.0,
        "synonyms": ["luz lazos andrea", "lampara lazos andrea", "luz cama andrea", "luz techo andrea"]
    },
    "luz_ventana_andrea": {
        "entity_id": "luz_ventana_andrea",
        "name": "Luz Oculta Viga / Ventana Andrea",
        "alias_ai": "luz de la ventana de Andrea",
        "alias": "luz de la ventana de Andrea",
        "room": "andrea",
        "device_type": "light_wall",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 18.0,
        "synonyms": ["luz ventana andrea", "luz viga andrea", "luz oculta andrea"]
    },
    "led_cama_andrea": {
        "entity_id": "led_cama_andrea",
        "name": "Tira LED Cabecero Cama Andrea",
        "alias_ai": "tira LED de la cama de Andrea",
        "alias": "tira LED de la cama de Andrea",
        "room": "andrea",
        "device_type": "led_strip",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": True,
        "supports_color_temp": True,
        "watts": 24.0,
        "synonyms": ["led cama andrea", "tira led cama andrea", "led cabecero andrea"]
    },
    "led_foso_andrea": {
        "entity_id": "led_foso_andrea",
        "name": "Tira LED Foso Entrada Andrea",
        "alias_ai": "tira LED del foso de Andrea",
        "alias": "tira LED del foso de Andrea",
        "room": "andrea",
        "device_type": "led_strip",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": True,
        "supports_color_temp": True,
        "watts": 24.0,
        "synonyms": ["led foso andrea", "tira led entrada andrea", "led techo andrea"]
    },
    "luz_comedor_salon": {
        "entity_id": "luz_comedor_salon",
        "name": "Luz Ventna",
        "alias_ai": "luz de la ventana del salón",
        "alias": "luz de la ventana del salón",
        "room": "salon",
        "device_type": "light_ceiling",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 22.0,
        "synonyms": ["luz ventana salon", "luz ventna salon"]
    },
    "luz_techo_salon": {
        "entity_id": "luz_techo_salon",
        "name": "Luz Terraza",
        "alias_ai": "luz de la terraza del salón",
        "alias": "luz de la terraza del salón",
        "room": "salon",
        "device_type": "light_ceiling",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 24.0,
        "synonyms": ["luz terraza", "luz terraza salon", "luz exterior terraza"]
    },
    "luz_luz_del_comedor_d9b2": {
        "entity_id": "luz_luz_del_comedor_d9b2",
        "name": "Luz del Comedor",
        "alias_ai": "luz del comedor",
        "alias": "luz del comedor",
        "room": "salon",
        "device_type": "light_ceiling",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 24.0,
        "synonyms": ["luz comedor", "lampara comedor", "luz mesa comedor"]
    },
    "luz_luz_principal_del_salon_53c1": {
        "entity_id": "luz_luz_principal_del_salon_53c1",
        "name": "Luz Principal del Salón",
        "alias_ai": "luz principal del salón",
        "alias": "luz principal del salón",
        "room": "salon",
        "device_type": "light_ceiling",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 28.0,
        "synonyms": ["luz principal salon", "luz techo salon", "luz del salon"]
    },
    "led_aparador_salon": {
        "entity_id": "led_aparador_salon",
        "name": "Tira LED Aparador Salón",
        "alias_ai": "tira LED del aparador del salón",
        "alias": "tira LED del aparador del salón",
        "room": "salon",
        "device_type": "led_strip",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": True,
        "supports_color_temp": True,
        "watts": 32.0,
        "synonyms": ["led aparador", "tira led aparador", "led comedor salon"]
    },
    "led_sofa_salon": {
        "entity_id": "led_sofa_salon",
        "name": "Tira LED Sofá Salón",
        "alias_ai": "tira LED del sofá del salón",
        "alias": "tira LED del sofá del salón",
        "room": "salon",
        "device_type": "led_strip",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": True,
        "supports_color_temp": True,
        "watts": 32.0,
        "synonyms": ["led sofa", "tira led sofa", "led sofa salon"]
    },
    "led_tv_salon": {
        "entity_id": "led_tv_salon",
        "name": "Tira LED Mueble TV Salón",
        "alias_ai": "tira LED de la tele del salón",
        "alias": "tira LED de la tele del salón",
        "room": "salon",
        "device_type": "led_strip",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": True,
        "supports_color_temp": True,
        "watts": 28.0,
        "synonyms": ["led tv", "led tele", "tira led tv salon", "led mueble tv"]
    },
    "luz_techo_cocina": {
        "entity_id": "luz_techo_cocina",
        "name": "Luz Principal Cocina",
        "alias_ai": "luz de la cocina",
        "alias": "luz de la cocina",
        "room": "cocina",
        "device_type": "light_ceiling",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 24.0,
        "synonyms": ["luz cocina", "luz techo cocina"]
    },
    "luz_techo_pasillo": {
        "entity_id": "luz_techo_pasillo",
        "name": "Luz Techo Pasillo",
        "alias_ai": "luz del techo del pasillo",
        "alias": "luz del techo del pasillo",
        "room": "pasillo",
        "device_type": "light_ceiling",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 18.0,
        "synonyms": ["luz pasillo", "luz techo pasillo"]
    },
    "led_pasillo_central": {
        "entity_id": "led_pasillo_central",
        "name": "Tira LED Pasillo",
        "alias_ai": "tira LED del pasillo",
        "alias": "tira LED del pasillo",
        "room": "pasillo",
        "device_type": "led_strip",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": True,
        "supports_color_temp": True,
        "watts": 24.0,
        "synonyms": ["led pasillo", "tira led pasillo", "leds pasillo", "tiras led pasillo", "led del pasillo", "las led del pasillo", "los leds del pasillo", "la tira del pasillo", "tiradera del pasillo", "tiras del pasillo", "tiradera pasillo"]
    },
    "luz_techo_bano": {
        "entity_id": "luz_techo_bano",
        "name": "Luz Principal Baño",
        "alias_ai": "luz del baño",
        "alias": "luz del baño",
        "room": "bano",
        "device_type": "light_ceiling",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 18.0,
        "synonyms": ["luz bano", "luz baño", "luz techo bano"]
    },
    "led_espejo_bano": {
        "entity_id": "led_espejo_bano",
        "name": "Tira LED Baño",
        "alias_ai": "tira LED del baño",
        "alias": "tira LED del baño",
        "room": "bano",
        "device_type": "led_strip",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": True,
        "supports_color_temp": True,
        "watts": 18.0,
        "synonyms": ["led bano", "led espejo bano", "tira led bano"]
    },
    "luz_techo_principal": {
        "entity_id": "luz_techo_principal",
        "name": "Luz Techo Dormitorio Principal",
        "alias_ai": "luz del techo del dormitorio principal",
        "alias": "luz del techo del dormitorio principal",
        "room": "principal",
        "device_type": "light_ceiling",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 22.0,
        "synonyms": ["luz dormitorio principal", "luz habitacion principal", "luz techo principal"]
    },
    "led_dormitorio_principal": {
        "entity_id": "led_dormitorio_principal",
        "name": "Tira LED Dormitorio Principal",
        "alias_ai": "tira LED del dormitorio principal",
        "alias": "tira LED del dormitorio principal",
        "room": "principal",
        "device_type": "led_strip",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": True,
        "supports_color_temp": True,
        "watts": 28.0,
        "synonyms": ["led dormitorio principal", "led habitacion principal", "tira led principal"]
    },
    "luz_recibidor_entrada": {
        "entity_id": "luz_recibidor_entrada",
        "name": "Luz Recibidor Entrada",
        "alias_ai": "luz de la entrada",
        "alias": "luz de la entrada",
        "room": "entrada",
        "device_type": "light_ceiling",
        "is_real": True,
        "is_backlight": False,
        "supports_brightness": False,
        "supports_color_temp": False,
        "watts": 16.0,
        "synonyms": ["luz entrada", "luz recibidor", "luz hall"]
    },
    "cover.persiana_andrea": {
        "entity_id": "cover.persiana_andrea",
        "name": "Persiana Habitación Andrea",
        "alias_ai": "persiana de Andrea",
        "alias": "persiana de Andrea",
        "room": "andrea",
        "device_type": "cover",
        "is_real": True,
        "is_backlight": False,
        "watts": 45.0,
        "synonyms": ["persiana andrea", "cortina andrea"]
    },
    "cover.persiana_salon": {
        "entity_id": "cover.persiana_salon",
        "name": "Persiana Salón",
        "alias_ai": "persiana del salón",
        "alias": "persiana del salón",
        "room": "salon",
        "device_type": "cover",
        "is_real": True,
        "is_backlight": False,
        "watts": 60.0,
        "synonyms": ["persiana salon", "cortina salon"]
    },
    "cover.persiana_principal": {
        "entity_id": "cover.persiana_principal",
        "name": "Persiana Dormitorio Principal",
        "alias_ai": "persiana del dormitorio principal",
        "alias": "persiana del dormitorio principal",
        "room": "principal",
        "device_type": "cover",
        "is_real": True,
        "is_backlight": False,
        "watts": 50.0,
        "synonyms": ["persiana principal", "persiana dormitorio principal", "cortina principal"]
    }
}


class DeviceMappingService:
    WALL_PLATES_CATALOG: Dict[str, Dict[str, Any]] = {}

    def __init__(self):
        self._lock = threading.RLock()
        self._mapping: Dict[str, Dict[str, Any]] = {}
        os.makedirs(CONFIG_DIR, exist_ok=True)
        os.makedirs(MAPPING_BACKUPS_DIR, exist_ok=True)
        self._load_or_init()

    def _load_or_init(self):
        with self._lock:
            if os.path.exists(MAPPING_FILE):
                try:
                    with open(MAPPING_FILE, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, dict) and data:
                            self._mapping = data
                except Exception as e:
                    logger.error(f"Error cargando {MAPPING_FILE}: {e}")

            if not self._mapping:
                self._mapping = dict(DEFAULT_DEVICE_MAPPINGS)
                self._save(create_snapshot=False)
            else:
                changed = False
                for eid, dcfg in DEFAULT_DEVICE_MAPPINGS.items():
                    if eid not in self._mapping:
                        self._mapping[eid] = dict(dcfg)
                        changed = True
                if changed:
                    self._save(create_snapshot=False)

    def _save(self, create_snapshot: bool = False):
        with self._lock:
            try:
                with open(MAPPING_FILE, "w", encoding="utf-8") as f:
                    json.dump(self._mapping, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.error(f"Error guardando {MAPPING_FILE}: {e}")

    def create_backup(self, label: Optional[str] = None) -> Dict[str, Any]:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        name = f"device_mapping_{ts}.json"
        dst = os.path.join(MAPPING_BACKUPS_DIR, name)
        shutil.copy2(MAPPING_FILE, dst)
        return {"status": "success", "backup_name": name, "label": label or ts}

    def list_backups(self) -> List[Dict[str, Any]]:
        files = sorted(glob.glob(os.path.join(MAPPING_BACKUPS_DIR, "*.json")), reverse=True)
        return [{"name": os.path.basename(f), "created_at": os.path.getmtime(f)} for f in files]

    def restore_backup(self, backup_name: Optional[str] = None) -> Dict[str, Any]:
        if not backup_name:
            bks = self.list_backups()
            if not bks:
                return {"status": "error", "message": "No hay backups disponibles"}
            backup_name = bks[0]["name"]
        src = os.path.join(MAPPING_BACKUPS_DIR, backup_name)
        if not os.path.exists(src):
            return {"status": "error", "message": f"Backup {backup_name} no encontrado"}
        shutil.copy2(src, MAPPING_FILE)
        self.reload()
        return {"status": "success", "restored": backup_name}

    def reload(self):
        self._load_or_init()

    def get_mapping(self) -> Dict[str, Dict[str, Any]]:
        with self._lock:
            return dict(self._mapping)

    def get_device_info(self, entity_id: str) -> Dict[str, Any]:
        with self._lock:
            return dict(self._mapping.get(entity_id, {}))

    def save_device_mapping(self, entity_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            cur = self._mapping.setdefault(entity_id, {"entity_id": entity_id})
            cur.update(data)
            self._save()
            return dict(cur)

    def save_bulk_mapping(self, mapping_dict: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            for k, v in mapping_dict.items():
                if isinstance(v, dict):
                    self._mapping.setdefault(k, {"entity_id": k}).update(v)
            self._save()
            return {"updated": len(mapping_dict)}

    def get_real_devices_only(self) -> Dict[str, Dict[str, Any]]:
        with self._lock:
            return {k: v for k, v in self._mapping.items() if v.get("is_real", True)}

    def _internal_auto_hide_backlights(self) -> int:
        return 0

    def auto_hide_backlights(self, known_entity_ids: Optional[List[str]] = None) -> int:
        return 0

    def find_entity_by_alias(self, text: str) -> Optional[str]:
        norm = normalize_text(text)
        if not norm:
            return None
        with self._lock:
            if text in self._mapping:
                return text
            for eid, info in self._mapping.items():
                if normalize_text(eid) == norm:
                    return eid
                alias = normalize_text(info.get("alias_ai") or info.get("alias") or info.get("name") or "")
                if alias and (alias == norm or alias in norm or norm in alias):
                    return eid
                for syn in info.get("synonyms", []):
                    ns = normalize_text(syn)
                    if ns and (ns == norm or ns in norm or norm in ns):
                        return eid
        return None

    def get_linked_targets(self, physical_button_id: str) -> List[str]:
        return []

    def get_linked_buttons(self, target_entity_id: str) -> List[str]:
        return []

    def get_linked_button(self, target_entity_id: str) -> Optional[str]:
        return None

    def get_conmutadas_cluster(self, entity_id: str) -> Dict[str, Any]:
        return {"master_id": entity_id, "satellites": [], "all_entities": [entity_id]}

    def _load_wall_plates_config(self) -> Dict[str, Any]:
        if os.path.exists(WALL_PLATES_FILE):
            try:
                with open(WALL_PLATES_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {"night_mode_active": False, "plates": {}}

    def _save_wall_plates_config(self, cfg: Dict[str, Any]):
        try:
            with open(WALL_PLATES_FILE, "w", encoding="utf-8") as f:
                json.dump(cfg, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error guardando {WALL_PLATES_FILE}: {e}")

    def get_wall_plates_data(self, states_by_id: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        try:
            from app.services.z2m_lighting_engine import z2m_engine
            return z2m_engine.get_full_state().get("plates", [])
        except Exception:
            return []

    def assign_plate_button(self, button_id: str, target_entity_id: Optional[str] = None) -> Dict[str, Any]:
        return {"status": "success", "button_id": button_id, "target_entity_id": target_entity_id}

    def get_targets_for_button(self, button_id: str) -> List[Dict[str, Any]]:
        return []

    def link_button_target(self, button_id: str, target_entity_id: str) -> Dict[str, Any]:
        return {"status": "success"}

    def unlink_button_target(self, button_id: str, target_entity_id: str) -> Dict[str, Any]:
        return {"status": "success"}

    def set_plate_night_mode_toggle(self, plate_id: str, night_mode_off: bool) -> Dict[str, Any]:
        cfg = self._load_wall_plates_config()
        cfg.setdefault("plates", {}).setdefault(plate_id, {})["night_mode_off"] = bool(night_mode_off)
        self._save_wall_plates_config(cfg)
        return {"status": "success", "plate_id": plate_id, "night_mode_off": bool(night_mode_off)}

    def get_room_lights_summary(self, states_by_id: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            from app.services.z2m_lighting_engine import z2m_engine
            st = z2m_engine.get_full_state()
            rooms_out: Dict[str, Any] = {}
            for rl in st.get("real_lights", []):
                r = rl.get("room", "salon")
                r_obj = rooms_out.setdefault(r, {"room_id": r, "room_name": r.capitalize(), "count": 0, "lights": []})
                r_obj["lights"].append(rl)
                r_obj["count"] = len(r_obj["lights"])
            return rooms_out
        except Exception:
            return {}

    def upsert_room_light(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return {"status": "success"}

    def delete_room_light(self, entity_id: str) -> Dict[str, Any]:
        return {"status": "success"}

    def unlink_conmutada(self, target_entity_id: str, button_id: str) -> Dict[str, Any]:
        return {"status": "success"}

    def clear_all_conmutadas(self, target_entity_id: str) -> Dict[str, Any]:
        return {"status": "success"}

    def group_room_lights(self, target_entity_id: str, group_entity_id: str) -> Dict[str, Any]:
        return {"status": "success"}

    def ungroup_room_lights(self, target_entity_id: str, group_entity_id: str) -> Dict[str, Any]:
        return {"status": "success"}

    def purge_stale_devices(self, states_by_id: Optional[Dict[str, Any]] = None) -> int:
        return 0

    def get_prompt_catalog(self) -> str:
        lines = []
        with self._lock:
            for eid, info in self._mapping.items():
                alias = info.get("alias_ai") or info.get("name") or eid
                room = info.get("room", "general")
                syns = ", ".join(info.get("synonyms", [])[:4])
                lines.append(f"- {alias} (Habitación: {room}) -> ID: `{eid}`" + (f" [Sinónimos: {syns}]" if syns else ""))
        return "\n".join(lines)


device_mapping_service = DeviceMappingService()
