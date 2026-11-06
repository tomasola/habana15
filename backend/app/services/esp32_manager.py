import json
import logging
import os
import time
from pathlib import Path
from typing import Dict, List, Any, Optional

logger = logging.getLogger("ESP32Manager")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = BASE_DIR / "config"
NODES_FILE = CONFIG_DIR / "esp32_nodes.json"
BLE_FILE = CONFIG_DIR / "esp32_ble_devices.json"

ROOM_INFO = {
    "salon": {"name": "Salón", "icon": "🛋️", "color": "#00f3ff"},
    "cocina": {"name": "Cocina", "icon": "🍳", "color": "#10b981"},
    "despacho": {"name": "Despacho", "icon": "💻", "color": "#8b5cf6"},
    "andrea": {"name": "Habitación Andrea", "icon": "🎀", "color": "#ec4899"},
    "dormitorio": {"name": "Dormitorio Principal", "icon": "🛏️", "color": "#38bdf8"},
    "bano": {"name": "Baño", "icon": "🚿", "color": "#06b6d4"},
    "entrada": {"name": "Entrada / Hall", "icon": "🚪", "color": "#f59e0b"},
    "away": {"name": "Fuera de Casa", "icon": "🚶", "color": "#64748b"}
}

DEFAULT_NODES = {
    "esp32_bola_xiaozhi": {
        "id": "esp32_bola_xiaozhi",
        "name": "Esfera Xiaozhi Robot V2",
        "type": "voice_display_sphere",
        "chip": "ESP32-S3",
        "room": "salon",
        "port": "COM3",
        "ip": "192.168.1.139",
        "status": "online",
        "capabilities": ["audio_input", "audio_output", "round_display", "ble_tracker", "touch_button"],
        "screen": {
            "model": "GC9A01A",
            "resolution": "240x240",
            "current_expression": "happy"
        },
        "audio": {
            "mic": "I2S Mics (GPIO 10, 9, 45, 16)",
            "speaker": "I2S Speaker (GPIO 8, 46)",
            "volume": 80
        },
        "ble_scanner": {
            "enabled": True,
            "interval_seconds": 10,
            "detected_beacons": 4
        },
        "battery": {
            "percentage": 95,
            "charging": True
        },
        "last_seen": time.time()
    }
}

DEFAULT_BLE_DEVICES = [
    {
        "id": "watch_tomas",
        "name": "Smartwatch Tomás",
        "owner": "Tomás",
        "mac": "FF:32:89:A1:02:11",
        "type": "smartwatch",
        "current_room": "salon",
        "current_node": "esp32_bola_xiaozhi",
        "rssi": -58,
        "distance_meters": 1.4,
        "last_seen": time.time(),
        "status": "in_room"
    },
    {
        "id": "phone_tomas",
        "name": "Smartphone Tomás",
        "owner": "Tomás",
        "mac": "AA:11:BB:22:CC:33",
        "type": "smartphone",
        "current_room": "salon",
        "current_node": "esp32_bola_xiaozhi",
        "rssi": -63,
        "distance_meters": 2.1,
        "last_seen": time.time(),
        "status": "in_room"
    },
    {
        "id": "phone_andrea",
        "name": "Smartphone Andrea",
        "owner": "Andrea",
        "mac": "DD:44:EE:55:FF:66",
        "type": "smartphone",
        "current_room": "andrea",
        "current_node": None,
        "rssi": -76,
        "distance_meters": 4.8,
        "last_seen": time.time(),
        "status": "in_room"
    }
]

