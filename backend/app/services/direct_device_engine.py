import os
import json
import time
import socket
import struct
import logging
import threading
import subprocess
import concurrent.futures
from typing import Dict, Any, List, Optional, Set
import requests

logger = logging.getLogger("DirectDeviceEngine")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_DIR = os.path.join(BASE_DIR, "config")
DIRECT_CONFIG_FILE = os.path.join(CONFIG_DIR, "direct_devices.json")

DEFAULT_DIRECT_DEVICES: List[Dict[str, Any]] = [
    {
        "entity_id": "luz_lazos_andrea",
        "name": "Lámpara de Lazos Cama Andrea",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 2,
        "room": "andrea",
        "watts": 15,
        "mqtt_topic": "zigbee2mqtt/andrea_placa_entrada"
    },
    {
        "entity_id": "luz_ventana_andrea",
        "name": "Luz Oculta Viga / Ventana Andrea",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 1,
        "room": "andrea",
        "watts": 18,
        "mqtt_topic": "zigbee2mqtt/andrea_placa_ventana"
    },
    {
        "entity_id": "led_cama_andrea",
        "name": "Tira LED Cabecero Cama Andrea",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 0,
        "room": "andrea",
        "watts": 24,
        "mqtt_topic": "zigbee2mqtt/andrea_led_cama"
    },
    {
        "entity_id": "led_foso_andrea",
        "name": "Tira LED Foso Entrada Andrea",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 0,
        "room": "andrea",
        "watts": 24,
        "mqtt_topic": "zigbee2mqtt/andrea_led_foso_entrada"
    },
    {
        "entity_id": "luz_comedor_salon",
        "name": "Luz Ventna",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 1,
        "room": "salon",
        "watts": 22,
        "mqtt_topic": "zigbee2mqtt/salon_ventana_2"
    },
    {
        "entity_id": "luz_techo_salon",
        "name": "Luz Terraza",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 2,
        "room": "salon",
        "watts": 24,
        "mqtt_topic": "zigbee2mqtt/salon_ventana_2"
    },
    {
        "entity_id": "luz_luz_del_comedor_d9b2",
        "name": "Luz del Comedor",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 1,
        "room": "salon",
        "watts": 24,
        "mqtt_topic": "zigbee2mqtt/placa_salon_entrada"
    },
    {
        "entity_id": "luz_luz_principal_del_salon_53c1",
        "name": "Luz Principal del Salón",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 2,
        "room": "salon",
        "watts": 28,
        "mqtt_topic": "zigbee2mqtt/placa_salon_entrada"
    },
    {
        "entity_id": "led_aparador_salon",
        "name": "Tira LED Aparador Salón",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 0,
        "room": "salon",
        "watts": 32,
        "mqtt_topic": "zigbee2mqtt/salon_led_aparador"
    },
    {
        "entity_id": "led_sofa_salon",
        "name": "Tira LED Sofá Salón",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 0,
        "room": "salon",
        "watts": 32,
        "mqtt_topic": "zigbee2mqtt/salon_led_sofa"
    },
    {
        "entity_id": "led_tv_salon",
        "name": "Tira LED Mueble TV Salón",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 0,
        "room": "salon",
        "watts": 28,
        "mqtt_topic": "zigbee2mqtt/salon_led_tv"
    },
    {
        "entity_id": "luz_techo_cocina",
        "name": "Luz Principal Cocina",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 1,
        "room": "cocina",
        "watts": 24,
        "mqtt_topic": "zigbee2mqtt/pasillo_cocina"
    },
    {
        "entity_id": "luz_techo_pasillo",
        "name": "Luz Techo Pasillo",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 1,
        "room": "pasillo",
        "watts": 18,
        "mqtt_topic": "zigbee2mqtt/pasillo_habitacion"
    },
    {
        "entity_id": "led_pasillo_central",
        "name": "Tira LED Pasillo",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 0,
        "room": "pasillo",
        "watts": 24,
        "mqtt_topic": "zigbee2mqtt/pasillo_led"
    },
    {
        "entity_id": "luz_techo_bano",
        "name": "Luz Principal Baño",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 1,
        "room": "bano",
        "watts": 18,
        "mqtt_topic": "zigbee2mqtt/pasillo_bano_andrea"
    },
    {
        "entity_id": "led_espejo_bano",
        "name": "Tira LED Baño",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 0,
        "room": "bano",
        "watts": 18,
        "mqtt_topic": "zigbee2mqtt/bano_led"
    },
    {
        "entity_id": "luz_techo_principal",
        "name": "Luz Techo Dormitorio Principal",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 1,
        "room": "principal",
        "watts": 22,
        "mqtt_topic": "zigbee2mqtt/principal_cama_izq"
    },
    {
        "entity_id": "led_dormitorio_principal",
        "name": "Tira LED Dormitorio Principal",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 0,
        "room": "principal",
        "watts": 28,
        "mqtt_topic": "zigbee2mqtt/principal_led"
    },
    {
        "entity_id": "luz_recibidor_entrada",
        "name": "Luz Recibidor Entrada",
        "protocol": "zigbee_mqtt",
        "domain": "light",
        "state": "off",
        "channel": 1,
        "room": "entrada",
        "watts": 16,
        "mqtt_topic": "zigbee2mqtt/entrada_placa_principal"
    },
    {
        "entity_id": "cover.persiana_andrea",
        "name": "Persiana Habitación Andrea",
        "protocol": "zigbee_mqtt",
        "domain": "cover",
        "state": "open",
        "current_position": 100,
        "channel": 0,
        "room": "andrea",
        "watts": 45,
        "mqtt_topic": "zigbee2mqtt/persiana_andrea"
    },
    {
        "entity_id": "cover.persiana_salon",
        "name": "Persiana Salón",
        "protocol": "zigbee_mqtt",
        "domain": "cover",
        "state": "open",
        "current_position": 100,
        "channel": 0,
        "room": "salon",
        "watts": 60,
        "mqtt_topic": "zigbee2mqtt/persiana_salon"
    },
    {
        "entity_id": "cover.persiana_principal",
        "name": "Persiana Dormitorio Principal",
        "protocol": "zigbee_mqtt",
        "domain": "cover",
        "state": "open",
        "current_position": 100,
        "channel": 0,
        "room": "principal",
        "watts": 50,
        "mqtt_topic": "zigbee2mqtt/persiana_principal"
    }
]


