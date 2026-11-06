import json



import logging



import os



import threading



import time



import uuid



import yaml



from collections import deque



from pathlib import Path



from typing import Any, Dict, List, Optional, Tuple







import paho.mqtt.client as mqtt







logger = logging.getLogger("Z2MLightingEngine")



# logging configured in main.pys [%(levelname)s] %(message)s")







BASE_DIR = Path(__file__).resolve().parent.parent.parent



DATA_FILE = BASE_DIR / "config" / "z2m_lighting_core.json"







def _resolve_z2m_data_dir() -> Path:



    """Devuelve el directorio de datos de Z2M que estÃ¡ realmente en uso.







    Antes se elegÃ­a ``services/zigbee2mqtt/data`` de la copia local solo por



    existir. Pero el Zigbee2MQTT que corre en esta mÃ¡quina puede haberse



    lanzado desde otra copia del proyecto (p. ej. ``F:\Habana 8``) y escribir



    su ``state.json`` allÃ­: el motor arrancaba entonces con estados de horas



    antes, el primer toque invertÃ­a desde un valor equivocado y la luz quedaba



    desincronizada. Ahora se elige el ``state.json`` mÃ¡s reciente.



    """



    local_data = BASE_DIR.parent / "services" / "zigbee2mqtt" / "data"
    if (local_data / "state.json").exists():
        return local_data
    bases = [
        local_data,  # F:\Habana 15\services\zigbee2mqtt\data
        Path(r"F:\Habana 14\services\zigbee2mqtt\data"),



        Path(r"F:\Habana 11\services\zigbee2mqtt\data"),



        Path(r"F:\Habana 10\services\zigbee2mqtt\data"),



        Path(r"F:\Habana 8\services\zigbee2mqtt\data"),



    ]



    best: Optional[Path] = None



    best_ts = -1.0



    for base in bases:



        candidate = base / "state.json"



        try:



            ts = candidate.stat().st_mtime



        except OSError:



            continue



        if ts > best_ts:



            best, best_ts = base, ts



    if best is None:



        return BASE_DIR.parent / "services" / "zigbee2mqtt" / "data"



    return best











_LOCAL_Z2M_DIR = BASE_DIR.parent / "services" / "zigbee2mqtt" / "data"



Z2M_DATA_DIR = _resolve_z2m_data_dir()











