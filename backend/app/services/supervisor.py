import threading
import time
import logging
from datetime import datetime

logger = logging.getLogger("Supervisor")

class SupervisorService:
    def __init__(self):
        self.interval = 60  # 1 minuto
        self.is_running = False
        self._thread = None
        self.health_status = {
            "whatsapp": "unknown",
            "home_assistant": "unknown",
            "zigbee2mqtt": "unknown",
            "google_cast": "unknown",
            "system": "ok",
            "last_check": None
        }
        self.alerts = []  # Lista de las ltimas 20 alertas
        self.consecutive_failures = {
            "whatsapp": 0,
            "home_assistant": 0
        }
    
    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        logger.info("Agente Supervisor iniciado.")

    def stop(self):
        self.is_running = False

    def get_status(self):
        return {
            "health": self.health_status,
            "alerts": self.alerts
        }

    def _add_alert(self, component, message, severity="warning"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        alert = {
            "id": int(time.time()),
            "timestamp": timestamp,
            "component": component,
            "message": message,
            "severity": severity
        }
        self.alerts.insert(0, alert)
        if len(self.alerts) > 50:
            self.alerts = self.alerts[:50]
        logger.warning(f"SUPERVISOR ALERT [{component}]: {message}")

    def _restart_wa_bridge(self):
        try:
            from app.core.config import settings
            if not settings.PROXMOX_HOST:
                self._add_alert("WhatsApp", "No se puede reiniciar wa-bridge: PROXMOX_HOST no está configurado.", "warning")
                return
            import paramiko
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(
                settings.PROXMOX_HOST,
                username=settings.PROXMOX_USER,
                password=settings.PROXMOX_PASS,
                timeout=10
            )
            stdin, stdout, stderr = client.exec_command(f'pct exec {settings.CT_ID} -- systemctl restart wa-bridge')
            client.close()
            self._add_alert("WhatsApp", "Reiniciado automáticamente (auto-curación) tras múltiples fallos.", "info")
            logger.info("Auto-curación: wa-bridge reiniciado.")
        except Exception as e:
            from app.core.state import state_manager
            if state_manager.get_state().server_mode == "local":
                logger.info(f"[SIMULADO] Intento de auto-curar wa-bridge ignorado por estar en modo local: {e}")
                return
            self._add_alert("WhatsApp", f"Fallo al intentar auto-curar wa-bridge: {e}", "error")
            logger.error(f"Fallo en auto-curación de wa-bridge: {e}")

    def _loop(self):
        # Evitar comprobar inmediatamente al arrancar (esperar a que todo cargue un mínimo)
        time.sleep(2)
        
        from app.services.whatsapp import wa_bridge
        from app.services.home_assistant import home_assistant_service as ha_service
        from app.services.google_cast import cast_service

        while self.is_running:
            try:
                # 1. Comprobar WhatsApp
                try:
                    wa_status = wa_bridge.get_status()
                    # El status puede ser 'connected', 'qr', 'error', 'disconnected'
                    self.health_status["whatsapp"] = wa_status.get("status", "unknown")
                    if self.health_status["whatsapp"] not in ("connected", "qr"):
                        self.consecutive_failures["whatsapp"] += 1
                        self._add_alert("WhatsApp", f"El puente de WhatsApp no responde (fallo {self.consecutive_failures['whatsapp']}/2).", "warning")
                        if self.consecutive_failures["whatsapp"] >= 2:
                            self._restart_wa_bridge()
                            self.consecutive_failures["whatsapp"] = 0
                    else:
                        self.consecutive_failures["whatsapp"] = 0
                except Exception as e:
                    self.health_status["whatsapp"] = "error"
                    self.consecutive_failures["whatsapp"] += 1
                    self._add_alert("WhatsApp", f"Excepcin al comprobar WhatsApp: {e}", "error")
                    if self.consecutive_failures["whatsapp"] >= 2:
                        self._restart_wa_bridge()
                        self.consecutive_failures["whatsapp"] = 0

                # 2. Comprobar Home Assistant
                try:
                    # Intento de ping simple obteniendo dispositivos
                    devices = ha_service.list_entities()
                    if devices is not None and isinstance(devices, list):
                        self.health_status["home_assistant"] = "connected"
                        self.consecutive_failures["home_assistant"] = 0
                    else:
                        self.health_status["home_assistant"] = "error"
                        self._add_alert("Home Assistant", "La API de Home Assistant no devolvi dispositivos.", "warning")
                except Exception as e:
                    self.health_status["home_assistant"] = "error"
                    self._add_alert("Home Assistant", f"No hay conexin con Home Assistant: {e}", "error")
                    self.consecutive_failures["home_assistant"] += 1
                    if self.consecutive_failures["home_assistant"] >= 2:
                        self._add_alert("Sistema", "Iniciando Auto-Sanación de Red (Buscando Home Assistant)...", "info")
                        try:
                            from app.core.network_scanner import scan_network_for_services, update_env_file
                            import os
                            found = scan_network_for_services()
                            if found.get("ha_ip") or found.get("proxmox_ip"):
                                updates = {}
                                if found.get("ha_ip"): updates["HOME_ASSISTANT_URL"] = f"http://{found['ha_ip']}:8123"
                                if found.get("proxmox_ip"): updates["PROXMOX_HOST"] = found["proxmox_ip"]
                                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                                env_path = os.path.join(base_dir, ".env")
                                update_env_file(updates, env_path=env_path)
                                self._add_alert("Sistema", f"Red auto-sanada: {found}. Requiere reinicio del servidor.", "info")
                        except Exception as inner_e:
                            self._add_alert("Sistema", f"Fallo en Auto-Sanación: {inner_e}", "error")
                        self.consecutive_failures["home_assistant"] = 0


                # 3. Comprobar Zigbee2MQTT / Broker MQTT
                try:
                    from app.services.z2m_lighting_engine import z2m_engine
                    if z2m_engine and (getattr(z2m_engine, '_mqtt_connected', False) or getattr(z2m_engine, 'mqtt_connected', False)):
                        self.health_status["zigbee2mqtt"] = "connected"
                    else:
                        self.health_status["zigbee2mqtt"] = "warning"
                        self._add_alert("Zigbee2MQTT", "El motor Zigbee2MQTT / MQTT no reporta conexión activa.", "warning")
                except Exception as e:
                    self.health_status["zigbee2mqtt"] = "error"
                    self._add_alert("Zigbee2MQTT", f"Error verificando Zigbee2MQTT: {e}", "error")

                # 4. Comprobar Google Cast
                try:
                    num_casts = len(cast_service.casts)
                    if num_casts > 0:
                        self.health_status["google_cast"] = "ok"
                    else:
                        self.health_status["google_cast"] = "warning"
                        self._add_alert("Google Cast", "No se detecta ningn altavoz en la red.", "warning")
                except Exception as e:
                    self.health_status["google_cast"] = "error"
                    self._add_alert("Google Cast", f"Error comprobando altavoces: {e}", "error")

                self.health_status["last_check"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                # 4. Check Agenda Reminders & Routines
                try:
                    from app.services.agenda import agenda_service
                    from app.services.home_assistant import home_assistant_service
                    
                    reminders = agenda_service.get_pending_reminders()
                    routines = agenda_service.get_pending_routines()
                    now = datetime.now()
                    
                    # Process Reminders
                    for rem in reminders:
                        try:
                            if "T" in rem["due_date"]:
                                due_date = datetime.fromisoformat(rem["due_date"].replace('Z', ''))
                            else:
                                try:
                                    due_date = datetime.strptime(rem["due_date"], "%Y-%m-%d %H:%M:%S")
                                except ValueError:
                                    due_date = datetime.strptime(rem["due_date"], "%Y-%m-%d %H:%M")
                                    
                            if now >= due_date:
                                tomas_jid = "34647797575@s.whatsapp.net"
                                wa_msg = f"🔔 *Recordatorio Habana* 🔔\n\n{rem['message']}"
                                wa_bridge.send_message(tomas_jid, wa_msg)
                                agenda_service.update_reminder_status(rem["id"], "sent")
                                self._add_alert("Agenda", f"Recordatorio enviado: {rem['message'][:20]}...", "info")
                        except Exception as rem_e:
                            logger.error(f"Error parseando fecha de recordatorio: {rem['due_date']} - {rem_e}")
                            
                    # Process Routines
                    for rout in routines:
                        try:
                            if "T" in rout["execute_at"]:
                                exec_date = datetime.fromisoformat(rout["execute_at"].replace('Z', ''))
                            else:
                                try:
                                    exec_date = datetime.strptime(rout["execute_at"], "%Y-%m-%d %H:%M:%S")
                                except ValueError:
                                    exec_date = datetime.strptime(rout["execute_at"], "%Y-%m-%d %H:%M")
                                    
                            if now >= exec_date:
                                logger.info(f"Supervisor: Ejecutando rutina pendiente {rout['action']} en {rout['entity_id']}")
                                res = home_assistant_service.control_device(rout['entity_id'], rout['action'])
                                agenda_service.update_routine_status(rout["id"], "executed")
                                self._add_alert("Rutinas", f"Rutina ejecutada: {rout['action']} en {rout['entity_id']}", "info")
                                
                        except Exception as rout_e:
                            logger.error(f"Error ejecutando rutina domótica: {rout['execute_at']} - {rout_e}")
                            
                except Exception as e:
                    self._add_alert("Agenda", f"Error revisando recordatorios/rutinas: {e}", "error")

            except Exception as e:
                logger.error(f"Error global en supervisor: {e}")

            time.sleep(self.interval)

supervisor_service = SupervisorService()
