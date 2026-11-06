import os
import re

import json

import logging

import threading

import time

from datetime import datetime

from typing import Dict, Any, List, Optional



logger = logging.getLogger("AutomationService")



BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CONFIG_DIR = os.path.join(BASE_DIR, "config")

AUTOMATIONS_FILE = os.path.join(CONFIG_DIR, "automations.json")



DEFAULT_AUTOMATIONS: List[Dict[str, Any]] = [
    {
        "id": "auto_notificaciones_cambios_whatsapp",
        "name": "Avisos WhatsApp de Cambios y Luces",
        "description": "Envía un mensaje de WhatsApp a Tomás cada vez que se enciende o apaga una luz, o se pulsa un interruptor en Habana.",
        "type": "automation",
        "icon": "📲",
        "enabled": True,
        "trigger": {
            "type": "state_change",
            "scope": "all_lights_and_switches"
        },
        "conditions": [],
        "actions": [
            {
                "type": "whatsapp_notification",
                "recipient": "34647797575@s.whatsapp.net"
            }
        ],
        "tts_message": None,
        "tts_speaker": None,
        "last_triggered": None,
        "execution_count": 0
    },

    {

        "id": "scene_buenas_noches",

        "name": "Modo Buenas Noches",

        "description": "Apaga todas las luces, baja persianas y deja luz tenue cálida en Andrea.",

        "type": "scene",

        "icon": "🌙",

        "enabled": True,

        "trigger": {

            "type": "manual",

            "voice_command": "buenas noches"

        },

        "conditions": [],

        "actions": [

            {

                "entity_id": "luz_lazos_andrea",

                "action": "turn_off"

            },

            {

                "entity_id": "luz_ventana_andrea",

                "action": "turn_off"

            },

            {

                "entity_id": "led_cama_andrea",

                "action": "turn_on",

                "brightness": 15,

                "color_temp_kelvin": 2700

            },

            {

                "entity_id": "cover.persiana_andrea",

                "action": "set_cover_position",

                "position": 0

            },

            {

                "entity_id": "luz_luz_principal_del_salon_53c1",

                "action": "turn_off"

            },

            {

                "entity_id": "luz_luz_del_comedor_d9b2",

                "action": "turn_off"

            },

            {

                "entity_id": "led_tv_salon",

                "action": "turn_off"

            },

            {

                "entity_id": "led_sofa_salon",

                "action": "turn_off"

            },

            {

                "entity_id": "led_aparador_salon",

                "action": "turn_off"

            },

            {

                "entity_id": "cover.persiana_salon",

                "action": "set_cover_position",

                "position": 0

            }

        ],

        "tts_message": "Buenas noches, activando modo descanso y bajando persianas.",

        "tts_speaker": "todos",

        "last_triggered": None,

        "execution_count": 0

    },

    {

        "id": "auto_camara_presencia_andrea",

        "name": "Luz de Noche Andrea por Cámara",

        "description": "Enciende tenue la tira LED de Andrea al detectar presencia por cámara de noche.",

        "type": "automation",

        "icon": "👁️",

        "enabled": True,

        "trigger": {

            "type": "camera",

            "camera_id": "camara_andrea",

            "camera_name": "Cámara Habitación Andrea",

            "event": "person_detected"

        },

        "conditions": [

            {

                "type": "time_window",

                "after": "22:00",

                "before": "07:30"

            }

        ],

        "actions": [

            {

                "entity_id": "led_cama_andrea",

                "action": "turn_on",

                "brightness": 25,

                "color_temp_kelvin": 2700

            }

        ],

        "tts_message": None,

        "tts_speaker": None,

        "last_triggered": None,

        "execution_count": 0

    },

    {

        "id": "scene_modo_cine",

        "name": "Modo Cine Salón",

        "description": "Atenúa la iluminación del salón y prepara el ambiente para películas.",

        "type": "scene",

        "icon": "🎬",

        "enabled": True,

        "trigger": {

            "type": "manual",

            "voice_command": "modo cine"

        },

        "conditions": [],

        "actions": [

            {

                "entity_id": "luz_luz_principal_del_salon_53c1",

                "action": "turn_off"

            },

            {

                "entity_id": "luz_luz_del_comedor_d9b2",

                "action": "turn_off"

            },

            {

                "entity_id": "led_tv_salon",

                "action": "turn_on",

                "brightness": 35,

                "color_temp_kelvin": 4000

            },

            {

                "entity_id": "led_sofa_salon",

                "action": "turn_on",

                "brightness": 20,

                "color_temp_kelvin": 2700

            },

            {

                "entity_id": "led_aparador_salon",

                "action": "turn_off"

            },

            {

                "entity_id": "cover.persiana_salon",

                "action": "set_cover_position",

                "position": 10

            }

        ],

        "tts_message": "Ambiente de cine configurado. Disfruta de la película.",

        "tts_speaker": "salon",

        "last_triggered": None,

        "execution_count": 0

    },

    {

        "id": "scene_salon_relax",

        "name": "Modo Relax Salón",

        "description": "Luz tenue y cálida en tiras LED del salón para lectura y descanso.",

        "type": "scene",

        "icon": "🛋️",

        "enabled": True,

        "trigger": {

            "type": "manual",

            "voice_command": "modo relax"

        },

        "conditions": [],

        "actions": [

            {

                "entity_id": "luz_luz_principal_del_salon_53c1",

                "action": "turn_off"

            },

            {

                "entity_id": "led_sofa_salon",

                "action": "turn_on",

                "brightness": 50,

                "color_temp_kelvin": 2700

            },

            {

                "entity_id": "led_tv_salon",

                "action": "turn_off"

            },

            {

                "entity_id": "led_aparador_salon",

                "action": "turn_on",

                "brightness": 35,

                "color_temp_kelvin": 2700

            },

            {

                "entity_id": "cover.persiana_salon",

                "action": "set_cover_position",

                "position": 30

            }

        ],

        "tts_message": "Ambiente de relax y lectura configurado en el salón.",

        "tts_speaker": "salon",

        "last_triggered": None,

        "execution_count": 0

    },

    {

        "id": "scene_salon_fiesta",

        "name": "Modo Salón Total",

        "description": "Encendido pleno de todas las luminarias y tiras LED del salón al 100%.",

        "type": "scene",

        "icon": "☀️",

        "enabled": True,

        "trigger": {

            "type": "manual",

            "voice_command": "salon total"

        },

        "conditions": [],

        "actions": [

            {

                "entity_id": "luz_luz_principal_del_salon_53c1",

                "action": "turn_on"

            },

            {

                "entity_id": "luz_luz_del_comedor_d9b2",

                "action": "turn_on"

            },

            {

                "entity_id": "led_sofa_salon",

                "action": "turn_on",

                "brightness": 100,

                "color_temp_kelvin": 4000

            },

            {

                "entity_id": "led_tv_salon",

                "action": "turn_on",

                "brightness": 100,

                "color_temp_kelvin": 4000

            },

            {

                "entity_id": "led_aparador_salon",

                "action": "turn_on",

                "brightness": 100,

                "color_temp_kelvin": 4000

            },

            {

                "entity_id": "cover.persiana_salon",

                "action": "open_cover",

                "position": 100

            }

        ],

        "tts_message": "Iluminación completa del salón activada al máximo.",

        "tts_speaker": "salon",

        "last_triggered": None,

        "execution_count": 0

    },

    {

        "id": "scene_salon_todo_off",

        "name": "Apagar Salón",

        "description": "Apaga instantáneamente todas las luces y tiras LED del salón.",

        "type": "scene",

        "icon": "⚫",

        "enabled": True,

        "trigger": {

            "type": "manual",

            "voice_command": "apagar salon"

        },

        "conditions": [],

        "actions": [

            {

                "entity_id": "luz_luz_principal_del_salon_53c1",

                "action": "turn_off"

            },

            {

                "entity_id": "luz_luz_del_comedor_d9b2",

                "action": "turn_off"

            },

            {

                "entity_id": "luz_comedor_salon",

                "action": "turn_off"

            },

            {

                "entity_id": "luz_techo_salon",

                "action": "turn_off"

            },

            {

                "entity_id": "led_sofa_salon",

                "action": "turn_off"

            },

            {

                "entity_id": "led_tv_salon",

                "action": "turn_off"

            },

            {

                "entity_id": "led_aparador_salon",

                "action": "turn_off"

            }

        ],

        "tts_message": "Todas las luces del salón han sido apagadas.",

        "tts_speaker": "salon",

        "last_triggered": None,

        "execution_count": 0

    },

    {

        "id": "auto_sensor_movimiento_pasillo",

        "name": "Luz Pasillo por Detección",

        "description": "Enciende la tira LED del pasillo al detectar movimiento en el sensor.",

        "type": "automation",

        "icon": "🚶",

        "enabled": True,

        "trigger": {

            "type": "sensor",

            "entity_id": "binary_sensor.presencia_pasillo",

            "sensor_name": "Sensor Movimiento Pasillo",

            "to_state": "on"

        },

        "conditions": [

            {

                "type": "time_window",

                "after": "21:00",

                "before": "07:00"

            }

        ],

        "actions": [

            {

                "entity_id": "led_pasillo_central",

                "action": "turn_on",

                "brightness": 40,

                "color_temp_kelvin": 3000

            }

        ],

        "tts_message": None,

        "tts_speaker": None,

        "last_triggered": None,

        "execution_count": 0

    },

    {

        "id": "auto_horario_despertar",

        "name": "Amanecer Automático 08:00",

        "description": "Sube persianas progresivamente y activa luz natural a las 08:00 en días laborables.",

        "type": "automation",

        "icon": "☀️",

        "enabled": True,

        "trigger": {

            "type": "time",

            "time": "08:00",

            "days": ["mon", "tue", "wed", "thu", "fri"]

        },

        "conditions": [],

        "actions": [

            {

                "entity_id": "cover.persiana_andrea",

                "action": "open_cover",

                "position": 100

            },

            {

                "entity_id": "cover.persiana_salon",

                "action": "open_cover",

                "position": 100

            },

            {

                "entity_id": "led_foso_andrea",

                "action": "turn_on",

                "brightness": 50,

                "color_temp_kelvin": 4000

            }

        ],

        "tts_message": "Buenos días. Iniciando rutina matinal.",

        "tts_speaker": "todos",

        "last_triggered": None,

        "execution_count": 0

    },

    {

        "id": "auto_camara_pasillo_humano",

        "name": "Luz Pasillo por Visión de Cámara (Pet-Safe)",

        "description": "Enciende la luz del pasillo al detectar una persona humana en la cámara (24/7), ignorando a los gatos.",

        "type": "automation",

        "icon": "📹",

        "enabled": True,

        "trigger": {

            "type": "camera",

            "camera_id": "camara_pasillo",

            "camera_name": "Cámara Pasillo",

            "event": "person_detected"

        },

        "conditions": [

            {

                "type": "pet_immunity",

                "camera_id": "camara_pasillo"

            }

        ],

        "actions": [

            {

                "type": "device",

                "entity_id": "led_pasillo_central",

                "action": "turn_on",

                "brightness": 60,

                "color_temp_kelvin": 3000

            }

        ],

        "tts_message": None,

        "tts_speaker": None,

        "last_triggered": None,

        "execution_count": 0

    },

    {

        "id": "auto_camara_cam720_salon",

        "name": "Luz Nocturna Salón por Visión Cam720",

        "description": "Enciende suavemente la tira LED del sofá al ver entrar a una persona en el salón (24/7), ignorando a los gatos.",

        "type": "automation",

        "icon": "👁️",

        "enabled": True,

        "trigger": {

            "type": "camera",

            "camera_id": "camara_cam720",

            "camera_name": "Cámara Cam720 Salón",

            "event": "person_detected"

        },

        "conditions": [

            {

                "type": "pet_immunity",

                "camera_id": "camara_cam720"

            }

        ],

        "actions": [

            {

                "type": "device",

                "entity_id": "led_sofa_salon",

                "action": "turn_on",

                "brightness": 25,

                "color_temp_kelvin": 2700

            }

        ],

        "tts_message": None,

        "tts_speaker": None,

        "last_triggered": None,

        "execution_count": 0

    }

]





