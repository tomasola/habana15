import time
import logging
from typing import Dict, Any, List
from app.bunker.storage import bunker_storage

logger = logging.getLogger("BunkerGatekeeper")

class BunkerGatekeeper:
    def __init__(self):
        self._last_execution_by_widget = {}
        self._recent_executions_log = []
        self._max_history = 50

    def can_execute(self, widget_id: str = "direct_action") -> Dict[str, Any]:
        """Comprueba si el Búnker está activo y si la orden no excede el rate limit."""
        if not bunker_storage.is_enabled():
            return {
                "allowed": False,
                "reason": "El Kill Switch del Búnker está AISLADO. Las macros y widgets experimentales están desconectados."
            }

        now = time.time()
        last_time = self._last_execution_by_widget.get(widget_id, 0.0)
        # Rate-limiter por widget: mínimo 300ms entre ejecuciones para evitar bucles o dobles clics
        if now - last_time < 0.3:
            return {
                "allowed": False,
                "reason": f"Rate-limit activo: Espera {round(0.3 - (now - last_time), 2)}s antes de volver a pulsar este botón."
            }

        return {"allowed": True}

    def _dispatch_action(self, act: Dict[str, Any]) -> Dict[str, Any]:
        """Ejecuta una acción individual de forma segura."""
        eid = act.get("entity_id") or act.get("target") or ""
        action_name = act.get("action", "toggle")
        bri = act.get("brightness")

        from app.services.z2m_lighting_engine import z2m_engine
        from app.services.automation_service import automation_service

        # 1. Apagado total de luces
        if (eid in ("all", "all_lights", "all_off") and action_name in ("turn_off_all", "all_off", "off", "turn_off")) or action_name in ("turn_off_all", "all_off"):
            res = z2m_engine.turn_off_all()
            return {"entity_id": "all_lights", "action": "turn_off_all", "result": res}

        # 2. Encendido total / general
        if eid in ("all", "all_lights", "all_on") and action_name in ("turn_on_all", "turn_on", "all_on"):
            key_lights = [
                "luz_luz_principal_del_salon_53c1",
                "luz_luz_del_comedor_d9b2",
                "luz_techo_pasillo",
                "luz_techo_principal"
            ]
            for kl in key_lights:
                try:
                    z2m_engine.control_habana_entity(kl, "turn_on")
                except Exception:
                    pass
            return {"entity_id": "all_lights", "action": "turn_on_all", "result": "ok"}

        # 3. Radio Multiroom
        if eid == "radio" or "radio" in action_name or act.get("type") == "radio":
            from app.services.radio_service import radio_service
            from app.services.google_cast import cast_service
            from app.services.local_audio_player import local_audio_player
            from app.core.state import state_manager

            st = radio_service.status()
            is_playing = st.get("state") == "playing"
            station = act.get("station", "los40")

            if action_name in ("stop", "turn_off"):
                res_r = radio_service.stop()
                cast_service.stop_all()
                local_audio_player.stop()
                state_manager.update_state({"global_radio_station": None})
                return {"entity_id": "radio", "action": "stop", "result": res_r}
            elif action_name in ("play", "turn_on"):
                res_r = radio_service.play(station)
                stream_url = res_r.get("stream_url")
                if stream_url:
                    cast_service.play_url("todos", stream_url, "audio/mpeg")
                    local_audio_player.play(stream_url, apply_delay=False)
                state_manager.update_state({"global_radio_station": station})
                return {"entity_id": "radio", "action": "play", "station": station, "result": res_r}
            else: # toggle
                if is_playing:
                    res_r = radio_service.stop()
                    cast_service.stop_all()
                    local_audio_player.stop()
                    state_manager.update_state({"global_radio_station": None})
                    return {"entity_id": "radio", "action": "toggle_off", "result": "stopped"}
                else:
                    res_r = radio_service.play(station)
                    stream_url = res_r.get("stream_url")
                    if stream_url:
                        cast_service.play_url("todos", stream_url, "audio/mpeg")
                        local_audio_player.play(stream_url, apply_delay=False)
                    state_manager.update_state({"global_radio_station": station})
                    return {"entity_id": "radio", "action": "toggle_on", "station": station, "result": res_r}

        # 4. Persianas (Individuales o Todas)
        if eid in ("all_covers", "todas_persianas", "persianas") or "persiana" in eid.lower() or "cover." in eid.lower():
            covers = [
                "cover.persiana_salon",
                "cover.persiana_andrea",
                "cover.persiana_principal"
            ]
            target_covers = covers if eid in ("all_covers", "todas_persianas", "persianas") else [eid]
            pos = act.get("position")
            cov_results = []
            for cv in target_covers:
                try:
                    if pos is not None:
                        r = z2m_engine.control_habana_entity(cv, "set_position", position=int(pos))
                    elif action_name in ("open", "subir", "up"):
                        r = z2m_engine.control_habana_entity(cv, "open")
                    elif action_name in ("close", "bajar", "down"):
                        r = z2m_engine.control_habana_entity(cv, "close")
                    else:
                        r = z2m_engine.control_habana_entity(cv, action_name)
                    cov_results.append({"entity_id": cv, "result": r})
                except Exception as e:
                    cov_results.append({"entity_id": cv, "error": str(e)})
            return {"entity_id": eid, "action": action_name, "results": cov_results}

        # 5. Control por habitaciones completas
        ROOM_TARGETS = {
            "salon": [
                "luz_luz_principal_del_salon_53c1", "luz_luz_del_comedor_d9b2",
                "luz_comedor_salon", "luz_techo_salon",
                "led_sofa_salon", "led_tv_salon", "led_aparador_salon"
            ],
            "andrea": [
                "luz_ventana_andrea", "luz_lazos_andrea",
                "led_cama_andrea", "led_foso_andrea"
            ],
            "principal": [
                "luz_techo_principal", "led_dormitorio_principal"
            ],
            "pasillo": [
                "luz_techo_pasillo", "led_pasillo_central"
            ],
            "cocina": [
                "luz_cocina", "luz_galeria_cocina"
            ],
            "bano": [
                "luz_estractor_7973", "luz_luz_baño_principal_2e8f"
            ]
        }
        clean_eid = eid.replace("room_", "").lower()
        if clean_eid in ROOM_TARGETS:
            targets = ROOM_TARGETS.get(clean_eid, [])
            room_res = []
            for t in targets:
                try:
                    r = z2m_engine.control_habana_entity(t, action_name, brightness_pct=bri)
                    room_res.append({"entity_id": t, "result": r})
                except Exception as e:
                    room_res.append({"entity_id": t, "error": str(e)})
            return {"room": clean_eid, "action": action_name, "results": room_res}

        # 6. Ambientes especiales (Modo Cine, Modo Relax, Briefing)
        if action_name == "briefing_audio" or eid == "briefing" or act.get("action") == "briefing_audio":
            from app.bunker.information import bunker_information
            res = bunker_information.speak_briefing()
            return {"action": "briefing_audio", "status": "active", "result": res}

        # 6. Ambientes especiales (Modo Cine, Modo Relax)
        if action_name == "modo_cine" or eid == "modo_cine":
            z2m_engine.control_habana_entity("luz_luz_principal_del_salon_53c1", "turn_off")
            z2m_engine.control_habana_entity("luz_luz_del_comedor_d9b2", "turn_off")
            z2m_engine.control_habana_entity("luz_comedor_salon", "turn_off")
            z2m_engine.control_habana_entity("led_tv_salon", "turn_on", brightness_pct=25, color_temp_kelvin=2700)
            z2m_engine.control_habana_entity("led_sofa_salon", "turn_on", brightness_pct=15, color_temp_kelvin=2700)
            return {"action": "modo_cine", "status": "active"}

        if action_name == "modo_relax" or eid == "modo_relax":
            z2m_engine.control_habana_entity("luz_luz_principal_del_salon_53c1", "turn_off")
            z2m_engine.control_habana_entity("luz_luz_del_comedor_d9b2", "turn_off")
            z2m_engine.control_habana_entity("led_sofa_salon", "turn_on", brightness_pct=40, color_temp_kelvin=2400)
            z2m_engine.control_habana_entity("led_aparador_salon", "turn_on", brightness_pct=30, color_temp_kelvin=2400)
            z2m_engine.control_habana_entity("led_tv_salon", "turn_on", brightness_pct=30, color_temp_kelvin=2400)
            return {"action": "modo_relax", "status": "active"}

        # 7. Escena o macro
        if eid.startswith("scene_") or act.get("type") == "scene":
            res = automation_service.execute_automation(eid, context={"force": True})
            return {"entity_id": eid, "action": "scene", "result": res}

        # 8. Dispositivo o luz real
        if eid:
            res = z2m_engine.control_habana_entity(
                entity_id=eid,
                action=action_name,
                brightness_pct=bri
            )
            return {"entity_id": eid, "action": action_name, "result": res}

        return {"entity_id": eid, "action": action_name, "error": "Acción no reconocida"}

    def execute_single_action(self, act: Dict[str, Any]) -> Dict[str, Any]:
        """Ejecuta una acción directa desde un botón individual."""
        check = self.can_execute("direct_action")
        if not check["allowed"]:
            return {"ok": False, "error": check["reason"]}

        self._last_execution_by_widget["direct_action"] = time.time()
        try:
            res = self._dispatch_action(act)
            return {"ok": True, "result": res}
        except Exception as e:
            logger.error(f"[Búnker Gatekeeper] Error ejecutando acción: {e}")
            return {"ok": False, "error": str(e)}

    def execute_widget_action(self, widget_id: str) -> Dict[str, Any]:
        """Ejecuta de forma segura todas las acciones de un widget del Búnker."""
        check = self.can_execute(widget_id)
        if not check["allowed"]:
            return {"ok": False, "error": check["reason"]}

        widget = bunker_storage.get_widget(widget_id)
        if not widget:
            return {"ok": False, "error": f"Widget '{widget_id}' no encontrado"}

        actions = widget.get("actions", [])
        if not actions and widget.get("buttons"):
            # Si tiene botones, usamos las acciones de los botones
            actions = [b.get("action_payload", {}) for b in widget.get("buttons")]

        if not actions:
            return {"ok": False, "error": "El widget no tiene acciones programadas"}

        now = time.time()
        self._last_execution_by_widget[widget_id] = now
        results = []

        for act in actions:
            try:
                res = self._dispatch_action(act)
                results.append(res)
            except Exception as e:
                logger.error(f"[Búnker Gatekeeper] Error en acción: {e}")
                results.append({"error": str(e)})

        bunker_storage.increment_run_count(widget_id)

        exec_entry = {
            "widget_id": widget_id,
            "title": widget.get("title"),
            "timestamp": now,
            "results_count": len(results),
            "status": "success"
        }
        self._recent_executions_log.append(exec_entry)
        if len(self._recent_executions_log) > self._max_history:
            self._recent_executions_log.pop(0)

        logger.info(f"🧱 [BÚNKER EJECUTADO] '{widget.get('title')}' ({len(results)} acciones ejecutadas)")
        return {
            "ok": True,
            "widget_id": widget_id,
            "title": widget.get("title"),
            "results": results
        }

    def get_recent_history(self) -> List[Dict[str, Any]]:
        return list(reversed(self._recent_executions_log))

    def get_execution_history(self) -> List[Dict[str, Any]]:
        return list(reversed(self._recent_executions_log))

bunker_gatekeeper = BunkerGatekeeper()
