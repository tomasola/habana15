import os
import json
import logging
import threading
import time
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger("SensorService")

CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "sensors.json"
WATCHDOG_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "sensors_watchdog.json"


class SensorService:
    def __init__(self):
        self._lock = threading.RLock()
        self._sensors: Dict[str, Dict[str, Any]] = {}
        self.watchdog_timeout_hours: float = 3.0  # Límite para considerar sensor offline
        self.watchdog_ping_hours: float = 2.0     # Intervalo de solicitud activa de batería
        self._last_active_ping_time: float = 0.0
        self.load_config()
        self.load_watchdog_config()
        self._watchdog_thread = threading.Thread(target=self._watchdog_loop, daemon=True)
        self._watchdog_thread.start()

    def load_watchdog_config(self):
        if WATCHDOG_CONFIG_PATH.exists():
            try:
                with open(WATCHDOG_CONFIG_PATH, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    self.watchdog_timeout_hours = float(cfg.get("timeout_hours", 3.0))
                    self.watchdog_ping_hours = float(cfg.get("ping_hours", 2.0))
            except Exception as e:
                logger.error(f"Error cargando watchdog config: {e}")

    def save_watchdog_config(self):
        try:
            WATCHDOG_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(WATCHDOG_CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump({
                    "timeout_hours": self.watchdog_timeout_hours,
                    "ping_hours": self.watchdog_ping_hours
                }, f, indent=2)
        except Exception as e:
            logger.error(f"Error guardando watchdog config: {e}")

    def _enrich_sensor_health(self, sensor: Dict[str, Any]) -> Dict[str, Any]:
        s = dict(sensor)
        last_up = s.get("last_updated")
        is_online = True
        offline_hours = 0.0

        is_battery = s.get("protocol") == "zigbee2mqtt" and (
            s.get("battery") is not None or 
            s.get("category") in ("plant", "contact", "water", "smoke_gas")
        )

        if last_up and s.get("installed", False):
            try:
                from datetime import datetime
                last_dt = datetime.strptime(last_up, "%Y-%m-%d %H:%M:%S")
                diff_sec = (datetime.now() - last_dt).total_seconds()
                offline_hours = round(max(0.0, diff_sec / 3600.0), 1)
                if is_battery and offline_hours > self.watchdog_timeout_hours:
                    is_online = False
            except Exception:
                pass

        s["is_online"] = is_online
        s["offline_hours"] = offline_hours
        s["is_battery_powered"] = is_battery
        if not is_online:
            s["offline_warning"] = f"⚠️ Sin señal / Batería agotada ({offline_hours}h sin reporte)"
        return s

    def _watchdog_loop(self):
        time.sleep(10)
        while True:
            try:
                now = time.time()
                if now - self._last_active_ping_time >= (self.watchdog_ping_hours * 3600):
                    self.ping_all_battery_sensors()
                    self._last_active_ping_time = now
            except Exception as e:
                logger.debug(f"[Watchdog loop error] {e}")
            time.sleep(60)

    def ping_all_battery_sensors(self) -> int:
        """Envía /get por MQTT a todos los sensores a pilas para solicitar actualización de batería."""
        sent_count = 0
        try:
            from app.services.z2m_lighting_engine import z2m_engine
        except Exception:
            return 0

        with self._lock:
            for s_id, s in self._sensors.items():
                if not s.get("installed", False):
                    continue
                is_battery = s.get("protocol") == "zigbee2mqtt" and (
                    s.get("battery") is not None or 
                    s.get("category") in ("plant", "contact", "water", "smoke_gas")
                )
                if is_battery:
                    dev_target = s.get("friendly_name") or s.get("ieee") or s_id
                    try:
                        z2m_engine.publish_z2m(f"{dev_target}/get", {"battery": ""}, mark_echo=False)
                        if s.get("category") == "plant":
                            z2m_engine.publish_z2m(f"{dev_target}/get", {"soil_moisture": ""}, mark_echo=False)
                        sent_count += 1
                        logger.info(f"Watchdog: Petición de telemetría de batería enviada a '{dev_target}'")
                    except Exception as err:
                        logger.debug(f"Error enviando ping a {dev_target}: {err}")
        return sent_count

    def load_config(self):
        with self._lock:
            if CONFIG_PATH.exists():
                try:
                    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                        self._sensors = json.load(f)
                except Exception as e:
                    logger.error(f"Error cargando {CONFIG_PATH}: {e}")
                    self._sensors = {}
            else:
                self._sensors = {}

    def save_config(self):
        with self._lock:
            try:
                CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
                with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                    json.dump(self._sensors, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.error(f"Error guardando {CONFIG_PATH}: {e}")

    def list_sensors(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            sensors_list = [self._enrich_sensor_health(s) for s in self._sensors.values()]
            if category and category != "all":
                sensors_list = [s for s in sensors_list if s.get("category") == category]
            return sensors_list

    def get_summary_stats(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self._sensors)
            by_category = {}
            water_alerts = 0
            power_voltage = 230.0
            power_status = "ESTABLE"
            presence_count = 0
            installed_count = 0
            future_count = 0

            for s in self._sensors.values():
                if s.get("installed", False):
                    installed_count += 1
                else:
                    future_count += 1
                cat = s.get("category", "other")
                by_category[cat] = by_category.get(cat, 0) + 1
                if cat == "water" and s.get("state") == "leak":
                    water_alerts += 1
                if cat == "power" and "voltage_v" in s.get("attributes", {}):
                    power_voltage = s["attributes"]["voltage_v"]
                    power_status = s["attributes"].get("supply_status", "ESTABLE")
                if cat == "presence" and s.get("state") == "on":
                    presence_count += 1

            offline_count = sum(1 for s in self._sensors.values() if s.get("installed") and not self._enrich_sensor_health(s).get("is_online", True))
            return {
                "total_sensors": total,
                "installed_count": installed_count,
                "future_count": future_count,
                "offline_count": offline_count,
                "categories": by_category,
                "water_alerts": water_alerts,
                "mains_voltage": power_voltage,
                "power_status": power_status,
                "active_presence_count": presence_count,
                "watchdog_timeout_hours": self.watchdog_timeout_hours,
                "watchdog_ping_hours": self.watchdog_ping_hours
            }

    def get_sensor(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            s = self._sensors.get(sensor_id)
            return self._enrich_sensor_health(s) if s else None

    def upsert_sensor(self, sensor_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            ieee = data.get("ieee")
            if ieee:
                ieee_lower = str(ieee).strip().lower()
                to_delete = [
                    sid for sid, s in self._sensors.items()
                    if sid != sensor_id and (
                        str(s.get("ieee", "")).strip().lower() == ieee_lower or
                        sid.strip().lower() == ieee_lower or
                        sid.strip().lower() == f"sensor_{ieee_lower}"
                    )
                ]
                for old_sid in to_delete:
                    logger.info(f"Deduplicando sensor: eliminando duplicado {old_sid} en favor de {sensor_id}")
                    del self._sensors[old_sid]

            if sensor_id not in self._sensors:
                self._sensors[sensor_id] = {"id": sensor_id}
            if "attributes" in data and isinstance(data["attributes"], dict):
                existing_attrs = dict(self._sensors[sensor_id].get("attributes") or {})
                existing_attrs.update(data["attributes"])
                data["attributes"] = existing_attrs
            self._sensors[sensor_id].update(data)
            self._sensors[sensor_id]["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
            self.save_config()
            return self._sensors[sensor_id]

    def delete_sensor(self, sensor_id: str) -> bool:
        with self._lock:
            if sensor_id in self._sensors:
                del self._sensors[sensor_id]
                self.save_config()
                return True
            return False

    def update_reading(self, sensor_id: str, value: Any, state: str, attributes: Optional[Dict[str, Any]] = None):
        with self._lock:
            sensor = self._sensors.get(sensor_id)
            if not sensor:
                return None
            sensor["value"] = str(value)
            sensor["state"] = state
            sensor["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
            if attributes:
                if "attributes" not in sensor:
                    sensor["attributes"] = {}
                sensor["attributes"].update(attributes)
            self.save_config()

        # Disparar automatizaciones asociadas si hay cambio
        try:
            from app.services.automation_service import automation_service
            automation_service.handle_sensor_trigger(sensor_id, state)
        except Exception as e:
            logger.debug(f"Trigger de automatización omitido: {e}")

        return sensor

    def simulate_event(self, sensor_id: str, event_type: str) -> Dict[str, Any]:
        """Simula una condición extrema o lectura para pruebas inmediatas."""
        with self._lock:
            sensor = self._sensors.get(sensor_id)
            if not sensor:
                return {"error": f"Sensor {sensor_id} no encontrado"}

            cat = sensor.get("category")
            if cat == "water":
                if event_type == "leak":
                    sensor["state"] = "leak"
                    sensor["value"] = "¡FUGA DETECTADA!"
                    sensor["attributes"]["water_leak"] = True
                    sensor["attributes"]["alarm"] = True
                else:
                    sensor["state"] = "dry"
                    sensor["value"] = "Seco (Sin Fuga)"
                    sensor["attributes"]["water_leak"] = False
                    sensor["attributes"]["alarm"] = False

            elif cat == "presence":
                if event_type == "presence_on":
                    sensor["state"] = "on"
                    sensor["value"] = "Presencia Detectada"
                else:
                    sensor["state"] = "off"
                    sensor["value"] = "Despejado"
            elif cat == "climate":
                sensor["state"] = event_type
                sensor["value"] = f"22.5°C · 55% Hum ({event_type})"
                sensor["attributes"]["temperature"] = 22.5
                sensor["attributes"]["humidity"] = 55
            elif cat == "button":
                sensor["state"] = event_type
                sensor["value"] = f"Pulsación: {event_type}"
                sensor["attributes"]["action"] = event_type
                sensor["attributes"]["last_action"] = event_type

            elif cat == "power":
                if event_type == "voltage_drop":
                    sensor["state"] = "warning"
                    sensor["value"] = "192.4 V"
                    sensor["attributes"]["voltage_v"] = 192.4
                    sensor["attributes"]["supply_status"] = "CAIDA DE TENSION"
                else:
                    sensor["state"] = "normal"
                    sensor["value"] = "231.8 V"
                    sensor["attributes"]["voltage_v"] = 231.8
                    sensor["attributes"]["supply_status"] = "ESTABLE"

            elif cat == "air":
                if event_type == "high_co2":
                    sensor["state"] = "warning"
                    sensor["value"] = "1250 ppm"
                    sensor["attributes"]["co2_ppm"] = 1250
                    sensor["attributes"]["air_status"] = "VENTILACION RECOMENDADA"
                else:
                    sensor["state"] = "good"
                    sensor["value"] = "480 ppm"
                    sensor["attributes"]["co2_ppm"] = 480
                    sensor["attributes"]["air_status"] = "EXCELENTE"

            elif cat == "contact":
                if event_type == "open":
                    sensor["state"] = "open"
                    sensor["value"] = "Abierta"
                    sensor["attributes"]["contact"] = False
                else:
                    sensor["state"] = "closed"
                    sensor["value"] = "Cerrada"
                    sensor["attributes"]["contact"] = True

            sensor["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
            self.save_config()

        # Notificar al motor de automatizaciones
        try:
            from app.services.automation_service import automation_service
            automation_service.handle_sensor_trigger(sensor_id, sensor["state"])
        except Exception as e:
            logger.debug(f"Trigger omitido en simulación: {e}")

        return sensor



    def handle_z2m_message(self, device_identifier: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Procesa un mensaje MQTT entrante de un sensor Zigbee2MQTT y actualiza su telemetría y reglas."""
        if not isinstance(payload, dict):
            return None

        dev_norm = device_identifier.strip().lower().replace(" ", "_")
        matched_sensor_id = None

        with self._lock:
            for s_id, s in self._sensors.items():
                s_id_norm = s_id.lower()
                s_ieee = str(s.get("ieee", "")).lower()
                s_fn = str(s.get("friendly_name", "")).lower()
                if (dev_norm == s_id_norm or 
                    dev_norm == s_fn or 
                    (s_ieee and dev_norm == s_ieee) or 
                    (s_fn and s_fn.replace("_", "") == dev_norm.replace("_", ""))):
                    matched_sensor_id = s_id
                    break

        # Auto-descubrimiento si no existe pero envía payload típico de sensor Zigbee
        if not matched_sensor_id:
            is_sensor_payload = any(k in payload for k in (
                "occupancy", "presence", "motion", "contact", "water_leak", 
                "temperature", "humidity", "co2", "pm25", "smoke", "illuminance", "illuminance_lux",
                "soil_moisture"
            ))
            if is_sensor_payload:
                category = "presence"
                s_type = "pir"
                if "soil_moisture" in payload:
                    category = "plant"
                    s_type = "soil_sensor"
                elif "contact" in payload:
                    category = "contact"
                    s_type = "door_window"
                elif "water_leak" in payload:
                    category = "water"
                    s_type = "water_leak"
                elif "smoke" in payload:
                    category = "smoke_gas"
                    s_type = "smoke_detector"
                elif "temperature" in payload or "humidity" in payload:
                    category = "air"
                    s_type = "climate"
                elif "illuminance" in payload or "illuminance_lux" in payload:
                    category = "light_lux"
                    s_type = "illuminance"

                matched_sensor_id = f"sensor_{dev_norm}"
                self.upsert_sensor(matched_sensor_id, {
                    "name": device_identifier.replace("_", " ").title(),
                    "friendly_name": device_identifier,
                    "category": category,
                    "type": s_type,
                    "room": "general",
                    "protocol": "zigbee2mqtt",
                    "installed": True
                })

        if not matched_sensor_id:
            return None

        with self._lock:
            sensor = self._sensors.get(matched_sensor_id)
            if not sensor:
                return None
            cat = sensor.get('category', 'presence')
            if 'soil_moisture' in payload:
                cat = 'plant'
                sensor['category'] = 'plant'
                sensor['type'] = 'soil_sensor'
            elif cat != 'air' and ('co2' in payload or 'pm25' in payload or 'voc' in payload or 'formaldehyd' in payload) and 'contact' not in payload:
                cat = 'air'
                sensor['category'] = 'air'
                sensor['type'] = 'air_quality' 

        cat = sensor.get("category", "presence")
        new_state = sensor.get("state", "off")
        new_val = sensor.get("value", "Normal")
        attrs = dict(sensor.get("attributes") or {})
        attrs.update(payload)

        if "battery" in payload:
            sensor["battery"] = payload["battery"]
        if "linkquality" in payload:
            sensor["lqi"] = payload["linkquality"]

        if cat == "presence":
            occ = payload.get("occupancy") if payload.get("occupancy") is not None else payload.get("presence")
            if occ is not None:
                new_state = "on" if occ else "off"
                new_val = "Presencia Detectada" if occ else "Despejado"
        elif cat == "contact":
            cont = payload.get("contact")
            if cont is not None:
                new_state = "closed" if cont else "open"
                new_val = "Cerrada" if cont else "Abierta"
        elif cat == "water":
            leak = payload.get("water_leak")
            if leak is not None:
                new_state = "leak" if leak else "dry"
                new_val = "¡FUGA DETECTADA!" if leak else "Seco (Sin Fuga)"
        elif cat == "smoke_gas":
            smk = payload.get("smoke")
            if smk is not None:
                new_state = "alarm" if smk else "clear"
                new_val = "¡HUMO DETECTADO!" if smk else "Despejado"
        elif cat == "air":
            if "co2" in payload:
                co2_val = payload["co2"]
                new_val = f"{co2_val} ppm"
                new_state = "warning" if co2_val > 1000 else "good"
            elif "pm25" in payload:
                pm_val = payload["pm25"]
                new_val = f"{pm_val} µg/m³"
                new_state = "warning" if pm_val > 50 else "good"
            elif "temperature" in payload:
                new_val = f"{payload['temperature']} °C"
                new_state = "normal"
        elif cat == "plant":
            moist = payload.get("soil_moisture")
            if moist is None:
                moist = attrs.get("soil_moisture", 0)
            else:
                attrs["soil_moisture"] = moist
            temp = payload.get("temperature")
            if temp is None:
                temp = attrs.get("temperature", "--")
            else:
                attrs["temperature"] = temp
            new_val = f"{moist}% humedad | {temp}°C"
            try:
                m_num = float(moist)
                if m_num < 15:
                    new_state = "dry"
                elif m_num > 65:
                    new_state = "wet"
                else:
                    new_state = "optimal"
            except (ValueError, TypeError):
                new_state = sensor.get("state", "dry")
        elif cat in ("climate", "temperature", "temp_humidity") or ("temperature" in payload and "humidity" in payload and cat not in ("plant", "contact", "water")):
            temp = payload.get("temperature", attrs.get("temperature"))
            hum = payload.get("humidity", attrs.get("humidity"))
            if temp is not None and hum is not None:
                new_val = f"{temp}°C · {hum}% Hum"
            elif temp is not None:
                new_val = f"{temp} °C"
            elif hum is not None:
                new_val = f"{hum} % Hum"

            if temp is not None:
                try:
                    t_num = float(temp)
                    if t_num < 18:
                        new_state = "cold"
                    elif t_num > 28:
                        new_state = "hot"
                    else:
                        new_state = "optimal"
                except (ValueError, TypeError):
                    new_state = "optimal"
        elif cat == "light_lux":
            lux = payload.get("illuminance_lux", payload.get("illuminance"))
            if lux is not None:
                new_val = f"{lux} lux"
                new_state = "daylight" if lux > 50 else "dark"
        elif cat == "button" or "action" in payload:
            act = payload.get("action")
            if act:
                new_state = str(act)
                new_val = f"Pulsación: {act}"
                attrs["last_action"] = act

        sensor["installed"] = True
        return self.update_reading(matched_sensor_id, new_val, new_state, attrs)


sensor_service = SensorService()