class DirectDeviceEngine:
    """
    Motor de Conexión Directa a Dispositivos (Saltándose a Home Assistant).
    Soporta los modos: 'hybrid' (por defecto), 'direct' (100% nativo sin HA) y 'home_assistant'.
    Implementa drivers reales para Tuya Local TCP, Zigbee2MQTT/MQTT, Shelly/Tasmota/ESPHome HTTP,
    Matter/Thread y Cámaras RTSP/HTTP Snapshot.
    """

    def __init__(self):
        self._lock = threading.RLock()
        os.makedirs(CONFIG_DIR, exist_ok=True)
        self._config: Dict[str, Any] = {
            "connection_mode": "hybrid",  # 'direct' | 'home_assistant' | 'hybrid'
            "mqtt_broker": {
                "host": "127.0.0.1",
                "port": 1883,
                "username": "",
                "password": "",
                "enabled": False
            },
            "devices": {}
        }
        self._load_or_init()

    def _load_or_init(self):
        with self._lock:
            loaded = False
            if os.path.exists(DIRECT_CONFIG_FILE):
                try:
                    with open(DIRECT_CONFIG_FILE, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, dict):
                            self._config["connection_mode"] = data.get("connection_mode", "hybrid")
                            if "mqtt_broker" in data and isinstance(data["mqtt_broker"], dict):
                                self._config["mqtt_broker"].update(data["mqtt_broker"])
                            if "devices" in data and isinstance(data["devices"], dict):
                                self._config["devices"] = data["devices"]
                                loaded = True
                except Exception as e:
                    logger.error(f"Error cargando direct_devices.json: {e}")

            # Asegurar que todos los DEFAULT_DIRECT_DEVICES existen y tienen habitaciones correctas
            changed = not loaded
            for dev in DEFAULT_DIRECT_DEVICES:
                eid = dev["entity_id"]
                if eid not in self._config["devices"]:
                    self._config["devices"][eid] = dict(dev)
                    changed = True
                else:
                    cur = self._config["devices"][eid]
                    if cur.get("room") in ("general", None, "") and dev.get("room"):
                        cur["room"] = dev["room"]
                        changed = True
                    if dev.get("name") and not cur.get("name"):
                        cur["name"] = dev["name"]
                        changed = True

            if changed:
                self._save()

    def _save(self):
        with self._lock:
            try:
                tmp_file = f"{DIRECT_CONFIG_FILE}.tmp"
                with open(tmp_file, "w", encoding="utf-8") as f:
                    json.dump(self._config, f, indent=2, ensure_ascii=False)
                os.replace(tmp_file, DIRECT_CONFIG_FILE)
            except Exception as e:
                logger.error(f"Error guardando direct_devices.json: {e}")

    def get_mode(self) -> str:
        with self._lock:
            mode = self._config.get("connection_mode", "hybrid")
            if mode not in ("direct", "home_assistant", "hybrid"):
                return "hybrid"
            return mode

    def set_mode(self, mode: str) -> str:
        if mode not in ("direct", "home_assistant", "hybrid"):
            raise ValueError("Modo inválido. Use 'direct', 'home_assistant' o 'hybrid'.")
        with self._lock:
            self._config["connection_mode"] = mode
            self._save()
            logger.info(f"Modo de conexión de dispositivos cambiado a: {mode}")
            return mode

    def get_mqtt_config(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._config.get("mqtt_broker", {}))

    def set_mqtt_config(self, mqtt_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            broker = self._config.setdefault("mqtt_broker", {})
            for k in ("host", "port", "username", "password", "base_topic", "enabled"):
                if k in mqtt_data and mqtt_data[k] is not None:
                    broker[k] = mqtt_data[k]
            self._save()
            return dict(broker)

    def get_config_summary(self) -> Dict[str, Any]:
        with self._lock:
            devices_list = list(self._config.get("devices", {}).values())
            active_lights = sum(
                1 for d in devices_list
                if d.get("domain") in ("light", "switch") and d.get("state") == "on"
            )
            total_watts = sum(
                float(d.get("watts") or d.get("power_w") or 0) for d in devices_list
                if (d.get("domain") in ("light", "switch") and d.get("state") == "on")
            )
            protocols_count: Dict[str, int] = {}
            for d in devices_list:
                p = d.get("protocol", "unknown")
                protocols_count[p] = protocols_count.get(p, 0) + 1

            return {
                "connection_mode": self.get_mode(),
                "mode": self.get_mode(),
                "mqtt_broker": self.get_mqtt_config(),
                "stats": {
                    "total_devices": len(devices_list),
                    "active_devices": active_lights,
                    "estimated_watts": round(total_watts, 1),
                    "protocols": protocols_count
                },
                "devices": devices_list
            }

    def upsert_device(self, dev_data: Dict[str, Any]) -> Dict[str, Any]:
        entity_id = (dev_data.get("entity_id") or "").strip()
        if not entity_id:
            raise ValueError("entity_id es obligatorio")
        if "." not in entity_id:
            domain_prefix = dev_data.get("domain", "switch")
            entity_id = f"{domain_prefix}.{entity_id}"

        domain = entity_id.split(".")[0]
        with self._lock:
            existing = self._config["devices"].get(entity_id, {
                "entity_id": entity_id,
                "name": entity_id,
                "protocol": "tuya_local",
                "domain": domain,
                "state": "open" if domain == "cover" else "off",
                "current_position": 100 if domain == "cover" else None,
                "dps": 1,
                "channel": 0,
                "room": "salon",
                "watts": 15,
                "ip": "",
                "device_id": "",
                "local_key": "",
                "mqtt_topic": ""
            })
            for k in ("name", "protocol", "ip", "port", "device_id", "local_key", "mqtt_topic",
                      "dps", "channel", "room", "watts", "power_w", "state", "position", "current_position", "rtsp_url", "snapshot_url"):
                if k in dev_data and dev_data[k] is not None:
                    existing[k] = dev_data[k]
            if dev_data.get("power_w") is not None and dev_data.get("watts") is None:
                existing["watts"] = dev_data["power_w"]
            elif dev_data.get("watts") is not None:
                existing["power_w"] = dev_data["watts"]
            if dev_data.get("position") is not None and dev_data.get("current_position") is None:
                existing["current_position"] = dev_data["position"]
            existing["entity_id"] = entity_id
            existing["domain"] = domain
            self._config["devices"][entity_id] = existing
            self._save()
            return dict(existing)

    def delete_device(self, entity_id: str) -> bool:
        with self._lock:
            if entity_id in self._config["devices"]:
                del self._config["devices"][entity_id]
                self._save()
                return True
            return False

    def _format_entity(self, dev: Dict[str, Any]) -> Dict[str, Any]:
        eid = dev["entity_id"]
        domain = dev.get("domain") or eid.split(".")[0]
        attrs = {
            "friendly_name": dev.get("name", eid),
            "protocol": dev.get("protocol", "tuya_local"),
            "room": dev.get("room", ""),
            "watts": dev.get("watts", 0),
            "ip": dev.get("ip", ""),
            "source": "direct"
        }
        if domain == "cover":
            attrs["current_position"] = dev.get("current_position", 100 if dev.get("state") == "open" else 0)
        return {
            "id": eid,
            "entity_id": eid,
            "state": dev.get("state", "off"),
            "name": dev.get("name", eid),
            "attributes": attrs,
            "domain": domain,
            "source": "direct",
            "protocol": dev.get("protocol", "tuya_local"),
            "room": dev.get("room", ""),
            "watts": dev.get("watts", 0)
        }

    def list_entities(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [self._format_entity(d) for d in self._config["devices"].values()]

    def get_all_states(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [self._format_entity(d) for d in self._config["devices"].values()]

    def get_state(self, entity_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            dev = self._config["devices"].get(entity_id)
            if not dev:
                return None
            formatted = self._format_entity(dev)
            formatted["last_updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            return formatted

    def get_raw_device(self, entity_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            dev = self._config["devices"].get(entity_id)
            return dict(dev) if dev else None

    def update_live_state(self, entity_id: str, new_state: str, attributes: Optional[Dict[str, Any]] = None):
        with self._lock:
            if entity_id in self._config["devices"]:
                dev = self._config["devices"][entity_id]
                dev["state"] = new_state
                if attributes and "current_position" in attributes:
                    dev["current_position"] = attributes["current_position"]

    def sync_from_ha_entities(self, ha_entities: List[Dict[str, Any]]):
        """En modo híbrido, sincroniza en segundo plano estados iniciales desde HA si el dispositivo no fue conmutado localmente hace poco."""
        with self._lock:
            now = time.time()
            for ha_e in ha_entities:
                eid = ha_e.get("entity_id") or ha_e.get("id")
                if not eid or eid not in self._config["devices"]:
                    continue
                dev = self._config["devices"][eid]
                # Si fue controlado directamente en los últimos 3s, prevalece el estado directo
                if (now - dev.get("_last_direct_ts", 0)) < 3.0:
                    continue
                ha_state = ha_e.get("state")
                if ha_state and ha_state not in ("unavailable", "unknown"):
                    dev["state"] = ha_state
                    attrs = ha_e.get("attributes") or {}
                    if "current_position" in attrs:
                        dev["current_position"] = attrs["current_position"]

    # =========================================================================
    # DRIVERS NATIVOS DIRECTOS (SIN HOME ASSISTANT)
    # =========================================================================

    def _control_tuya_local(self, dev: Dict[str, Any], target_state: str, position: Optional[int] = None) -> Dict[str, Any]:
        ip = (dev.get("ip") or "").strip()
        device_id = (dev.get("device_id") or "").strip()
        local_key = (dev.get("local_key") or "").strip()
        dps = int(dev.get("dps") or 1)
        domain = dev.get("domain", "switch")

        if ip and device_id and local_key:
            try:
                import tinytuya  # type: ignore
                d = tinytuya.OutletDevice(device_id, ip, local_key)
                d.set_version(3.3)
                d.set_socketTimeout(1.2)
                if domain == "cover" and position is not None:
                    d.set_value(dps, int(position))
                else:
                    d.set_status(target_state == "on" or target_state == "open", dps)
                return {"driver": "tuya_local_tinytuya", "hardware_ack": True}
            except ImportError:
                pass
            except Exception as e:
                logger.debug(f"TinyTuya fallback en {dev['entity_id']}: {e}")

        if ip:
            # Sondeo / trama rápida TCP al puerto 6668 de Tuya Local
            try:
                with socket.create_connection((ip, 6668), timeout=0.8) as sock:
                    payload_bytes = json.dumps({
                        "devId": device_id or dev["entity_id"],
                        "dps": {str(dps): position if (domain == "cover" and position is not None) else (target_state in ("on", "open"))}
                    }).encode("utf-8")
                    # Cabecera Tuya 0x000055AA
                    frame = struct.pack(">IIII", 0x000055AA, 1, 7, len(payload_bytes) + 8) + payload_bytes + struct.pack(">II", 0, 0x0000AA55)
                    sock.sendall(frame)
                return {"driver": "tuya_local_tcp6668", "hardware_ack": True}
            except Exception as e:
                logger.debug(f"Socket Tuya 6668 fallback ({ip}): {e}")

        return {"driver": "tuya_local_direct", "hardware_ack": False}

    def _control_mqtt(self, dev: Dict[str, Any], target_state: str, position: Optional[int] = None) -> Dict[str, Any]:
        broker = self._config.get("mqtt_broker", {})
        host = (broker.get("host") or "127.0.0.1").strip()
        port = int(broker.get("port") or 1883)
        enabled = bool(broker.get("enabled", False))
        entity_id = dev['entity_id']
        topic, endpoint_key = self._resolve_mqtt_topic_and_endpoint(entity_id, dev.get("mqtt_topic"))
        set_topic = topic if topic.endswith("/set") else f"{topic}/set"

        domain = dev.get("domain", "switch")
        if domain == "cover" and position is not None:
            payload = json.dumps({"position": int(position), "state": "OPEN" if position > 0 else "CLOSE"})
        elif domain == "cover":
            payload = json.dumps({"state": "OPEN" if target_state == "open" else ("STOP" if target_state == "stop" else "CLOSE")})
        else:
            p_dict = {endpoint_key: "ON" if target_state == "on" else "OFF"}
            if target_state == "on" and domain == "light":
                attrs = dev.get("attributes", {})
                if "brightness" in attrs and attrs["brightness"] is not None:
                    p_dict["brightness"] = int(attrs["brightness"])
                if "color_temp" in attrs and attrs["color_temp"] is not None:
                    p_dict["color_temp"] = int(attrs["color_temp"])
                elif "color_temp_kelvin" in attrs and attrs["color_temp_kelvin"] is not None:
                    k = int(attrs["color_temp_kelvin"])
                    if k > 0:
                        p_dict["color_temp"] = int(round(1000000.0 / k))
                if "rgb_color" in attrs and isinstance(attrs["rgb_color"], (list, tuple)) and len(attrs["rgb_color"]) == 3:
                    p_dict["color"] = {"r": int(attrs["rgb_color"][0]), "g": int(attrs["rgb_color"][1]), "b": int(attrs["rgb_color"][2])}
            payload = json.dumps(p_dict)

        if enabled and host:
            try:
                import paho.mqtt.publish as publish  # type: ignore
                auth = None
                if broker.get("username"):
                    auth = {"username": broker["username"], "password": broker.get("password", "")}
                publish.single(set_topic, payload=payload, hostname=host, port=port, auth=auth, keepalive=2)
                return {"driver": "zigbee_mqtt_paho", "topic": set_topic, "hardware_ack": True}
            except ImportError:
                pass
            except Exception as e:
                logger.debug(f"Paho MQTT fallback en {dev['entity_id']}: {e}")

            # Fallback raw MQTT v3.1.1 CONNECT + PUBLISH por socket TCP
            try:
                with socket.create_connection((host, port), timeout=1.2) as sock:
                    client_id = b"habana8_direct"
                    var_header = b"\x00\x04MQTT\x04\x02\x00\x0a"
                    c_payload = struct.pack(">H", len(client_id)) + client_id
                    rem_len = len(var_header) + len(c_payload)
                    sock.sendall(bytes([0x10, rem_len]) + var_header + c_payload)
                    sock.recv(4)  # CONNACK
                    topic_bytes = set_topic.encode("utf-8")
                    msg_bytes = payload.encode("utf-8")
                    pub_rem = 2 + len(topic_bytes) + len(msg_bytes)
                    if pub_rem < 128:
                        sock.sendall(bytes([0x30, pub_rem]) + struct.pack(">H", len(topic_bytes)) + topic_bytes + msg_bytes)
                return {"driver": "zigbee_mqtt_socket", "topic": set_topic, "hardware_ack": True}
            except Exception as e:
                logger.debug(f"Socket MQTT 1883 fallback ({host}): {e}")

        return {"driver": "zigbee_mqtt_direct", "topic": set_topic, "hardware_ack": False}

    def _control_http_rest(self, dev: Dict[str, Any], target_state: str, position: Optional[int] = None) -> Dict[str, Any]:
        ip = (dev.get("ip") or "").strip()
        protocol = dev.get("protocol", "shelly_http")
        channel = int(dev.get("channel") or 0)
        is_on = target_state in ("on", "open")

        if ip:
            try:
                if protocol == "tasmota_http":
                    power_cmd = f"Power{channel + 1}" if channel > 0 else "Power"
                    state_str = "On" if is_on else "Off"
                    url = f"http://{ip}/cm?cmnd={power_cmd}%20{state_str}"
                    requests.get(url, timeout=1.5)
                    return {"driver": "tasmota_http_direct", "url": url, "hardware_ack": True}
                elif protocol == "esphome_http":
                    domain = dev.get("domain", "switch")
                    obj_id = dev["entity_id"].split(".")[-1]
                    action_str = "turn_on" if is_on else "turn_off"
                    url = f"http://{ip}/{domain}/{obj_id}/{action_str}"
                    requests.post(url, timeout=1.5)
                    return {"driver": "esphome_http_direct", "url": url, "hardware_ack": True}
                else:
                    # Shelly Gen2 RPC + fallback Gen1
                    url_gen2 = f"http://{ip}/rpc/Switch.Set?id={channel}&on={'true' if is_on else 'false'}"
                    r = requests.get(url_gen2, timeout=1.5)
                    if r.status_code != 200:
                        url_gen1 = f"http://{ip}/relay/{channel}?turn={'on' if is_on else 'off'}"
                        requests.get(url_gen1, timeout=1.5)
                    return {"driver": "shelly_http_direct", "url": url_gen2, "hardware_ack": True}
            except Exception as e:
                logger.debug(f"HTTP REST fallback ({ip}) en {dev['entity_id']}: {e}")

        return {"driver": f"{protocol}_direct", "hardware_ack": False}

    def _control_matter(self, dev: Dict[str, Any], target_state: str, position: Optional[int] = None) -> Dict[str, Any]:
        ip = (dev.get("ip") or "").strip()
        if ip:
            try:
                url = f"http://{ip}:5580/command"
                requests.post(url, json={"entity_id": dev["entity_id"], "state": target_state, "position": position}, timeout=1.5)
                return {"driver": "matter_local_server", "hardware_ack": True}
            except Exception:
                pass
        return {"driver": "matter_direct", "hardware_ack": False}

    def control_device(self, entity_id: str, action: Optional[str], position: Optional[int] = None,
                       brightness: Optional[int] = None, brightness_pct: Optional[int] = None,
                       color_temp: Optional[int] = None, color_temp_kelvin: Optional[int] = None,
                       rgb_color: Optional[List[int]] = None) -> Dict[str, Any]:
        t0 = time.perf_counter()
        action_lower = (action or "toggle").lower().strip()

        with self._lock:
            # Soporte para comando global "all"
            entity_clean = entity_id.strip()
            if entity_clean.lower() in ("all", "all_lights", "all_off", "light.all", "switch.all", "todas", "luces") or action_lower in ("turn_off_all", "all_off"):
                is_off = any(k in action_lower for k in ("off", "apagar", "close", "cerrar"))
                if is_off:
                    try:
                        from app.services.z2m_lighting_engine import z2m_engine
                        z2m_engine.turn_off_all()
                    except Exception:
                        pass
                new_st = "off" if is_off else "on"
                count = 0
                for d in self._config["devices"].values():
                    if d.get("domain") in ("light", "switch"):
                        d["state"] = new_st
                        d["_last_direct_ts"] = time.time()
                        count += 1
                self._save()
                latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                return {
                    "status": "success",
                    "source": "direct",
                    "driver": "direct_batch_engine",
                    "affected_devices": count,
                    "state": new_st,
                    "latency_ms": latency_ms
                }

            # Delegar primero al motor nativo Z2MLightingEngine si reconoce la entidad
            try:
                from app.services.z2m_lighting_engine import z2m_engine
                bri_pct_val = brightness_pct
                if bri_pct_val is None and brightness is not None:
                    bri_pct_val = brightness if brightness <= 100 else int(round((brightness / 255.0) * 100))
                z2m_res = z2m_engine.control_habana_entity(
                    entity_clean,
                    action=action_lower,
                    brightness_pct=bri_pct_val,
                    color_temp_kelvin=color_temp_kelvin,
                    rgb_color=rgb_color,
                    position=position,
                )
                if z2m_res.get("ok"):
                    st_str = str(z2m_res.get("state", "off")).lower()
                    if entity_clean in self._config["devices"]:
                        self._config["devices"][entity_clean]["state"] = st_str
                        self._config["devices"][entity_clean]["_last_direct_ts"] = time.time()
                        self._save()
                    latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                    return {
                        "status": "success",
                        "source": "z2m_native",
                        "entity_id": entity_clean,
                        "state": st_str,
                        "protocol": "zigbee2mqtt",
                        "driver": "z2m_lighting_engine",
                        "hardware_ack": True,
                        "latency_ms": latency_ms,
                    }
            except Exception as e:
                logger.debug(f"Fallback tras z2m_engine en direct_device_engine: {e}")

            # Resolver entidad por alias si no existe directamente en self._config["devices"]
            if entity_clean not in self._config["devices"]:
                try:
                    from app.services.device_mapping_service import device_mapping_service
                    resolved = device_mapping_service.find_entity_by_alias(entity_clean)
                    if resolved:
                        entity_clean = resolved
                except Exception:
                    pass

            # Si no existe aún en el registro directo, lo creamos al vuelo para no fallar nunca
            if entity_clean not in self._config["devices"]:
                domain = entity_clean.split(".")[0]
                self._config["devices"][entity_clean] = {
                    "entity_id": entity_clean,
                    "name": entity_clean.split(".")[-1].replace("_", " ").title(),
                    "protocol": "tuya_local",
                    "domain": domain,
                    "state": "open" if domain == "cover" else "off",
                    "current_position": 100 if domain == "cover" else None,
                    "dps": 1,
                    "channel": 0,
                    "room": "general",
                    "watts": 15,
                    "ip": "",
                    "device_id": "",
                    "local_key": "",
                    "mqtt_topic": ""
                }

            dev = self._config["devices"][entity_clean]
            domain = dev.get("domain") or entity_clean.split(".")[0]
            current_state = dev.get("state", "off")

            # Calcular nuevo estado
            if domain == "cover":
                if position is not None or any(k in action_lower for k in ("position", "set_cover_position")):
                    pos_val = max(0, min(100, int(position if position is not None else 100)))
                    dev["current_position"] = pos_val
                    target_state = "open" if pos_val > 0 else "closed"
                elif any(k in action_lower for k in ("close", "cerrar", "bajar", "off", "turn_off")):
                    pos_val = 0
                    dev["current_position"] = 0
                    target_state = "closed"
                elif any(k in action_lower for k in ("stop", "parar", "detener")):
                    pos_val = dev.get("current_position", 50)
                    target_state = "open" if pos_val > 0 else "closed"
                elif action_lower in ("toggle", "alternar"):
                    is_currently_open = current_state == "open" and dev.get("current_position", 100) > 0
                    pos_val = 0 if is_currently_open else 100
                    dev["current_position"] = pos_val
                    target_state = "closed" if is_currently_open else "open"
                else:
                    pos_val = 100
                    dev["current_position"] = 100
                    target_state = "open"
            else:
                pos_val = None
                if brightness is not None or brightness_pct is not None or color_temp_kelvin is not None or color_temp is not None or rgb_color is not None:
                    target_state = "on"
                elif action_lower in ("toggle", "alternar"):
                    target_state = "off" if current_state == "on" else "on"
                elif any(k in action_lower for k in ("off", "apagar", "close", "cerrar", "desactivar")):
                    target_state = "off"
                else:
                    target_state = "on"

                attrs = dev.setdefault("attributes", {})
                if brightness_pct is not None:
                    attrs["brightness"] = int(max(0, min(100, int(brightness_pct))) * 2.55)
                elif brightness is not None:
                    attrs["brightness"] = max(0, min(255, int(brightness)))
                if color_temp_kelvin is not None:
                    attrs["color_temp_kelvin"] = int(color_temp_kelvin)
                elif color_temp is not None:
                    attrs["color_temp"] = int(color_temp)
                if rgb_color is not None:
                    attrs["rgb_color"] = rgb_color

            # Ejecutar driver físico según protocolo
            protocol = dev.get("protocol", "tuya_local")
            if protocol == "tuya_local" and not (dev.get("ip") and dev.get("device_id") and dev.get("local_key")):
                # Si no tiene IP de Tuya WiFi configurada, es un interruptor/dispositivo conectado a Zigbee2MQTT
                driver_info = self._control_mqtt(dev, target_state, pos_val)
            elif protocol == "tuya_local":
                driver_info = self._control_tuya_local(dev, target_state, pos_val)
            elif protocol in ("zigbee_mqtt", "zigbee2mqtt"):
                driver_info = self._control_mqtt(dev, target_state, pos_val)
            elif protocol in ("shelly_http", "tasmota_http", "esphome_http"):
                driver_info = self._control_http_rest(dev, target_state, pos_val)
            elif protocol == "matter":
                driver_info = self._control_matter(dev, target_state, pos_val)
            else:
                driver_info = {"driver": "direct_memory_bus", "hardware_ack": False}

            dev["state"] = target_state
            dev["_last_direct_ts"] = time.time()
            try:
                from app.services.automation_service import automation_service
                automation_service.notify_device_state_change(
                    device_name=dev.get("name") or entity_clean,
                    new_state=target_state,
                    details=f"Control {protocol}",
                    room=dev.get("room", "")
                )
            except Exception:
                pass

            # Sincronizar en memoria y en hardware broker MQTT las conmutadas hermanas
            try:
                self.sync_conmutadas_hardware(entity_clean, target_state)
            except Exception as e:
                logger.error(f"Error sincronizando conmutadas tras control directo: {e}")

            self._save()

            latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            return {
                "status": "success",
                "source": "direct",
                "entity_id": entity_clean,
                "state": target_state,
                "current_position": dev.get("current_position"),
                "protocol": protocol,
                "driver": driver_info.get("driver", "direct"),
                "hardware_ack": driver_info.get("hardware_ack", False),
                "latency_ms": latency_ms
            }

    def get_camera_snapshot(self, camera_entity_id: str) -> bytes:
        with self._lock:
            dev = self._config["devices"].get(camera_entity_id, {})
        snapshot_url = dev.get("snapshot_url") or ""
        rtsp_url = dev.get("rtsp_url") or ""
        ip = dev.get("ip") or ""

        if snapshot_url:
            try:
                r = requests.get(snapshot_url, timeout=3)
                if r.status_code == 200:
                    return r.content
            except Exception as e:
                logger.debug(f"Snapshot HTTP directo falló ({snapshot_url}): {e}")

        if ip and not rtsp_url:
            try:
                r = requests.get(f"http://{ip}/snapshot.jpg", timeout=2)
                if r.status_code == 200:
                    return r.content
            except Exception:
                pass

        if rtsp_url:
            try:
                import cv2  # type: ignore
                cap = cv2.VideoCapture(rtsp_url)
                ret, frame = cap.read()
                cap.release()
                if ret:
                    ok, buf = cv2.imencode(".jpg", frame)
                    if ok:
                        return buf.tobytes()
            except Exception as e:
                logger.debug(f"Captura RTSP directa falló ({rtsp_url}): {e}")

        return b""

    def scan_local_devices(self) -> List[Dict[str, Any]]:
        """
        Escanea la tabla ARP de la red local y sondea puertos domóticos comunes en paralelo:
        - 6668: Tuya Local TCP
        - 80: Shelly / Tasmota / ESPHome HTTP
        - 1883: Broker MQTT (Zigbee2MQTT / Mosquitto)
        - 554: Cámara IP RTSP
        - 8123: Home Assistant
        """
        candidates: List[Dict[str, str]] = []
        try:
            res = subprocess.run("arp -a", shell=True, capture_output=True, text=True, timeout=4)
            seen_ips = set()
            for line in res.stdout.splitlines():
                parts = line.split()
                if len(parts) >= 2 and parts[0].count(".") == 3:
                    ip = parts[0]
                    if ip.startswith(("224.", "239.", "255.")) or ip.endswith(".255") or ip in seen_ips:
                        continue
                    seen_ips.add(ip)
                    candidates.append({"ip": ip, "mac": parts[1]})
        except Exception as e:
            logger.error(f"Error ejecutando arp -a en scan_local_devices: {e}")

        ports_map = {
            6668: ("tuya_local", "Tuya Smart Device (TCP 6668)"),
            1883: ("zigbee_mqtt", "MQTT Broker / Zigbee2MQTT (1883)"),
            80: ("shelly_http", "Shelly / Tasmota / Web HTTP (80)"),
            554: ("rtsp_camera", "Cámara IP RTSP (554)"),
            8123: ("home_assistant", "Home Assistant Core (8123)")
        }

        discovered: List[Dict[str, Any]] = []

        def _probe_host(entry: Dict[str, str]):
            ip = entry["ip"]
            mac = entry["mac"]
            found_for_ip = []
            for port, (proto, label) in ports_map.items():
                try:
                    with socket.create_connection((ip, port), timeout=0.4):
                        found_for_ip.append({
                            "ip": ip,
                            "mac": mac,
                            "port": port,
                            "protocol": proto,
                            "description": label
                        })
                except Exception:
                    pass
            return found_for_ip

        if candidates:
            with concurrent.futures.ThreadPoolExecutor(max_workers=24) as executor:
                futures = [executor.submit(_probe_host, c) for c in candidates[:60]]
                for fut in concurrent.futures.as_completed(futures):
                    try:
                        res_list = fut.result()
                        if res_list:
                            discovered.extend(res_list)
                    except Exception:
                        pass

        return discovered



    def _resolve_mqtt_topic_and_endpoint(self, entity_id: str, custom_topic: Optional[str] = None):
        """
        Resuelve de forma robusta el topic Z2M (friendly_name) y el endpoint key ('state', 'state_left', 'state_l1', etc.)
        para cualquier entidad, soportando nombres Tuya HA y nombres nativos de Zigbee2MQTT.
        """
        target_eid = entity_id
        try:
            from app.services.light_programmer_service import light_programmer_service
            canon = light_programmer_service.get_canonical_id(entity_id)
            aliases = light_programmer_service.get_aliases_for(canon)
            # Buscar si alguno de los alias o canon es un nombre de placa nativo
            for candidate in [entity_id, canon] + aliases:
                raw = candidate.split(".")[-1]
                for g in ["left", "center", "right", "l1", "l2", "l3", "l4"]:
                    if raw.endswith(f"_{g}"):
                        fn = raw[:-len(g)-1]
                        return f"zigbee2mqtt/{fn}", f"state_{g}"
        except Exception:
            pass

        raw_name = target_eid.split(".")[-1]
        endpoint_key = "state"
        clean_fn = raw_name
        for g in ["left", "center", "right", "l1", "l2", "l3", "l4"]:
            if raw_name.endswith(f"_{g}"):
                clean_fn = raw_name[:-len(g)-1]
                endpoint_key = f"state_{g}"
                break

        topic = (custom_topic or f"zigbee2mqtt/{clean_fn}").strip()
        return topic, endpoint_key

    def sync_conmutadas_hardware(self, source_entity_id: str, target_state: str, exclude_eids: Optional[Set[str]] = None):
        """
        Propaga el cambio de estado (ON/OFF) a nivel de broker MQTT / hardware a todas
        las placas y conmutadas hermanas vinculadas a source_entity_id.
        """
        try:
            from app.services.device_mapping_service import device_mapping_service
            cluster = device_mapping_service.get_conmutadas_cluster(source_entity_id)
            all_sibs = cluster.get("all_entities", [])
            target_st_upper = "ON" if target_state in ("on", "open") else "OFF"
            target_st_lower = "on" if target_state in ("on", "open") else "off"

            now = time.time()
            if exclude_eids is None:
                exclude_eids = set()
            exclude_eids.add(source_entity_id)

            # Evitar bucles de retroalimentación
            if not hasattr(self, "_hardware_sync_lock"):
                self._hardware_sync_lock = {}

            # Agrupar comandos por topic Z2M para enviar un único payload si pertenecen a la misma placa
            topic_payloads: Dict[str, Dict[str, Any]] = {}

            for sib in all_sibs:
                if sib in exclude_eids:
                    continue

                # Evitar bucles de retroalimentación si ya fue sincronizado hace < 1.0s
                last_t = self._hardware_sync_lock.get(sib, 0)
                if now - last_t < 1.0:
                    continue
                self._hardware_sync_lock[sib] = now

                # Actualizar estado en memoria direct_device_engine si existe
                if sib in self._config["devices"]:
                    s_dev = self._config["devices"][sib]
                    s_dev["state"] = target_st_lower
                    s_dev["_last_direct_ts"] = now

                # Resolver topic y endpoint
                sib_dev = self._config["devices"].get(sib, {})
                topic, endpoint_key = self._resolve_mqtt_topic_and_endpoint(sib, sib_dev.get("mqtt_topic"))
                set_topic = topic if topic.endswith("/set") else f"{topic}/set"

                # Si es una tira LED o dimmer, enviar 'state'
                if sib.startswith("light.") and ("led" in sib or "dimmer" in sib):
                    endpoint_key = "state"

                payload_dict = topic_payloads.setdefault(set_topic, {})
                payload_dict[endpoint_key] = target_st_upper

            # Publicar a Zigbee2MQTT
            if topic_payloads:
                broker = self._config.get("mqtt_broker", {})
                host = (broker.get("host") or "127.0.0.1").strip()
                port = int(broker.get("port") or 1883)
                try:
                    import paho.mqtt.publish as publish
                    for set_topic, p_dict in topic_payloads.items():
                        publish.single(set_topic, payload=json.dumps(p_dict), hostname=host, port=port)
                        logger.info(f"⚡ [Conmutadas Direct Sync] Publicado a {set_topic}: {p_dict}")
                except Exception as e:
                    logger.error(f"Error publicando sincronización de conmutadas: {e}")

        except Exception as e:
            logger.error(f"Error en sync_conmutadas_hardware para {source_entity_id}: {e}")

    def start_mqtt_conmutadas_listener(self):
        """
        DESACTIVADO: El ÚNICO listener MQTT activo en HABANA 10 es z2m_lighting_engine.py.
        z2m_engine gestiona nativamente la sincronización de conmutadas, pulsaciones físicas
        y secuencias dimming directamente sin listeners paralelos.
        """
        logger.info("ℹ️ [Conmutadas Engine] start_mqtt_conmutadas_listener() omitido: z2m_engine es el listener único.")
        self._mqtt_listener_running = False

    def _handle_physical_hardware_press(self, entity_id: str, new_state: str):
        now = time.time()
        last_t = self._listener_debounce.get(entity_id, 0)
        # Debounce de 0.4s para evitar ráfagas duplicadas del mismo reporte
        if now - last_t < 0.4:
            return
        self._listener_debounce[entity_id] = now

        # Verificar si este reporte fue originado por un comando emitido recientemente por Habana
        last_sync = getattr(self, "_hardware_sync_lock", {}).get(entity_id, 0)
        if now - last_sync < 1.2:
            return

        logger.info(f"⚡ [Pulsación Física Z2M Detectada] {entity_id} -> {new_state}")
        # Disparar propagación atómica a todos los hermanos conmutados
        self.sync_conmutadas_hardware(entity_id, new_state)


direct_device_engine = DirectDeviceEngine()