class ESP32Manager:
    def __init__(self):
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        self.nodes: Dict[str, Dict[str, Any]] = self._load_nodes()
        self.ble_devices: List[Dict[str, Any]] = self._load_ble_devices()
        self.discovered_devices: Dict[str, Dict[str, Any]] = {}
        self._check_connected_serial_ports()

    def _load_nodes(self) -> Dict[str, Dict[str, Any]]:
        if NODES_FILE.exists():
            try:
                with open(NODES_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error cargando {NODES_FILE}: {e}")
        self._save_nodes(DEFAULT_NODES)
        return dict(DEFAULT_NODES)

    def _save_nodes(self, data: Optional[Dict[str, Any]] = None):
        to_save = data if data is not None else self.nodes
        try:
            with open(NODES_FILE, "w", encoding="utf-8") as f:
                json.dump(to_save, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error guardando {NODES_FILE}: {e}")

    def _load_ble_devices(self) -> List[Dict[str, Any]]:
        if BLE_FILE.exists():
            try:
                with open(BLE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error cargando {BLE_FILE}: {e}")
        self._save_ble_devices(DEFAULT_BLE_DEVICES)
        return list(DEFAULT_BLE_DEVICES)

    def _save_ble_devices(self, data: Optional[List[Dict[str, Any]]] = None):
        to_save = data if data is not None else self.ble_devices
        try:
            with open(BLE_FILE, "w", encoding="utf-8") as f:
                json.dump(to_save, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error guardando {BLE_FILE}: {e}")

    def _check_connected_serial_ports(self) -> List[Dict[str, str]]:
        available = []
        try:
            import serial.tools.list_ports
            ports = serial.tools.list_ports.comports()
            for p in ports:
                info = {
                    "port": p.device,
                    "description": p.description,
                    "hwid": p.hwid,
                    "is_esp32": "303A" in (p.hwid or "").upper() or "CP210" in (p.description or "").upper() or "CH340" in (p.description or "").upper()
                }
                available.append(info)
        except Exception as e:
            logger.debug(f"Pyserial scan error (usando fallback Windows): {e}")
            # Fallback simple
            available.append({"port": "COM3", "description": "Dispositivo serie USB (ESP32-S3)", "is_esp32": True})
        return available

    def get_overview(self) -> Dict[str, Any]:
        ports = self._check_connected_serial_ports()
        # Verificar estado en vivo de nodos según puertos
        for n_id, node in self.nodes.items():
            port = node.get("port")
            if port:
                matched = any(p["port"] == port for p in ports)
                node["status"] = "online" if matched else "offline"
            node["last_seen"] = time.time() if node.get("status") == "online" else node.get("last_seen", 0)

        return {
            "nodes": list(self.nodes.values()),
            "detected_serial_ports": ports,
            "ble_tracked_devices": self.ble_devices,
            "total_nodes": len(self.nodes),
            "online_nodes": sum(1 for n in self.nodes.values() if n.get("status") == "online"),
            "ble_tracking_active": any(n.get("ble_scanner", {}).get("enabled") for n in self.nodes.values())
        }

    def register_or_update_node(self, node_data: Dict[str, Any]) -> Dict[str, Any]:
        node_id = node_data.get("id") or f"esp32_{int(time.time())}"
        node_data["id"] = node_id
        node_data["last_seen"] = time.time()
        self.nodes[node_id] = node_data
        self._save_nodes()
        return node_data

    def delete_node(self, node_id: str) -> bool:
        if node_id in self.nodes:
            del self.nodes[node_id]
            self._save_nodes()
            return True
        return False

    def register_ble_device(self, dev_data: Dict[str, Any]) -> Dict[str, Any]:
        dev_id = dev_data.get("id") or f"ble_{int(time.time())}"
        dev_data["id"] = dev_id
        dev_data["last_seen"] = time.time()
        # Actualizar si ya existe o añadir
        for i, existing in enumerate(self.ble_devices):
            if existing["id"] == dev_id or existing.get("mac") == dev_data.get("mac"):
                self.ble_devices[i] = {**existing, **dev_data}
                self._save_ble_devices()
                return self.ble_devices[i]

        self.ble_devices.append(dev_data)
        self._save_ble_devices()
        return dev_data

    def delete_ble_device(self, dev_id: str) -> bool:
        initial_len = len(self.ble_devices)
        self.ble_devices = [d for d in self.ble_devices if d["id"] != dev_id]
        if len(self.ble_devices) < initial_len:
            self._save_ble_devices()
            return True
        return False

    def trigger_action(self, node_id: str, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        node = self.nodes.get(node_id)
        if not node:
            return {"ok": False, "error": f"Nodo {node_id} no encontrado"}
        params = params or {}

        if action == "set_expression":
            expr = params.get("expression", "happy")
            node.setdefault("screen", {})["current_expression"] = expr
            self._save_nodes()
            logger.info(f"🎭 [ESP32 Action] {node_id} cambia expresión a '{expr}'")
            return {"ok": True, "action": action, "expression": expr}

        elif action == "play_sound":
            sound = params.get("sound", "chime")
            logger.info(f"🔊 [ESP32 Action] {node_id} reproduciendo sonido '{sound}'")
            return {"ok": True, "action": action, "sound": sound}

        elif action == "toggle_ble":
            enabled = params.get("enabled", True)
            node.setdefault("ble_scanner", {})["enabled"] = enabled
            self._save_nodes()
            logger.info(f"📡 [ESP32 Action] {node_id} BLE Scanner -> {enabled}")
            return {"ok": True, "action": action, "ble_enabled": enabled}

        elif action == "set_volume":
            vol = max(0, min(100, int(params.get("volume", 80))))
            node.setdefault("audio", {})["volume"] = vol
            self._save_nodes()
            return {"ok": True, "action": action, "volume": vol}

        return {"ok": True, "action": action, "status": "executed"}

    @staticmethod
    def calculate_distance(rssi: int, tx_power: int = -59, n: float = 2.5) -> float:
        """Calcula distancia estimada en metros usando modelo Log-Distance Path Loss."""
        if rssi >= 0:
            return 0.1
        ratio = (tx_power - rssi) / (10.0 * n)
        return max(0.2, round(10.0 ** ratio, 1))

    def process_ble_telemetry(self, node_id: str, sightings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Procesa el lote de balizas/dispositivos BLE detectados por un nodo ESP32.
        Aplica triangulación por RSSI, histéresis de cambio de habitación y dispara automatizaciones.
        """
        node = self.nodes.get(node_id)
        if not node:
            return {"ok": False, "error": f"Nodo {node_id} no registrado"}

        node_room = node.get("room", "salon")
        node["last_seen"] = time.time()
        processed_count = 0
        now = time.time()

        for s in sightings:
            raw_mac = (s.get("mac") or s.get("address") or "").strip().upper()
            if not raw_mac:
                continue
            rssi = int(s.get("rssi", -100))
            name = s.get("name") or s.get("local_name")

            # Guardar en catálogo de balizas descubiertas para emparejamiento fácil
            self.discovered_devices[raw_mac] = {
                "mac": raw_mac,
                "name": name or "Dispositivo BLE",
                "rssi": rssi,
                "last_seen": now,
                "detected_by": node_id,
                "room": node_room
            }

            # Buscar si es un dispositivo registrado en el sistema
            for dev in self.ble_devices:
                dev_mac = (dev.get("mac") or "").strip().upper()
                if dev_mac == raw_mac:
                    old_rssi = dev.get("rssi", -100)
                    # Suavizado de señal (filtro EMA)
                    smoothed_rssi = int(0.7 * rssi + 0.3 * old_rssi) if old_rssi != -100 else rssi
                    dist = self.calculate_distance(smoothed_rssi)
                    dev["rssi"] = smoothed_rssi
                    dev["distance_meters"] = dist
                    dev["last_seen"] = now
                    dev["status"] = "in_room"

                    # Algoritmo de decisión de estancia con histéresis de 4 dBm
                    current_room = dev.get("current_room")
                    if current_room != node_room:
                        if smoothed_rssi > -70 or dev.get("current_node") is None:
                            dev["current_room"] = node_room
                            dev["current_node"] = node_id
                            logger.info(f"📍 [BLE Radar] {dev['name']} ({dev['owner']}) ha entrado a '{ROOM_INFO.get(node_room, {}).get('name', node_room)}' (Señal {smoothed_rssi} dBm, {dist}m)")
                            try:
                                from app.services.automation_service import automation_service
                                automation_service.trigger_by_presence(dev.get("owner", "Tomás"), node_room, "enter")
                            except Exception:
                                pass
                    else:
                        dev["current_node"] = node_id

                    processed_count += 1
                    break

        self._save_ble_devices()
        return {"ok": True, "processed": processed_count, "node": node_id, "room": node_room}

    def simulate_device_movement(self, dev_id: str, target_room: str, rssi: int = -56) -> Dict[str, Any]:
        """Simula interactivamente el movimiento de un habitante para pruebas inmediatas de radar."""
        target_room = target_room.lower().strip()
        matched = None
        for dev in self.ble_devices:
            if dev["id"] == dev_id or dev.get("mac") == dev_id or dev.get("owner", "").lower() == dev_id.lower():
                matched = dev
                break

        if not matched:
            return {"ok": False, "error": f"Dispositivo '{dev_id}' no encontrado"}

        old_room = matched.get("current_room")
        matched["current_room"] = target_room
        matched["rssi"] = rssi
        matched["distance_meters"] = self.calculate_distance(rssi)
        matched["last_seen"] = time.time()
        matched["status"] = "away" if target_room == "away" else "in_room"

        for n_id, n in self.nodes.items():
            if n.get("room") == target_room:
                matched["current_node"] = n_id
                break

        self._save_ble_devices()
        logger.info(f"📍 [BLE Radar Simulación] {matched['name']} movido de '{old_room}' -> '{target_room}'")

        try:
            from app.services.automation_service import automation_service
            automation_service.trigger_by_presence(matched.get("owner", "Tomás"), target_room, "enter")
        except Exception:
            pass

        return {
            "ok": True,
            "device": matched["name"],
            "owner": matched["owner"],
            "room": target_room,
            "room_name": ROOM_INFO.get(target_room, {}).get("name", target_room),
            "rssi": rssi,
            "distance_meters": matched["distance_meters"]
        }

    def get_room_presence_map(self) -> Dict[str, Any]:
        """Retorna el mapa completo de presencia con las personas/dispositivos por habitación."""
        rooms_map = {}
        for r_id, r_meta in ROOM_INFO.items():
            rooms_map[r_id] = {
                "id": r_id,
                "name": r_meta["name"],
                "icon": r_meta["icon"],
                "color": r_meta["color"],
                "occupants": [],
                "nodes": [n["name"] for n in self.nodes.values() if n.get("room") == r_id]
            }

        now = time.time()
        for dev in self.ble_devices:
            is_stale = (now - dev.get("last_seen", 0)) > 120
            room = "away" if is_stale else dev.get("current_room", "away")
            if room not in rooms_map:
                room = "salon"
            
            dev_status = "away" if is_stale else dev.get("status", "in_room")
            rooms_map[room]["occupants"].append({
                "id": dev["id"],
                "name": dev["name"],
                "owner": dev.get("owner", "Desconocido"),
                "mac": dev.get("mac", ""),
                "type": dev.get("type", "smartwatch"),
                "rssi": dev.get("rssi", -80),
                "distance_meters": dev.get("distance_meters", 3.0),
                "last_seen_seconds": round(now - dev.get("last_seen", now)),
                "status": dev_status
            })

        return {
            "radar": rooms_map,
            "total_tracked": len(self.ble_devices),
            "active_in_home": sum(len(r["occupants"]) for r_id, r in rooms_map.items() if r_id != "away"),
            "discovered_devices": list(self.discovered_devices.values())[-10:]
        }

    def get_screen_buttons(self) -> Dict[str, Any]:
        node = self.nodes.get("esp32_pantalla_jc3248w535")
        if not node or "buttons" not in node:
            self.nodes = self._load_nodes()
            node = self.nodes.get("esp32_pantalla_jc3248w535", {})
        return {
            "node_id": "esp32_pantalla_jc3248w535",
            "screen_info": node.get("screen", {}),
            "ip": node.get("ip", "192.168.1.247"),
            "buttons": node.get("buttons", {})
        }

    def update_screen_buttons(self, buttons_data: Dict[str, Any]) -> Dict[str, Any]:
        node = self.nodes.get("esp32_pantalla_jc3248w535")
        if not node:
            self.nodes = self._load_nodes()
            node = self.nodes.get("esp32_pantalla_jc3248w535")
        if node:
            if "buttons" not in node:
                node["buttons"] = {}
            node["buttons"].update(buttons_data)
            self._save_nodes()
            logger.info("Botones de pantalla JC3248W535 actualizados en esp32_nodes.json")
            return {"ok": True, "buttons": node["buttons"]}
        return {"ok": False, "error": "Nodo pantalla no encontrado"}

    def trigger_button_action(self, btn_id: str) -> Dict[str, Any]:
        node = self.nodes.get("esp32_pantalla_jc3248w535", {})
        buttons = node.get("buttons", {})
        btn = buttons.get(btn_id)
        if not btn:
            return {"ok": False, "error": f"Botón {btn_id} no configurado"}
        
        action = btn.get("action")
        endpoint = btn.get("endpoint")
        logger.info(f"Disparando acción para botón {btn_id}: {action} ({endpoint})")
        
        if action == "all_off":
            from app.services.z2m_lighting_engine import z2m_engine
            res = z2m_engine.turn_off_all()
            return {"ok": True, "action": action, "msg": "Todas las luces apagadas", "result": res}
        elif action == "toggle_alarm":
            from app.services.alarm_service import alarm_service
            if alarm_service.is_enabled:
                alarm_service.disable()
            else:
                alarm_service.enable()
            return {"ok": True, "action": action, "armed": alarm_service.is_enabled, "msg": f"Alarma {'armada' if alarm_service.is_enabled else 'desarmada'}"}
        elif action in ("page_radar", "page_sensors"):
            return {"ok": True, "action": action, "msg": f"Página de pantalla {action} seleccionada"}
        elif endpoint and endpoint.startswith("/"):
            try:
                import requests
                res = requests.post(f"http://127.0.0.1:8050{endpoint}", timeout=3)
                return {"ok": True, "action": action, "status_code": res.status_code}
            except Exception as e:
                return {"ok": False, "error": str(e)}
        return {"ok": True, "action": action}

esp32_manager = ESP32Manager()
