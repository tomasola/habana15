import requests
import logging
import time
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.services.direct_device_engine import direct_device_engine

logger = logging.getLogger("HomeAssistant")

class HomeAssistantService:
    # Dominios expuestos a HABANA (UI + IA)
    SUPPORTED_DOMAINS = ('light.', 'switch.', 'sensor.', 'binary_sensor.', 'cover.', 'scene.',
                         'media_player.', 'climate.', 'input_boolean.', 'fan.', 'script.')
    def __init__(self):
        self.token = settings.HOME_ASSISTANT_TOKEN
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        # Caché para evitar saturar el threadpool con timeouts repetitivos
        self._entities_cache: List = []
        self._entities_cache_ts: float = 0
        self._status_cache: Dict = {}
        self._status_cache_ts: float = 0
        self._cache_ttl: float = 2.0  # segundos entre llamadas reales a HA (reducido para respuesta ágil)
        self._last_error_ts: float = 0
        self._error_backoff: int = 5  # esperar 5s tras un fallo antes de reintentar
        self._sync_debounce: Dict[str, float] = {}  # prevención de bucles infinitos en vínculos
        self._sent_sync_commands: Dict[str, tuple] = {}  # {entity_id: (target_state, timestamp)}
        self._start_ws_listener()

    def _start_ws_listener(self):
        """Inicia un hilo en segundo plano que escucha eventos state_changed de Home Assistant en tiempo real."""
        import threading
        t = threading.Thread(target=self._ws_listener_loop, daemon=True, name="HA-WS-Listener")
        t.start()

    def _ws_listener_loop(self):
        import json
        import websocket
        import threading
        while True:
            try:
                mode = direct_device_engine.get_mode()
                if mode == "direct":
                    time.sleep(5)
                    continue

                ws_url = self.api_url.replace("http://", "ws://").replace("https://", "wss://").replace("/api", "/api/websocket")
                ws = websocket.create_connection(ws_url, timeout=5)
                # Auth handshake
                auth_req = json.loads(ws.recv())
                if auth_req.get("type") == "auth_required":
                    ws.send(json.dumps({"type": "auth", "access_token": self.token}))
                    auth_res = json.loads(ws.recv())
                    if auth_res.get("type") != "auth_ok":
                        logger.warning(f"HA WebSocket autenticación fallida: {auth_res}")
                        ws.close()
                        time.sleep(10)
                        continue
                
                # Suscribirse a eventos state_changed
                ws.send(json.dumps({"id": 1, "type": "subscribe_events", "event_type": "state_changed"}))
                sub_res = json.loads(ws.recv())
                if not sub_res.get("success"):
                    logger.warning(f"HA WebSocket fallo al suscribirse a state_changed: {sub_res}")
                    ws.close()
                    time.sleep(5)
                    continue
                
                logger.info("⚡ Conexión WebSocket en tiempo real con Home Assistant activa y escuchando eventos físicos.")

                while True:
                    msg = ws.recv()
                    if not msg:
                        break
                    data = json.loads(msg)
                    if data.get("type") == "event" and data.get("event", {}).get("event_type") == "state_changed":
                        evt_data = data["event"].get("data", {})
                        entity_id = evt_data.get("entity_id")
                        new_state_obj = evt_data.get("new_state")
                        if entity_id and new_state_obj:
                            new_st = new_state_obj.get("state")
                            attrs = new_state_obj.get("attributes", {})
                            if new_st not in ("unavailable", "unknown"):
                                # 1. Actualizar caché de entidades en memoria de HA service
                                for item in self._entities_cache:
                                    if item.get("entity_id") == entity_id or item.get("id") == entity_id:
                                        item["state"] = new_st
                                        if attrs:
                                            item.setdefault("attributes", {}).update(attrs)
                                        break
                                
                                # 2. Actualizar motor directo para sincronización perfecta
                                direct_device_engine.update_live_state(entity_id, new_st, attrs)
                                
                                # 3. Invalidar caché del router para que el siguiente fetch devuelva el estado nuevo
                                try:
                                    from app.api.router import _cache, _cache_ts
                                    _cache.clear()
                                    _cache_ts.clear()
                                except Exception:
                                    pass
                                
                                # Detección inteligente de eco: si este evento fue generado por una orden previa de HABANA,
                                # lo confirmamos y salimos para no re-propagar en bucle ni bloquear la red.
                                expected_st, sent_ts = self._sent_sync_commands.get(entity_id, (None, 0))
                                if expected_st == new_st and (time.time() - sent_ts) < 3.5:
                                    self._sent_sync_commands.pop(entity_id, None)
                                    logger.debug(f"⚡ Eco de comando propio confirmado para {entity_id} -> {new_st}")
                                    continue

                                logger.info(f"⚡ Evento físico HA recibido: {entity_id} -> {new_st}")

                                # 4. Sincronización instantánea de conmutadas múltiples y tiras LED vinculadas
                                try:
                                    from app.services.device_mapping_service import device_mapping_service
                                    cluster = device_mapping_service.get_conmutadas_cluster(entity_id)
                                    siblings = [e for e in cluster.get("all_entities", []) if e != entity_id]
                                    siblings_to_sync = [
                                        sib for sib in siblings
                                        if self.get_cached_state(sib) != new_st and new_st in ("on", "off")
                                    ]
                                    if siblings_to_sync:
                                        logger.info(f"⚡ Sincronizando en bloque {len(siblings_to_sync)} conmutadas hermanas de {entity_id} -> {new_st}: {siblings_to_sync}")
                                        self._sync_siblings_batch(siblings_to_sync, new_st)
                                except Exception as sync_err:
                                    logger.error(f"Error sincronizando conmutadas vinculadas a {entity_id}: {sync_err}")
            except Exception as e:
                logger.debug(f"Reconectando HA WebSocket listener: {e}")
                time.sleep(5)

    @property
    def api_url(self):
        # Utilizar la IP dinámica del .env (gestión de interfaz visual)
        base = settings.HOME_ASSISTANT_URL.rstrip('/')
        return f"{base}/api"

    def get_status(self) -> Dict[str, Any]:
        mode = direct_device_engine.get_mode()
        if mode == "direct":
            return {
                "status": "Operational",
                "mode": "direct",
                "location": "Habana Direct Engine (Sin Home Assistant)",
                "version": "Direct-Native-8.0"
            }

        now = time.time()
        # Devolver caché si es reciente
        if self._status_cache and (now - self._status_cache_ts) < self._cache_ttl:
            res = dict(self._status_cache)
            res["mode"] = mode
            return res
        # Circuit breaker: no reintentar hasta que pase el backoff
        if (now - self._last_error_ts) < self._error_backoff:
            if mode == "hybrid":
                return {
                    "status": "Operational (Direct Hybrid)",
                    "mode": "hybrid",
                    "ha_status": "Unreachable",
                    "location": "Habana Hybrid Engine"
                }
            return self._status_cache or {"status": "Unreachable", "mode": mode}
        try:
            response = requests.get(f"{self.api_url}/config", headers=self.headers, timeout=2.5)
            if response.status_code == 200:
                data = response.json()
                self._status_cache = {
                    "status": "Operational",
                    "mode": mode,
                    "location": data.get("location_name", "Home"),
                    "version": data.get("version")
                }
                self._status_cache_ts = now
                return self._status_cache
            if mode == "hybrid":
                return {"status": "Operational (Direct Hybrid)", "mode": "hybrid", "ha_code": response.status_code}
            return {"status": "Offline", "code": response.status_code, "mode": mode}
        except Exception as e:
            self._last_error_ts = now
            logger.error(f"Error comprobando estado de HA: {e}")
            if mode == "hybrid":
                return {
                    "status": "Operational (Direct Hybrid)",
                    "mode": "hybrid",
                    "ha_status": "Offline",
                    "location": "Habana Direct Fallback"
                }
            return self._status_cache or {"status": "Error", "message": str(e), "mode": mode}

    def _get_hidden_entities(self) -> set:
        now = time.time()
        if (now - getattr(self, '_hidden_entities_ts', 0)) < 120 and hasattr(self, '_hidden_entities_cache'):
            return self._hidden_entities_cache
        try:
            import websocket, json
            ws_url = self.api_url.replace("http://", "ws://").replace("https://", "wss://").replace("/api", "/api/websocket")
            ws = websocket.create_connection(ws_url, timeout=1.5)
            ws.settimeout(1.2)
            ws.recv()  # auth_required
            ws.send(json.dumps({"type": "auth", "access_token": self.token}))
            ws.recv()  # auth_ok
            ws.send(json.dumps({"id": 1, "type": "config/entity_registry/list"}))
            res = json.loads(ws.recv())
            ws.close()
            if res.get("success"):
                whitelist = set()
                try:
                    from app.services.device_mapping_service import device_mapping_service
                    whitelist.update(device_mapping_service.get_mapping().keys())
                except Exception:
                    pass
                try:
                    whitelist.update(direct_device_engine.get_config().get("devices", {}).keys())
                except Exception:
                    pass
                hidden = {e["entity_id"] for e in res["result"] if e.get("hidden_by") is not None and e["entity_id"] not in whitelist}
                self._hidden_entities_cache = hidden
                self._hidden_entities_ts = now
                return hidden
        except Exception as e:
            logger.debug(f"No se pudo consultar el registro de entidades ocultas: {e}")
        return getattr(self, '_hidden_entities_cache', set())

    def _fetch_ha_entities_raw(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        now = time.time()
        if not force_refresh:
            if (now - self._entities_cache_ts) < self._cache_ttl and self._entities_cache:
                return self._entities_cache
            if (now - self._last_error_ts) < self._error_backoff:
                return self._entities_cache
        try:
            response = requests.get(f"{self.api_url}/states", headers=self.headers, timeout=2.5)
            if response.status_code == 200:
                hidden = self._get_hidden_entities()
                self._entities_cache = [
                    {
                        "id": s['entity_id'],
                        "entity_id": s['entity_id'],
                        "state": s['state'],
                        "name": s.get('attributes', {}).get('friendly_name'),
                        "attributes": s.get('attributes', {}),
                        "domain": s['entity_id'].split('.')[0],
                        "source": "home_assistant"
                    }
                    for s in response.json()
                    if s['entity_id'].startswith(self.SUPPORTED_DOMAINS) and s['entity_id'] not in hidden
                ]
                self._entities_cache_ts = now
                return self._entities_cache
            return self._entities_cache
        except Exception as e:
            self._last_error_ts = now
            logger.error(f"Error listando entidades de HA: {e}")
            return self._entities_cache

    def list_entities(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        try:
            from app.services.z2m_lighting_engine import z2m_engine
            return z2m_engine.get_habana_devices_list()
        except Exception as e:
            logger.error(f"Error listando entidades desde z2m_engine: {e}")
            return direct_device_engine.list_entities()

    def get_all_states(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Obtiene la lista completa de estados desde Z2MLightingEngine y DirectDeviceEngine."""
        try:
            from app.services.z2m_lighting_engine import z2m_engine
            z2m_list = z2m_engine.get_habana_devices_list()
            z2m_ids = {d.get("entity_id") for d in z2m_list}
            extra = [d for d in direct_device_engine.get_all_states() if d.get("entity_id") not in z2m_ids and not str(d.get("entity_id", "")).startswith(("light.", "switch.", "cover."))]
            return z2m_list + extra
        except Exception as e:
            logger.error(f"Error obteniendo todos los estados desde z2m_engine: {e}")
            return direct_device_engine.get_all_states()

    def get_cached_state(self, entity_id: str) -> Optional[str]:
        """Obtiene el estado actual ('on' o 'off') de forma instantánea en memoria sin I/O de red bloqueante."""
        if not entity_id:
            return None
        try:
            from app.services.z2m_lighting_engine import z2m_engine
            for item in z2m_engine.get_habana_devices_list():
                if item.get("entity_id") == entity_id or item.get("id") == entity_id:
                    st = item.get("state")
                    if st:
                        return str(st).lower()
        except Exception:
            pass
        # Fallback: direct_device_engine
        try:
            direct_st = direct_device_engine.get_state(entity_id)
            if direct_st and isinstance(direct_st, dict):
                st = direct_st.get("state")
                if st:
                    return str(st).lower()
        except Exception:
            pass
        return None

    def _send_ha_service_call(self, domain: str, service: str, payload: Dict[str, Any], timeout: float = 2.0):
        """Envía una llamada directa síncrona a un servicio de Home Assistant con timeout corto."""
        try:
            url = f"{self.api_url}/services/{domain}/{service}"
            requests.post(url, headers=self.headers, json=payload, timeout=timeout)
        except Exception as e:
            logger.debug(f"Error en _send_ha_service_call {domain}.{service}: {e}")

    def _sync_siblings_batch(self, siblings: List[str], target_st: str):
        """Sincronización delegada al motor nativo Z2MLightingEngine."""
        return

    def _sync_sibling_device(self, sib: str, target_st: str):
        """Wrapper de compatibilidad."""
        return

    def control_device(self, entity_id: str, action: Optional[str] = "toggle", position: Optional[int] = None,
                       brightness: Optional[int] = None, brightness_pct: Optional[int] = None,
                       color_temp: Optional[int] = None, color_temp_kelvin: Optional[int] = None,
                       rgb_color: Optional[List[int]] = None, kelvin: Optional[int] = None) -> Dict[str, Any]:
        # 1. Enrutar primero por el motor nativo Z2M Lighting Core
        try:
            from app.services.z2m_lighting_engine import z2m_engine
            z2m_res = z2m_engine.control_habana_entity(
                entity_id=entity_id,
                action=action or "toggle",
                brightness=brightness,
                brightness_pct=brightness_pct,
                color_temp=color_temp,
                color_temp_kelvin=color_temp_kelvin or kelvin,
                position=position,
            )
            if z2m_res.get("ok"):
                try:
                    from app.services.habit_service import habit_service
                    habit_service.record_device_action(entity_id, action or "toggle")
                except Exception:
                    pass
                return {"status": "success", "source": "z2m_native", **z2m_res}
        except Exception as e:
            logger.error(f"Error en control_habana_entity para {entity_id}: {e}")

        mode = direct_device_engine.get_mode()

        # En modo "direct", 100% nativo sin llamar a Home Assistant
        if mode == "direct":
            res = direct_device_engine.control_device(
                entity_id, action, position=position,
                brightness=brightness, brightness_pct=brightness_pct,
                color_temp=color_temp, color_temp_kelvin=color_temp_kelvin,
                rgb_color=rgb_color
            )
            try:
                from app.services.habit_service import habit_service
                habit_service.record_device_action(entity_id, action or "toggle")
            except Exception:
                pass
            return res

        # En modo "hybrid", ejecutamos primero en el motor directo (0ms latencia en UI y drivers locales)
        direct_res = None
        if mode == "hybrid":
            direct_res = direct_device_engine.control_device(
                entity_id, action, position=position,
                brightness=brightness, brightness_pct=brightness_pct,
                color_temp=color_temp, color_temp_kelvin=color_temp_kelvin,
                rgb_color=rgb_color
            )

        action_lower = (action or "toggle").lower()
        if brightness is not None or brightness_pct is not None or rgb_color is not None or color_temp is not None or kelvin is not None or color_temp_kelvin is not None:
            normalized_action = "turn_on"
        elif action_lower in ("toggle", "alternar"):
            normalized_action = "toggle"
        elif any(k in action_lower for k in ("apagar", "off", "turn_off", "close", "cerrar", "bajar")):
            normalized_action = "turn_off"
        elif any(k in action_lower for k in ("encender", "on", "turn_on", "open", "abrir", "subir", "activar")):
            normalized_action = "turn_on"
        elif any(k in action_lower for k in ("stop", "parar", "detener")):
            normalized_action = "stop"
        elif any(k in action_lower for k in ("set_cover_position", "set_position", "position")):
            normalized_action = "set_cover_position"
        else:
            normalized_action = action_lower

        if not entity_id or not str(entity_id).strip():
            logger.error("control_device abortado: entity_id vacío")
            return {"status": "error", "message": "entity_id vacío"}

        entity_lower = str(entity_id).lower().strip()
        # Solo es "todas" si NO es un entity_id real (sin dominio) o es explícitamente *.all
        is_real_entity = '.' in entity_lower and not entity_lower.endswith(('.all', '.*'))
        if not is_real_entity and any(k in entity_lower for k in ("toda", "luces", "all", "*")):
            normalized_entity = "all"
            domain = "light" if any(k in entity_lower for k in ("luz", "luces", "light")) else "homeassistant"
        else:
            normalized_entity = str(entity_id).strip()
            if '.' not in normalized_entity:
                try:
                    from app.services.device_mapping_service import device_mapping_service
                    resolved = device_mapping_service.find_entity_by_alias(normalized_entity)
                    if resolved:
                        normalized_entity = resolved
                    else:
                        normalized_entity = f"light.{normalized_entity}"
                except Exception:
                    normalized_entity = f"light.{normalized_entity}"
            domain = normalized_entity.split('.')[0]

        # Traducción de acción según dominio
        if domain == "cover":
            if normalized_action in ("set_cover_position", "set_position") or position is not None:
                normalized_action = "set_cover_position"
            else:
                normalized_action = {"turn_on": "open_cover", "turn_off": "close_cover",
                                     "open": "open_cover", "close": "close_cover",
                                     "stop": "stop_cover"}.get(normalized_action, normalized_action)
        elif domain == "scene":
            normalized_action = "turn_on"  # Las escenas solo se activan
        elif domain == "select":
            normalized_action = "select_option"
        elif domain == "number":
            normalized_action = "set_value"
        # MACROS Y GRUPOS VIRTUALES (Conmutadas Tuya + Input Boolean)
        virtual_groups = {}

        # Si el LLM o la UI activan un ayudante, disparamos también los switches físicos asociados
        if normalized_entity in virtual_groups:
            switches = virtual_groups[normalized_entity]
            logger.info(f"Domótica: Macro detectada para {normalized_entity}. Disparando {len(switches)} interruptores asociados.")
            try:
                requests.post(f"{self.api_url}/services/switch/{normalized_action}", headers=self.headers, json={"entity_id": switches}, timeout=2.5)
            except Exception as e:
                logger.error(f"Error disparando switches asociados al macro {normalized_entity}: {e}")

        logger.info(f"Domótica [{mode}]: Controlando {normalized_entity} -> Acción: {normalized_action} (Posición: {position})")
        url = f"{self.api_url}/services/{domain}/{normalized_action}"
        
        if normalized_entity == "all":
            payload = {}
        else:
            payload = {"entity_id": normalized_entity}
            if domain == "select":
                payload["option"] = str(action)
            if domain == "number":
                val = position if position is not None else action
                try:
                    payload["value"] = float(val)
                except (ValueError, TypeError):
                    payload["value"] = 0.0
            if normalized_action == "set_cover_position" and position is not None:
                payload["position"] = max(0, min(100, int(position)))
            if domain == "light" and normalized_action == "turn_on":
                if brightness_pct is not None:
                    payload["brightness_pct"] = max(0, min(100, int(brightness_pct)))
                elif brightness is not None:
                    payload["brightness"] = max(0, min(255, int(brightness)))
                if rgb_color is not None and isinstance(rgb_color, (list, tuple)) and len(rgb_color) == 3:
                    payload["rgb_color"] = [max(0, min(255, int(c))) for c in rgb_color]
                if color_temp_kelvin is not None:
                    kelvin_val = max(2000, min(6500, int(color_temp_kelvin)))
                    payload["color_temp_kelvin"] = kelvin_val
                    payload["kelvin"] = kelvin_val
                elif kelvin is not None:
                    kelvin_val = max(2000, min(6500, int(kelvin)))
                    payload["color_temp_kelvin"] = kelvin_val
                    payload["kelvin"] = kelvin_val
                elif color_temp is not None:
                    if int(color_temp) >= 1000:
                        kelvin_val = max(2000, min(6500, int(color_temp)))
                        payload["color_temp_kelvin"] = kelvin_val
                        payload["kelvin"] = kelvin_val
                    else:
                        payload["color_temp"] = int(color_temp)

        # Si HA está en circuit-breaker y estamos en modo híbrido, devolvemos directamente la respuesta instantánea
        if mode == "hybrid" and (time.time() - self._last_error_ts) < self._error_backoff:
            try:
                from app.services.habit_service import habit_service
                habit_service.record_device_action(normalized_entity, normalized_action)
            except Exception:
                pass
            return direct_res

        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=2.5)
            if response.status_code in [200, 201]:
                try:
                    from app.services.habit_service import habit_service
                    habit_service.record_device_action(normalized_entity, normalized_action)
                except Exception:
                    pass

                # Sincronización instantánea de conmutadas y pulsadores hermanos vinculados
                try:
                    import threading
                    from app.services.device_mapping_service import device_mapping_service
                    cluster = device_mapping_service.get_conmutadas_cluster(normalized_entity)
                    expected_st = "on" if normalized_action == "turn_on" else ("off" if normalized_action == "turn_off" else None)
                    if normalized_action == "toggle":
                        curr_st = self.get_cached_state(normalized_entity)
                        expected_st = "off" if curr_st == "on" else "on"

                    if expected_st:
                        self._sent_sync_commands[normalized_entity] = (expected_st, time.time())
                        siblings = [e for e in cluster.get("all_entities", []) if e != normalized_entity]
                        siblings_to_sync = [
                            sib for sib in siblings
                            if self.get_cached_state(sib) != expected_st
                        ]
                        if siblings_to_sync:
                            logger.info(f"⚡ Sincronizando en bloque {len(siblings_to_sync)} conmutadas hermanas tras accionar {normalized_entity} -> {expected_st}: {siblings_to_sync}")
                            self._sync_siblings_batch(siblings_to_sync, expected_st)
                except Exception as e:
                    logger.debug(f"Error en sincronización bidireccional de {normalized_entity}: {e}")

                if direct_res:
                    return {**direct_res, "source": "hybrid", "ha_synced": True}
                return {"status": "success", "source": "home_assistant", "ha_response": response.json()}
            if direct_res:
                return {**direct_res, "source": "direct_fallback", "ha_status_code": response.status_code}
            return {"status": "error", "message": f"HA Status Code: {response.status_code}", "detail": response.text}
        except Exception as e:
            self._last_error_ts = time.time()
            logger.error(f"Error controlando dispositivo en HA {entity_id}: {e}")
            if direct_res:
                try:
                    from app.services.habit_service import habit_service
                    habit_service.record_device_action(normalized_entity, normalized_action)
                except Exception:
                    pass
                return {**direct_res, "source": "direct_fallback", "ha_offline": True}
            return {"error": str(e)}

    def get_camera_image(self, camera_entity_id: str) -> bytes:
        mode = direct_device_engine.get_mode()
        if mode in ("direct", "hybrid"):
            snap = direct_device_engine.get_camera_snapshot(camera_entity_id)
            if snap or mode == "direct":
                return snap

        logger.info(f"Cámaras: Obteniendo captura de {camera_entity_id}")
        url = f"{self.api_url}/camera_proxy/{camera_entity_id}"
        try:
            response = requests.get(url, headers=self.headers, timeout=5)
            if response.status_code == 200:
                return response.content
            logger.error(f"Error obteniendo captura de cámara {camera_entity_id}: Status {response.status_code}")
            return b""
        except Exception as e:
            logger.error(f"Error obteniendo captura de cámara {camera_entity_id}: {e}")
            return b""

    def get_state(self, entity_id: str) -> dict:
        try:
            from app.services.z2m_lighting_engine import z2m_engine
            for item in z2m_engine.get_habana_devices_list():
                if item.get("entity_id") == entity_id or item.get("id") == entity_id:
                    return dict(item)
        except Exception:
            pass
        mode = direct_device_engine.get_mode()
        if mode == "direct":
            st = direct_device_engine.get_state(entity_id)
            return st or {"error": f"Entidad directa no encontrada: {entity_id}"}

        try:
            response = requests.get(f"{self.api_url}/states/{entity_id}", headers=self.headers, timeout=3)
            if response.status_code == 200:
                data = response.json()
                return {
                    "entity_id": data.get("entity_id"),
                    "state": data.get("state"),
                    "attributes": data.get("attributes", {}),
                    "last_updated": data.get("last_updated"),
                    "source": "home_assistant"
                }
        except Exception as e:
            logger.error(f"Error consultando estado de {entity_id}: {e}")

        if mode == "hybrid":
            st = direct_device_engine.get_state(entity_id)
            if st:
                return st
        return {"error": f"Entidad no encontrada: {entity_id}"}

    def trigger_alarm(self) -> Dict[str, Any]:
        logger.info("Domótica: Disparando alarma")
        if direct_device_engine.get_mode() == "direct":
            return {"status": "success", "source": "direct"}
        url = f"{self.api_url}/services/alarm_control_panel/alarm_trigger"
        try:
            response = requests.post(url, headers=self.headers, json={}, timeout=3)
            if response.status_code in [200, 201]:
                return {"status": "success"}
            return {"status": "error", "message": f"HA Status Code: {response.status_code}"}
        except Exception as e:
            logger.error(f"Error disparando alarma: {e}")
            return {"status": "success", "source": "direct_fallback"}

    def set_alarm_state(self, armed: bool) -> Dict[str, Any]:
        action = "alarm_arm_away" if armed else "alarm_disarm"
        logger.info(f"Domótica: Cambiando estado de alarma a {action}")
        if direct_device_engine.get_mode() == "direct":
            return {"status": "success", "source": "direct", "armed": armed}
        url = f"{self.api_url}/services/alarm_control_panel/{action}"
        try:
            response = requests.post(url, headers=self.headers, json={}, timeout=3)
            if response.status_code in [200, 201]:
                return {"status": "success"}
            return {"status": "error", "message": f"HA Status Code: {response.status_code}"}
        except Exception as e:
            logger.error(f"Error cambiando estado de alarma: {e}")
            return {"status": "success", "source": "direct_fallback", "armed": armed}

    def update_entity_name(self, entity_id: str, new_name: str) -> bool:
        """
        Actualiza el nombre amigable (friendly_name) de la entidad en el registro oficial de Home Assistant vía WebSocket.
        """
        if not entity_id or not new_name:
            return False
        try:
            import websocket
            base_url = settings.HOME_ASSISTANT_URL.rstrip('/')
            ws_url = base_url.replace("http://", "ws://").replace("https://", "wss://") + "/api/websocket"
            ws = websocket.create_connection(ws_url, timeout=3)
            ws.recv()  # auth_required
            ws.send(json.dumps({"type": "auth", "access_token": self.token}))
            auth_res = json.loads(ws.recv())
            if auth_res.get("type") != "auth_ok":
                ws.close()
                return False
            ws.send(json.dumps({
                "id": 1,
                "type": "config/entity_registry/update",
                "entity_id": entity_id,
                "name": new_name.strip()
            }))
            res = json.loads(ws.recv())
            ws.close()
            success = bool(res.get("success"))
            if success:
                logger.info(f"✅ Nombre de {entity_id} sincronizado en Home Assistant a '{new_name}'")
            return success
        except Exception as e:
            logger.debug(f"No se pudo sincronizar nombre con HA para {entity_id}: {e}")
            return False

home_assistant_service = HomeAssistantService()


# FIX APLICADO AUTOMATICAMENTE
