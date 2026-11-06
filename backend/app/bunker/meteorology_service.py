import os
import json
import time
import threading
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("BunkerMeteorologyService")

DEFAULT_COVERS_CALIBRATION: Dict[str, Dict[str, Any]] = {
    "cover.persiana_principal": {
        "time_up": 22.0,
        "time_down": 17.0,
        "motor_reversal": False
    },
    "cover.persiana_salon": {
        "time_up": 22.0,
        "time_down": 17.0,
        "motor_reversal": True
    },
    "cover.persiana_salon_puerta": {
        "time_up": 30.0,
        "time_down": 23.0,
        "motor_reversal": True
    },
    "cover.persiana_andrea": {
        "time_up": 22.0,
        "time_down": 17.0,
        "motor_reversal": False
    }
}

class BunkerMeteorologyService:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent.parent.parent
        self.config_dir = self.base_dir / "backend" / "config"
        self.config_file = self.config_dir / "bunker_climate_config.json"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.climate_config = self._load_climate_config()

        # Temporizadores de control preciso de recorrido
        self._active_timers: Dict[str, threading.Timer] = {}
        self._active_runs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def _load_climate_config(self) -> Dict[str, Any]:
        default_config = {
            "hvac": {
                "installed": False,
                "power": False,
                "mode": "cool", # cool, heat, fan_only, dry, eco
                "target_temperature": 22.0,
                "fan_speed": "auto",
                "eco_mode": True,
                "notes": "Módulo en preparación. Listo para vincular pasarela IR / Tuya / Daikin / Mitsubishi."
            },
            "covers_calibration": json.loads(json.dumps(DEFAULT_COVERS_CALIBRATION)),
            "automation_rules": [
                {
                    "id": "rule_heat_protection",
                    "name": "Protección Térmica (Verano)",
                    "enabled": False,
                    "condition": "Temp exterior > 26°C y sol directo",
                    "action": "Bajar persiana salón al 20% para aislar del calor"
                },
                {
                    "id": "rule_night_insulation",
                    "name": "Aislamiento Nocturno (Invierno)",
                    "enabled": True,
                    "condition": "A las 23:00 o Modo Buenas Noches",
                    "action": "Bajar todas las persianas al 0% para retener temperatura"
                },
                {
                    "id": "rule_morning_ventilation",
                    "name": "Ventilación Matinal",
                    "enabled": False,
                    "condition": "Apertura al 40% al amanecer si la calidad del aire lo requiere",
                    "action": "Subir persiana a media altura"
                }
            ]
        }

        if self.config_file.exists():
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    # Merge recursivo covers_calibration
                    saved_calib = data.get("covers_calibration", {})
                    for k, v in DEFAULT_COVERS_CALIBRATION.items():
                        if k not in saved_calib:
                            saved_calib[k] = v.copy()
                        else:
                            for prop in ("time_up", "time_down", "motor_reversal"):
                                if prop not in saved_calib[k]:
                                    saved_calib[k][prop] = v[prop]
                    data["covers_calibration"] = saved_calib
                    default_config.update(data)
            except Exception as e:
                logger.error(f"Error cargando bunker_climate_config.json: {e}")
        else:
            self._save_climate_config(default_config)

        return default_config

    def _save_climate_config(self, cfg: Optional[Dict[str, Any]] = None):
        if cfg:
            self.climate_config = cfg
        try:
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(self.climate_config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error guardando bunker_climate_config.json: {e}")

    # ===================================================
    # 1. TELEMETRÍA COMPLETA: SENSORES, CLIMA Y EXTERIOR
    # ===================================================
    def get_meteorology_overview(self) -> Dict[str, Any]:
        from app.services.sensor_service import sensor_service
        all_sensors = sensor_service.list_sensors()

        indoor_sensors = []
        outdoor_sensors = []

        for s in all_sensors:
            sid = s.get("id", "")
            cat = s.get("category", "")
            attrs = s.get("attributes") or {}

            if sid in ["sensor_temperatura", "sensor_de_calidad_de_aire"] or cat in ["climate", "air"]:
                temp_val = attrs.get("temperature")
                hum_val = attrs.get("humidity")
                indoor_sensors.append({
                    "id": sid,
                    "name": s.get("name"),
                    "room": s.get("room", "Hogar"),
                    "temperature": temp_val,
                    "humidity": hum_val,
                    "battery": s.get("battery", 100),
                    "lqi": s.get("lqi", 0),
                    "co2": attrs.get("co2"),
                    "voc": attrs.get("voc"),
                    "pm25": attrs.get("pm25"),
                    "state": s.get("state"),
                    "value_display": s.get("value"),
                    "last_updated": s.get("last_updated")
                })
            elif sid in ["sensor_frutal", "sensor_limonero"] or cat == "plant":
                outdoor_sensors.append({
                    "id": sid,
                    "name": s.get("name"),
                    "room": s.get("room", "Terraza Exterior"),
                    "temperature": attrs.get("temperature"),
                    "soil_moisture": attrs.get("soil_moisture"),
                    "battery": s.get("battery", attrs.get("battery", 100)),
                    "state": s.get("state"),
                    "last_updated": s.get("last_updated")
                })

        from app.bunker.information import bunker_information
        weather_external = bunker_information.get_weather()

        covers_data = self.get_covers_state()

        return {
            "status": "success",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "indoor_sensors": indoor_sensors,
            "outdoor_sensors": outdoor_sensors,
            "weather_external": weather_external,
            "covers": covers_data,
            "hvac": self.climate_config.get("hvac"),
            "automation_rules": self.climate_config.get("automation_rules", [])
        }

    # ===================================================
    # 2. GESTIÓN Y ESTADO DE LAS PERSIANAS (COVERS)
    # ===================================================
    def _get_z2m_device_name(self, cover_id: str) -> str:
        from app.services.z2m_lighting_engine import z2m_engine
        cov = z2m_engine._covers.get(cover_id)
        if cov and cov.get("z2m_device"):
            return cov["z2m_device"]
        return cover_id.replace("cover.", "")

    def get_covers_calibration(self) -> Dict[str, Any]:
        calibs = self.climate_config.get("covers_calibration", {})
        for k, v in DEFAULT_COVERS_CALIBRATION.items():
            if k not in calibs:
                calibs[k] = v.copy()
        return calibs

    def get_cover_calibration(self, cover_id: str) -> Dict[str, Any]:
        calibs = self.get_covers_calibration()
        return calibs.get(cover_id, DEFAULT_COVERS_CALIBRATION.get(cover_id, {
            "time_up": 22.0,
            "time_down": 17.0,
            "motor_reversal": False
        }))

    def update_cover_calibration(
        self,
        cover_id: str,
        time_up: float,
        time_down: float,
        motor_reversal: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Guarda los tiempos diferenciados de subida y bajada (en segundos),
        e instruye a Zigbee2MQTT con el tiempo de seguridad del hardware.
        """
        from app.services.z2m_lighting_engine import z2m_engine

        calibs = self.get_covers_calibration()
        cur = calibs.get(cover_id, {})
        cur["time_up"] = max(3.0, round(float(time_up), 1))
        cur["time_down"] = max(3.0, round(float(time_down), 1))
        if motor_reversal is not None:
            cur["motor_reversal"] = bool(motor_reversal)

        calibs[cover_id] = cur
        self.climate_config["covers_calibration"] = calibs
        self._save_climate_config()

        logger.info(f"⏱️ [Covers Timing] Calibración actualizada para {cover_id}: Subida={cur['time_up']}s, Bajada={cur['time_down']}s, Reversal={cur.get('motor_reversal')}")

        # Sincronizar parámetros en el hardware TuYa TS130F via Z2M si procede
        z2m_dev = self._get_z2m_device_name(cover_id)
        hw_calib = max(int(round(max(cur["time_up"], cur["time_down"]) + 20)), 120)

        payload: Dict[str, Any] = {"calibration_time": hw_calib}
        if "motor_reversal" in cur:
            payload["motor_reversal"] = "ON" if cur["motor_reversal"] else "OFF"

        try:
            z2m_engine.publish_z2m(z2m_dev, payload)
        except Exception as e:
            logger.warning(f"No se pudo sincronizar calibration_time con {z2m_dev}: {e}")

        return {
            "ok": True,
            "cover_id": cover_id,
            "calibration": cur,
            "hardware_calibration_time": hw_calib
        }

    def sync_cover_position(self, cover_id: str, position: int) -> Dict[str, Any]:
        """
        Fuerza la sincronización de la posición física (ej. al llegar al tope manual).
        """
        from app.services.z2m_lighting_engine import z2m_engine
        pos = max(0, min(100, int(position)))

        with self._lock:
            # Cancelar temporizadores activos
            if cover_id in self._active_timers:
                self._active_timers[cover_id].cancel()
                self._active_timers.pop(cover_id, None)
            self._active_runs.pop(cover_id, None)

        cov = z2m_engine._covers.get(cover_id)
        if cov:
            cov["position"] = pos
            cov["state"] = "open" if pos > 15 else "closed"

        z2m_dev = self._get_z2m_device_name(cover_id)
        if z2m_dev in z2m_engine._live_states:
            z2m_engine._live_states[z2m_dev]["position"] = pos
            z2m_engine._live_states[z2m_dev]["moving"] = "STOP"
            z2m_engine._live_states[z2m_dev]["state"] = "OPEN" if pos > 15 else "CLOSE"

        if z2m_dev:
            try:
                # Sincronizar en hardware TuYa TS130F el registro interno de posición y estado
                z2m_engine.publish_z2m(z2m_dev, {"position": pos, "state": "STOP"})
            except Exception as e:
                logger.warning(f"No se pudo enviar sync position a {z2m_dev}: {e}")

        logger.info(f"📍 [Covers Timing] Posición de {cover_id} sincronizada en Habana y hardware TuYa a {pos}%")
        return {"ok": True, "cover_id": cover_id, "position": pos}

    def get_covers_state(self) -> List[Dict[str, Any]]:
        from app.services.z2m_lighting_engine import z2m_engine
        raw_covers = z2m_engine._covers or {}
        calibs = self.get_covers_calibration()

        ROOM_LABELS = {
            "cover.persiana_principal": {"room": "Dormitorio Principal", "friendly_name": "Persiana Principal", "icon": "👑"},
            "cover.persiana_salon": {"room": "Salón (Ventana)", "friendly_name": "Persiana Salón", "icon": "🪟"},
            "cover.persiana_salon_puerta": {"room": "Salón (Puerta)", "friendly_name": "Persiana Salón Puerta", "icon": "🚪"},
            "cover.persiana_andrea": {"room": "Habitación Andrea", "friendly_name": "Persiana Andrea", "icon": "🛏️"}
        }

        covers_list = []
        for cid, info in raw_covers.items():
            pos = info.get("position", 100)
            meta = ROOM_LABELS.get(cid, {"room": "Habana", "friendly_name": info.get("name", cid), "icon": "🪟"})
            calib = calibs.get(cid, DEFAULT_COVERS_CALIBRATION.get(cid, {}))

            state_str = "OPEN" if pos > 85 else ("CLOSED" if pos < 15 else "PARTIAL")

            # Determinar si está en movimiento según run activo
            is_moving = False
            moving_dir = None
            if cid in self._active_runs:
                is_moving = True
                moving_dir = self._active_runs[cid].get("direction")

            covers_list.append({
                "id": cid,
                "entity_id": cid,
                "name": meta["friendly_name"],
                "room": meta["room"],
                "icon": meta["icon"],
                "position": pos,
                "state": state_str,
                "is_open": pos > 10,
                "is_moving": is_moving,
                "moving_dir": moving_dir,
                "time_up": float(calib.get("time_up", 22.0)),
                "time_down": float(calib.get("time_down", 17.0)),
                "motor_reversal": bool(calib.get("motor_reversal", False)),
                "z2m_device": info.get("z2m_device", cid)
            })

        return covers_list

    def _on_travel_finished(self, cover_id: str, target_pos: int):
        """Disparado cuando concluye el tiempo exacto del recorrido calculado."""
        from app.services.z2m_lighting_engine import z2m_engine
        try:
            logger.info(f"🏁 [Covers Timing] Fin de recorrido exacto para {cover_id} -> Enviando STOP a relé físico y fijando posición {target_pos}%")
            z2m_engine.control_habana_entity(cover_id, "stop")
            cov = z2m_engine._covers.get(cover_id)
            if cov:
                cov["position"] = target_pos
                cov["state"] = "open" if target_pos > 15 else "closed"

            z2m_dev = self._get_z2m_device_name(cover_id)
            if z2m_dev in z2m_engine._live_states:
                z2m_engine._live_states[z2m_dev]["position"] = target_pos
                z2m_engine._live_states[z2m_dev]["moving"] = "STOP"
                z2m_engine._live_states[z2m_dev]["state"] = "OPEN" if target_pos > 15 else "CLOSE"
        except Exception as e:
            logger.error(f"Error en _on_travel_finished para {cover_id}: {e}")
        finally:
            with self._lock:
                self._active_timers.pop(cover_id, None)
                self._active_runs.pop(cover_id, None)

    def control_cover(self, cover_id: str, action: str, position: Optional[int] = None) -> Dict[str, Any]:
        """
        Control de persiana con diferenciación milimétrica de velocidad de Subida vs Bajada.
        action: 'open' | 'close' | 'stop' | 'set_cover_position'
        """
        from app.services.z2m_lighting_engine import z2m_engine
        logger.info(f"[Búnker Clima] Orden persiana {cover_id}: acción={action}, pos={position}")

        act = action.lower()
        calib = self.get_cover_calibration(cover_id)
        time_up = float(calib.get("time_up", 22.0))
        time_down = float(calib.get("time_down", 17.0))

        # Posición actual reportada o guardada
        cov = z2m_engine._covers.get(cover_id, {})
        cur_pos = cov.get("position", 100)

        # Cancelar cualquier temporizador activo previo
        with self._lock:
            if cover_id in self._active_timers:
                self._active_timers[cover_id].cancel()
                self._active_timers.pop(cover_id, None)

            # Si estaba en movimiento y se envía otra orden o stop, interpolar posición
            if cover_id in self._active_runs:
                prev_run = self._active_runs.pop(cover_id, None)
                if prev_run:
                    elapsed = time.time() - prev_run["start_time"]
                    if prev_run["direction"] == "up":
                        pct_gained = (elapsed / time_up) * 100.0
                        cur_pos = min(100, int(prev_run["start_pos"] + pct_gained))
                    else:
                        pct_lost = (elapsed / time_down) * 100.0
                        cur_pos = max(0, int(prev_run["start_pos"] - pct_lost))
                    cov["position"] = cur_pos

        if act in ("measure_up", "medir_subir"):
            res = z2m_engine.control_habana_entity(cover_id, "open")
            t = threading.Timer(120.0, self._on_travel_finished, args=[cover_id, 100])
            t.daemon = True
            with self._lock:
                self._active_timers[cover_id] = t
                self._active_runs[cover_id] = {
                    "start_time": time.time(),
                    "start_pos": cur_pos,
                    "target": 100,
                    "direction": "up",
                    "duration": 120.0
                }
            t.start()

        elif act in ("measure_down", "medir_bajar"):
            res = z2m_engine.control_habana_entity(cover_id, "close")
            t = threading.Timer(120.0, self._on_travel_finished, args=[cover_id, 0])
            t.daemon = True
            with self._lock:
                self._active_timers[cover_id] = t
                self._active_runs[cover_id] = {
                    "start_time": time.time(),
                    "start_pos": cur_pos,
                    "target": 0,
                    "direction": "down",
                    "duration": 120.0
                }
            t.start()

        elif act in ("open", "subir"):
            target_pos = 100
            # Duración amplia de seguridad (+15s) para garantizar que NUNCA corte antes del tope mecánico físico
            duration = max(time_up + 15.0, 60.0)
            res = z2m_engine.control_habana_entity(cover_id, "open")

            t = threading.Timer(duration, self._on_travel_finished, args=[cover_id, 100])
            t.daemon = True
            with self._lock:
                self._active_timers[cover_id] = t
                self._active_runs[cover_id] = {
                    "start_time": time.time(),
                    "start_pos": cur_pos,
                    "target": 100,
                    "direction": "up",
                    "duration": duration
                }
            t.start()

        elif act in ("close", "bajar"):
            target_pos = 0
            # Duración amplia de seguridad (+15s) para garantizar que NUNCA corte antes del tope mecánico físico
            duration = max(time_down + 15.0, 60.0)
            res = z2m_engine.control_habana_entity(cover_id, "close")

            t = threading.Timer(duration, self._on_travel_finished, args=[cover_id, 0])
            t.daemon = True
            with self._lock:
                self._active_timers[cover_id] = t
                self._active_runs[cover_id] = {
                    "start_time": time.time(),
                    "start_pos": cur_pos,
                    "target": 0,
                    "direction": "down",
                    "duration": duration
                }
            t.start()

        elif act in ("stop", "parar"):
            res = z2m_engine.control_habana_entity(cover_id, "stop")
            cov["position"] = cur_pos
            cov["state"] = "open" if cur_pos > 15 else "closed"

        elif position is not None or act == "set_cover_position":
            target_pos = max(0, min(100, int(position if position is not None else 50)))

            if target_pos > cur_pos:
                pct = target_pos - cur_pos
                duration = (pct / 100.0) * time_up
                res = z2m_engine.control_habana_entity(cover_id, "open")
                direction = "up"
            elif target_pos < cur_pos:
                pct = cur_pos - target_pos
                duration = (pct / 100.0) * time_down
                res = z2m_engine.control_habana_entity(cover_id, "close")
                direction = "down"
            else:
                return {"ok": True, "cover_id": cover_id, "action": act, "position": target_pos, "result": "already_at_position"}

            t = threading.Timer(duration, self._on_travel_finished, args=[cover_id, target_pos])
            t.daemon = True
            with self._lock:
                self._active_timers[cover_id] = t
                self._active_runs[cover_id] = {
                    "start_time": time.time(),
                    "start_pos": cur_pos,
                    "target": target_pos,
                    "direction": direction,
                    "duration": duration
                }
            t.start()
        else:
            return {"ok": False, "error": f"Acción '{action}' no soportada"}

        # Auditoría en Gatekeeper
        try:
            from app.bunker.gatekeeper import bunker_gatekeeper
            bunker_gatekeeper._recent_executions_log.append({
                "widget_id": "meteorology_covers",
                "title": f"Persiana {cover_id}: {action} ({position or ''}%)",
                "timestamp": datetime.now().timestamp(),
                "status": "success"
            })
        except Exception:
            pass

        return {
            "ok": True,
            "cover_id": cover_id,
            "action": action,
            "position": position,
            "result": res
        }

    def control_all_covers(self, action: str, position: Optional[int] = None) -> Dict[str, Any]:
        """Control simultáneo de todas las persianas de la casa."""
        covers = self.get_covers_state()
        results = []
        for c in covers:
            r = self.control_cover(c["id"], action, position)
            results.append(r)
        return {
            "ok": True,
            "action": action,
            "total_controlled": len(results),
            "results": results
        }

    # ===================================================
    # 3. CONFIGURACIÓN HVAC (AIRE ACONDICIONADO)
    # ===================================================
    def update_hvac_settings(self, hvac_payload: Dict[str, Any]) -> Dict[str, Any]:
        cur_hvac = self.climate_config.get("hvac", {})
        cur_hvac.update(hvac_payload)
        self.climate_config["hvac"] = cur_hvac
        self._save_climate_config()
        logger.info(f"[Búnker Clima] Configuración HVAC actualizada: {cur_hvac}")
        return {
            "ok": True,
            "hvac": cur_hvac
        }

    def toggle_rule(self, rule_id: str, enabled: bool) -> Dict[str, Any]:
        rules = self.climate_config.get("automation_rules", [])
        for r in rules:
            if r.get("id") == rule_id:
                r["enabled"] = enabled
                break
        self.climate_config["automation_rules"] = rules
        self._save_climate_config()
        return {"ok": True, "rules": rules}

bunker_meteorology_service = BunkerMeteorologyService()