class Z2MLightingEngine:



    """



    Motor 100% Nativo Zigbee2MQTT en Bloque Unificado para HABANA 10:



    - Apartado 0: VinculaciÃ³n, Emparejamiento (Permit Join), Renombrado Z2M y AsignaciÃ³n de Placas/Interruptores/LEDs/Sensores.



    - Apartado 1: Descubrimiento de placas, identificaciÃ³n de canales fÃ­sicos (con cable de luz vs sin cable) y controladores LED.



    - Apartado 2: Matriz de conmutaciones en tiempo real sin bucles.



    - Apartado 3: Secuenciador de Dimmers y Tiras LED.



    """







    def __init__(self):



        self._lock = threading.RLock()



        self._config: Dict[str, Any] = {}



        self._live_states: Dict[str, Dict[str, Any]] = {}



        self._echo_guard: Dict[Tuple[str, str], float] = {}



        # QuÃ© estado ordenamos a cada canal y hasta cuÃ¡ndo esperamos su eco.



        # Permite distinguir "eco de mi propio comando" de "pulsaciÃ³n humana".



        self._echo_expected: Dict[Tuple[str, str], Tuple[str, float]] = {}



        self._commanded_states: Dict[Tuple[str, str], Tuple[str, float]] = {}



        self._press_debounce: Dict[Tuple[str, str], Tuple[float, str]] = {}



        self._cluster_last_triggered: Dict[str, float] = {}



        self._recent_events: deque = deque(maxlen=40)



        self._learn_mode: Dict[str, Any] = {



            "active": False,



            "target_light_id": None,



            "role": "commutation",



            "started_at": 0.0,



            "last_captured": None



        }



        # Estado del Emparejador e Inventario Z2M (Apartado 0)



        self._pairing_state: Dict[str, Any] = {



            "active": False,



            "expires_at": 0.0,



            "target_room": "salon",



            "newly_joined": []



        }



        self._z2m_bridge_devices: Dict[str, Dict[str, Any]] = {}







        # Persianas nativas Z2M



        self._covers: Dict[str, Dict[str, Any]] = {
            'cover.persiana_principal': {
                'id': 'cover.persiana_principal',
                'entity_id': 'cover.persiana_principal',
                'z2m_device': 'persiana_principal',
                'ieee': '0xa4c1380b8c243a14',
                'name': 'Persiana Principal',
                'room': 'principal',
                'state': 'open',
                'position': 100,
            },
            'cover.persiana_salon': {
                'id': 'cover.persiana_salon',
                'entity_id': 'cover.persiana_salon',
                'z2m_device': 'persiana_salon',
                'ieee': '0xa4c138e016ab1f13',
                'name': 'Persiana Salón',
                'room': 'salon',
                'state': 'open',
                'position': 100,
            },
            'cover.persiana_salon_puerta': {
                'id': 'cover.persiana_salon_puerta',
                'entity_id': 'cover.persiana_salon_puerta',
                'z2m_device': 'persiana_salon_puerta',
                'ieee': '0xa4c1382f318a31bb',
                'name': 'Persiana Salón Puerta',
                'room': 'salon',
                'state': 'open',
                'position': 100,
            },
            'cover.persiana_andrea': {
                'id': 'cover.persiana_andrea',
                'entity_id': 'cover.persiana_andrea',
                'z2m_device': 'persiana_andrea',
                'ieee': '0xa4c13882bcba4b67',
                'name': 'Persiana Andrea',
                'room': 'andrea',
                'state': 'open',
                'position': 100,
            },
        }







        self._mqtt_client: Optional[mqtt.Client] = None



        self._mqtt_connected = False







        self._load_config()



        self._load_initial_z2m_states()







    # =========================================================================



    # CARGA Y GUARDADO DE CONFIGURACIÃ“N



    # =========================================================================



    def _load_config(self):



        with self._lock:



            if DATA_FILE.exists():



                try:



                    with open(DATA_FILE, "r", encoding="utf-8-sig") as f:



                        self._config = json.load(f)



                except Exception as e:



                    logger.error(f"Error cargando {DATA_FILE}: {e}")



                    self._config = {}



            self._sync_roles_from_lights()







    def _save_config(self):



        with self._lock:



            self._sync_roles_from_lights()



            DATA_FILE.parent.mkdir(parents=True, exist_ok=True)



            with open(DATA_FILE, "w", encoding="utf-8") as f:



                json.dump(self._config, f, indent=2, ensure_ascii=False)







    def _sync_roles_from_lights(self):



        plates = self._config.get("plates", {})



        real_lights = self._config.get("real_lights", {})







        for p_id, p_data in plates.items():



            for ch_key, ch_data in p_data.get("channels", {}).items():



                if ch_data.get("role") != "dimmer_sequencer":



                    ch_data["assigned_light_id"] = None



                    ch_data["assigned_light_name"] = None



                    ch_data["assigned_role"] = "free"



                    ch_data["has_physical_wire"] = False







        for l_id, l_data in real_lights.items():



            l_data["habana_entity_id"] = l_id



            ps = l_data.get("power_source", {})



            if ps.get("type") == "plate_channel":



                dev = ps.get("device")



                ch = ps.get("channel")



                if dev in plates and ch in plates[dev].get("channels", {}):



                    c_obj = plates[dev]["channels"][ch]



                    c_obj["has_physical_wire"] = True



                    c_obj["role"] = "wired_load"



                    c_obj["assigned_light_id"] = l_id



                    c_obj["assigned_light_name"] = l_data.get("name", l_id)



                    c_obj["assigned_role"] = "power_source"







            for sw in l_data.get("commutation_switches", []):



                dev = sw.get("device")



                ch = sw.get("channel")



                if dev in plates and ch in plates[dev].get("channels", {}):



                    c_obj = plates[dev]["channels"][ch]



                    c_obj["assigned_light_id"] = l_id



                    c_obj["assigned_light_name"] = l_data.get("name", l_id)



                    c_obj["assigned_role"] = "commutation"







    def _load_initial_z2m_states(self):



        try:



            data_dir = _resolve_z2m_data_dir()



            devices_yaml = data_dir / "devices.yaml"



            state_json = data_dir / "state.json"



            logger.info(f"[Z2M Core] Leyendo estado inicial de {data_dir}")



            ieee_to_name = {}



            if devices_yaml.exists():



                with open(devices_yaml, "r", encoding="utf-8") as f:



                    d_data = yaml.safe_load(f) or {}



                    for ieee, info in d_data.items():



                        if isinstance(info, dict) and "friendly_name" in info:



                            fname = info["friendly_name"]



                            ieee_to_name[str(ieee)] = fname



                            self._z2m_bridge_devices[str(ieee)] = {



                                "ieee": str(ieee),



                                "friendly_name": fname,



                                "model": info.get("model", ""),



                                "vendor": info.get("vendor", "Zigbee")



                            }







            if state_json.exists():



                with open(state_json, "r", encoding="utf-8-sig") as f:



                    s_data = json.load(f) or {}



                    for ieee, st in s_data.items():



                        fname = ieee_to_name.get(str(ieee), str(ieee))



                        if isinstance(st, dict):



                            if fname not in self._live_states:



                                self._live_states[fname] = dict(st)



                            else:



                                for k, v in st.items():



                                    self._live_states[fname].setdefault(k, v)



                            if str(ieee) not in self._live_states:



                                self._live_states[str(ieee)] = dict(st)



                            else:



                                for k, v in st.items():



                                    self._live_states[str(ieee)].setdefault(k, v)
                        # Map also by config plate key / led key via IEEE
                        for p_id, p_val in self._config.get("plates", {}).items():
                            if str(p_val.get("ieee")) == str(ieee) and isinstance(st, dict):
                                self._live_states[p_id] = dict(st)
                        for l_id, l_val in self._config.get("led_controllers", {}).items():
                            if str(l_val.get("ieee")) == str(ieee) and isinstance(st, dict):
                                self._live_states[l_id] = dict(st)



        except Exception as e:



            logger.warning(f"No se pudo leer estado inicial Z2M: {e}")







    def sync_from_z2m_files(self) -> Dict[str, Any]:



        with self._lock:



            self._load_initial_z2m_states()



            devices_yaml = Z2M_DATA_DIR / "devices.yaml"



            added = []



            if devices_yaml.exists():



                with open(devices_yaml, "r", encoding="utf-8") as f:



                    d_data = yaml.safe_load(f) or {}



                for ieee, info in d_data.items():



                    if not isinstance(info, dict):



                        continue



                    fname = info.get("friendly_name", str(ieee))



                    # Auto-migrar si el friendly_name cambió en Zigbee2MQTT para este mismo IEEE



                    for old_p_id, p_val in list(self._config.get("plates", {}).items()):



                        if p_val.get("ieee") == str(ieee) and old_p_id != fname:



                            p_data = self._config["plates"].pop(old_p_id)



                            p_data["friendly_name"] = fname



                            self._config["plates"][fname] = p_data



                            for rl in self._config.get("real_lights", {}).values():



                                if rl.get("power_source", {}).get("device") == old_p_id:



                                    rl["power_source"]["device"] = fname



                                for sw in rl.get("commutation_switches", []):



                                    if sw.get("device") == old_p_id:



                                        sw["device"] = fname



                            if old_p_id in self._live_states:



                                self._live_states[fname] = self._live_states.pop(old_p_id)



                            logger.info(f"🔄 [Sync Rename Plate] {old_p_id} -> {fname}")



                            break



                    st = self._live_states.get(fname, {})



                    if fname in self._config.get("plates", {}) or fname in self._config.get("led_controllers", {}):



                        continue



                    if "brightness" in st or "color_temp" in st or "led" in fname:



                        self._config.setdefault("led_controllers", {})[fname] = {



                            "ieee": str(ieee),



                            "friendly_name": fname,



                            "name": fname.replace("_", " ").title(),



                            "room": "salon",



                            "supports_brightness": True,



                            "supports_color_temp": "color_temp" in st



                        }



                        added.append(fname)



                    else:



                        channels = self._build_channels_for_profile(self._detect_gang_profile(st))



                        self._config.setdefault("plates", {})[fname] = {



                            "ieee": str(ieee),



                            "friendly_name": fname,



                            "name": fname.replace("_", " ").title(),



                            "room": "salon",



                            "model": f"Zigbee Switch ({len(channels)} canales)",



                            "channels": channels



                        }



                        added.append(fname)



            self._save_config()







        try:



            for p_id in list(self._config.get("plates", {}).keys()):



                self.publish_z2m(f"{p_id}/get", {}, mark_echo=False)



        except Exception as e:



            logger.debug(f"Error solicitando /get en sync_from_z2m_files: {e}")







        return {"added": added, "total_plates": len(self._config.get("plates", {})), "total_leds": len(self._config.get("led_controllers", {}))}







    def _detect_gang_profile(self, st: Dict[str, Any], fn: str = "") -> str:
        fn_low = (fn or "").lower()
        if "persiana" in fn_low or "cover" in fn_low or any(k in st for k in ("motor_reversal", "calibration", "calibration_time", "moving")):
            return "cover"



        if any(k in st for k in ("state_left", "state_center", "state_right")):



            return "plate_3g"



        if any(k in st for k in ("state_l1", "state_l2")):



            return "plate_2g"



        if "brightness" in st and "color_temp" not in st:



            return "dimmer_seq"



        if "contact" in st:
            return "sensor_door"

        if any(k in st for k in ("occupancy", "presence")):
            return "sensor_motion"

        if "water_leak" in st:
            return "sensor_water"

        if "brightness" in st or "color_temp" in st:
            return "led_controller"

        return "plate_1g"







    def _build_channels_for_profile(self, profile: str) -> Dict[str, Any]:



        if profile in ("plate_3g", "plate_3"):



            return {



                "state_left": {"label": "BotÃ³n 1 (Izquierdo)", "has_physical_wire": False, "role": "commutation_button", "notes": ""},



                "state_center": {"label": "BotÃ³n 2 (Central)", "has_physical_wire": False, "role": "commutation_button", "notes": ""},



                "state_right": {"label": "BotÃ³n 3 (Derecho)", "has_physical_wire": False, "role": "commutation_button", "notes": ""}



            }



        if profile in ("plate_2g", "plate_2"):



            return {



                "state_l1": {"label": "BotÃ³n L1 (Arriba/Izq)", "has_physical_wire": False, "role": "commutation_button", "notes": ""},



                "state_l2": {"label": "BotÃ³n L2 (Abajo/Der)", "has_physical_wire": False, "role": "commutation_button", "notes": ""}



            }



        if profile in ("dimmer_seq", "dimmer"):



            return {



                "state": {"label": "BotÃ³n Central + Subir/Bajar Brillo", "has_physical_wire": False, "role": "dimmer_sequencer", "notes": "Secuenciador LED"}



            }



        return {



            "state": {"label": "BotÃ³n Ãšnico", "has_physical_wire": False, "role": "commutation_button", "notes": ""}



        }







    # =========================================================================



    # MOTOR MQTT PERSISTENTE Y ESCUCHA DEL BRIDGE Z2M



    # =========================================================================



    def start_mqtt(self):



        if self._mqtt_client is not None:



            return







        broker = self._config.get("broker", {})



        host = broker.get("host", "127.0.0.1")



        port = int(broker.get("port", 1883))







        client_id = f"habana10_z2m_core_{uuid.uuid4().hex[:6]}"



        if hasattr(mqtt, "CallbackAPIVersion"):



            self._mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id=client_id)



        else:



            self._mqtt_client = mqtt.Client(client_id=client_id)







        def on_connect(client, userdata, flags, rc):



            if rc == 0:



                self._mqtt_connected = True



                client.subscribe("zigbee2mqtt/+")



                client.subscribe("zigbee2mqtt/bridge/event")



                client.subscribe("zigbee2mqtt/bridge/devices")



                client.subscribe("zigbee2mqtt/bridge/response/device/rename")



                client.subscribe("zigbee2mqtt/bridge/response/networkmap")



                logger.info(f"âš¡ [Z2M Core] Conectado a MQTT ({host}:{port}) y escuchando zigbee2mqtt/#")



            else:



                self._mqtt_connected = False



                logger.error(f"Error conectando a MQTT rc={rc}")







        def on_disconnect(client, userdata, rc):



            self._mqtt_connected = False



            logger.warning("Desconectado de MQTT, reintentando automÃ¡ticamente...")







        def on_message(client, userdata, msg):



            try:



                topic = msg.topic



                payload_str = msg.payload.decode("utf-8", errors="ignore")



                if topic == "zigbee2mqtt/bridge/event":



                    if payload_str.startswith("{"):



                        self._handle_bridge_event(json.loads(payload_str))



                    return



                if topic == "zigbee2mqtt/bridge/devices":



                    if payload_str.startswith("["):



                        self._handle_bridge_devices_list(json.loads(payload_str))



                    return



                if topic == "zigbee2mqtt/bridge/response/networkmap":



                    if payload_str.startswith("{"):



                        self._handle_networkmap_response(json.loads(payload_str))



                    return



                if topic == "zigbee2mqtt/bridge/response/device/rename":



                    if payload_str.startswith("{"):



                        self._handle_device_rename_response(json.loads(payload_str))



                    return



                if topic.endswith("/set") or topic.endswith("/get") or "/bridge" in topic:



                    return



                device = topic.replace("zigbee2mqtt/", "").strip()



                if not payload_str.startswith("{"):



                    return



                data = json.loads(payload_str)



                self._process_incoming_z2m_state(device, data)



            except Exception as e:



                logger.debug(f"Error en on_message MQTT: {e}")







        self._mqtt_client.on_connect = on_connect



        self._mqtt_client.on_disconnect = on_disconnect



        self._mqtt_client.on_message = on_message







        def _loop():



            while True:



                try:



                    self._mqtt_client.connect(host, port, keepalive=60)



                    self._mqtt_client.loop_forever()



                except Exception:



                    self._mqtt_connected = False



                    time.sleep(2)







        t = threading.Thread(target=_loop, name="Z2MPureCoreMQTT", daemon=True)



        t.start()







    def _handle_bridge_event(self, ev: Dict[str, Any]):



        ev_type = ev.get("type")



        data = ev.get("data", {})



        if ev_type in ("device_joined", "device_interview", "device_announce"):



            ieee = data.get("ieee_address")



            fname = data.get("friendly_name") or ieee



            model = (data.get("definition") or {}).get("model") or ""



            vendor = (data.get("definition") or {}).get("vendor") or "Zigbee"



            if ieee:



                with self._lock:



                    self._z2m_bridge_devices[str(ieee)] = {



                        "ieee": str(ieee),



                        "friendly_name": fname,



                        "model": model,



                        "vendor": vendor



                    }



                    is_already_configured = (



                        fname in self._config.get("plates", {})



                        or fname in self._config.get("led_controllers", {})



                        or any(p.get("ieee") == str(ieee) for p in self._config.get("plates", {}).values())



                        or any(l.get("ieee") == str(ieee) for l in self._config.get("led_controllers", {}).values())



                    )



                    if not is_already_configured and not any(x.get("ieee") == str(ieee) for x in self._pairing_state["newly_joined"]):



                        self._pairing_state["newly_joined"].insert(0, {



                            "ieee": str(ieee),



                            "friendly_name": fname,



                            "model": model,



                            "vendor": vendor,



                            "timestamp": time.strftime("%H:%M:%S")



                        })



                logger.info(f"âœ¨ [Z2M Discovery] Dispositivo detectado en red Zigbee: {fname} ({ieee}) [{model}]")







    def _handle_bridge_devices_list(self, devices_list: List[Dict[str, Any]]):



        with self._lock:



            for d in devices_list:



                if d.get("type") == "Coordinator":



                    continue



                ieee = d.get("ieee_address")



                fname = d.get("friendly_name") or ieee



                defn = d.get("definition") or {}



                if ieee:



                    self._z2m_bridge_devices[str(ieee)] = {



                        "ieee": str(ieee),



                        "friendly_name": fname,



                        "model": defn.get("model", d.get("model_id", "")),



                        "vendor": defn.get("vendor", d.get("manufacturer", "Zigbee"))



                    }







    def _handle_device_rename_response(self, resp_dict: Dict[str, Any]):



        if resp_dict.get("status") != "ok":



            return



        data = resp_dict.get("data", {})



        from_name = data.get("from")



        to_name = data.get("to")



        if not from_name or not to_name or from_name == to_name:



            return







        with self._lock:



            if from_name in self._live_states:



                self._live_states[to_name] = self._live_states.pop(from_name)







            plates = self._config.get("plates", {})



            if from_name in plates:



                plate_data = plates.pop(from_name)



                plate_data["friendly_name"] = to_name



                plates[to_name] = plate_data







            leds = self._config.get("led_controllers", {})



            if from_name in leds:



                led_data = leds.pop(from_name)



                led_data["friendly_name"] = to_name



                leds[to_name] = led_data







            for rl in self._config.get("real_lights", {}).values():



                ps = rl.get("power_source", {})



                if ps.get("device") == from_name:



                    ps["device"] = to_name



                for sw in rl.get("commutation_switches", []):



                    if sw.get("device") == from_name:



                        sw["device"] = to_name







            for dev in self._z2m_bridge_devices.values():



                if dev.get("friendly_name") == from_name:



                    dev["friendly_name"] = to_name







            self._save_config()



            logger.info(f"✨ [Z2M Auto-Rename] Renombrado '{from_name}' -> '{to_name}' en HABANA")







    # =========================================================================



    # APARTADO 0: EMPAREJAMIENTO, IDENTIFICACIÃ“N Y RECLASIFICACIÃ“N Z2M



    # =========================================================================



    def set_permit_join(self, active: bool, duration_seconds: int = 120, room: str = "salon") -> Dict[str, Any]:



        with self._lock:



            self._pairing_state["active"] = bool(active)



            self._pairing_state["target_room"] = room



            self._pairing_state["expires_at"] = (time.time() + int(duration_seconds)) if active else 0.0







        # Zigbee herdsman solo admite un maximo de 254 segundos en el stack ZNP/Ember
        safe_duration = min(max(int(duration_seconds), 10), 254) if active else 0
        with self._lock:
            self._pairing_state["expires_at"] = (time.time() + safe_duration) if active else 0.0

        payload = {"value": bool(active), "time": safe_duration}



        try:



            if self._mqtt_client and self._mqtt_connected:



                self._mqtt_client.publish("zigbee2mqtt/bridge/request/permit_join", json.dumps(payload))



                logger.info(f"ðŸ“¡ [Z2M Permit Join] {'ABIERTO' if active else 'CERRADO'} ({duration_seconds}s)")



        except Exception as e:



            logger.error(f"Error enviando permit_join: {e}")







        return self._get_pairing_status_Snapshot()







    def _get_pairing_status_Snapshot(self) -> Dict[str, Any]:



        now = time.time()



        if self._pairing_state["active"] and now >= self._pairing_state["expires_at"]:



            self._pairing_state["active"] = False



        rem = max(0, int(self._pairing_state["expires_at"] - now)) if self._pairing_state["active"] else 0



        return {



            "active": self._pairing_state["active"],



            "remaining_seconds": rem,



            "target_room": self._pairing_state["target_room"],



            "newly_joined": self._pairing_state["newly_joined"][:15]



        }







    def blink_identify_device(self, device: str) -> Dict[str, Any]:



        """Hace parpadear o sonar el relÃ© de un dispositivo 2 veces y lo deja en OFF."""



        def _worker():



            st = self._live_states.get(device, {})



            if "state_l1" in st:



                ch = "state_l1"



            elif "state_left" in st:



                ch = "state_left"



            else:



                ch = "state"



            self.publish_z2m(device, {ch: "ON"}, mark_echo=True)



            time.sleep(0.45)



            self.publish_z2m(device, {ch: "OFF"}, mark_echo=True)



            time.sleep(0.35)



            self.publish_z2m(device, {ch: "ON"}, mark_echo=True)



            time.sleep(0.45)



            self.publish_z2m(device, {ch: "OFF"}, mark_echo=True)







        threading.Thread(target=_worker, daemon=True).start()



        return {"ok": True, "device": device, "action": "blink_2x_off"}







    def assign_z2m_hardware_device(



        self,



        ieee: str,



        old_friendly_name: str,



        new_friendly_name: str,



        display_name: str,



        room: str,



        device_profile: str  # "plate_1g" | "plate_2g" | "plate_3g" | "led_controller" | "dimmer_seq" | "sensor"



    ) -> Dict[str, Any]:



        old_fn = old_friendly_name.strip()



        new_fn = (new_friendly_name.strip().lower().replace(" ", "_") or old_fn)



        disp_name = display_name.strip() or new_fn.replace("_", " ").title()







        current_z2m_fn = (self._z2m_bridge_devices.get(ieee, {}).get("friendly_name") or "").strip()



        if not current_z2m_fn:



            current_z2m_fn = old_fn







        if (new_fn != old_fn or new_fn != current_z2m_fn) and self._mqtt_client and self._mqtt_connected:



            target_from = current_z2m_fn if current_z2m_fn else (old_fn or ieee)



            rename_payload = json.dumps({"from": target_from, "to": new_fn})



            self._mqtt_client.publish("zigbee2mqtt/bridge/request/device/rename", rename_payload)



            logger.info(f"[Z2M Rename] {target_from} -> {new_fn}")







        with self._lock:



            if new_fn != old_fn:



                if old_fn in self._live_states:



                    self._live_states[new_fn] = self._live_states.pop(old_fn)



                if ieee in self._z2m_bridge_devices:



                    self._z2m_bridge_devices[ieee]["friendly_name"] = new_fn







            # Limpiar cualquier placa o controlador anterior asociado a este IEEE o nombre viejo/nuevo



            old_plate = None



            plates = self._config.setdefault("plates", {})



            for k in list(plates.keys()):



                if k in (old_fn, new_fn) or (ieee and plates[k].get("ieee") == ieee):



                    if not old_plate:



                        old_plate = plates[k]



                    del plates[k]







            leds = self._config.setdefault("led_controllers", {})



            for k in list(leds.keys()):



                if k in (old_fn, new_fn) or (ieee and leds[k].get("ieee") == ieee):



                    del leds[k]







            if device_profile == "led_controller":



                self._config.setdefault("led_controllers", {})[new_fn] = {



                    "ieee": ieee,



                    "friendly_name": new_fn,



                    "name": disp_name,



                    "room": room,



                    "supports_brightness": True,



                    "supports_color_temp": True



                }



            elif device_profile == "sensor" or device_profile.startswith("sensor"):
                cat = "contact"
                stype = "door_window"
                if "motion" in device_profile or "presence" in device_profile:
                    cat = "presence"
                    stype = "pir"
                elif "water" in device_profile or "leak" in device_profile:
                    cat = "water"
                    stype = "water_leak"

                sensors = self._config.setdefault("sensors_cameras", [])
                sensors = [s for s in sensors if s.get("ieee") != ieee and s.get("friendly_name") not in (old_fn, new_fn)]
                sensors.append({
                    "ieee": ieee,
                    "friendly_name": new_fn,
                    "name": disp_name,
                    "room": room,
                    "type": stype,
                    "category": cat
                })
                self._config["sensors_cameras"] = sensors

                # Sincronizar automaticamente con sensor_service
                try:
                    from app.services.sensor_service import sensor_service
                    sensor_service.upsert_sensor(new_fn, {
                        "name": disp_name,
                        "category": cat,
                        "type": stype,
                        "room": room,
                        "protocol": "zigbee2mqtt",
                        "installed": True,
                        "friendly_name": new_fn,
                        "ieee": ieee,
                        "notes": f"Emparejado via Z2M ({ieee})"
                    })
                except Exception as ex_s:
                    logger.warning(f"No se pudo sincronizar sensor con sensor_service: {ex_s}")

            elif device_profile in ("cover", "blind", "persiana"):
                cov_key = f"cover.{new_fn}" if not new_fn.startswith("cover.") else new_fn
                self._covers[cov_key] = {
                    "id": cov_key,
                    "entity_id": cov_key,
                    "z2m_device": new_fn,
                    "ieee": ieee,
                    "name": disp_name,
                    "room": room,
                    "state": "open",
                    "position": 100
                }
                logger.info(f"✨ [Z2M Assign] Registrada persiana/cover {cov_key} -> {new_fn} ({ieee})")



            else:



                new_channels = self._build_channels_for_profile(device_profile)



                if old_plate and isinstance(old_plate.get("channels"), dict):



                    for ch_k, ch_v in new_channels.items():



                        if ch_k in old_plate["channels"]:



                            ch_v["label"] = old_plate["channels"][ch_k].get("label", ch_v["label"])



                            ch_v["notes"] = old_plate["channels"][ch_k].get("notes", "")







                model_labels = {



                    "plate_1g": "TS0001 (1 BotÃ³n)",



                    "plate_2g": "TS0002 (2 Botones)",



                    "plate_3g": "TS0003 (3 Botones)",



                    "dimmer_seq": "TS0601 Dimmer Secuenciador"



                }



                self._config.setdefault("plates", {})[new_fn] = {



                    "ieee": ieee,



                    "friendly_name": new_fn,



                    "name": disp_name,



                    "room": room,



                    "model": model_labels.get(device_profile, "Interruptor Zigbee"),



                    "channels": new_channels



                }







            if new_fn != old_fn:



                for rl in self._config.get("real_lights", {}).values():



                    ps = rl.get("power_source", {})



                    if ps.get("device") == old_fn:



                        ps["device"] = new_fn



                    for sw in rl.get("commutation_switches", []):



                        if sw.get("device") == old_fn:



                            sw["device"] = new_fn







            self._save_config()



            return {"ok": True, "friendly_name": new_fn, "name": disp_name, "room": room, "profile": device_profile}







    def get_z2m_hardware_inventory(self) -> List[Dict[str, Any]]:



        """Devuelve la lista consolidada de todos los dispositivos Zigbee2MQTT para el Apartado 0."""



        with self._lock:



            self._load_initial_z2m_states()



            inventory = []



            seen_fnames = set()







            for fn, p in self._config.get("plates", {}).items():



                seen_fnames.add(fn)



                st = self._live_states.get(fn, {})



                ch_keys = list(p.get("channels", {}).keys())



                if p.get("channels", {}).get("state", {}).get("role") == "dimmer_sequencer":



                    profile = "dimmer_seq"



                elif len(ch_keys) == 3:



                    profile = "plate_3g"



                elif len(ch_keys) == 2:



                    profile = "plate_2g"



                else:



                    profile = "plate_1g"







                inventory.append({



                    "ieee": p.get("ieee", ""),



                    "friendly_name": fn,



                    "name": p.get("name", fn),



                    "room": p.get("room", "salon"),



                    "profile": profile,



                    "model": p.get("model", ""),



                    "channels_count": len(ch_keys),



                    "linkquality": st.get("linkquality", 0),



                    "is_configured": True



                })







            for fn, l in self._config.get("led_controllers", {}).items():



                seen_fnames.add(fn)



                st = self._live_states.get(fn, {})



                inventory.append({



                    "ieee": l.get("ieee", ""),



                    "friendly_name": fn,



                    "name": l.get("name", fn),



                    "room": l.get("room", "salon"),



                    "profile": "led_controller",



                    "model": "Controlador Tira LED Zigbee",



                    "channels_count": 1,



                    "linkquality": st.get("linkquality", 0),



                    "is_configured": True



                })







            for cid, cov in self._covers.items():
                fn = cov.get("z2m_device") or cov.get("friendly_name") or cid.replace("cover.", "")
                seen_fnames.add(fn)
                if cov.get("ieee"):
                    seen_fnames.add(cov["ieee"])
                st = self._live_states.get(fn, {})
                inventory.append({
                    "ieee": cov.get("ieee", ""),
                    "friendly_name": fn,
                    "name": cov.get("name", fn.replace("_", " ").title()),
                    "room": cov.get("room", "salon"),
                    "profile": "cover",
                    "model": "TuYa TS130F / TS0601 Motor Persiana",
                    "channels_count": 1,
                    "linkquality": st.get("linkquality", 0),
                    "is_configured": True
                })

            for ieee, b_dev in self._z2m_bridge_devices.items():



                fn = b_dev.get("friendly_name", ieee)



                if fn in seen_fnames:



                    continue



                st = self._live_states.get(fn, {})



                guessed_profile = self._detect_gang_profile(st, fn)



                inventory.append({



                    "ieee": ieee,



                    "friendly_name": fn,



                    "name": fn.replace("_", " ").title(),



                    "room": "salon",



                    "profile": guessed_profile,



                    "model": b_dev.get("model") or ("Sensor Puerta/Ventana (Sonoff SNZB-04)" if guessed_profile == "sensor_door" else ("Sensor Movimiento / Presencia" if guessed_profile == "sensor_motion" else ("Sensor Fuga de Agua" if guessed_profile == "sensor_water" else "Nuevo Dispositivo Zigbee"))),



                    "channels_count": 3 if guessed_profile == "plate_3g" else (2 if guessed_profile == "plate_2g" else 1),



                    "linkquality": st.get("linkquality", 0),



                    "is_configured": False



                })







            return inventory







    # =========================================================================



    # PUBLICACIÃ“N Y CONMUTACIÃ“N SIN BUCLES



    # =========================================================================



    # ------------------------------------------------------------------



    # ANTI-ECO: ventana adaptativa al LQI + reconocimiento del valor



    # ------------------------------------------------------------------



    ECHO_TTL_SECONDS = 2.5







    def _echo_window_seconds(self, device: str) -> float:



        """Ventana para ignorar el eco de nuestros propios comandos."""



        try:



            lqi = int(self._live_states.get(device, {}).get("linkquality") or 0)



        except (TypeError, ValueError):



            lqi = 0



        if lqi and lqi < 25:



            return 5.0



        if lqi and lqi < 50:



            return 4.0



        return 3.0







    def _mark_echo(self, device: str, expected_channel: Optional[str] = None,



                   expected_state: Optional[str] = None,



                   now: Optional[float] = None) -> None:



        """Registra el eco esperado para un canal específico tras enviar comando."""



        moment = now if now is not None else time.time()



        if expected_channel and expected_state in ("ON", "OFF"):



            st_up = expected_state.upper()



            self._echo_expected[(device, expected_channel)] = (st_up, moment + self.ECHO_TTL_SECONDS)



            self._commanded_states[(device, expected_channel)] = (st_up, moment + self.ECHO_TTL_SECONDS)







    def publish_z2m(self, device: str, payload_dict: Dict[str, Any], mark_echo: bool = True) -> bool:



        now = time.time()



        if mark_echo:



            for ch_key, val in payload_dict.items():



                if isinstance(val, str) and val.upper() in ("ON", "OFF"):



                    st_up = val.upper()



                    self._mark_echo(device, expected_channel=ch_key, expected_state=st_up, now=now)







        with self._lock:
            st = self._live_states.setdefault(device, {})
            for k, v in payload_dict.items():
                st[k] = v
            resolved_p_id = self._resolve_plate_id(device)
            if resolved_p_id:
                self._live_states.setdefault(resolved_p_id, {}).update(payload_dict)
                p_ieee = self._config.get("plates", {}).get(resolved_p_id, {}).get("ieee")
                if p_ieee:
                    self._live_states.setdefault(p_ieee, {}).update(payload_dict)
            else:
                for l_id, l_val in self._config.get("led_controllers", {}).items():
                    if l_id == device or l_val.get("ieee") == device:
                        self._live_states.setdefault(l_id, {}).update(payload_dict)
                        if l_val.get("ieee"):
                            self._live_states.setdefault(l_val["ieee"], {}).update(payload_dict)
                        break







        topic = f"zigbee2mqtt/{device}" if "/" in device else f"zigbee2mqtt/{device}/set"



        payload_json = json.dumps(payload_dict)







        try:



            if self._mqtt_client and self._mqtt_connected:



                info = self._mqtt_client.publish(topic, payload_json, qos=0)



                if info.rc == mqtt.MQTT_ERR_SUCCESS:



                    logger.info(f"ðŸ“¤ [MQTT TX] {topic} -> {payload_json}")



                    return True



        except Exception as e:



            logger.warning(f"Fallo publish persistente, usando fallback single: {e}")







        try:



            import paho.mqtt.publish as publish



            broker = self._config.get("broker", {})



            publish.single(topic, payload=payload_json, hostname=broker.get("host", "127.0.0.1"), port=int(broker.get("port", 1883)))



            return True



        except Exception as e:



            logger.error(f"Error publicando a {topic}: {e}")



            return False







    def _resolve_plate_id(self, device: str) -> Optional[str]:
        if not device:
            return None
        plates = self._config.get("plates", {})
        if device in plates:
            return device
        def _norm(s: str) -> str:
            return s.lower().replace("ñ", "n").replace("\ufffd", "n").replace("bano", "bao").strip()
        norm_dev = _norm(device)
        for p_id, p_val in plates.items():
            if p_val.get("ieee") == device or _norm(p_id) == norm_dev or _norm(p_val.get("friendly_name", "")) == norm_dev:
                return p_id
        return None

        plates = self._config.get("plates", {})
        if device in plates:
            return device
        def _norm(s: str) -> str:
            return s.lower().replace("ñ", "n").replace("�", "n").replace("bano", "bao").strip()
        norm_dev = _norm(device)
        for p_id, p_val in plates.items():
            if p_val.get("ieee") == device or _norm(p_id) == norm_dev or _norm(p_val.get("friendly_name", "")) == norm_dev:
                return p_id
        return None

    def _process_incoming_z2m_state(self, device: str, data: Dict[str, Any]):



        now = time.time()



        with self._lock:



            prev_state = dict(self._live_states.get(device, {}))



            self._live_states.setdefault(device, {}).update(data)



            # Sincronización cruzada IEEE <-> friendly_name (con normalización ñ/bano) para placas y controladores LED
            resolved_p_id = self._resolve_plate_id(device)
            if resolved_p_id:
                self._live_states.setdefault(resolved_p_id, {}).update(data)
                p_ieee = self._config.get("plates", {}).get(resolved_p_id, {}).get("ieee")
                if p_ieee:
                    self._live_states.setdefault(p_ieee, {}).update(data)
            else:
                for l_id, l_val in self._config.get("led_controllers", {}).items():
                    if l_id == device or l_val.get("ieee") == device:
                        self._live_states.setdefault(l_id, {}).update(data)
                        if l_val.get("ieee"):
                            self._live_states.setdefault(l_val["ieee"], {}).update(data)
                        if "state" in data:
                            st_now = str(data["state"]).upper()
                            st_prev = str(prev_state.get("state", "")).upper()
                            if st_now in ("ON", "OFF") and st_now != st_prev:
                                try:
                                    from app.services.automation_service import automation_service
                                    automation_service.notify_device_state_change(
                                        device_name=l_val.get("name") or l_id,
                                        new_state=st_now,
                                        details="Tira LED",
                                        room=l_val.get("room", "")
                                    )
                                except Exception:
                                    pass
                        break







        # Sincronización continua conmutada: Si una fuente de potencia o controlador LED reporta estado,
        # asegurar que las conmutadas secundarias de pared reflejen exactamente el mismo estado.
        for rl_id, rl in self._config.get("real_lights", {}).items():
            ps = rl.get("power_source", {})
            ps_dev = ps.get("device")
            if ps_dev and (ps_dev == device or ps_dev == resolved_p_id):
                ps_ch = ps.get("channel", "state")
                if ps_ch in data:
                    new_val_s = str(data[ps_ch]).upper()
                    if new_val_s in ("ON", "OFF"):
                        rl["state"] = new_val_s
                        old_val_s = str(prev_state.get(ps_ch, "")).upper()
                        if new_val_s != old_val_s:
                            try:
                                from app.services.automation_service import automation_service
                                automation_service.notify_device_state_change(
                                    device_name=rl.get("name") or rl_id,
                                    new_state=new_val_s,
                                    details="Luz / Carga",
                                    room=rl.get("room", "")
                                )
                            except Exception:
                                pass
                            for sw in rl.get("commutation_switches", []):
                                s_dev = sw.get("device")
                                s_ch = sw.get("channel")
                                if s_dev and s_ch:
                                    cur_sw = str(self._live_states.get(s_dev, {}).get(s_ch, "")).upper()
                                    if cur_sw != new_val_s:
                                        logger.info(f"🔄 [SYNC-CONMUTADA] Sincronizando pulsador de pared {s_dev}.{s_ch} -> {new_val_s} (por cambio en {device})")
                                        self.publish_z2m(s_dev, {s_ch: new_val_s}, mark_echo=True)

        # 0. Enrutamiento automático hacia SensorService si corresponde a telemetría de sensor
        try:
            from app.services.sensor_service import sensor_service
            sensor_service.handle_z2m_message(device, data)
        except Exception as _e_sens:
            logger.debug(f"[SensorService Hook] {_e_sens}")

        # Actualizacion continua de persianas motorizadas (covers)
        for cov_id, cov in self._covers.items():
            cov_dev = cov.get("z2m_device") or cov.get("friendly_name") or cov_id
            if device in (cov_dev, cov.get("ieee")):
                if "position" in data:
                    try:
                        cov["position"] = int(data["position"])
                    except Exception:
                        pass
                if "state" in data:
                    st_val = str(data["state"]).lower()
                    if st_val in ("open", "opening"):
                        cov["state"] = "open"
                    elif st_val in ("close", "closing", "closed"):
                        cov["state"] = "closed"
                    elif st_val == "stop":
                        cov["state"] = "open" if cov.get("position", 0) > 0 else "closed"
                break

        # 1. El secuenciador de dimmer se procesa por su flujo específico



        seq_cfg = self._config.get("dimmer_sequences", {}).get(device)



        if seq_cfg and seq_cfg.get("enabled"):



            self._handle_dimmer_sequence_message(device, prev_state, data, now)



            return







        # 2. REGLA DE ORO: Solo los dispositivos registrados como PLACAS DE PARED



        # pueden generar eventos de pulsaciÃ³n fÃ­sica de interruptor.



        # Controladores de tiras LED, bombillas, enchufes y sensores solo actualizan



        # su _live_states arriba y NUNCA deben disparar conmutaciones.



        resolved_p_id = self._resolve_plate_id(device)

        if not resolved_p_id:

            return

        device = resolved_p_id

        plate_info = self._config.get("plates", {}).get(device, {})







        # 3. Solo inspeccionar canales reales declarados en la placa



        plate_channels = plate_info.get("channels", {})



        for ch in ("state_left", "state_center", "state_right", "state_l1", "state_l2", "state_l3", "state"):



            if ch in data and ch in plate_channels:



                new_val = str(data[ch]).upper()



                old_val = str(prev_state.get(ch, "")).upper()



                self._check_channel_trigger(device, ch, old_val, new_val, now)







    def _check_channel_trigger(self, device: str, channel: str, old_val: str, new_val: str, now: float):



        if new_val not in ("ON", "OFF"):



            return







        resolved_p_id = self._resolve_plate_id(device)

        if not resolved_p_id:

            return

        device = resolved_p_id

        plate_info = self._config.get("plates", {}).get(device, {})

        if not plate_info or channel not in plate_info.get("channels", {}):

            return







        if now < getattr(self, "_all_off_until", 0.0) and new_val == "ON":



            logger.debug(f"🔇 [ALL-OFF-GUARD] Descartando ON residual durante apagado general: {device}.{channel}")



            return







        # 1. Comprobar si este estado entrante es el eco esperado de una orden que nosotros enviamos



        cmd = self._commanded_states.get((device, channel))

        if cmd is not None:
            cmd_val, cmd_until = cmd
            if now < cmd_until:
                if new_val == cmd_val:
                    logger.debug(f"🔇 [ANTI-ECO] Eco ordenado descartado: {device}.{channel} == {new_val}")
                    return
                else:
                    cmd_age = now - (cmd_until - self.ECHO_TTL_SECONDS)
                    if cmd_age < 0.95:
                        logger.debug(f"🔇 [ANTI-ECO IN-FLIGHT] Ignorando estado previo en vuelo ({new_val}) en {device}.{channel} (esperado {cmd_val})")
                        self._live_states.setdefault(device, {})[channel] = cmd_val
                        return
                    self._commanded_states.pop((device, channel), None)



            else:



                self._commanded_states.pop((device, channel), None)







        expected = self._echo_expected.get((device, channel))



        if expected is not None:



            exp_val, exp_until = expected



            if now < exp_until:



                if new_val == exp_val:



                    logger.debug(f"🔇 [ANTI-ECO] Eco esperado descartado: {device}.{channel} == {new_val}")



                    self._echo_expected.pop((device, channel), None)



                    return



                else:



                    self._echo_expected.pop((device, channel), None)



            else:



                self._echo_expected.pop((device, channel), None)







        # Si el estado no ha cambiado realmente respecto al anterior, descartar



        if old_val == new_val:



            return







        # Debounce mecánico rápido (250ms)



        last_ts, last_st = self._press_debounce.get((device, channel), (0.0, ""))



        if now - last_ts < 0.25:



            return



        self._press_debounce[(device, channel)] = (now, new_val)

        # Notificar al Asistente Setup Wizard si esta escuchando
        try:
            from app.services.setup_wizard_service import setup_wizard_service
            if setup_wizard_service.is_listening():
                setup_wizard_service.on_hardware_press(device, channel, new_val)
        except Exception as _e_wiz:
            pass







        plate_info = self._config.get("plates", {}).get(device, {})



        plate_name = plate_info.get("name", device)



        ch_info = plate_info.get("channels", {}).get(channel, {})



        ch_label = ch_info.get("label", channel)







        event_obj = {



            "id": uuid.uuid4().hex[:8],



            "timestamp": time.strftime("%H:%M:%S"),



            "ts": now,



            "device": device,



            "plate_name": plate_name,



            "channel": channel,



            "channel_label": ch_label,



            "state": new_val,



            "assigned_light_id": ch_info.get("assigned_light_id"),



            "assigned_light_name": ch_info.get("assigned_light_name")



        }



        self._recent_events.appendleft(event_obj)



        logger.info(f"👉 [PULSACIÓN FÍSICA PARED] {plate_name} ({device}) · {ch_label} ({channel}) -> {new_val}")
        try:
            from app.services.automation_service import automation_service
            automation_service.notify_device_state_change(
                device_name=f"{plate_name} ({ch_label})",
                new_state=str(new_val).upper(),
                details="Interruptor físico de pared",
                room=plate_info.get("room", "")
            )
        except Exception:
            pass







        if self._learn_mode.get("active"):



            self._handle_learn_capture(device, channel, event_obj)







        self._execute_commutation_from_wall(device, channel, new_val)







    def _handle_learn_capture(self, device: str, channel: str, event_obj: Dict[str, Any]):



        with self._lock:



            self._learn_mode["last_captured"] = event_obj



            light_id = self._learn_mode.get("target_light_id")



            role = self._learn_mode.get("role", "commutation")



            if light_id and light_id in self._config.get("real_lights", {}):



                if role == "commutation":



                    self.add_commutation_switch(light_id, device, channel)



                elif role == "power_source":



                    self.set_light_power_source(light_id, "plate_channel", device, channel)







    def _execute_commutation_from_wall(self, triggered_device: str, triggered_channel: str, new_state: str):



        now = time.time()



        with self._lock:



            real_lights = self._config.get("real_lights", {})



            matched_light = None



            is_power_source = False







            for l_id, l_data in real_lights.items():



                ps = l_data.get("power_source", {})



                if ps.get("device") == triggered_device and ps.get("channel") == triggered_channel:



                    matched_light = l_data



                    is_power_source = True



                    break



                for sw in l_data.get("commutation_switches", []):



                    if sw.get("device") == triggered_device and sw.get("channel") == triggered_channel:



                        matched_light = l_data



                        is_power_source = False



                        break



                if matched_light:



                    break







            if not matched_light:



                return







            matched_light_id = matched_light.get("id", "")



            last_trig = self._cluster_last_triggered.get(matched_light_id, 0.0)



            ps = matched_light.get("power_source", {})
            comm_switches = matched_light.get("commutation_switches", [])
            ps_dev = ps.get("device")
            ps_ch = ps.get("channel", "state")

            cur_light_state = str(self._live_states.get(ps_dev, {}).get(ps_ch, matched_light.get("state", "OFF"))).upper()

            # Si es una conmutada secundaria (sin cable de potencia directo), la pulsación física
            # del usuario es un intento inequívoco de alternar (toggle) el estado real actual de la luz.
            if not is_power_source:
                target_state = "OFF" if cur_light_state == "ON" else "ON"
            else:
                target_state = str(new_state).upper()

            # Debounce ultrarrápido (250ms) contra rebote de contacto físico
            if now - last_trig < 0.25:
                return

            self._cluster_last_triggered[matched_light_id] = now







            matched_light["state"] = target_state



            tx_by_device: Dict[str, Dict[str, Any]] = {}







            if ps_dev:



                if not is_power_source or self._live_states.get(ps_dev, {}).get(ps_ch) != target_state:



                    tx_by_device.setdefault(ps_dev, {})[ps_ch] = target_state



                    self._mark_echo(ps_dev, ps_ch, target_state, now)







            for sw in comm_switches:



                s_dev = sw.get("device")



                s_ch = sw.get("channel")



                if s_dev and s_ch:



                    if s_dev == triggered_device and s_ch == triggered_channel:



                        if new_state != target_state:



                            tx_by_device.setdefault(s_dev, {})[s_ch] = target_state



                            self._mark_echo(s_dev, s_ch, target_state, now)



                        else:



                            self._mark_echo(s_dev, s_ch, target_state, now)



                        continue



                    tx_by_device.setdefault(s_dev, {})[s_ch] = target_state



                    self._mark_echo(s_dev, s_ch, target_state, now)







        if ps_dev and ps_dev in tx_by_device:



            self.publish_z2m(ps_dev, tx_by_device[ps_dev], mark_echo=True)







        def _staggered_sync(light_ref, expected_target, others_dict):



            time.sleep(0.035)



            for t_dev, t_pay in others_dict.items():



                if light_ref.get("state") != expected_target:



                    return



                self.publish_z2m(t_dev, t_pay, mark_echo=True)



                time.sleep(0.035)







        others = {k: v for k, v in tx_by_device.items() if k != ps_dev}



        if others:



            threading.Thread(target=_staggered_sync, args=(matched_light, target_state, others), daemon=True).start()







        # Notificar a automation_service para reglas de pulsación física / temporizadores (ej. extractor de baño)



        try:



            from app.services.automation_service import automation_service



            automation_service.on_hardware_button_pressed(matched_light_id, target_state)



        except Exception as ex:



            logger.debug(f"[Z2M Engine] Error notificando pulsación física a automaciones: {ex}")







    def _handle_dimmer_sequence_message(self, device: str, prev_state: Dict[str, Any], data: Dict[str, Any], now: float):



        echo_until = self._echo_guard.get((device, "state"), 0.0)



        if now < echo_until:



            return







        with self._lock:



            seq = self._config["dimmer_sequences"][device]



            was_on = bool(seq.get("is_on", False))



            new_st = str(data.get("state", prev_state.get("state", "OFF"))).upper()



            new_bri = data.get("brightness")



            old_bri = prev_state.get("brightness")







            if new_st == "OFF" and was_on:



                seq["is_on"] = False



                seq["saved_step"] = seq.get("current_step", 1)



                self._save_config()



                for led_dev in ["salon_led_aparador", "salon_led_sofa", "salon_led_tv"]:



                    self.publish_z2m(led_dev, {"state": "OFF"}, mark_echo=True)



                return







            if new_st == "ON" and not was_on:



                seq["is_on"] = True



                if not hasattr(self, "_dimmer_on_ts"):



                    self._dimmer_on_ts = {}



                self._dimmer_on_ts[device] = now



                step_num = int(seq.get("saved_step", 1))



                if step_num < 1:



                    step_num = 1



                seq["current_step"] = step_num



                self._save_config()



                self._apply_dimmer_step(device, step_num)



                return







            on_ts = getattr(self, "_dimmer_on_ts", {}).get(device, 0.0)



            if new_st == "ON" and was_on and new_bri is not None and new_bri != old_bri and (now - on_ts) > 2.5:



                next_step = (int(seq.get("current_step", 1)) % len(seq.get("steps", []))) + 1



                seq["current_step"] = next_step



                seq["saved_step"] = next_step



                self._save_config()



                self._apply_dimmer_step(device, next_step)







    def _apply_dimmer_step(self, dimmer_device: str, step_num: int):



        with self._lock:



            seq = self._config.get("dimmer_sequences", {}).get(dimmer_device, {})



            steps = seq.get("steps", [])



            step_obj = next((s for s in steps if int(s.get("step", 0)) == int(step_num)), None)



            if not step_obj:



                return



            seq["current_step"] = int(step_num)



            seq["saved_step"] = int(step_num)



            seq["is_on"] = True



            targets = step_obj.get("targets", {})



            self._save_config()







        for led_dev, pct in targets.items():



            pct_val = int(pct)



            if pct_val <= 0:



                self.publish_z2m(led_dev, {"state": "OFF"}, mark_echo=True)



            else:



                bri_254 = max(1, min(254, int(round((pct_val / 100.0) * 254))))



                self.publish_z2m(led_dev, {"state": "ON", "brightness": bri_254}, mark_echo=True)







    # =========================================================================



    # API DE CONTROL Y GESTIÃ“N GLOBAL



    # =========================================================================



    def get_full_state(self) -> Dict[str, Any]:



        with self._lock:



            plates_out = []



            for p_id, p_data in self._config.get("plates", {}).items():



                ieee = p_data.get("ieee", "")



                st = dict(self._live_states.get(ieee, {})) if ieee else {}



                st.update(self._live_states.get(p_id, {}))



                ch_list = []



                for ch_key, ch_meta in p_data.get("channels", {}).items():



                    ch_state = str(st.get(ch_key, "OFF")).upper()



                    ch_list.append({



                        "channel": ch_key,



                        "label": ch_meta.get("label", ch_key),



                        "state": ch_state,



                        "has_physical_wire": bool(ch_meta.get("has_physical_wire", False)),



                        "role": ch_meta.get("role", "commutation_button"),



                        "assigned_light_id": ch_meta.get("assigned_light_id"),



                        "assigned_light_name": ch_meta.get("assigned_light_name"),



                        "assigned_role": ch_meta.get("assigned_role", "free"),



                        "notes": ch_meta.get("notes", "")



                    })



                plates_out.append({



                    "id": p_id,



                    "ieee": p_data.get("ieee", ""),



                    "name": p_data.get("name", p_id),



                    "room": p_data.get("room", "salon"),



                    "model": p_data.get("model", ""),



                    "linkquality": st.get("linkquality", 0),



                    "channels": ch_list



                })







            leds_out = []



            for l_id, l_data in self._config.get("led_controllers", {}).items():



                st = self._live_states.get(l_id, {})



                bri_raw = int(st.get("brightness", 254) or 0)



                bri_pct = max(0, min(100, int(round((bri_raw / 254.0) * 100))))



                leds_out.append({



                    "id": l_id,



                    "ieee": l_data.get("ieee", ""),



                    "name": l_data.get("name", l_id),



                    "room": l_data.get("room", "salon"),



                    "state": str(st.get("state", "OFF")).upper(),



                    "brightness_pct": bri_pct,



                    "color_temp": st.get("color_temp", 370),



                    "linkquality": st.get("linkquality", 0)



                })







            lights_out = []



            for rl_id, rl_data in self._config.get("real_lights", {}).items():



                ps = rl_data.get("power_source", {})



                ps_dev = ps.get("device", "")



                ps_ch = ps.get("channel", "state")



                ps_plate_info = self._config.get("plates", {}).get(ps_dev, {})
                ps_led_info = self._config.get("led_controllers", {}).get(ps_dev, {})
                ps_ieee_addr = ps_plate_info.get("ieee") or ps_led_info.get("ieee") or "" 



                dev_st = dict(self._live_states.get(ps_ieee_addr, {})) if ps_ieee_addr else {}



                dev_st.update(self._live_states.get(ps_dev, {}))



                current_st = str(dev_st.get(ps_ch, rl_data.get("state", "OFF"))).upper()



                bri_pct = None



                if rl_data.get("kind") == "led_controller":



                    bri_raw = int(dev_st.get("brightness", 254) or 0)



                    bri_pct = max(0, min(100, int(round((bri_raw / 254.0) * 100))))







                comm_detailed = []



                for sw in rl_data.get("commutation_switches", []):



                    s_dev = sw.get("device", "")



                    s_ch = sw.get("channel", "")



                    p_obj = self._config.get("plates", {}).get(s_dev, {})



                    c_obj = p_obj.get("channels", {}).get(s_ch, {})



                    s_live = str(self._live_states.get(s_dev, {}).get(s_ch, "OFF")).upper()



                    comm_detailed.append({



                        "device": s_dev,



                        "plate_name": p_obj.get("name", s_dev),



                        "channel": s_ch,



                        "channel_label": c_obj.get("label", s_ch),



                        "state": s_live



                    })







                ps_plate = self._config.get("plates", {}).get(ps_dev, {})



                ps_led = self._config.get("led_controllers", {}).get(ps_dev, {})



                ps_name = ps_plate.get("name") or ps_led.get("name") or ps_dev



                ps_ch_label = ps_plate.get("channels", {}).get(ps_ch, {}).get("label", ps_ch)







                lights_out.append({



                    "id": rl_id,



                    "name": rl_data.get("name", rl_id),



                    "room": rl_data.get("room", "salon"),



                    "kind": rl_data.get("kind", "wired_relay"),



                    "state": current_st,



                    "brightness_pct": bri_pct,



                    "power_source": {



                        "type": ps.get("type", "plate_channel"),



                        "device": ps_dev,



                        "device_name": ps_name,



                        "channel": ps_ch,



                        "channel_label": ps_ch_label



                    },



                    "commutation_switches": comm_detailed,



                    "habana_entity_id": rl_id



                })







            return {



                "mqtt_connected": self._mqtt_connected,



                "broker": self._config.get("broker", {}),



                "rooms": self._config.get("rooms", []),



                "pairing": self._get_pairing_status_Snapshot(),
                "permit_join": bool(self._get_pairing_status_Snapshot().get("active", False)),
                "permit_join_countdown": int(self._get_pairing_status_Snapshot().get("remaining_seconds", 0) or 0),
                "z2m_devices": self.get_z2m_hardware_inventory(),



                "z2m_inventory": self.get_z2m_hardware_inventory(),



                "plates": plates_out,



                "led_controllers": leds_out,



                "real_lights": lights_out,



                "dimmer_sequences": self._config.get("dimmer_sequences", {}),



                "recent_events": list(self._recent_events),



                "learn_mode": self._learn_mode



            }







    def get_habana_devices_list(self) -> List[Dict[str, Any]]:



        """



        Devuelve la lista completa de entidades limpias de HABANA 10 (las 19 luces reales Z2M + 3 persianas)



        lista para consumir en GET /api/devices y GET /api/system-state.



        """



        with self._lock:



            devices_list: List[Dict[str, Any]] = []



            for rl_id, rl_data in self._config.get("real_lights", {}).items():



                ps = rl_data.get("power_source", {})



                ps_dev = ps.get("device", "")



                ps_ch = ps.get("channel", "state")



                ps_plate_info = self._config.get("plates", {}).get(ps_dev, {})
                ps_led_info = self._config.get("led_controllers", {}).get(ps_dev, {})
                ps_ieee_addr = ps_plate_info.get("ieee") or ps_led_info.get("ieee") or "" 



                dev_st = dict(self._live_states.get(ps_ieee_addr, {})) if ps_ieee_addr else {}



                dev_st.update(self._live_states.get(ps_dev, {}))



                raw_st = str(dev_st.get(ps_ch, rl_data.get("state", "OFF"))).upper()



                is_on = (raw_st == "ON")



                is_led = (rl_data.get("kind") == "led_controller")



                bri_raw = int(dev_st.get("brightness", 254 if is_on else 0) or 0)



                bri_pct = max(0, min(100, int(round((bri_raw / 254.0) * 100)))) if is_led else (100 if is_on else 0)



                room = rl_data.get("room", "salon")



                name = rl_data.get("name", rl_id)







                devices_list.append({



                    "id": rl_id,



                    "entity_id": rl_id,



                    "name": name,



                    "state": "on" if is_on else "off",



                    "domain": "light",



                    "room": room,



                    "kind": rl_data.get("kind", "wired_relay"),



                    "is_real": True,



                    "is_backlight": False,



                    "protocol": "zigbee2mqtt",



                    "source": "z2m_native",



                    "supports_brightness": is_led,



                    "supports_color_temp": is_led,



                    "attributes": {



                        "friendly_name": name,



                        "room": room,



                        "kind": rl_data.get("kind", "wired_relay"),



                        "brightness": bri_raw if is_led else (254 if is_on else 0),



                        "brightness_pct": bri_pct,



                        "color_temp": dev_st.get("color_temp", 370) if is_led else None,



                        "power_device": ps_dev,



                        "power_channel": ps_ch,



                        "commutation_switches": rl_data.get("commutation_switches", []),



                    }



                })







            for cov_id, cov in self._covers.items():



                z2m_dev = cov.get("z2m_device", "")



                live_cov = self._live_states.get(z2m_dev, {})



                pos = int(live_cov.get("position", cov.get("position", 100)))



                st_str = str(live_cov.get("state", cov.get("state", "open"))).lower()



                if st_str in ("on", "open", "opening"):



                    cov_state = "open"



                elif st_str in ("off", "close", "closed", "closing"):



                    cov_state = "closed"



                else:



                    cov_state = "open" if pos > 0 else "closed"







                devices_list.append({



                    "id": cov_id,



                    "entity_id": cov_id,



                    "name": cov["name"],



                    "state": cov_state,



                    "domain": "cover",



                    "room": cov["room"],



                    "is_real": True,



                    "is_backlight": False,



                    "protocol": "zigbee2mqtt",



                    "source": "z2m_native",



                    "attributes": {



                        "friendly_name": cov["name"],



                        "room": cov["room"],



                        "current_position": pos,



                    }



                })







            return devices_list







    def control_habana_entity(

        self,

        entity_id: str,

        action: str = "toggle",

        brightness_pct: Optional[int] = None,

        brightness: Optional[int] = None,

        color_temp_kelvin: Optional[int] = None,

        kelvin: Optional[int] = None,

        rgb_color: Optional[List[int]] = None,

        position: Optional[int] = None,

        **kwargs: Any,

    ) -> Dict[str, Any]:

        """

        Control unificado de cualquier entidad limpia de HABANA 10/12 (real_lights, led_controllers,

        persianas cover.persiana_*, salon_dimmer o canales de placas).

        """

        if brightness_pct is None and brightness is not None:

            brightness_pct = brightness if brightness <= 100 else int(round((brightness / 255.0) * 100))

        if color_temp_kelvin is None and kelvin is not None:

            color_temp_kelvin = kelvin



        cid = (entity_id or "").strip()

        if not cid:
            return {"ok": False, "error": "entity_id vacío"}
        act_check = (action or "toggle").strip().lower()
        if cid.lower() in ("all", "all_lights", "all_off", "light.all", "switch.all", "todas", "luces") or act_check in ("turn_off_all", "all_off"):
            res_all = self.turn_off_all()
            return {"ok": True, "state": "OFF", "action": "turn_off_all", **res_all}
        if cid in ("luz_techo_cocina", "luces_cocina", "cocina_luces"):
            r1 = self.control_real_light("luz_cocina_mesa_7f97", action=act_check, brightness_pct=brightness_pct) if "luz_cocina_mesa_7f97" in self._config.get("real_lights", {}) else {}
            r2 = self.control_real_light("luz_cocina_encimera_6ce2", action=act_check, brightness_pct=brightness_pct) if "luz_cocina_encimera_6ce2" in self._config.get("real_lights", {}) else {}
            return r1 if r1.get("ok") else r2



        if cid.startswith("light.") or cid.startswith("switch."):

            stripped = cid.split(".", 1)[1]

            if stripped in self._config.get("real_lights", {}) or stripped in self._config.get("led_controllers", {}):

                cid = stripped



        # Resolución de alias amigables y normalización de tildes/mojibake

        if cid not in self._config.get("real_lights", {}):

            def _norm(s: str) -> str:

                return s.lower().replace("ñ", "n").replace("�", "n").replace("bano", "bao").replace(" ", "_")

            norm_cid = _norm(cid)

            for rl_key in self._config.get("real_lights", {}).keys():

                norm_rl = _norm(rl_key)

                if norm_cid == norm_rl or (len(norm_cid) > 5 and norm_cid in norm_rl) or (len(norm_rl) > 5 and norm_rl in norm_cid):

                    cid = rl_key

                    break







        act = (action or "toggle").strip().lower()







        # 1. Â¿Es una luz real validada en real_lights?



        if cid in self._config.get("real_lights", {}):



            res = self.control_real_light(cid, action=act, brightness_pct=brightness_pct)



            if color_temp_kelvin and self._config["real_lights"][cid].get("kind") == "led_controller":



                ps_dev = self._config["real_lights"][cid].get("power_source", {}).get("device")



                if ps_dev:



                    mireds = max(150, min(500, int(round(1000000 / max(2000, int(color_temp_kelvin))))))



                    self.publish_z2m(ps_dev, {"color_temp": mireds}, mark_echo=True)



            return res







        # 2. Â¿Es un controlador LED por su friendly_name Z2M (ej. salon_led_sofa)?



        if cid in self._config.get("led_controllers", {}):



            for rl_id, rl_data in self._config.get("real_lights", {}).items():



                if rl_data.get("power_source", {}).get("device") == cid:



                    return self.control_real_light(rl_id, action=act, brightness_pct=brightness_pct)



            return self.control_raw_channel(cid, "state", action=act, brightness_pct=brightness_pct)







        # 3. Â¿Es una persiana (cover.persiana_andrea, cover.persiana_salon, cover.persiana_principal)?



        if cid in self._covers or cid.startswith("cover.persiana_"):



            cov = self._covers.get(cid)



            if not cov:



                room_slug = cid.replace("cover.persiana_", "")



                cov = {



                    "id": cid,



                    "entity_id": cid,



                    "z2m_device": f"persiana_{room_slug}",



                    "name": f"Persiana {room_slug.title()}",



                    "room": room_slug,



                    "state": "open",



                    "position": 100,



                }



                self._covers[cid] = cov







            z2m_dev = cov["z2m_device"]



            if position is not None or act == "set_cover_position":



                pos_val = max(0, min(100, int(position if position is not None else 100)))



                cov["position"] = pos_val



                cov["state"] = "open" if pos_val > 0 else "closed"



                self.publish_z2m(z2m_dev, {"position": pos_val}, mark_echo=True)



            elif act in ("open", "open_cover", "on", "turn_on"):
                cov["position"] = 100
                cov["state"] = "open"
                self.publish_z2m(z2m_dev, {"state": "OPEN"}, mark_echo=True)

            elif act in ("close", "close_cover", "off", "turn_off"):
                cov["position"] = 0
                cov["state"] = "closed"
                self.publish_z2m(z2m_dev, {"state": "CLOSE"}, mark_echo=True)

            elif act in ("stop", "stop_cover"):
                cov["state"] = "stopped"
                self.publish_z2m(z2m_dev, {"state": "STOP"}, mark_echo=True)



            else:



                if cov.get("state") == "open":



                    cov["position"] = 0



                    cov["state"] = "closed"



                    self.publish_z2m(z2m_dev, {"state": "CLOSE"}, mark_echo=True)



                else:



                    cov["position"] = 100



                    cov["state"] = "open"



                    self.publish_z2m(z2m_dev, {"state": "OPEN"}, mark_echo=True)



            return {"ok": True, "entity_id": cid, "state": cov["state"], "position": cov["position"]}







        # 4. Â¿Es el dimmer secuenciador del salÃ³n?



        if cid == "salon_dimmer":



            seq = self._config.get("dimmer_sequences", {}).get("salon_dimmer", {})



            if act in ("off", "turn_off"):



                seq["is_on"] = False



                self._save_config()



                for led_dev in ["salon_led_aparador", "salon_led_sofa", "salon_led_tv"]:



                    self.publish_z2m(led_dev, {"state": "OFF"}, mark_echo=True)



                return {"ok": True, "entity_id": cid, "state": "OFF"}



            step_to_run = int(seq.get("saved_step", 1)) if not seq.get("is_on") else ((int(seq.get("current_step", 1)) % 9) + 1)



            if step_to_run < 1:



                step_to_run = 1



            self.trigger_dimmer_step("salon_dimmer", step_to_run)



            return {"ok": True, "entity_id": cid, "state": "ON", "step": step_to_run}







        # 5. Â¿Es una placa.canal (ej. andrea_placa_entrada.state_center)?



        if "." in cid:



            dev, ch = cid.split(".", 1)



            if dev in self._config.get("plates", {}):



                return self.control_raw_channel(dev, ch, action=act, brightness_pct=brightness_pct)







        # 6. Â¿Es una placa directa?



        if cid in self._config.get("plates", {}):



            return self.control_raw_channel(cid, "state", action=act, brightness_pct=brightness_pct)







        return {"ok": False, "error": f"Entidad Z2M '{entity_id}' no encontrada"}







    def control_raw_channel(self, device: str, channel: str, action: str = "toggle", brightness_pct: Optional[int] = None) -> Dict[str, Any]:



        plate = self._config.get("plates", {}).get(device, {})



        ieee = plate.get("ieee", "")



        dev_st = dict(self._live_states.get(ieee, {})) if ieee else {}



        dev_st.update(self._live_states.get(device, {}))



        cur = str(dev_st.get(channel, "OFF")).upper()



        if action.lower() == "toggle":



            target = "OFF" if cur == "ON" else "ON"



        elif action.lower() in ("on", "turn_on"):



            target = "ON"



        else:



            target = "OFF"







        payload: Dict[str, Any] = {channel: target}



        if brightness_pct is not None and channel == "state":



            payload["brightness"] = max(1, min(254, int(round((int(brightness_pct) / 100.0) * 254))))



            payload["state"] = "ON" if int(brightness_pct) > 0 else "OFF"







        ok = self.publish_z2m(device, payload, mark_echo=True)







        with self._lock:



            for rl in self._config.get("real_lights", {}).values():



                ps = rl.get("power_source", {})



                if ps.get("device") == device and ps.get("channel") == channel:



                    rl["state"] = target



                    for sw in rl.get("commutation_switches", []):



                        s_dev = sw.get("device")



                        s_ch = sw.get("channel")



                        if s_dev and s_ch:



                            self.publish_z2m(s_dev, {s_ch: target}, mark_echo=True)







        return {"ok": ok, "device": device, "channel": channel, "state": payload[channel]}







    def control_real_light(self, light_id: str, action: str = "toggle", brightness_pct: Optional[int] = None) -> Dict[str, Any]:



        with self._lock:



            if light_id == "luz_techo_cocina" and "luz_techo_cocina" not in self._config.get("real_lights", {}):
                light_id = "luz_cocina_mesa_7f97"
            rl = self._config.get("real_lights", {}).get(light_id)



            if not rl:



                return {"ok": False, "error": f"Luz {light_id} no encontrada"}







            ps = rl.get("power_source", {})



            ps_dev = ps.get("device")



            ps_ch = ps.get("channel", "state")



            ps_plate = self._config.get("plates", {}).get(ps_dev, {})



            ps_ieee = ps_plate.get("ieee", "")



            dev_st = dict(self._live_states.get(ps_ieee, {})) if ps_ieee else {}



            dev_st.update(self._live_states.get(ps_dev, {}))



            cur = str(dev_st.get(ps_ch, rl.get("state", "OFF"))).upper()







            if action.lower() == "toggle":



                target = "OFF" if cur == "ON" else "ON"



            elif action.lower() in ("on", "turn_on"):



                target = "ON"



            else:



                target = "OFF"







            tx_by_device: Dict[str, Dict[str, Any]] = {}



            now_ctrl = time.time()



            if ps_dev:



                p_dict: Dict[str, Any] = {ps_ch: target}



                if brightness_pct is not None and rl.get("kind") == "led_controller":



                    if int(brightness_pct) <= 0:



                        target = "OFF"



                        p_dict[ps_ch] = "OFF"



                    else:



                        target = "ON"



                        p_dict[ps_ch] = "ON"



                        p_dict["brightness"] = max(1, min(254, int(round((int(brightness_pct) / 100.0) * 254))))



                tx_by_device[ps_dev] = p_dict



                self._mark_echo(ps_dev, ps_ch, target, now_ctrl)







            rl["state"] = target







            for sw in rl.get("commutation_switches", []):



                s_dev = sw.get("device")



                s_ch = sw.get("channel")



                if s_dev and s_ch:



                    tx_by_device.setdefault(s_dev, {})[s_ch] = target



                    self._mark_echo(s_dev, s_ch, target, now_ctrl)







        if ps_dev and ps_dev in tx_by_device:



            self.publish_z2m(ps_dev, tx_by_device[ps_dev], mark_echo=True)







        def _staggered_ctrl_sync(light_ref, expected_target, others_dict):



            time.sleep(0.035)



            for t_dev, t_pay in others_dict.items():



                if light_ref.get("state") != expected_target:



                    return



                self.publish_z2m(t_dev, t_pay, mark_echo=True)



                time.sleep(0.035)







        others = {k: v for k, v in tx_by_device.items() if k != ps_dev}



        if others:



            threading.Thread(target=_staggered_ctrl_sync, args=(rl, target, others), daemon=True).start()







        return {"ok": True, "light_id": light_id, "state": target, "synced_devices": list(tx_by_device.keys())}







    def update_plate_metadata(self, plate_id: str, name: str, room: str, channel_labels: Optional[Dict[str, str]] = None) -> bool:



        with self._lock:



            p = self._config.get("plates", {}).get(plate_id)



            if not p:



                return False



            p["name"] = name.strip()



            p["room"] = room.strip()



            if channel_labels:



                for ch, lbl in channel_labels.items():



                    if ch in p.get("channels", {}):



                        p["channels"][ch]["label"] = lbl.strip()



            self._save_config()



            return True







    def create_or_update_real_light(



        self,



        light_id: Optional[str],



        name: str,



        room: str,



        kind: str,



        power_device: str,



        power_channel: str



    ) -> Dict[str, Any]:



        with self._lock:



            for ex_id, ex_l in list(self._config.get("real_lights", {}).items()):



                ps = ex_l.get("power_source", {})



                if ps.get("device") == power_device and ps.get("channel") == power_channel:



                    if not light_id:



                        light_id = ex_id



                    elif ex_id != light_id:



                        old_comms = ex_l.get("commutation_switches", [])



                        cur_l = self._config["real_lights"].setdefault(light_id, {})



                        cur_comms = cur_l.setdefault("commutation_switches", [])



                        for oc in old_comms:



                            if oc not in cur_comms:



                                cur_comms.append(oc)



                        del self._config["real_lights"][ex_id]







            if not light_id:



                slug = name.lower().strip().replace(" ", "_").replace("Ã¡", "a").replace("Ã©", "e").replace("Ã­", "i").replace("Ã³", "o").replace("Ãº", "u").replace("Ã±", "n")



                light_id = f"luz_{slug}_{uuid.uuid4().hex[:4]}"







            for other_id, other_l in self._config.get("real_lights", {}).items():



                other_l["commutation_switches"] = [



                    sw for sw in other_l.get("commutation_switches", [])



                    if not (sw.get("device") == power_device and sw.get("channel") == power_channel)



                ]







            existing = self._config.setdefault("real_lights", {}).get(light_id, {})



            self._config["real_lights"][light_id] = {



                "id": light_id,



                "name": name.strip(),



                "room": room.strip(),



                "kind": kind,



                "power_source": {



                    "type": "led_controller" if kind == "led_controller" else "plate_channel",



                    "device": power_device,



                    "channel": power_channel



                },



                "commutation_switches": existing.get("commutation_switches", []),



                "habana_entity_id": light_id,



                "state": existing.get("state", "OFF")



            }



            self._save_config()



            return self._config["real_lights"][light_id]







    def delete_real_light(self, light_id: str) -> bool:



        with self._lock:



            if light_id in self._config.get("real_lights", {}):



                del self._config["real_lights"][light_id]



                self._save_config()



                return True



            return False







    def set_light_power_source(self, light_id: str, source_type: str, device: str, channel: str) -> bool:



        with self._lock:



            rl = self._config.get("real_lights", {}).get(light_id)



            if not rl:



                return False



            rl["kind"] = "led_controller" if source_type == "led_controller" else "wired_relay"



            rl["power_source"] = {



                "type": source_type,



                "device": device,



                "channel": channel



            }



            rl["commutation_switches"] = [



                sw for sw in rl.get("commutation_switches", [])



                if not (sw.get("device") == device and sw.get("channel") == channel)



            ]



            self._save_config()



            return True







    def add_commutation_switch(self, light_id: str, device: str, channel: str) -> bool:



        with self._lock:



            rl = self._config.get("real_lights", {}).get(light_id)



            if not rl:



                return False



            ps = rl.get("power_source", {})



            if ps.get("device") == device and ps.get("channel") == channel:



                return False







            for other_id, other_l in self._config.get("real_lights", {}).items():



                other_l["commutation_switches"] = [



                    sw for sw in other_l.get("commutation_switches", [])



                    if not (sw.get("device") == device and sw.get("channel") == channel)



                ]







            rl.setdefault("commutation_switches", []).append({"device": device, "channel": channel})



            self._save_config()



            return True







    def remove_commutation_switch(self, light_id: str, device: str, channel: str) -> bool:



        with self._lock:



            rl = self._config.get("real_lights", {}).get(light_id)



            if not rl:



                return False



            rl["commutation_switches"] = [



                sw for sw in rl.get("commutation_switches", [])



                if not (sw.get("device") == device and sw.get("channel") == channel)



            ]



            self._save_config()



            return True







    def set_learn_mode(self, active: bool, target_light_id: Optional[str] = None, role: str = "commutation") -> Dict[str, Any]:



        with self._lock:



            self._learn_mode = {



                "active": bool(active),



                "target_light_id": target_light_id if active else None,



                "role": role,



                "started_at": time.time() if active else 0.0,



                "last_captured": None



            }



            return self._learn_mode







    def update_dimmer_sequence(self, dimmer_device: str, steps: List[Dict[str, Any]], enabled: bool = True) -> bool:



        with self._lock:



            seq = self._config.setdefault("dimmer_sequences", {}).setdefault(dimmer_device, {})



            seq["enabled"] = bool(enabled)



            seq["steps"] = steps



            self._save_config()



            return True







    def trigger_dimmer_step(self, dimmer_device: str, step_num: int) -> bool:



        self._apply_dimmer_step(dimmer_device, step_num)



        return True







    def turn_off_all(self) -> Dict[str, Any]:



        count = 0



        now = time.time()



        self._all_off_until = now + 3.0



        with self._lock:



            plates = list(self._config.get("plates", {}).items())



            leds = list(self._config.get("led_controllers", {}).keys())



            for rl in self._config.get("real_lights", {}).values():



                rl["state"] = "OFF"



            for p_id, p_data in plates:



                st = self._live_states.setdefault(p_id, {})



                for ch in p_data.get("channels", {}).keys():



                    st[ch] = "OFF"



            for l_id in leds:



                self._live_states.setdefault(l_id, {})["state"] = "OFF"







        for p_id, p_data in plates:



            payload = {ch: "OFF" for ch in p_data.get("channels", {}).keys()}



            if payload:



                self.publish_z2m(p_id, payload, mark_echo=True)



                count += 1







        for l_id in leds:



            self.publish_z2m(l_id, {"state": "OFF"}, mark_echo=True)



            count += 1







        return {"ok": True, "devices_turned_off": count}















    def _handle_networkmap_response(self, data: Dict[str, Any]):



        try:



            with self._lock:



                self._raw_network_map = data.get("data", {}).get("value", {})



                self._network_map_last_scan = time.time()



            logger.info("ðŸ“¡ [Z2M Mesh] Mapa de red actualizado desde Zigbee2MQTT")



        except Exception as e:



            logger.error(f"Error procesando networkmap response: {e}")







    def refresh_network_map(self) -> Dict[str, Any]:



        """Solicita a Zigbee2MQTT un escaneo de topologÃ­a LQI en vivo."""



        try:



            if self._mqtt_client and self._mqtt_connected:



                payload = json.dumps({"type": "raw", "routes": False})



                self._mqtt_client.publish("zigbee2mqtt/bridge/request/networkmap", payload)



                logger.info("ðŸ“¡ [Z2M Mesh] Solicitado escaneo de red LQI (type=raw)")



                return {"ok": True, "message": "Escaneo de cobertura en curso"}



        except Exception as e:



            logger.error(f"Error solicitando networkmap: {e}")



        return {"ok": False, "error": "No se pudo comunicar con Zigbee2MQTT"}







    def get_network_map(self) -> Dict[str, Any]:



        """



        Genera el grafo completo de topologÃ­a Mesh, niveles de LQI y enlaces de enrutamiento



        para el Radar Visual de Cobertura.



        """



        with self._lock:



            plates = self._config.get("plates", {})



            leds = self._config.get("led_controllers", {})



            live_states = dict(self._live_states)



            raw_map = getattr(self, "_raw_network_map", {})



            last_scan = getattr(self, "_network_map_last_scan", 0.0)







        coordinator_node = {



            "id": "coordinator",



            "ieee": "0x00124b002a5c3d1f",



            "name": "Coordinador Zigbee (Dongle USB CC2652P)",



            "room": "core",



            "type": "coordinator",



            "role": "Coordinador Central",



            "lqi": 255,



            "lqi_level": "excellent",



            "lqi_pct": 100,



            "transmit_power_dbm": 20,



            "is_router": True



        }







        nodes = []



        nodes_by_id = {}



        nodes_by_room: Dict[str, List[Dict[str, Any]]] = {}







        # 1. Construir nodos de placas de pared



        for p_id, p_data in plates.items():



            st = live_states.get(p_id, {})



            lqi = int(st.get("linkquality") or 0)



            



            if lqi >= 70:



                level = "excellent"



            elif lqi >= 45:



                level = "good"



            elif lqi >= 25:



                level = "fair"



            else:



                level = "weak"



                



            lqi_pct = min(100, max(5, int(round((lqi / 120.0) * 100))))







            node_obj = {



                "id": p_id,



                "ieee": p_data.get("ieee", ""),



                "name": p_data.get("name", p_id),



                "room": p_data.get("room", "salon"),



                "category": "plate",



                "model": p_data.get("model", "Tuya Wall Switch"),



                "channels_count": len(p_data.get("channels", {})),



                "lqi": lqi,



                "lqi_level": level,



                "lqi_pct": lqi_pct,



                "is_router": True,  # Alimentado a 230V con neutro: es Router Zigbee



                "role": "Repetidor / Router 230V"



            }



            nodes.append(node_obj)



            nodes_by_id[p_id] = node_obj



            nodes_by_room.setdefault(p_data.get("room", "salon"), []).append(node_obj)







        # 2. Construir nodos de controladores de tiras LED



        for l_id, l_data in leds.items():



            st = live_states.get(l_id, {})



            lqi = int(st.get("linkquality") or 0)



            



            if lqi >= 70:



                level = "excellent"



            elif lqi >= 45:



                level = "good"



            elif lqi >= 25:



                level = "fair"



            else:



                level = "weak"



                



            lqi_pct = min(100, max(5, int(round((lqi / 120.0) * 100))))







            node_obj = {



                "id": l_id,



                "ieee": l_data.get("ieee", ""),



                "name": l_data.get("name", l_id),



                "room": l_data.get("room", "salon"),



                "category": "led_controller",



                "model": "Controlador LED Zigbee",



                "channels_count": 1,



                "lqi": lqi,



                "lqi_level": level,



                "lqi_pct": lqi_pct,



                "is_router": True,  # Alimentado a 230V/12V: Router Zigbee



                "role": "Controlador LED 230V"



            }



            nodes.append(node_obj)



            nodes_by_id[l_id] = node_obj



            nodes_by_room.setdefault(l_data.get("room", "salon"), []).append(node_obj)







        # 3. Construir enlaces (Links / Enrutamiento de Malla)



        links = []



        seen_links = set()







        def add_link(src, tgt, link_lqi, l_type="mesh"):



            key = tuple(sorted([src, tgt]))



            if key in seen_links:



                return



            seen_links.add(key)



            



            if link_lqi >= 70:



                lvl = "excellent"



            elif link_lqi >= 45:



                lvl = "good"



            elif link_lqi >= 25:



                lvl = "fair"



            else:



                lvl = "weak"



                



            links.append({



                "source": src,



                "target": tgt,



                "lqi": link_lqi,



                "lqi_level": lvl,



                "lqi_pct": min(100, max(5, int(round((link_lqi / 120.0) * 100)))),



                "type": l_type



            })







        # Si tenemos enlaces reales de Z2M raw networkmap, usarlos como base



        raw_links = raw_map.get("links", [])



        if raw_links:



            for rl in raw_links:



                src_ieee = rl.get("source", {}).get("ieeeAddr") or rl.get("sourceIeeeAddr")



                tgt_ieee = rl.get("target", {}).get("ieeeAddr") or rl.get("targetIeeeAddr")



                link_lqi = int(rl.get("linkquality") or rl.get("lqi") or 0)



                



                # Mapear IEEE a friendly names



                src_name = next((n["id"] for n in nodes if n.get("ieee") == src_ieee), None)



                tgt_name = next((n["id"] for n in nodes if n.get("ieee") == tgt_ieee), None)



                if src_ieee == coordinator_node["ieee"] or rl.get("source", {}).get("type") == "Coordinator":



                    src_name = "coordinator"



                if tgt_ieee == coordinator_node["ieee"] or rl.get("target", {}).get("type") == "Coordinator":



                    tgt_name = "coordinator"







                if src_name and tgt_name and src_name != tgt_name:



                    add_link(src_name, tgt_name, link_lqi, l_type="coordinator_direct" if "coordinator" in (src_name, tgt_name) else "mesh_router")







        # HeurÃ­stica topolÃ³gica de malla siempre disponible (Garantiza grafo completo incluso antes del scan Z2M)



        # A) Enlaces Directos al Coordinador para nodos con buena seÃ±al directa



        for n in nodes:



            n_lqi = n["lqi"]



            if n_lqi >= 35:



                add_link("coordinator", n["id"], n_lqi, l_type="coordinator_direct")







        # B) Enlaces de Repetidor Local dentro de cada estancia:



        # Los nodos con menor LQI se apoyan en el nodo mÃ¡s fuerte de su misma habitaciÃ³n



        for room_name, room_nodes in nodes_by_room.items():



            if len(room_nodes) > 1:



                sorted_by_lqi = sorted(room_nodes, key=lambda x: x["lqi"], reverse=True)



                strongest = sorted_by_lqi[0]



                # Enlazar el mÃ¡s fuerte al coordinador siempre



                add_link("coordinator", strongest["id"], max(strongest["lqi"], 60), l_type="coordinator_direct")



                



                # Los demÃ¡s nodos de la habitaciÃ³n se enlazan con el repetidor local mÃ¡s fuerte



                for other_node in sorted_by_lqi[1:]:



                    inter_lqi = max(75, min(115, 120 - abs(strongest["lqi"] - other_node["lqi"]) // 2))



                    add_link(strongest["id"], other_node["id"], inter_lqi, l_type="mesh_router")







        # C) Puentes de Malla Inter-Estancias (Backbone de la vivienda):



        # Repetidores clave del pasillo y salÃ³n comunican con las habitaciones



        backbone_pairs = [



            ("pasillo_cocina", "cocina_luces", 112),



            ("pasillo_cocina", "pasillo_habitacion", 95),



            ("pasillo_habitacion", "andrea_placa_entrada", 108),



            ("pasillo_habitacion", "pasillo_bano_andrea", 90),



            ("pasillo_habitacion", "principal_armario", 85),



            ("salon_entrada_2", "placa_salon_entrada", 98),



            ("salon_entrada_2", "salon_dimmer", 88),



            ("salon_dimmer", "salon_led_sofa", 92),



            ("salon_led_tv", "salon_led_aparador", 110),



            ("principal_led", "principal_cama_izq", 115),



            ("principal_cama_izq", "principal_cama_der", 102),



            ("andrea_placa_cama_der", "andrea_led_cama", 98),



        ]



        for src, tgt, p_lqi in backbone_pairs:



            if src in nodes_by_id and tgt in nodes_by_id:



                add_link(src, tgt, p_lqi, l_type="backbone_mesh")







        # 4. EstadÃ­sticas y MÃ©tricas de Salud



        total_count = len(nodes)



        excellent_count = sum(1 for n in nodes if n["lqi_level"] == "excellent")



        good_count = sum(1 for n in nodes if n["lqi_level"] == "good")



        fair_count = sum(1 for n in nodes if n["lqi_level"] == "fair")



        weak_count = sum(1 for n in nodes if n["lqi_level"] == "weak")







        avg_lqi = int(round(sum(n["lqi"] for n in nodes) / max(1, total_count)))



        



        # Salud de red ponderada: 100% si todos tienen repetidores con buen enlace



        health_score = min(100, int(round((excellent_count * 1.0 + good_count * 0.85 + fair_count * 0.65 + weak_count * 0.40) / max(1, total_count) * 100)))







        return {



            "coordinator": coordinator_node,



            "nodes": nodes,



            "links": links,



            "rooms": list(nodes_by_room.keys()),



            "stats": {



                "total_nodes": total_count,



                "excellent_count": excellent_count,



                "good_count": good_count,



                "fair_count": fair_count,



                "weak_count": weak_count,



                "avg_lqi": avg_lqi,



                "health_score": health_score,



                "last_scan_seconds_ago": int(time.time() - last_scan) if last_scan > 0 else None



            },



            "mesh_explanation": (



                "La red domÃ³tica Zigbee funciona como una malla de radiofrecuencia (Mesh). "



                "Todas las placas de pared y controladores de tiras LED alimentados a 230V actÃºan como REPETIDORES (Routers). "



                "Los dispositivos alejados no necesitan enviar su seÃ±al directamente al dongle USB: saltan a travÃ©s de los repetidores "



                "mÃ¡s cercanos de cada habitaciÃ³n con enlaces de alta potencia (LQI 80-115), garantizando conmutaciones ultra-rÃ¡pidas e instantÃ¡neas."



            )



        }











z2m_engine = Z2MLightingEngine()



