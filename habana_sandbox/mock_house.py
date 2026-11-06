import os
import json
import random
import time
from typing import Dict, Any, List, Optional

LAYOUT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "config", "digital_twin_layout.json")

class MockHouse:
    """Gemelo digital en memoria de la vivienda Habana 14."""
    def __init__(self):
        self.rooms: Dict[str, Dict[str, Any]] = {}
        self.load_rooms()
        self.active_human_room: str = "salon"
        self.last_switch_toggle_time: float = 0.0

    def load_rooms(self):
        default_rooms = [
            {"id": "salon", "name": "Salón", "lights": ["luz_comedor_salon", "luz_techo_salon"], "ledStrips": ["led_sofa_salon", "led_tv_salon"]},
            {"id": "cocina", "name": "Cocina", "lights": ["luz_techo_cocina", "luz_encimera_cocina"], "ledStrips": []},
            {"id": "pasillo", "name": "Pasillo Central", "lights": ["luz_pasillo_1", "luz_pasillo_2"], "ledStrips": []},
            {"id": "bano", "name": "Baño Principal", "lights": ["luz_techo_bano", "luz_espejo_bano"], "ledStrips": []},
            {"id": "principal", "name": "Dormitorio Principal", "lights": ["luz_techo_dormitorio", "luz_mesita_dormitorio"], "ledStrips": ["led_cabecero_dormitorio"]},
            {"id": "andrea", "name": "Habitación Andrea", "lights": ["luz_lazos_andrea", "luz_ventana_andrea"], "ledStrips": []},
            {"id": "despacho", "name": "Despacho", "lights": ["luz_techo_despacho", "luz_escritorio_despacho"], "ledStrips": []},
            {"id": "entrada", "name": "Entrada / Recibidor", "lights": ["luz_techo_entrada"], "ledStrips": []},
            {"id": "terraza", "name": "Terraza Exterior", "lights": ["luz_terraza"], "ledStrips": []}
        ]

        if os.path.exists(LAYOUT_PATH):
            try:
                with open(LAYOUT_PATH, "r", encoding="utf-8") as f:
                    raw_rooms = json.load(f)
                    for r in raw_rooms:
                        rid = r.get("id")
                        if not rid:
                            continue
                        self.rooms[rid] = {
                            "id": rid,
                            "name": r.get("name", rid),
                            "lights": {lid: {"state": "OFF", "brightness": 254} for lid in r.get("lights", []) + r.get("ledStrips", [])},
                            "presence": False,
                            "temperature": round(random.uniform(20.5, 22.5), 1),
                            "power_watts": 0.0,
                            "door_open": False
                        }
            except Exception as e:
                print(f"[MockHouse] Error cargando digital_twin_layout: {e}")

        # Si no había archivo o faltaron
        if not self.rooms:
            for r in default_rooms:
                rid = r["id"]
                self.rooms[rid] = {
                    "id": rid,
                    "name": r["name"],
                    "lights": {lid: {"state": "OFF", "brightness": 254} for lid in r["lights"] + r["ledStrips"]},
                    "presence": False,
                    "temperature": 21.5,
                    "power_watts": 0.0,
                    "door_open": False
                }

    def set_human_presence(self, room_id: str):
        """Mueve al humano virtual a una habitación y actualiza sensores de presencia."""
        if room_id not in self.rooms:
            return
        self.active_human_room = room_id
        for rid, room in self.rooms.items():
            room["presence"] = (rid == room_id)

    def toggle_light(self, room_id: str, light_id: Optional[str] = None) -> Dict[str, Any]:
        """Simula una conmutada o pulsación en interruptor Z2M calculando latencia física."""
        t0 = time.perf_counter()
        if room_id not in self.rooms:
            return {"success": False, "error": f"Habitación {room_id} desconocida"}

        room = self.rooms[room_id]
        if not room["lights"]:
            return {"success": False, "error": "No hay luces en esta estancia"}

        target_light = light_id if light_id in room["lights"] else list(room["lights"].keys())[0]
        cur_state = room["lights"][target_light]["state"]
        new_state = "OFF" if cur_state == "ON" else "ON"
        room["lights"][target_light]["state"] = new_state

        # Recalcular potencia watios
        total_w = sum(15.0 for l in room["lights"].values() if l["state"] == "ON")
        room["power_watts"] = total_w

        # Latencia Z2M realista (emulando motor Habana 14: entre 2.2 ms y 4.8 ms)
        time.sleep(random.uniform(0.002, 0.0045))
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "success": True,
            "room_id": room_id,
            "light_id": target_light,
            "new_state": new_state,
            "latency_ms": latency_ms
        }

    def set_light_brightness(self, room_id: str, brightness: int, light_id: Optional[str] = None) -> Dict[str, Any]:
        t0 = time.perf_counter()
        if room_id not in self.rooms:
            return {"success": False, "error": f"Habitación {room_id} desconocida"}

        room = self.rooms[room_id]
        target_light = light_id if light_id in room["lights"] else (list(room["lights"].keys())[0] if room["lights"] else None)
        if not target_light:
            return {"success": False, "error": "Sin luces"}

        room["lights"][target_light]["brightness"] = brightness
        room["lights"][target_light]["state"] = "ON" if brightness > 0 else "OFF"
        time.sleep(random.uniform(0.003, 0.006))
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "success": True,
            "room_id": room_id,
            "light_id": target_light,
            "brightness": brightness,
            "latency_ms": latency_ms
        }

    def get_snapshot(self) -> Dict[str, Any]:
        """Devuelve el estado completo actual del gemelo digital."""
        return {
            "active_room": self.active_human_room,
            "rooms": self.rooms,
            "total_power_watts": sum(r["power_watts"] for r in self.rooms.values())
        }
