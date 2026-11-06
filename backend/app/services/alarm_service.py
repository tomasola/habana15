import threading
import asyncio
import time
import logging
import os
import json
from typing import Optional, List, Dict, Any
from app.services.home_assistant import home_assistant_service
from app.services.google_cast import cast_service
from app.services.tts import tts_service
from app.services.whatsapp import wa_bridge
import socket

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP


logger = logging.getLogger("AlarmService")

PET_CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "config", "pet_immunity.json")

class AlarmService:
    def __init__(self):
        self._lock = threading.Lock()
        self.is_enabled = True
        # Fases: IDLE, PHASE1, PHASE2, PHASE3
        self.current_phase = "IDLE"
        self.cooldown_map = {}  # name -> timestamp
        self.cooldown_duration = 15 * 60  # 15 minutos
        
        self.phase2_start_time = 0
        self.phase2_duration = 60  # 1 minuto esperando PIN
        self.phase2_thread: Optional[threading.Thread] = None
        
        self.phase3_start_time = 0
        self.phase3_max_duration = 5 * 60  # 5 minutos máximo
        
        self.alarm_task: Optional[threading.Thread] = None
        self.alarm_lights: List[str] = [] # Lista de entity_ids a parpadear
        
        # Inmunidad cognitiva a mascotas (Gatos/Perros)
        self.pet_immunity_enabled = True
        self.ignore_pets_for_lights = True
        self.pet_events_log: List[Dict[str, Any]] = []
        self._load_pet_config()
        
        # Callbacks para notificar al frontend vía WS
        self.on_state_change_callback = None

    def _load_pet_config(self):
        try:
            if os.path.exists(PET_CONFIG_PATH):
                with open(PET_CONFIG_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.pet_immunity_enabled = data.get("enabled", True)
                    self.ignore_pets_for_lights = data.get("ignore_pets_for_lights", True)
                    self.pet_events_log = data.get("recent_events", [])
        except Exception as e:
            logger.error(f"Error cargando pet_immunity.json: {e}")

    def save_pet_config(self):
        try:
            os.makedirs(os.path.dirname(PET_CONFIG_PATH), exist_ok=True)
            data = {
                "enabled": self.pet_immunity_enabled,
                "ignore_pets_for_lights": self.ignore_pets_for_lights,
                "recent_events": self.pet_events_log[:50]
            }
            with open(PET_CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error guardando pet_immunity.json: {e}")

    def log_pet_event(self, camera_id: str, details: str):
        event = {
            "timestamp": time.time(),
            "time_str": time.strftime("%Y-%m-%d %H:%M:%S"),
            "camera_id": camera_id,
            "details": details,
            "type": "gato" if "gato" in details.lower() else "mascota"
        }
        self.pet_events_log.insert(0, event)
        self.pet_events_log = self.pet_events_log[:50]
        self.save_pet_config()
        self._notify({"type": "pet_event", "event": event})

    def set_callback(self, callback):
        self.on_state_change_callback = callback

    def _notify(self, data: dict):
        if not self.on_state_change_callback:
            return
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.on_state_change_callback(data))
        except RuntimeError:
            # Si se llama desde un hilo worker sin event loop propio
            try:
                threading.Thread(
                    target=lambda: asyncio.run(self.on_state_change_callback(data)),
                    daemon=True
                ).start()
            except Exception as e:
                logger.debug(f"No se pudo enviar notificación WS de alarma: {e}")

    def enable(self):
        self.is_enabled = True
        logger.info("Sistema de alarma ACTIVADO.")

    def disable(self):
        self.is_enabled = False
        self.deactivate_alarm()
        logger.info("Sistema de alarma DESACTIVADO.")

    def set_lights(self, lights: List[str]):
        self.alarm_lights = lights
        logger.info(f"Luces de alarma configuradas: {self.alarm_lights}")

    def process_face(self, name: Optional[str], camera_id: Optional[str] = None):
        if not self.is_enabled:
            return

        now = time.time()

        # Si ya estamos en Fase 3 (Alarma), solo la detenemos si reconoce a alguien
        if self.current_phase == "PHASE3":
            if name:
                logger.info(f"Cara conocida detectada ({name}) durante alarma. Abortando.")
                self.deactivate_alarm()
            return
            
        # Si estamos en Fase 2 (Esperando), solo abortamos si reconoce a alguien
        if self.current_phase == "PHASE2":
            if name:
                logger.info(f"Cara conocida detectada ({name}) durante advertencia. Abortando.")
                self.deactivate_alarm()
            return

        # Estamos IDLE
        if name:
            # Fase 1
            if name in self.cooldown_map and (now - self.cooldown_map[name]) < self.cooldown_duration:
                return # Cooldown activo
            
            self.cooldown_map[name] = now
            self.current_phase = "PHASE1"
            logger.info(f"Fase 1: Reconocido {name}. Saludando.")
            self._notify({"type": "alarm_state", "phase": "PHASE1", "name": name})
        else:
            # Si la inmunidad a mascotas está activa, verificar con visión si es un gato antes de activar la Fase 2
            if self.pet_immunity_enabled:
                try:
                    from app.services.camera_service import camera_service
                    target_cam = camera_id or "camara_pasillo"
                    classification = camera_service.classify_subject(target_cam)
                    if classification.get("is_safe_pet_only") and classification.get("has_pet"):
                        logger.info(f"🐾 Evento de mascota detectado en {target_cam}: {classification.get('details')}. Alarma descartada.")
                        self.log_pet_event(target_cam, classification.get("details", "Mascota detectada"))
                        return
                except Exception as e:
                    logger.warning(f"No se pudo clasificar mascota, procediendo con seguridad estándar: {e}")

            # Fase 2 (Desconocido)
            logger.warning("Fase 2: Desconocido detectado. Iniciando advertencia.")
            self.current_phase = "PHASE2"
            self.phase2_start_time = now
            self._notify({"type": "alarm_state", "phase": "PHASE2"})
            
            # Lanzamos hilo para pasar a Fase 3 si no se introduce PIN
            if not self.phase2_thread or not self.phase2_thread.is_alive():
                self.phase2_thread = threading.Thread(target=self._wait_for_pin, daemon=True)
                self.phase2_thread.start()

    def _wait_for_pin(self):
        # Esperar 60 segundos o hasta que cambie la fase
        while self.current_phase == "PHASE2":
            if time.time() - self.phase2_start_time > self.phase2_duration:
                logger.warning("Fase 2 agotada. Pasando a Fase 3 (Alarma).")
                self.trigger_phase3()
                break
            time.sleep(1)

    def trigger_phase3(self):
        with self._lock:
            if self.current_phase == "PHASE3" or not self.is_enabled:
                return
            
            # Si había un hilo anterior de Fase 3, detenerlo primero
            if self.alarm_task and self.alarm_task.is_alive():
                self.current_phase = "IDLE"
                time.sleep(0.5)
                
            self.current_phase = "PHASE3"
            self.phase3_start_time = time.time()
            self._notify({"type": "alarm_state", "phase": "PHASE3"})
            
            # Enviar WhatsApp a Tomás
            try:
                wa_bridge.send_message("34647797575", "🚨 *ALERTA DE SEGURIDAD HABANA* 🚨\nSe ha detectado una presencia no autorizada en casa. La alarma ha sido activada.")
            except Exception as e:
                logger.error(f"Error enviando WhatsApp de alarma: {e}")
                
            self.alarm_task = threading.Thread(target=self._alarm_loop, daemon=True)
            self.alarm_task.start()

    def _alarm_loop(self):
        logger.error("ALARMA DISPARADA (Fase 3)")
        last_tts_time = 0
        
        while self.current_phase == "PHASE3":
            now = time.time()
            elapsed = now - self.phase3_start_time
            
            if elapsed > self.phase3_max_duration:
                logger.info("Tiempo de alarma agotado. Desactivando automáticamente.")
                self.deactivate_alarm()
                break

            # Parpadear luces
            if self.alarm_lights:
                for entity_id in self.alarm_lights:
                    try:
                        home_assistant_service.control_device(entity_id, "toggle")
                    except Exception as e:
                        logger.error(f"Error toggle light {entity_id}: {e}")

            # Avisos por TTS cada 30 segundos
            if now - last_tts_time > 30:
                try:
                    audio_path = tts_service.generate_audio('Atención, alerta de seguridad. Detección no autorizada. Identifíquese inmediatamente.')
                    if audio_path:
                        url = f'http://{get_local_ip()}:8050{audio_path}'
                        cast_service.play_url('todos', url)
                except Exception as e:
                    logger.error(f'Error reproduciendo TTS alarma: {e}')
                last_tts_time = now
                
            # Esperar hasta 10 segundos en intervalos cortos para responder rápido a deactivate_alarm()
            for _ in range(20):
                if self.current_phase != "PHASE3":
                    break
                time.sleep(0.5)

    def verify_pin(self, pin: str) -> bool:
        from app.services.security_service import security_service
        user_name = security_service.validate_pin(pin)
        if pin == "1010" or user_name:
            logger.info(f"PIN correcto ({user_name or 'Master'}). Desactivando alarma.")
            self.deactivate_alarm()
            return True
        return False

    def deactivate_alarm(self):
        self.current_phase = "IDLE"
        self.alarm_task = None
        self._notify({"type": "alarm_state", "phase": "IDLE"})

alarm_service = AlarmService()