class AutomationService:

    def __init__(self):

        self._lock = threading.RLock()

        self._automations: Dict[str, Dict[str, Any]] = {}

        self._active_timers: Dict[str, Dict[str, Any]] = {}

        self._running = False

        self._thread: Optional[threading.Thread] = None

        self._last_minute_checked: Optional[str] = None

        self._load()



    def _normalize_eid(self, eid: str) -> str:
        if not eid:
            return ""
        s = eid.lower().replace("ñ", "n").replace("�", "n")
        s = s.replace("bano", "bao")
        return re.sub(r'[^a-z0-9_]', '', s).strip()

    def has_active_timer(self, entity_id: str) -> bool:
        """Comprueba si hay un temporizador activo para la entidad (buscando id exacto o normalizado)."""
        with self._lock:
            norm = self._normalize_eid(entity_id)
            for k in self._active_timers.keys():
                norm_k = self._normalize_eid(k)
                if k == entity_id or norm_k == norm or (len(norm) > 5 and norm in norm_k) or (len(norm_k) > 5 and norm_k in norm):
                    return True
            return False

    def cancel_timer_if_active(self, entity_id: str) -> bool:
        """Cancela cualquier temporizador de cuenta atras activo para un dispositivo."""
        with self._lock:
            norm = self._normalize_eid(entity_id)
            cancelled = False
            keys_to_remove = []
            for k in list(self._active_timers.keys()):
                norm_k = self._normalize_eid(k)
                if k == entity_id or norm_k == norm or (len(norm) > 5 and norm in norm_k) or (len(norm_k) > 5 and norm_k in norm):
                    keys_to_remove.append(k)
            for k in keys_to_remove:
                timer_info = self._active_timers.pop(k, None)
                if timer_info:
                    t = timer_info.get("timer")
                    if t:
                        try:
                            t.cancel()
                        except Exception as e:
                            logger.warning(f"Error cancelando timer de {k}: {e}")
                    logger.info(f"[TimedOn] Temporizador cancelado para {k}")
                    cancelled = True
            return cancelled

    def get_timed_on_rule_for_entity(self, entity_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            norm_target = self._normalize_eid(entity_id)
            automations_list = self._automations.values() if isinstance(self._automations, dict) else self._automations
            for item in automations_list:
                if not isinstance(item, dict):
                    continue
                if not item.get("enabled", True):
                    continue
                for act in item.get("actions", []):
                    if not isinstance(act, dict):
                        continue
                    if act.get("action") == "timed_on":
                        act_eid = act.get("entity_id", "")
                        norm_act = self._normalize_eid(act_eid)
                        if act_eid == entity_id or norm_act == norm_target or (len(norm_target) > 5 and norm_target in norm_act) or (len(norm_act) > 5 and norm_act in norm_target):
                            return act
            return None



    def start_timed_on_countdown(

        self,

        entity_id: str,

        duration_minutes: float = 1.0,

        brightness_pct: Optional[int] = None,

        color_temp_kelvin: Optional[int] = None,

        rgb_color: Optional[List[int]] = None,

        ensure_on: bool = True

    ) -> Dict[str, Any]:

        """

        Inicia la cuenta atrás de auto-apagado para entity_id.

        Si ensure_on es True, envía orden turn_on si el dispositivo no estaba ya encendido.

        Al expirar el tiempo, apaga automáticamente el dispositivo en Z2M/HA.

        """

        from app.services.z2m_lighting_engine import z2m_engine

        from app.services.home_assistant import home_assistant_service



        with self._lock:

            self.cancel_timer_if_active(entity_id)



            duration_secs = max(5, int(float(duration_minutes) * 60))

            logger.info(f"[TimedOn] Iniciando cuenta atrás de {duration_minutes} min ({duration_secs}s) para {entity_id}...")



            if ensure_on:

                res = z2m_engine.control_habana_entity(

                    entity_id=entity_id,

                    action="turn_on",

                    brightness_pct=brightness_pct,

                    color_temp_kelvin=color_temp_kelvin,

                    rgb_color=rgb_color

                )

                if not res.get("ok"):

                    home_assistant_service.control_device(

                        entity_id=entity_id,

                        action="turn_on",

                        brightness_pct=brightness_pct,

                        color_temp_kelvin=color_temp_kelvin,

                        rgb_color=rgb_color

                    )



            def _auto_off_callback():

                logger.info(f"[TimedOn] ⏱️ Cuenta atrás de {duration_minutes} min finalizada para {entity_id}. APAGANDO AUTOMÁTICAMENTE...")

                with self._lock:

                    norm = self._normalize_eid(entity_id)

                    keys_to_remove = [k for k in list(self._active_timers.keys()) if k == entity_id or self._normalize_eid(k) == norm]

                    for k in keys_to_remove:

                        self._active_timers.pop(k, None)

                try:

                    off_res = z2m_engine.control_habana_entity(entity_id, action="turn_off")

                    if not off_res.get("ok"):

                        home_assistant_service.control_device(entity_id, action="turn_off")

                    logger.info(f"[TimedOn] ✅ Auto-apagado exitoso de {entity_id}")

                except Exception as ex:

                    logger.error(f"[TimedOn] ❌ Error en auto-apagado de {entity_id}: {ex}")



            timer = threading.Timer(duration_secs, _auto_off_callback)

            timer.daemon = True

            timer.start()



            now = time.time()

            self._active_timers[entity_id] = {

                "timer": timer,

                "entity_id": entity_id,

                "duration_minutes": duration_minutes,

                "started_at": now,

                "ends_at": now + duration_secs

            }



            return {

                "ok": True,

                "status": "timed_on_started",

                "action_executed": "timed_on",

                "entity_id": entity_id,

                "duration_minutes": duration_minutes,

                "duration_seconds": duration_secs,

                "seconds_remaining": duration_secs,

                "message": f"{entity_id} encendido con cuenta atrás de {duration_minutes} min."

            }



    def on_hardware_button_pressed(self, entity_id: str, new_state: str) -> Dict[str, Any]:

        """

        Manejador llamado cuando se detecta una pulsación física en la pared sobre una luz o carga.

        - Si el temporizador estaba activo:

          El usuario ha vuelto a pulsar la tecla en la pared. Cancela el timer y apaga de inmediato.

        - Si new_state == "ON" y tiene regla timed_on configurada:

          Arranca la cuenta atrás con los minutos de la regla (ej. 1 min).

        - Si new_state == "OFF":

          Cancela el timer si estuviera activo.

        """

        from app.services.z2m_lighting_engine import z2m_engine

        from app.services.home_assistant import home_assistant_service



        st_upper = str(new_state).upper()

        has_timer = self.has_active_timer(entity_id)



        if has_timer:

            # Re-pulsación física mientras la cuenta atrás corre -> Apagar de inmediato

            logger.info(f"[TimedOn Wall] Re-pulsación en la pared para {entity_id} con cuenta atrás activa. Cancelando y APAGANDO.")

            self.cancel_timer_if_active(entity_id)

            res = z2m_engine.control_habana_entity(entity_id, action="turn_off")

            if not res.get("ok"):

                res = home_assistant_service.control_device(entity_id, action="turn_off")

            return {"handled": True, "action": "turn_off_and_cancel_timer"}



        if st_upper == "ON":

            rule = self.get_timed_on_rule_for_entity(entity_id)

            if rule:

                dur = float(rule.get("duration_minutes") or rule.get("duration") or 1.0)

                bri = rule.get("brightness")

                kel = rule.get("color_temp_kelvin")

                rgb = rule.get("rgb_color")

                logger.info(f"[TimedOn Wall] Pulsación ON en pared para {entity_id}. Regla temporizada detectada: {dur} min. Iniciando cuenta atrás...")

                self.start_timed_on_countdown(

                    entity_id=entity_id,

                    duration_minutes=dur,

                    brightness_pct=bri,

                    color_temp_kelvin=kel,

                    rgb_color=rgb,

                    ensure_on=False

                )

                return {"handled": True, "action": "timed_on_started", "duration_minutes": dur}



        elif st_upper == "OFF":

            self.cancel_timer_if_active(entity_id)



        return {"handled": False}



    def get_active_timers(self) -> List[Dict[str, Any]]:

        """Devuelve la lista de temporizadores de cuenta atras activos."""

        with self._lock:

            now = time.time()

            result = []

            for eid, info in list(self._active_timers.items()):

                remaining = max(0, int(info.get("ends_at", now) - now))

                result.append({

                    "entity_id": eid,

                    "duration_minutes": info.get("duration_minutes", 10),

                    "seconds_remaining": remaining,

                    "started_at": info.get("started_at"),

                    "ends_at": info.get("ends_at")

                })

            return result



    def handle_timed_on(

        self,

        entity_id: str,

        duration_minutes: float = 10,

        brightness_pct: Optional[int] = None,

        color_temp_kelvin: Optional[int] = None,

        rgb_color: Optional[List[int]] = None

    ) -> Dict[str, Any]:

        """

        Encendido temporizado con toggle inteligente:

        - Si el dispositivo ya esta ON o tiene una cuenta atras en marcha:

          Cancela el temporizador de inmediato y apaga el dispositivo (toggle off).

        - Si esta OFF:

          Enciende el dispositivo e inicia la cuenta atras. Al expirar el tiempo, se apaga solo.

        """

        from app.services.z2m_lighting_engine import z2m_engine

        from app.services.home_assistant import home_assistant_service



        with self._lock:

            has_active_timer = entity_id in self._active_timers



            is_currently_on = False

            try:

                all_devs = {d.get("entity_id") or d.get("id"): d for d in z2m_engine.get_habana_devices_list()}

                dev = all_devs.get(entity_id)

                if dev:

                    st = str(dev.get("state", "")).lower()

                    if st in ("on", "open"):

                        is_currently_on = True

                else:

                    ha_st = home_assistant_service.get_state(entity_id)

                    if ha_st and str(ha_st.get("state", "")).lower() in ("on", "open"):

                        is_currently_on = True

            except Exception as e:

                logger.warning(f"[TimedOn] No se pudo leer estado de {entity_id}: {e}")



            if has_active_timer or is_currently_on:

                self.cancel_timer_if_active(entity_id)

                logger.info(f"[TimedOn] Re-pulsacion en {entity_id} (timer={has_active_timer}, on={is_currently_on}). Cancelando cuenta atras y apagando.")

                res = z2m_engine.control_habana_entity(entity_id, action="turn_off")

                if not res.get("ok"):

                    res = home_assistant_service.control_device(entity_id, action="turn_off")

                return {

                    "ok": True,

                    "status": "turned_off",

                    "action_executed": "turn_off",

                    "timer_cancelled": True,

                    "entity_id": entity_id,

                    "message": f"{entity_id} apagado y cuenta atras cancelada."

                }



        return self.start_timed_on_countdown(

            entity_id=entity_id,

            duration_minutes=duration_minutes,

            brightness_pct=brightness_pct,

            color_temp_kelvin=color_temp_kelvin,

            rgb_color=rgb_color,

            ensure_on=True

        )



    def _load(self):
        with self._lock:
            os.makedirs(CONFIG_DIR, exist_ok=True)
            if os.path.exists(AUTOMATIONS_FILE):
                try:
                    with open(AUTOMATIONS_FILE, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            self._automations = {item["id"]: item for item in data if "id" in item}
                        elif isinstance(data, dict):
                            self._automations = data
                        logger.info(f"Cargadas {len(self._automations)} automatizaciones/escenas desde disco.")
                except Exception as e:
                    logger.error(f"Error cargando {AUTOMATIONS_FILE}: {e}")
                    self._automations = {item["id"]: item for item in DEFAULT_AUTOMATIONS}
            else:
                self._automations = {item["id"]: item for item in DEFAULT_AUTOMATIONS}

            # Asegurar que la automatización de avisos por WhatsApp de cambios esté siempre presente
            if "auto_notificaciones_cambios_whatsapp" not in self._automations:
                self._automations["auto_notificaciones_cambios_whatsapp"] = {
                    "id": "auto_notificaciones_cambios_whatsapp",
                    "name": "Avisos WhatsApp de Cambios y Luces",
                    "description": "Envía un mensaje de WhatsApp a Tomás cada vez que se enciende o apaga una luz, o se pulsa un interruptor en Habana.",
                    "type": "automation",
                    "icon": "📲",
                    "enabled": True,
                    "trigger": {
                        "type": "state_change",
                        "scope": "all_lights_and_switches"
                    },
                    "conditions": [],
                    "actions": [
                        {
                            "type": "whatsapp_notification",
                            "recipient": "34647797575@s.whatsapp.net"
                        }
                    ],
                    "tts_message": None,
                    "tts_speaker": None,
                    "last_triggered": None,
                    "execution_count": 0
                }
            self._save()

    def _save(self):

        with self._lock:

            try:

                os.makedirs(CONFIG_DIR, exist_ok=True)

                tmp_file = f"{AUTOMATIONS_FILE}.tmp"

                with open(tmp_file, "w", encoding="utf-8") as f:

                    json.dump(list(self._automations.values()), f, indent=2, ensure_ascii=False)

                os.replace(tmp_file, AUTOMATIONS_FILE)

            except Exception as e:

                logger.error(f"Error guardando {AUTOMATIONS_FILE}: {e}")



    def list_automations(self) -> List[Dict[str, Any]]:

        with self._lock:

            return list(self._automations.values())



    get_automations = list_automations



    def get_automation(self, automation_id: str) -> Optional[Dict[str, Any]]:

        with self._lock:

            return self._automations.get(automation_id)



    def save_automation(self, data: Dict[str, Any]) -> Dict[str, Any]:

        """Crea o actualiza una automatización o escena."""

        with self._lock:

            aid = data.get("id") or f"auto_{int(time.time())}"

            aid = str(aid).strip().replace(" ", "_")



            current = self._automations.get(aid, {})

            current.update({

                "id": aid,

                "name": data.get("name") or current.get("name") or "Nueva Automatización",

                "description": data.get("description", current.get("description", "")),

                "type": data.get("type") or current.get("type") or "automation",

                "icon": data.get("icon") or current.get("icon") or ("🎬" if data.get("type") == "scene" else "⚡"),

                "enabled": data.get("enabled", current.get("enabled", True)),

                "trigger": data.get("trigger") or current.get("trigger") or {"type": "manual"},

                "conditions": data.get("conditions", current.get("conditions", [])),

                "actions": data.get("actions", current.get("actions", [])),

                "tts_message": data.get("tts_message", current.get("tts_message")),

                "tts_speaker": data.get("tts_speaker", current.get("tts_speaker", "todos")),
                "category": data.get("category") or current.get("category") or ("scene" if data.get("type") == "scene" else "custom"),
                "is_quick_scene": data.get("is_quick_scene") if data.get("is_quick_scene") is not None else current.get("is_quick_scene", False),
                "quick_color": data.get("quick_color") or current.get("quick_color") or "#00f3ff",
                "quick_order": data.get("quick_order") if data.get("quick_order") is not None else current.get("quick_order", 50),

                "last_triggered": current.get("last_triggered"),

                "execution_count": current.get("execution_count", 0)

            })



            self._automations[aid] = current

            self._save()

            logger.info(f"Automatización guardada: {aid} ('{current['name']}')")

            return current



    def delete_automation(self, automation_id: str) -> bool:

        with self._lock:

            if automation_id in self._automations:

                del self._automations[automation_id]

                self._save()

                logger.info(f"Automatización eliminada: {automation_id}")

                return True

            return False



    def toggle_automation(self, automation_id: str) -> Optional[bool]:

        with self._lock:

            item = self._automations.get(automation_id)

            if not item:

                return None

            item["enabled"] = not item.get("enabled", True)

            self._save()

            return item["enabled"]



    def execute_automation(self, automation_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:

        """Ejecuta de inmediato todas las acciones de una escena o automatización."""

        with self._lock:

            item = self._automations.get(automation_id)

            if not item:

                return {"status": "error", "message": f"Automatización '{automation_id}' no encontrada."}



            force = bool(context and context.get("force"))

            if not item.get("enabled", True) and not force:

                return {"status": "skipped", "message": "Automatización en pausa (desactivada)."}



            if not force and not self._check_conditions(item.get("conditions", [])):

                return {"status": "condition_not_met", "message": "Las condiciones de ejecución no se cumplen en este momento."}



            action_set = context.get("action_set") if context else None
            if action_set == "close":
                actions = item.get("close_actions", [])
            else:
                actions = item.get("actions", [])

            executed_actions = []



            from app.services.z2m_lighting_engine import z2m_engine

            from app.services.home_assistant import home_assistant_service

            for act in actions:

                eid = act.get("entity_id")

                if not eid:

                    continue

                action_name = act.get("action")
                if not action_name:
                    action_name = "turn_off" if action_set == "close" else "turn_on"
                elif action_name == "toggle" and action_set == "close":
                    action_name = "turn_off" 

                if action_name != "timed_on":

                    self.cancel_timer_if_active(eid)

                pos = act.get("position")

                brightness = act.get("brightness")

                kelvin = act.get("color_temp_kelvin") or act.get("kelvin")

                rgb = act.get("rgb_color")



                if action_name == "timed_on":

                    dur = act.get("duration_minutes") or act.get("duration") or 10

                    timed_res = self.handle_timed_on(

                        entity_id=eid,

                        duration_minutes=dur,

                        brightness_pct=brightness,

                        color_temp_kelvin=kelvin,

                        rgb_color=rgb

                    )

                    executed_actions.append({"entity_id": eid, "action": "timed_on", "result": timed_res})
                    continue

                if eid in ("all", "all_lights", "all_off") or action_name in ("turn_off_all", "all_off"):
                    try:
                        res = z2m_engine.turn_off_all()
                        executed_actions.append({"entity_id": eid, "action": "turn_off_all", "result": res})
                    except Exception as e:
                        logger.error(f"Error apagando todo: {e}")
                    continue

                if eid in self._automations or act.get("type") in ("scene", "automation") or action_name in ("run_scene", "execute_scene", "scene"):
                    logger.info(f"🎬 [Automation] Ejecutando sub-escena/automatización '{eid}'")
                    try:
                        sub_res = self.execute_automation(eid, context={"force": True})
                        executed_actions.append({"entity_id": eid, "action": "scene", "result": sub_res})
                    except Exception as e:
                        logger.error(f"Error ejecutando escena/automatización {eid}: {e}")
                    continue



                try:

                    res = z2m_engine.control_habana_entity(

                        entity_id=eid,

                        action=action_name,

                        brightness_pct=brightness,

                        color_temp_kelvin=kelvin,

                        rgb_color=rgb,

                        position=pos,

                    )

                    if not res.get("ok"):

                        res = home_assistant_service.control_device(

                            entity_id=eid,

                            action=action_name,

                            position=pos,

                            brightness_pct=brightness,

                            color_temp_kelvin=kelvin,

                            rgb_color=rgb

                        )

                    executed_actions.append({"entity_id": eid, "action": action_name, "result": res})

                except Exception as e:

                    logger.error(f"Error ejecutando acción sobre {eid}: {e}")

                    executed_actions.append({"entity_id": eid, "action": action_name, "error": str(e)})



            # TTS si está configurado

            tts_text = item.get("close_tts_message") if action_set == "close" else item.get("tts_message")

            if tts_text:

                try:

                    from app.services.google_cast import cast_service

                    from app.services.tts import tts_service

                    if hasattr(tts_service, "generate_audio"):
                        audio_url = tts_service.generate_audio(tts_text)
                    elif hasattr(tts_service, "synthesize_speech"):
                        audio_url = tts_service.synthesize_speech(tts_text)
                    else:
                        audio_url = None

                    if audio_url:

                        speaker = item.get("tts_speaker") or "todos"

                        cast_service.play_url(speaker, audio_url)

                except Exception as e:

                    logger.warning(f"No se pudo emitir TTS de la automatización: {e}")



            # Actualizar estadísticas

            item["last_triggered"] = datetime.now().isoformat()

            item["execution_count"] = item.get("execution_count", 0) + 1

            self._save()



            logger.info(f"Automatización '{item['name']}' ({automation_id}) ejecutada con éxito. Acciones: {len(executed_actions)}")

            return {

                "status": "success",

                "id": automation_id,

                "name": item["name"],

                "executed_actions_count": len(executed_actions),

                "details": executed_actions,

                "last_triggered": item["last_triggered"]

            }



    def turn_off_automation(self, automation_id: str) -> Dict[str, Any]:

        """Apaga o revierte todas las entidades de iluminación y persianas vinculadas a una escena o regla."""

        with self._lock:

            item = self._automations.get(automation_id)

            if not item:

                return {"status": "error", "message": f"Automatización '{automation_id}' no encontrada."}



            actions = item.get("actions", [])

            executed_actions = []



            from app.services.z2m_lighting_engine import z2m_engine

            from app.services.home_assistant import home_assistant_service



            for act in actions:

                eid = act.get("entity_id")

                if not eid:

                    continue

                self.cancel_timer_if_active(eid)



                if "cover" in eid or "persiana" in eid:

                    action_name = "close_cover"

                    pos = 0

                else:

                    action_name = "turn_off"

                    pos = None



                try:

                    res = z2m_engine.control_habana_entity(

                        entity_id=eid,

                        action=action_name,

                        position=pos

                    )

                    if not res.get("ok"):

                        res = home_assistant_service.control_device(

                            entity_id=eid,

                            action=action_name,

                            position=pos

                        )

                    executed_actions.append({"entity_id": eid, "action": action_name, "result": res})

                except Exception as e:

                    logger.error(f"Error apagando entidad {eid} en escena {automation_id}: {e}")



            logger.info(f"Escena/Regla '{item['name']}' ({automation_id}) apagada. Acciones revertidas: {len(executed_actions)}")

            return {

                "status": "success",

                "id": automation_id,

                "name": item["name"],

                "reverted_actions_count": len(executed_actions),

                "details": executed_actions

            }



    def _check_conditions(self, conditions: List[Dict[str, Any]]) -> bool:

        """Verifica si todas las condiciones opcionales de la regla se cumplen."""

        if not conditions:

            return True



        now = datetime.now()

        current_time_str = now.strftime("%H:%M")



        for cond in conditions:

            ctype = cond.get("type")

            if ctype == "time_window":

                after = cond.get("after")

                before = cond.get("before")

                if after and before:

                    if after <= before:

                        if not (after <= current_time_str <= before):

                            return False

                    else:  # Cruza la medianoche (ej: 22:00 a 07:00)

                        if not (current_time_str >= after or current_time_str <= before):

                            return False

            elif ctype == "pet_immunity":

                try:

                    from app.services.alarm_service import alarm_service

                    if alarm_service.pet_immunity_enabled:

                        cam_id = cond.get("camera_id") or "camara_pasillo"

                        from app.services.camera_service import camera_service

                        c = camera_service.classify_subject(cam_id)

                        if c.get("is_safe_pet_only") and c.get("has_pet"):

                            logger.info(f"Condición omitida por inmunidad a mascotas en {cam_id}.")

                            return False

                except Exception as e:

                    logger.debug(f"Error comprobando inmunidad a mascotas: {e}")

            elif ctype == "lux_below":

                try:

                    max_lux = float(cond.get("lux", 60))

                    from app.services.sensor_service import sensor_service

                    sens = sensor_service.get_sensor(cond.get("sensor_id", "sensor_lux_terraza"))

                    if sens:

                        curr = float(sens.get("attributes", {}).get("illuminance_lux", 100))

                        if curr >= max_lux:

                            return False

                except Exception:

                    pass

        return True



    def handle_sensor_trigger(self, sensor_id: str, new_state: str) -> List[Dict[str, Any]]:

        return self.trigger_by_sensor(sensor_id, new_state)



    def trigger_by_camera(self, camera_id: str, event_type: str) -> List[Dict[str, Any]]:

        """Dispara todas las automatizaciones vinculadas a eventos de visión de una cámara."""

        results = []

        with self._lock:

            for aid, auto in self._automations.items():

                if not auto.get("enabled", True):

                    continue

                trig = auto.get("trigger", {})

                if trig.get("type") == "camera":

                    c_id = trig.get("camera_id")

                    ev = trig.get("event")

                    if (c_id == camera_id or c_id == "all" or not c_id) and (ev == event_type or ev == "any"):

                        res = self.execute_automation(aid, context={"force": True, "event": event_type, "camera_id": camera_id})

                        results.append(res)

        return results



    def trigger_by_presence(self, user: str, room: str, event_type: str = "enter") -> List[Dict[str, Any]]:
        """Dispara automatizaciones basadas en la presencia de un habitante en una habitación (BLE/ESP32)."""
        results = []
        u_clean = user.lower().strip()
        r_clean = room.lower().strip()
        for aid, auto in self.automations.items():
            if not auto.get("enabled", True):
                continue
            trig = auto.get("trigger", {})
            if trig.get("type") in ("presence", "ble_presence"):
                t_user = (trig.get("user") or trig.get("person") or "any").lower().strip()
                t_room = (trig.get("room") or "any").lower().strip()
                t_ev = (trig.get("event") or "enter").lower().strip()
                if (t_user == "any" or t_user == u_clean) and (t_room == "any" or t_room == r_clean) and (t_ev == "any" or t_ev == event_type):
                    logger.info(f"⚡ [Automation] Disparando '{auto.get('name')}' por presencia de {user} en {room}")
                    res = self.execute_automation(aid, context={"force": True, "user": user, "room": room, "event": event_type})
                    results.append(res)
        return results

    def trigger_by_sensor(self, entity_id: str, new_state: str) -> List[Dict[str, Any]]:
        """Dispara automatizaciones vinculadas a un cambio de estado en un sensor con resolución inteligente de aliases."""
        results = []
        from app.services.sensor_service import sensor_service

        sensor_obj = sensor_service.get_sensor(entity_id) or {}
        valid_ids = {
            str(entity_id).lower(),
            str(sensor_obj.get("id", "")).lower(),
            str(sensor_obj.get("ieee", "")).lower(),
            str(sensor_obj.get("friendly_name", "")).lower()
        }
        valid_ids.discard("")

        with self._lock:
            for aid, auto in self._automations.items():
                if not auto.get("enabled", True):
                    continue

                trig = auto.get("trigger", {})
                if trig.get("type") == "sensor":
                    s_eid = str(trig.get("entity_id", "")).strip().lower()
                    matched = s_eid in valid_ids
                    if not matched and s_eid:
                        target_s = sensor_service.get_sensor(s_eid) or {}
                        t_ieee = str(target_s.get("ieee", "")).lower()
                        t_fn = str(target_s.get("friendly_name", "")).lower()
                        if (t_ieee and t_ieee in valid_ids) or (t_fn and t_fn in valid_ids):
                            matched = True
                        elif "puerta" in s_eid and any("puerta" in x for x in valid_ids):
                            matched = True
                        elif ("sonoff" in s_eid or "snzb" in s_eid) and any("sonoff" in x or "snzb" in x or "00124b" in x for x in valid_ids):
                            matched = True
                        elif ("moes" in s_eid or "pulsador" in s_eid or "boton" in s_eid) and any("moes" in x or "pulsador" in x or "boton" in x for x in valid_ids):
                            matched = True

                    if matched:
                        target_open = str(trig.get("to_state", "open")).strip().lower()
                        target_close = str(trig.get("close_state", "")).strip().lower()
                        n_state = str(new_state).strip().lower()

                        def _matches_button_pattern(pattern: str, state: str) -> bool:
                            if not pattern or not state:
                                return False
                            p = pattern.strip().lower()
                            s = state.strip().lower()
                            if p == s:
                                return True
                            if p in ("any", "*", "all", "cualquiera"):
                                return True
                            if p.endswith("_*") or p.endswith("_any"):
                                prefix = p.split("_")[0] + "_"
                                return s.startswith(prefix)
                            if p.startswith("*_") or p.startswith("any_"):
                                suffix = "_" + p.split("_", 1)[1]
                                return s.endswith(suffix)
                            return False

                        is_button = (
                            sensor_obj.get("category") == "button" or
                            sensor_obj.get("type") == "wireless_button" or
                            any(b in target_open for b in ("single", "double", "hold", "1_", "2_", "3_", "4_"))
                        )

                        if is_button:
                            matched_open = _matches_button_pattern(target_open, n_state)
                            matched_close = _matches_button_pattern(target_close, n_state) if target_close else False

                            if matched_open:
                                logger.info(f"🔘 [Automation] Pulsador {entity_id} ({new_state}) activando Acción Principal en '{aid}'")
                                res = self.execute_automation(aid, context={"force": True, "new_state": new_state, "entity_id": entity_id, "action_set": "open"})
                                results.append(res)
                            elif matched_close:
                                logger.info(f"🔘 [Automation] Pulsador {entity_id} ({new_state}) activando Acción Secundaria/Apagar en '{aid}'")
                                res = self.execute_automation(aid, context={"force": True, "new_state": new_state, "entity_id": entity_id, "action_set": "close"})
                                results.append(res)
                        else:
                            def_close = "closed" if target_open in ("open", "opened") else "off"
                            effective_close = target_close if target_close else def_close

                            if n_state == target_open or (target_open == "open" and n_state in ("open", "opened", "on", "active")):
                                logger.info(f"⚡ [Automation] Sensor {entity_id} ({new_state}) activando Estado 1 (ABRIR) en '{aid}'")
                                res = self.execute_automation(aid, context={"force": True, "new_state": new_state, "entity_id": entity_id, "action_set": "open"})
                                results.append(res)
                            elif n_state == effective_close or (effective_close == "closed" and n_state in ("closed", "off", "dry", "clear")):
                                logger.info(f"🔒 [Automation] Sensor {entity_id} ({new_state}) activando Estado 2 (CERRAR) en '{aid}'")
                                res = self.execute_automation(aid, context={"force": True, "new_state": new_state, "entity_id": entity_id, "action_set": "close"})
                                results.append(res)

        return results

    def _is_day_active(self, days: Any, now: datetime) -> bool:

        if not days:

            return True

        weekday_idx = now.weekday()  # 0 = Lunes ... 6 = Domingo

        day_en = now.strftime("%a").lower()  # 'mon', 'tue', ...

        days_es = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"]

        day_es = days_es[weekday_idx]

        for d in days:

            if isinstance(d, int) and d == weekday_idx:

                return True

            elif isinstance(d, str):

                clean_d = d.strip().lower()

                if clean_d.isdigit() and int(clean_d) == weekday_idx:

                    return True

                if clean_d in (day_en, day_es) or clean_d.startswith(day_en) or clean_d.startswith(day_es):

                    return True

        return False



    def check_time_triggers(self):

        """Comprueba cada minuto si alguna automatización horaria debe dispararse."""

        now = datetime.now()

        current_minute = now.strftime("%H:%M")

        if self._last_minute_checked == current_minute:

            return



        self._last_minute_checked = current_minute

        today_date_str = now.strftime("%Y-%m-%d")



        with self._lock:

            for aid, auto in self._automations.items():

                if not auto.get("enabled", True):

                    continue

                trig = auto.get("trigger", {})

                if trig.get("type") == "time":

                    t_str = trig.get("time")

                    end_str = trig.get("end_time")

                    days = trig.get("days", [])



                    if not self._is_day_active(days, now):

                        continue



                    # 1. Comprobar disparo de INICIO (a la hora exacta o si estamos en la ventana horaria y aún no se ejecutó hoy)

                    should_trigger_start = False

                    if t_str:

                        if t_str == current_minute:

                            should_trigger_start = True

                        elif end_str and t_str < end_str:

                            if t_str <= current_minute < end_str:

                                last_trig = auto.get("last_triggered")

                                if not last_trig or not str(last_trig).startswith(today_date_str):

                                    should_trigger_start = True



                    if should_trigger_start:

                        logger.info(f"⏰ Disparo horario de INICIO ({current_minute}) para '{auto['name']}' ({aid})")

                        threading.Thread(target=self.execute_automation, args=(aid,), daemon=True).start()



                    # 2. Comprobar disparo de FIN / Auto-apagado

                    elif end_str and end_str == current_minute:

                        logger.info(f"⏰ Disparo horario de FIN ({current_minute}) para '{auto['name']}' (Auto-apagado/reversión)")

                        threading.Thread(target=self.turn_off_automation, args=(aid,), daemon=True).start()



    def start_scheduler(self):

        """Inicia el hilo en segundo plano que vigila los disparadores horarios."""

        with self._lock:

            if self._running:

                return

            self._running = True

            self._thread = threading.Thread(target=self._scheduler_loop, daemon=True)

            self._thread.start()

            logger.info("Motor de Automatizaciones y Escenas iniciado en segundo plano.")



    def _scheduler_loop(self):

        while self._running:

            try:

                self.check_time_triggers()

            except Exception as e:

                logger.error(f"Error en bucle del planificador de automatizaciones: {e}")

            time.sleep(15)



    def stop_scheduler(self):

        with self._lock:

            self._running = False

    def notify_device_state_change(self, device_name: str, new_state: str, details: str = "", room: str = ""):
        """
        Notifica a Tomás por WhatsApp de un cambio de estado en luces, pulsadores o dispositivos si la
        automatización 'auto_notificaciones_cambios_whatsapp' está habilitada.
        Incluye buffer inteligente de 0.45s para agrupar cambios simultáneos y evitar spam.
        """
        with self._lock:
            auto = self._automations.get("auto_notificaciones_cambios_whatsapp")
            if not auto or not auto.get("enabled", True):
                return

        clean_dev = (device_name or "").strip()
        clean_state = str(new_state or "").strip().upper()
        if not clean_dev or not clean_state:
            return

        now = time.time()
        if not hasattr(self, "_wa_last_sent_states"):
            self._wa_last_sent_states = {}
        
        last_item = self._wa_last_sent_states.get(clean_dev)
        if last_item and last_item[0] == clean_state and (now - last_item[1]) < 1.5:
            return
        self._wa_last_sent_states[clean_dev] = (clean_state, now)

        if not hasattr(self, "_wa_notify_lock"):
            self._wa_notify_lock = threading.Lock()
        if not hasattr(self, "_wa_pending_changes"):
            self._wa_pending_changes = []
        if not hasattr(self, "_wa_debounce_timer"):
            self._wa_debounce_timer = None

        with self._wa_notify_lock:
            self._wa_pending_changes.append({
                "device": clean_dev,
                "state": clean_state,
                "details": details,
                "room": room,
                "time": datetime.now().strftime("%H:%M:%S")
            })
            if self._wa_debounce_timer:
                try:
                    self._wa_debounce_timer.cancel()
                except Exception:
                    pass
            self._wa_debounce_timer = threading.Timer(0.45, self._flush_wa_notifications)
            self._wa_debounce_timer.daemon = True
            self._wa_debounce_timer.start()

    def _flush_wa_notifications(self):
        with self._wa_notify_lock:
            if not self._wa_pending_changes:
                return
            changes = list(self._wa_pending_changes)
            self._wa_pending_changes.clear()
            self._wa_debounce_timer = None

        with self._lock:
            auto = self._automations.get("auto_notificaciones_cambios_whatsapp")
            if not auto or not auto.get("enabled", True):
                return
            auto["last_triggered"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            auto["execution_count"] = auto.get("execution_count", 0) + len(changes)
            self._save()

        now_str = datetime.now().strftime("%H:%M:%S")
        if len(changes) == 1:
            c = changes[0]
            st = c["state"]
            st_icon = "🟢 ENCENDIDO" if st in ("ON", "1", "OPEN", "TRUE") else ("⚫ APAGADO" if st in ("OFF", "0", "CLOSE", "FALSE") else f"⚡ {st}")
            room_str = f" ({c['room']})" if c['room'] else ""
            detail_str = f"\nℹ️ *Detalle:* {c['details']}" if c['details'] else ""
            msg = f"🔔 *Habana 14 - Aviso de Cambio*\n\n📍 *Dispositivo:* {c['device']}{room_str}\n📊 *Estado:* {st_icon}{detail_str}\n🕒 *Hora:* {now_str}"
        else:
            lines = []
            for c in changes:
                st = c["state"]
                st_icon = "🟢" if st in ("ON", "1", "OPEN", "TRUE") else ("⚫" if st in ("OFF", "0", "CLOSE", "FALSE") else "⚡")
                room_str = f" ({c['room']})" if c['room'] else ""
                lines.append(f"• {st_icon} *{c['device']}{room_str}:* {c['state']}")
            msg = f"🔔 *Habana 14 - Aviso de Cambios*\n\n" + "\n".join(lines) + f"\n\n🕒 *Hora:* {now_str}"

        def _send():
            try:
                from app.services.whatsapp import wa_bridge
                tomas_jid = "34647797575@s.whatsapp.net"
                wa_bridge.send_message(tomas_jid, msg)
                logger.info(f"[WhatsApp Alert] Alerta de cambios enviada a Tomás ({len(changes)} eventos)")
            except Exception as e:
                logger.error(f"[WhatsApp Alert] Error enviando WhatsApp a Tomás: {e}")

        threading.Thread(target=_send, daemon=True).start()

automation_service = AutomationService()
