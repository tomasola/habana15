import os
import re
import logging
import requests
import json
import time

from google import genai

from google.genai import types as genai_types

from app.core.config import settings

from app.core.state import state_manager

from app.services.google_cast import cast_service

from app.services.radio_service import radio_service

from app.services.stream_service import stream_service
from app.services.memory_service import memory_service

from app.services.tts import tts_service

from app.services.home_assistant import home_assistant_service
from app.services.device_mapping_service import device_mapping_service, normalize_text
from app.services.whatsapp import wa_bridge



logger = logging.getLogger("Agent")



gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)



PERSONAS = {

    "friday": (
        "Eres HABANA, la IA central de la casa de Tomás. "
        "Responde de forma concisa, servicial y cyberpunk, como el asistente de Iron Man. "
        "¡CRITICO!: Eres el controlador del hardware. Tu ÚNICA forma de interactuar con dispositivos físicos es imprimiendo etiquetas exactas CON CORCHETES al final de tu mensaje: [ZIGBEE:id,ACCION]. "
        "¡IMPORTANTE!: Puedes y DEBES emitir MÚLTIPLES etiquetas a la vez si el usuario pide controlar varios dispositivos (ej: 'enciende las luces del salón y pasillo' -> [ZIGBEE:led_tv_salon,ON][ZIGBEE:led_pasillo_central,ON]). Si te pide comandos complejos como 'enciende todo menos la luz X', debes generar una etiqueta ON para cada luz disponible excepto para la X. "
        "REGLA ABSOLUTA: NUNCA inventes IDs. SOLO puedes usar los IDs que aparecen en la sección [DISPOSITIVOS DOMÓTICOS DISPONIBLES]. Copia el ID exactamente como aparece, sin espacios. "
        "Acciones válidas: ON o OFF (luces/enchufes), OPEN, CLOSE o STOP (persianas cover.*). Para activar escenas (scene.*) usa ON. "
        "Para regular brillo o color en luces compatibles, puedes añadir parámetros opcionales: [ZIGBEE:id,ON,50%] (brillo 0-100%), [ZIGBEE:id,ON,calida] (luz cálida), [ZIGBEE:id,ON,fria] (luz fría) o combinados como [ZIGBEE:id,ON,50%,calida]. "
        "Usa SIEMPRE el ID exacto de la lista de dispositivos, nunca lo inventes. "
        "Las entidades 'Luz de fondo' son solo el piloto LED del interruptor, NO las uses salvo que te lo pidan explícitamente. "
        "Para la radio multiroom sincronizada, usa [RADIO:emisora] (identificadores obligatorios: cadena_ser, ser_madrid, los40, los40_classic, los40_dance, los40_urban, radiole, cadena_dial, kebuena, virgin_radio, m80, rac1, rac105, radio3, radio4, rfm). "
        "Para detener la radio, usa exactamente [RADIO:stop]. "
        "Para sintonizar un canal de televisión en las estancias con TV (salon, habitacion o cocina), usa [TV:estancia,canal] (ej: [TV:salon,telecinco], [TV:habitacion,antena3], [TV:cocina,la1], [TV:salon,la7cyl], [TV:todas,lasexta]). Para encender o apagar una tele usa [TV:estancia,on] o [TV:estancia,off]. "
        "Para cambiar el volumen de los altavoces, usa [VOLUMEN:nivel] donde nivel es un numero del 0 al 10 (ej: [VOLUMEN:5]). "
        "Para recordar datos importantes, usa [RECORDAR:hecho o preferencia]. "
        "Para enviar un archivo o documento (como un PDF) por WhatsApp al usuario, usa [ENVIAR_DOCUMENTO:nombre_del_archivo]. Ejemplo: [ENVIAR_DOCUMENTO:lola_manual.pdf]. "
        "Para guardar en la agenda, usa EXACTAMENTE esta sintaxis y orden: [AGENDA:titulo,YYYY-MM-DDTHH:MM:00,tipo,descripcion]. Ejemplo: [AGENDA:Cita medico,2026-08-15T10:00:00,evento,Traer radiografias]. ¡Es MUY IMPORTANTE que calcules la fecha usando la FECHA ACTUAL del sistema, nunca inventes fechas! Los tipos válidos son: recordatorio, evento, alarma, nota. Para crear una rutina domótica a una hora específica, usa [RUTINA:entidad,accion,YYYY-MM-DDTHH:MM:00]. Ejemplo: [RUTINA:luz_luz_principal_del_salon_53c1,ON,2026-08-15T23:00:00]. Para registrar una lección o regla cuando el usuario te corrija un fallo o te indique cómo actuar, usa: [LECCION:titulo|que_fallo|correccion|regla_futura]. Ejemplo: [LECCION:Luz de la tele|Encendió techo|Debió encender led TV|Usar siempre led_tv_salon para la tele]. Para crear o anadir un widget interactivo en el Bunker IA cuando el usuario te pida crear una ventana, boton o macro experimental, usa EXACTAMENTE [BUNKER_WIDGET:descripcion]. Ejemplo: [BUNKER_WIDGET:encender todas las luces, apagar todas las luces y radio]. "
    ),

    "ghost": (
        "Eres GHOST, una IA alternativa de la casa de Tomás. "
        "Responde con un tono más oscuro, sarcástico o analítico. "
        "¡CRITICO!: Eres el controlador del hardware. Tu ÚNICA forma de interactuar con dispositivos físicos es imprimiendo etiquetas exactas CON CORCHETES al final de tu mensaje: [ZIGBEE:id,ACCION]. "
        "¡IMPORTANTE!: Puedes y DEBES emitir MÚLTIPLES etiquetas a la vez si el usuario pide controlar varios dispositivos (ej: 'enciende las luces del salón y pasillo' -> [ZIGBEE:led_tv_salon,ON][ZIGBEE:led_pasillo_central,ON]). Si te pide comandos complejos como 'enciende todo menos la luz X', debes generar una etiqueta ON para cada luz disponible excepto para la X. "
        "REGLA ABSOLUTA: NUNCA inventes IDs. SOLO puedes usar los IDs que aparecen en la sección [DISPOSITIVOS DOMÓTICOS DISPONIBLES]. Copia el ID exactamente como aparece, sin espacios. "
        "Acciones válidas: ON o OFF (luces/enchufes), OPEN, CLOSE o STOP (persianas cover.*). Para activar escenas (scene.*) usa ON. "
        "Para regular brillo o color en luces compatibles, puedes añadir parámetros opcionales: [ZIGBEE:id,ON,50%] (brillo 0-100%), [ZIGBEE:id,ON,calida] (luz cálida), [ZIGBEE:id,ON,fria] (luz fría) o combinados como [ZIGBEE:id,ON,50%,calida]. "
        "Usa SIEMPRE el ID exacto de la lista de dispositivos, nunca lo inventes. "
        "Las entidades 'Luz de fondo' son solo el piloto LED del interruptor, NO las uses salvo que te lo pidan explícitamente. "
        "Para la radio multiroom sincronizada, usa [RADIO:emisora] (identificadores obligatorios: cadena_ser, ser_madrid, los40, los40_classic, los40_dance, los40_urban, radiole, cadena_dial, kebuena, virgin_radio, m80, rac1, rac105, radio3, radio4, rfm). "
        "Para detener la radio, usa exactamente [RADIO:stop]. "
        "Para sintonizar un canal de televisión en las estancias con TV (salon, habitacion o cocina), usa [TV:estancia,canal] (ej: [TV:salon,telecinco], [TV:habitacion,antena3], [TV:cocina,la1], [TV:salon,la7cyl], [TV:todas,lasexta]). Para encender o apagar una tele usa [TV:estancia,on] o [TV:estancia,off]. "
        "Para cambiar el volumen de los altavoces, usa [VOLUMEN:nivel] donde nivel es un numero del 0 al 10 (ej: [VOLUMEN:5]). "
        "Para recordar datos importantes, usa [RECORDAR:hecho o preferencia]. "
        "Para enviar un archivo o documento (como un PDF) por WhatsApp al usuario, usa [ENVIAR_DOCUMENTO:nombre_del_archivo]. Ejemplo: [ENVIAR_DOCUMENTO:lola_manual.pdf]. "
        "Para guardar en la agenda, usa EXACTAMENTE esta sintaxis y orden: [AGENDA:titulo,YYYY-MM-DDTHH:MM:00,tipo,descripcion]. Ejemplo: [AGENDA:Cita medico,2026-08-15T10:00:00,evento,Traer radiografias]. ¡Es MUY IMPORTANTE que calcules la fecha usando la FECHA ACTUAL del sistema, nunca inventes fechas! Los tipos válidos son: recordatorio, evento, alarma, nota. Para crear una rutina domótica a una hora específica, usa [RUTINA:entidad,accion,YYYY-MM-DDTHH:MM:00]. Ejemplo: [RUTINA:luz_luz_principal_del_salon_53c1,ON,2026-08-15T23:00:00]."
    )

}



class NeuralAgent:

    def __init__(self):

        self.context_window = []



    def get_system_prompt(self) -> str:
        persona_id = state_manager.get_state().active_persona
        base_prompt = PERSONAS.get(persona_id, PERSONAS["friday"])
        
        try:
            from app.core.plugin_loader import plugin_registry
            base_prompt += plugin_registry.get_prompt_extensions()
        except Exception as e:
            logger.error(f"Error cargando extensiones de plugin: {e}")
            
        return base_prompt



    def process_message(self, user_text: str, source: str = "web", from_number: str = None) -> tuple[str, str]:

        logger.info(f"Procesando mensaje de {source}: {user_text}")

        # FAST TRACK WIDGETS & AUTO-MODIFICACIÓN DINÁMICA (Auto-Evolución de UI por IA)
        try:
            from app.services.widget_service import widget_service
            norm_w_text = user_text.strip()

            # 0. Crear widget / panel en el Búnker IA
            if ("bunker" in norm_w_text.lower() or "búnker" in norm_w_text.lower()) and any(kw in norm_w_text.lower() for kw in ("crea", "haz", "pon", "añade", "diseña")):
                from app.bunker.storage import bunker_storage
                buttons = []
                w_title = "Panel Búnker: Luces & Radio" if ("luces" in norm_w_text.lower() or "radio" in norm_w_text.lower()) else "Panel Experimental Búnker"
                w_desc = norm_w_text
                w_color = "#00f3ff"
                w_icon = "🎛️"

                if "luz" in norm_w_text.lower() or "luces" in norm_w_text.lower():
                    buttons.append({
                        "label": "Encender Todas las Luces",
                        "icon": "💡",
                        "color": "#10b981",
                        "action_payload": {"entity_id": "all_lights", "action": "turn_on_all"}
                    })
                    buttons.append({
                        "label": "Apagar Todas las Luces",
                        "icon": "🌙",
                        "color": "#ef4444",
                        "action_payload": {"entity_id": "all_lights", "action": "turn_off_all"}
                    })
                if "radio" in norm_w_text.lower() or "musica" in norm_w_text.lower() or "música" in norm_w_text.lower():
                    buttons.append({
                        "label": "Radio On / Off (Los 40)",
                        "icon": "📻",
                        "color": "#38bdf8",
                        "action_payload": {"entity_id": "radio", "action": "toggle", "station": "los40"}
                    })

                if not buttons:
                    buttons.append({
                        "label": "Ejecutar",
                        "icon": "⚡",
                        "color": "#00f3ff",
                        "action_payload": {"raw_command": norm_w_text}
                    })

                w_data = {
                    "title": w_title,
                    "icon": w_icon,
                    "category": "panel",
                    "author": f"IA Avatar ({source})",
                    "description": w_desc,
                    "color": w_color,
                    "buttons": buttons,
                    "actions": [b.get("action_payload", {}) for b in buttons]
                }
                saved_b = bunker_storage.save_widget(w_data)
                resp_text = f"¡Entendido! He creado la ventana '{saved_b['title']}' con sus {len(buttons)} botones en el Búnker IA. Ya puedes acceder y probarla con total seguridad."
                logger.info(f"Widget creado en Búnker vía IA ({source}): {saved_b['id']}")
                audio_url = tts_service.generate_audio(resp_text, persona=state_manager.get_state().active_persona)
                return resp_text, audio_url
            
            # 1. Crear nuevo botón en pantalla
            w_create_m = re.search(
                r"\b(crea|pon|a[ñn]ade|haz)\s+(?:un\s+)?bot[oó]n\s+(?:en\s+(?:la\s+)?pantalla\s+)?(?:que\s+se\s+llame|llamado)?\s*['\"]?([^'\"]+?)['\"]?\s+(?:y\s+|que\s+|para\s+)?(.+)$",
                norm_w_text,
                re.IGNORECASE
            )
            if w_create_m:
                btn_name = w_create_m.group(2).strip()
                btn_action_raw = w_create_m.group(3).strip()
                
                # Asignar icono y color según acción
                icon = "⚡"
                color = "#00f3ff"
                act_lower = btn_action_raw.lower()
                if any(w in act_lower for w in ("apaga", "apagar", "noche", "dormir", "off")):
                    icon = "🌙"
                    color = "#ef4444"
                elif any(w in act_lower for w in ("cine", "pelicula", "tele", "tv")):
                    icon = "🎬"
                    color = "#8b5cf6"
                elif any(w in act_lower for w in ("relax", "calida", "suave", "vela")):
                    icon = "🕯️"
                    color = "#f59e0b"
                elif any(w in act_lower for w in ("musica", "radio", "cancion")):
                    icon = "📻"
                    color = "#10b981"
                elif any(w in act_lower for w in ("siesta", "descanso")):
                    icon = "🛋️"
                    color = "#06b6d4"

                new_widget_data = {
                    "title": btn_name.capitalize(),
                    "icon": icon,
                    "color": color,
                    "description": btn_action_raw,
                    "action_type": "all_off" if "apaga todo" in act_lower or "apagar todo" in act_lower else "multi_command",
                    "payload": {
                        "raw_command": btn_action_raw,
                        "commands": []
                    }
                }
                
                if "salon" in act_lower or "salón" in act_lower:
                    new_widget_data["room"] = "salon"
                elif "andrea" in act_lower:
                    new_widget_data["room"] = "andrea"
                elif "cocina" in act_lower:
                    new_widget_data["room"] = "cocina"

                created_widget = widget_service.add_widget(new_widget_data, created_by=f"ia_{source}")
                resp_text = f"¡Listo! He creado el botón '{created_widget['title']}' {icon} en tu pantalla principal. Ya puedes usarlo directamente."
                logger.info(f"Botón dinámico creado por IA vía {source}: {created_widget['id']}")
                audio_url = tts_service.generate_audio(resp_text, persona=state_manager.get_state().active_persona)
                return resp_text, audio_url

            # 2. Borrar botón de la pantalla
            w_del_m = re.search(
                r"\b(elimina|borra|quita)\s+(?:el\s+)?bot[oó]n\s+['\"]?([^'\"]+)['\"]?",
                norm_w_text,
                re.IGNORECASE
            )
            if w_del_m:
                target_btn_name = w_del_m.group(2).strip().lower()
                all_w = widget_service.list_widgets()
                matched_id = None
                matched_title = ""
                for w in all_w:
                    if target_btn_name in w.get("title", "").lower() or w.get("title", "").lower() in target_btn_name:
                        matched_id = w.get("id")
                        matched_title = w.get("title")
                        break
                if matched_id:
                    widget_service.delete_widget(matched_id)
                    resp_text = f"He eliminado el botón '{matched_title}' de tu pantalla principal."
                else:
                    resp_text = f"No he encontrado ningún botón en la pantalla con el nombre '{target_btn_name}'."
                audio_url = tts_service.generate_audio(resp_text, persona=state_manager.get_state().active_persona)
                return resp_text, audio_url

        except Exception as _e_widget_ai:
            logger.error(f"Error procesando auto-modificación de widget: {_e_widget_ai}")
        
        # FAST TRACK SCENES (Detección instantánea de escenas como Modo Cine, Modo Relax, Buenas Noches, etc.)
        norm_input = normalize_text(user_text)
        from app.services.automation_service import automation_service
        all_autos = automation_service.list_automations()
        matched_scene_id = None
        for auto in all_autos:
            if not auto.get("enabled", True):
                continue
            vc = auto.get("trigger", {}).get("voice_command")
            if vc:
                norm_vc = normalize_text(vc)
                if norm_input == norm_vc or norm_input in (f"activa {norm_vc}", f"pon {norm_vc}", f"activar {norm_vc}", f"poner {norm_vc}", f"modo {norm_vc}"):
                    matched_scene_id = auto["id"]
                    break
        if matched_scene_id:
            res = automation_service.execute_automation(matched_scene_id)
            auto_item = automation_service.get_automation(matched_scene_id)
            resp_text = (auto_item.get("tts_message") if auto_item else None) or f"Escena '{auto_item.get('name', 'activada')}' configurada."
            logger.info(f"Escena ejecutada por comando de voz: '{user_text}' -> {matched_scene_id}")
            audio_url = tts_service.generate_audio(resp_text, persona=state_manager.get_state().active_persona)
            return resp_text, audio_url

        # FAST TRACK SELECTIVE ("deja solo los led de ... encendidos")
        selective_match = re.search(
            r'\b(deja|pon|mant[eé]n)\s+solo\s+(?:los\s+|las\s+|el\s+|la\s+)?(leds?|tiras?\s*led|tiras?)\s+(?:de\s+la\s+|del\s+|de\s+)?(habitaci[oó]n\s+principal|dormitorio\s+principal|principal|sal[oó]n|andrea|pasillo|ba[ñn]o)',
            user_text.strip(),
            re.IGNORECASE
        )
        if selective_match:
            from app.services.z2m_lighting_engine import z2m_engine
            zona = selective_match.group(3).lower()
            off_list, on_list, label_zona = [], [], ""
            if "principal" in zona:
                off_list = ["luz_techo_principal"]
                on_list = ["led_dormitorio_principal"]
                label_zona = "la habitación principal"
            elif "sal" in zona:
                off_list = ["luz_luz_principal_del_salon_53c1", "luz_luz_del_comedor_d9b2", "luz_comedor_salon", "luz_techo_salon"]
                on_list = ["led_sofa_salon", "led_tv_salon", "led_aparador_salon"]
                label_zona = "el salón"
            elif "andrea" in zona:
                off_list = ["luz_lazos_andrea", "luz_ventana_andrea"]
                on_list = ["led_cama_andrea", "led_foso_andrea"]
                label_zona = "la habitación de Andrea"
            elif "pasillo" in zona:
                off_list = ["luz_techo_pasillo"]
                on_list = ["led_pasillo_central"]
                label_zona = "el pasillo"
            elif "ba" in zona:
                off_list = ["luz_techo_bano"]
                on_list = ["led_espejo_bano"]
                label_zona = "el baño"

            if on_list:
                for eid in off_list:
                    z2m_engine.control_habana_entity(eid, "OFF")
                for eid in on_list:
                    z2m_engine.control_habana_entity(eid, "ON")
                resp_text = f"Hecho. He apagado la luz general y he dejado solo los LEDs de {label_zona} encendidos."
                audio_url = tts_service.generate_audio(resp_text, persona=state_manager.get_state().active_persona)
                return resp_text, audio_url

        # FAST TRACK TELEVISIÓN Y CANALES POR VOZ (Salón, Habitación Principal, Cocina)
        try:
            from app.services.tv_media_orchestrator import tv_manager
            tv_voice_resp = tv_manager.try_handle_voice_command(user_text)
            if tv_voice_resp:
                logger.info(f"📺 [Fast-Track TV Voz] '{user_text}' -> {tv_voice_resp}")
                audio_url = tts_service.generate_audio(tv_voice_resp, persona=state_manager.get_state().active_persona)
                return tv_voice_resp, audio_url
        except Exception as _e_tv_voice:
            logger.error(f"Error en Fast-Track TV Voz: {_e_tv_voice}")

        # FAST TRACK DOMOTICS (Bypass Neural para velocidad instantánea con soporte de Alias y Brillo/Color)
        fast_track_pattern = re.compile(
            r'^(enciende|apaga|abre|cierra|activa|desactiva|sube|baja|pon|coloca|ajusta)\s+(.+)$',
            re.IGNORECASE
        )
        match = fast_track_pattern.match(user_text.strip())
        if match:
            accion_str = match.group(1).lower()
            resto = match.group(2).strip()
            if resto.lower() in ["la", "el", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "algo", ""]:
                resp_text = f"¿Qué dispositivo o luz quieres {accion_str}, Tomás?"
                audio_url = tts_service.generate_audio(resp_text, persona=state_manager.get_state().active_persona)
                return resp_text, audio_url

            brightness_pct = None
            pct_match = re.search(r'\b(?:al\s+|a\s+)?(\d{1,3})\s*%', resto, re.IGNORECASE)
            if pct_match:
                brightness_pct = max(0, min(100, int(pct_match.group(1))))
                resto = re.sub(r'\b(?:al\s+|a\s+)?\d{1,3}\s*%', '', resto, flags=re.IGNORECASE).strip()

            color_temp_kelvin = None
            if re.search(r'\b(c[aá]lid[ao]|c[aá]liente)\b', resto, re.IGNORECASE):
                color_temp_kelvin = 2700
                resto = re.sub(r'\b(?:con\s+luz\s+|luz\s+)?(c[aá]lid[ao]|c[aá]liente)\b', '', resto, flags=re.IGNORECASE).strip()
            elif re.search(r'\b(fr[ií][ao])\b', resto, re.IGNORECASE):
                color_temp_kelvin = 5500
                resto = re.sub(r'\b(?:con\s+luz\s+|luz\s+)?(fr[ií][ao])\b', '', resto, flags=re.IGNORECASE).strip()
            elif re.search(r'\b(neutr[ao]|blanca)\b', resto, re.IGNORECASE):
                color_temp_kelvin = 4000
                resto = re.sub(r'\b(?:con\s+luz\s+|luz\s+)?(neutr[ao]|blanca)\b', '', resto, flags=re.IGNORECASE).strip()
            else:
                k_match = re.search(r'\b(\d{4})\s*k\b', resto, re.IGNORECASE)
                if k_match:
                    color_temp_kelvin = max(2000, min(6500, int(k_match.group(1))))
                    resto = re.sub(r'\b\d{4}\s*k\b', '', resto, flags=re.IGNORECASE).strip()

            rgb_color = None
            colors = {
                "rojo": [255, 0, 0], "roja": [255, 0, 0],
                "azul": [0, 80, 255], "celeste": [0, 180, 255],
                "verde": [0, 255, 0], "amarillo": [255, 230, 0],
                "amarilla": [255, 230, 0], "naranja": [255, 120, 0],
                "morado": [180, 0, 255], "rosa": [255, 50, 150]
            }
            for c_name, c_rgb in colors.items():
                if re.search(rf'\b{c_name}\b', resto, re.IGNORECASE):
                    rgb_color = c_rgb
                    resto = re.sub(rf'\b(?:de\s+color\s+|en\s+|color\s+)?{c_name}\b', '', resto, flags=re.IGNORECASE).strip()
                    break

            clean_search = re.sub(r'^(la\s+tira\s+led|la\s+tira|las\s+tiras\s+led|las\s+tiras|la\s+luz|el\s+led|la\s+persiana|el\s+enchufe|la\s+l[aá]mpara|el\s+estor|los\s+leds|las\s+luces|el|la|los|las)\s+', '', resto, flags=re.IGNORECASE).strip()
            clean_search = re.sub(r'^(del|de\s+la|de\s+los|de\s+las|de)\s+', '', clean_search, flags=re.IGNORECASE).strip()
            clean_search = re.sub(r'\s+(y\s+luz|y)\s*$', '', clean_search, flags=re.IGNORECASE).strip()

            from app.services.z2m_lighting_engine import z2m_engine

            multi_targets = None
            multi_room_label = None
            # 1. Control global de TODA LA CASA (Apaga todo / Enciende todo / Todas las luces)
            if re.search(r'^(?:todas las luces|todo|toda la casa|las luces de la casa|las luces)$', resto.strip(), re.IGNORECASE) or clean_search in ("todas las luces", "todo", "toda la casa", "luces casa"):
                multi_targets = [
                    "luz_luz_principal_del_salon_53c1", "luz_luz_del_comedor_d9b2", "luz_comedor_salon", "luz_techo_salon",
                    "led_sofa_salon", "led_tv_salon", "led_aparador_salon",
                    "luz_techo_cocina",
                    "luz_techo_pasillo", "led_pasillo_central",
                    "luz_lazos_andrea", "luz_ventana_andrea", "led_cama_andrea", "led_foso_andrea",
                    "luz_techo_principal", "led_dormitorio_principal",
                    "luz_techo_bano", "led_espejo_bano",
                    "luz_recibidor_entrada"
                ]
                multi_room_label = "todas las luces de la casa"
            elif re.search(r'\b(todas las luces|las luces|luces|todo|todo el)\s+(?:del\s+|de\s+)?(sal[oó]n)\b', resto, re.IGNORECASE) or clean_search in ("luces salon", "todas las luces salon", "todo el salon", "salon completo"):
                multi_targets = ["luz_luz_principal_del_salon_53c1", "luz_luz_del_comedor_d9b2", "luz_comedor_salon", "luz_techo_salon", "led_sofa_salon", "led_tv_salon", "led_aparador_salon"]
                multi_room_label = "todas las luces del salón"
            elif re.search(r'\b(leds|tiras|tiras led|luces led)\s+(?:del\s+|de\s+)?(sal[oó]n)\b', resto, re.IGNORECASE) or \
               (clean_search in ("leds salon", "tiras salon", "tiras led salon", "led salon")):
                multi_targets = ["led_sofa_salon", "led_tv_salon", "led_aparador_salon"]
                multi_room_label = "las tiras LED del salón"
            elif re.search(r'\b(todas las luces|las luces|luces)\s+(?:de\s+)?(andrea)\b', resto, re.IGNORECASE) or clean_search in ("luces andrea", "todas las luces andrea"):
                multi_targets = ["luz_lazos_andrea", "luz_ventana_andrea", "led_cama_andrea", "led_foso_andrea"]
                multi_room_label = "todas las luces de Andrea"
            elif re.search(r'\b(leds|tiras|tiras led|luces led)\s+(?:de\s+)?(andrea)\b', resto, re.IGNORECASE) or \
                 (clean_search in ("leds andrea", "tiras andrea", "tiras led andrea")):
                multi_targets = ["led_cama_andrea", "led_foso_andrea"]
                multi_room_label = "las tiras LED de Andrea"
            elif re.search(r'\b(todas las luces|las luces|luces|todo)\s+(?:de la\s+|del\s+|de\s+)?(habitaci[oó]n principal|dormitorio principal|principal)\b', resto, re.IGNORECASE) or \
                 clean_search in ("luces habitacion principal", "luces dormitorio principal", "luces principal", "habitacion principal", "dormitorio principal"):
                multi_targets = ["luz_techo_principal", "led_dormitorio_principal"]
                multi_room_label = "todas las luces de la habitación principal"
            elif re.search(r'\b(leds|led|tiras|tira led|tiras led|luces led)\s+(?:de la\s+|del\s+|de\s+)?(habitaci[oó]n principal|dormitorio principal|principal)\b', resto, re.IGNORECASE) or \
                 clean_search in ("led habitacion principal", "leds habitacion principal", "led dormitorio principal", "leds principal"):
                multi_targets = ["led_dormitorio_principal"]
                multi_room_label = "la tira LED de la habitación principal"
            elif re.search(r'\b(leds?|tiras?\s*led|tiras?|luces?\s*led|tiradera)\s+(?:del\s+|de\s+)?(pasillo)\b', resto, re.IGNORECASE) or (clean_search in ("led pasillo", "leds pasillo", "tiras pasillo", "tiras led pasillo", "led del pasillo", "las led del pasillo", "los leds del pasillo", "tira del pasillo", "tira led del pasillo", "tiradera pasillo", "tiradera del pasillo")):
                multi_targets = ["led_pasillo_central"]
                multi_room_label = "la tira LED del pasillo"
            elif re.search(r'\b(luz\s+techo|luz\s+del\s+techo|bombilla|techo)\s+(?:del\s+|de\s+)?(pasillo)\b', resto, re.IGNORECASE) or (clean_search in ("luz techo pasillo", "techo pasillo", "bombilla pasillo", "luz pasillo", "luz del pasillo")):
                multi_targets = ["luz_techo_pasillo"]
                multi_room_label = "la luz del techo del pasillo"
            elif re.search(r'\b(todas las luces|las luces|luces)\s+(?:del\s+|de\s+)?(pasillo)\b', resto, re.IGNORECASE) or clean_search in ("luces pasillo", "todo el pasillo"):
                multi_targets = ["luz_techo_pasillo", "led_pasillo_central"]
                multi_room_label = "todas las luces del pasillo"
            elif re.search(r'\b(todas las luces|las luces|luces)\s+(?:del\s+|de\s+)?(ba[ñn]o)\b', resto, re.IGNORECASE) or clean_search in ("luces bano", "luces baño"):
                multi_targets = ["luz_techo_bano", "led_espejo_bano"]
                multi_room_label = "todas las luces del baño" 

            if multi_targets:
                ha_act = "OFF" if accion_str in ["apaga", "cierra", "desactiva", "baja"] else "ON"
                for t in multi_targets:
                    z2m_engine.control_habana_entity(
                        t, ha_act,
                        brightness_pct=brightness_pct,
                        color_temp_kelvin=color_temp_kelvin,
                        rgb_color=rgb_color
                    )
                verbo = "Desactivadas" if ha_act == "OFF" else "Activadas"
                detalles = []
                if brightness_pct is not None:
                    detalles.append(f"al {brightness_pct}%")
                if color_temp_kelvin:
                    detalles.append(f"{color_temp_kelvin}K")
                detalles_str = f" ({', '.join(detalles)})" if detalles else ""
                resp_text = f"Hecho. {verbo} {multi_room_label}{detalles_str}."
                audio_url = tts_service.generate_audio(resp_text, persona=state_manager.get_state().active_persona)
                return resp_text, audio_url

            target_id = device_mapping_service.find_entity_by_alias(clean_search) or \
                        device_mapping_service.find_entity_by_alias(resto) or \
                        device_mapping_service.find_entity_by_alias(user_text)

            if not target_id:
                devices = z2m_engine.get_habana_devices_list()
                lugar = clean_search.replace(" ", "_").replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u").strip()
                for d in devices:
                    if not d['id'].startswith("sensor.") and (d['id'].endswith(f"_{lugar}") or d['id'].endswith(f".{lugar}")):
                        target_id = d['id']
                        break
                if not target_id:
                    for d in devices:
                        if not d['id'].startswith("sensor.") and d.get('name') and clean_search.lower() in d['name'].lower():
                            target_id = d['id']
                            break
                if not target_id:
                    for d in devices:
                        if not d['id'].startswith("sensor.") and lugar in d['id']:
                            target_id = d['id']
                            break

            if target_id:
                domain = "cover" if target_id.startswith("cover.") else "light"
                if domain == "cover":
                    if brightness_pct is not None:
                        ha_action = "set_cover_position"
                        pos_arg = brightness_pct
                    else:
                        ha_action = "OPEN" if accion_str in ["enciende", "abre", "sube", "activa"] else "CLOSE"
                        pos_arg = None
                else:
                    pos_arg = None
                    if brightness_pct is not None or color_temp_kelvin is not None or rgb_color is not None:
                        ha_action = "turn_on"
                    elif accion_str in ["apaga", "cierra", "desactiva", "baja"]:
                        ha_action = "OFF"
                    else:
                        ha_action = "ON"

                logger.info(f"Bypass de IA disparado: '{user_text}' -> {target_id} ({ha_action}, pct={brightness_pct}, kelvin={color_temp_kelvin})")

                res_z2m = z2m_engine.control_habana_entity(
                    target_id, ha_action,
                    position=pos_arg,
                    brightness_pct=brightness_pct,
                    color_temp_kelvin=color_temp_kelvin,
                    rgb_color=rgb_color
                )
                if not res_z2m.get("ok"):
                    home_assistant_service.control_device(
                        target_id, ha_action,
                        position=pos_arg,
                        brightness_pct=brightness_pct,
                        color_temp_kelvin=color_temp_kelvin,
                        rgb_color=rgb_color
                    )

                # Obtener nombre descriptivo amigable para el TTS
                dev_info = device_mapping_service.get_device_info(target_id)
                alias_friendly = (dev_info.get("alias_ai") if dev_info else None) or clean_search or target_id
                
                detalles = []
                if brightness_pct is not None:
                    detalles.append(f"al {brightness_pct}%")
                if color_temp_kelvin == 2700:
                    detalles.append("luz cálida")
                elif color_temp_kelvin == 5500:
                    detalles.append("luz fría")
                elif color_temp_kelvin == 4000:
                    detalles.append("luz neutra")
                elif color_temp_kelvin:
                    detalles.append(f"{color_temp_kelvin} Kelvin")
                if rgb_color:
                    detalles.append("en color")

                detalles_str = f" ({', '.join(detalles)})" if detalles else ""
                verbo_resp = "Activado" if ha_action in ["ON", "turn_on", "OPEN"] else "Desactivado"
                respuesta_texto = f"Hecho. {verbo_resp} {alias_friendly}{detalles_str}."
                audio_url = tts_service.generate_audio(respuesta_texto, persona=state_manager.get_state().active_persona)

                return respuesta_texto, audio_url

        # Paralelizar contexto para maxima velocidad
        import concurrent.futures

        def get_weather():
            weather_context = ""
            clima_keywords = ["tiempo", "clima", "temperatura", "lluvia", "viento", "sol", "pronostico", "pronóstico", "hace hoy", "hace mañana"]
            if any(kw in user_text.lower() for kw in clima_keywords):
                match_city = re.search(r"\b(?:en|de|por|para)\s+([a-zA-ZñáéíóúüÑÁÉÍÓÚÜ\s]+)", user_text, re.IGNORECASE)
                ciudad = "Ourense"
                if match_city:
                    words = match_city.group(1).strip().split()
                    clean_words = [w for w in words if w.lower() not in ["hoy", "mañana", "tarde", "noche", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]]
                    if clean_words:
                        ciudad = " ".join(clean_words)
                try:
                    geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={ciudad}&count=1&language=es&format=json"
                    geo_resp = requests.get(geo_url, timeout=5).json()
                    if geo_resp.get('results'):
                        res = geo_resp['results'][0]
                        lat, lon = res['latitude'], res['longitude']
                        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto"
                        data = requests.get(w_url, timeout=5).json()
                        cw = data.get('current_weather', {})
                        daily = data.get('daily', {})
                        weather_context = (
                            f"\n[DATOS DEL TIEMPO EN TIEMPO REAL - {res.get('name')}, {res.get('country')}]:\n"
                            f"Temperatura actual: {cw.get('temperature')}°C. Código de clima: {cw.get('weathercode')}.\n"
                            f"Pronóstico hoy: Máxima {daily.get('temperature_2m_max', [0])[0]}°C, Mínima {daily.get('temperature_2m_min', [0])[0]}°C.\n"
                        )
                        logger.info(f"Inyectando contexto de clima para {ciudad}")
                except Exception as e:
                    logger.error(f"Error al pre-cargar clima: {e}")
            return weather_context

        def get_memory():
            long_term_memory_context = ""
            # Saltar memoria profunda si es un comando obvio de domotica o charla trivial
            skip_kw = ["enciende", "apaga", "abre", "cierra", "pon la radio", "para la radio", "volumen", "hora es", "hola", "qué tal", "que tal", "buenos días", "buenas noches"]
            if any(kw in user_text.lower() for kw in skip_kw):
                return ""
            try:
                from app.services.memory_service import memory_service
                memories = memory_service.search_memory(user_text, n_results=2)
                if memories:
                    long_term_memory_context = "\n\n[MEMORIA A LARGO PLAZO / DOCUMENTOS]:\nLa siguiente informacin ha sido recuperada de tu memoria profunda y es sumamente relevante:\n"
                    for m in memories:
                        meta_str = str(m.get('metadata', {}))
                        long_term_memory_context += f"--- Inicio Documento (Meta: {meta_str}) ---\n{m['text']}\n--- Fin Documento ---\n"
            except Exception as e:
                logger.error(f"Error recuperando memoria a largo plazo: {e}")
            return long_term_memory_context

        def get_devices():
            devices_context = ""
            try:
                # 1. Catálogo oficial de alias IA y capacidades de hardware
                catalog = device_mapping_service.get_prompt_catalog()
                if catalog:
                    devices_context = f"\n\n[DISPOSITIVOS DOMÓTICOS DISPONIBLES (ALIAS Y CONTROL DE HARDWARE)]:\n{catalog}\n"
                else:
                    from app.services.home_assistant import home_assistant_service
                    devices = home_assistant_service.list_entities()
                    if devices:
                        devices_context = "\n\n[DISPOSITIVOS DOMÓTICOS DISPONIBLES]:\n"
                        for d in devices:
                            did = d.get('id') or d.get('entity_id')
                            if not did.startswith('sensor.') and 'luz_de_fondo' not in did.lower():
                                devices_context += f"- ID: {did} | Nombre: {d.get('name', 'N/A')} | Estado: {d['state']}\n"
            except Exception as e:
                logger.error(f"Error recuperando dispositivos: {e}")
            return devices_context

        # Check if the user is changing persona via text command
        if user_text.lower().startswith("friday ") or user_text.lower() == "friday":
            state_manager.update_state({"active_persona": "friday"})
            user_text = user_text[len("friday"):].strip()
        elif user_text.lower().startswith("ghost ") or user_text.lower() == "ghost":
            state_manager.update_state({"active_persona": "ghost"})
            user_text = user_text[len("ghost"):].strip()

        from datetime import datetime
        import locale
        try:
            locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
        except:
            pass
        now = datetime.now()
        date_context = f"\n\n[DATOS DEL SISTEMA]: La FECHA y HORA ACTUAL es {now.strftime('%A, %d de %B de %Y %H:%M:%S')}. (ISO: {now.isoformat()}). Úsala obligatoriamente como referencia cronológica para calcular 'mañana', 'próxima semana', etc."
        
        # Recuperar Memoria Histórica del usuario actual
        from app.services.tracker import tracker
        historial = tracker.get_conversations(limit=3)
        memory_context = "\n\n[MEMORIA A CORTO PLAZO]: Conversaciones recientes:\n"
        if historial:
            for h in historial:
                prefix = "USUARIO" if h.get("sender") in ["user", "usuario"] else "HABANA"
                memory_context += f"- {prefix}: {h['message']}\n"
            memory_context += "(Nota interna de sistema: Los tags [ZIGBEE:...] emitidos por HABANA han sido procesados y ocultados del historial de chat, pero sigues teniendo OBLIGACION de generarlos en tu nueva respuesta para mover hardware.)\n"
        else:
            memory_context += "(Ninguna)\n"

        # Fetch I/O context in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            future_weather = executor.submit(get_weather)
            future_memory = executor.submit(get_memory)
            future_devices = executor.submit(get_devices)
            
            weather_context = future_weather.result()
            long_term_memory_context = future_memory.result()
            devices_context = future_devices.result()

        # Obsidian Learned Lessons Retrieval (Prioridad Absoluta)
        lessons_context = ""
        try:
            from app.services.obsidian_service import obsidian_service
            lessons_context = obsidian_service.get_lessons_prompt_context()
        except Exception as e:
            logger.warning(f"Error recuperando lecciones aprendidas de Obsidian: {e}")

        # Obsidian Vault Knowledge Retrieval
        obsidian_context = ""
        try:
            from app.services.obsidian_service import obsidian_service
            obsidian_matches = obsidian_service.search_vault(user_text, max_results=3)
            if obsidian_matches:
                obsidian_context = "\n\n[CONOCIMIENTO EN OBSIDIAN / SEGUNDO CEREBRO]:\n"
                for m in obsidian_matches:
                    obsidian_context += f"- [[{m['path']}]] ({m['category']}): {m['excerpt']}\n"
        except Exception as e:
            logger.warning(f"Error recuperando contexto de Obsidian: {e}")

        sys_prompt = self.get_system_prompt() + lessons_context + weather_context + date_context + memory_context + long_term_memory_context + devices_context + obsidian_context
        logger.info(f'SYSTEM PROMPT EVALUATED: {sys_prompt}')


        

        state = state_manager.get_state()
        engine = state.voice_engine

        answer = "Modo de emergencia: Subsistema neural desconectado."
        
        # MODEL LADDER & COOLDOWNS
        # Priorizar el motor activo elegido por el usuario con respaldo multi-modelo
        if engine == "ollama":
            model_ladder = [
                ("ollama", "llama3.2:latest"),
                ("groq", "openai/gpt-oss-20b"),
                ("groq", "qwen/qwen3.8-27b"),
                ("groq", "openai/gpt-oss-120b"),
                ("gemini", "gemini-2.5-flash"),
                ("gemini", "gemini-2.5-flash-lite")
            ]
        elif engine == "gemini":
            model_ladder = [
                ("gemini", "gemini-2.5-flash"),
                ("gemini", "gemini-2.5-flash-lite"),
                ("groq", "openai/gpt-oss-20b"),
                ("groq", "qwen/qwen3.8-27b"),
                ("groq", "openai/gpt-oss-120b"),
                ("ollama", "llama3.2:latest")
            ]
        else:
            # GROQ (Default Ultrarrápido con múltiples modelos de respaldo ante 429)
            model_ladder = [
                ("groq", "qwen/qwen3.8-27b"),
                ("groq", "openai/gpt-oss-20b"),
                ("groq", "openai/gpt-oss-120b"),
                ("gemini", "gemini-2.5-flash"),
                ("gemini", "gemini-2.5-flash-lite"),
                ("ollama", "llama3.2:latest")
            ]
        
        # Tiempo de cooldown en segundos para saltar un modelo que falló recientemente
        if not hasattr(self, "_model_cooldowns"):
            self._model_cooldowns = {}
            
        success = False
        
        for m_engine, m_name in model_ladder:
            # Check cooldown
            cooldown_until = self._model_cooldowns.get(f"{m_engine}:{m_name}", 0)
            if time.time() < cooldown_until:
                logger.info(f"Saltando {m_engine} ({m_name}) - En cooldown.")
                continue
                
            try:
                logger.info(f"Intentando generar respuesta con {m_engine} ({m_name})...")
                
                if m_engine == "gemini":
                    response = gemini_client.models.generate_content(
                        model=m_name,
                        contents=user_text,
                        config=genai_types.GenerateContentConfig(
                            system_instruction=sys_prompt,
                            temperature=0.7,
                            max_output_tokens=1024,
                        )
                    )
                    answer = response.text or ""
                    
                elif m_engine == "groq":
                    headers = {
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": m_name,
                        "messages": [
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": user_text}
                        ],
                        "temperature": 0.7
                    }
                    response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=8)
                    response.raise_for_status()
                    answer = response.json()["choices"][0]["message"]["content"]
                    
                elif m_engine == "ollama":
                    ollama_url = f"{settings.OLLAMA_HOST.rstrip('/')}/api/chat"
                    ollama_payload = {
                        "model": m_name,
                        "messages": [
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": user_text}
                        ],
                        "stream": False
                    }
                    o_res = requests.post(ollama_url, json=ollama_payload, timeout=25)
                    o_res.raise_for_status()
                    answer = o_res.json()["message"]["content"]
                
                # Si llega aqui, el modelo funciono correctamente
                success = True
                logger.info(f"RAW LLM ANSWER ({m_engine}): {answer}")
                # Limpiar aviso de escudo si la respuesta se generó con éxito
                if state_manager.get_state().ai_warning:
                    state_manager.update_state({"ai_warning": None})
                break # Salir del ladder
                
            except Exception as e:
                err_str = str(e).lower()
                is_rate_limit = any(x in err_str for x in ["429", "too many requests", "quota", "resource_exhausted", "ratelimit"])
                # Para límites de velocidad (429) basta un enfriamiento corto de 15s para que pase la ráfaga
                cooldown_sec = 15 if is_rate_limit else 35
                logger.warning(f"Error en {m_engine} ({m_name}): {e}. Aplicando cooldown de {cooldown_sec}s.")
                self._model_cooldowns[f"{m_engine}:{m_name}"] = time.time() + cooldown_sec
                state_manager.update_state({"ai_warning": f"Escudo activado: Fallo en {m_engine}, saltando al siguiente."})
                
        # INTENTO DE RESCATE SI TODOS LOS MODELOS ESTABAN EN COOLDOWN
        if not success:
            logger.warning("Todos los modelos del ladder estaban en cooldown o fallaron. Ejecutando intento de rescate inmediato...")
            rescue_models = [
                ("groq", "openai/gpt-oss-20b"),
                ("groq", "qwen/qwen3.8-27b"),
                ("gemini", "gemini-2.5-flash-lite")
            ]
            for m_engine, m_name in rescue_models:
                try:
                    logger.info(f"Rescate neural con {m_engine} ({m_name})...")
                    if m_engine == "groq":
                        headers = {
                            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        }
                        payload = {
                            "model": m_name,
                            "messages": [
                                {"role": "system", "content": sys_prompt},
                                {"role": "user", "content": user_text}
                            ],
                            "temperature": 0.7
                        }
                        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=7)
                        response.raise_for_status()
                        answer = response.json()["choices"][0]["message"]["content"]
                        success = True
                        logger.info(f"Rescate neural EXITOSO con {m_engine} ({m_name})")
                        break
                    elif m_engine == "gemini":
                        response = gemini_client.models.generate_content(
                            model=m_name,
                            contents=user_text,
                            config=genai_types.GenerateContentConfig(
                                system_instruction=sys_prompt,
                                temperature=0.7,
                                max_output_tokens=1024,
                            )
                        )
                        if response and response.text:
                            answer = response.text
                            success = True
                            logger.info(f"Rescate neural EXITOSO con {m_engine} ({m_name})")
                            break
                except Exception as r_err:
                    logger.warning(f"Rescate falló en {m_engine} ({m_name}): {r_err}")

        if not success:
            logger.error("Colapso Neuronal Total: No fue posible contactar con ningún proveedor.")
            answer = "Subsistema neural saturado momentáneamente. Por favor, repite la orden en un instante, Tomás."

        
        # =========================================================================
        # 🛡️ HARDWARE SAFETY SHIELD (Escudo Antialucinación de Apagados y Persianas)
        # =========================================================================
        # Evita apagados masivos de la vivienda o bajada de persianas no solicitadas
        # cuando el usuario dio otra orden (ej: errores fonéticos en nombres de canales 'pon Clan' -> 'pon Tlan').
        u_norm_safety = normalize_text(user_text).lower()
        has_shutdown_intent = any(kw in u_norm_safety for kw in (
            "apaga todo", "apagar todo", "apaga toda", "apagar toda", "apaga todas", "apagar todas",
            "apaga la casa", "apagar la casa", "apaga todas las luces", "apagar todas las luces",
            "apaga luces", "apagar luces", "buenas noches", "modo noche", "modo dormir", "a dormir",
            "me voy de casa", "desconecta todo", "desconectar todo", "apagon general", "apagar el hogar"
        ))
        has_blind_close_intent = any(kw in u_norm_safety for kw in (
            "persiana", "persianas", "cortina", "cortinas", "estor", "estores",
            "buenas noches", "modo noche", "modo dormir", "a dormir",
            "cierra la casa", "cerrar la casa", "baja todo", "bajar todo"
        ))
        is_pon_or_query = any(u_norm_safety.strip().startswith(p) for p in (
            "pon ", "poner ", "ponme ", "ponlo ", "enciende ", "encender ", "abre ", "abrir ",
            "sube ", "subir ", "reproduce ", "reproducir ", "sintoniza ", "sintonizar ",
            "que ", "como ", "cual ", "cuando ", "donde ", "por que ", "cuentame ", "dime ", "explica "
        ))

        raw_zigbee_matches = re.findall(
            r'\[?ZIGBEE:\s*([a-zA-Z0-9_.]+)(?:,\s*([^,\]]+))?(?:,\s*([^,\]]+))?(?:,\s*([^,\]]+))?\]?',
            answer,
            re.IGNORECASE
        )

        intercepted_safety = False
        if raw_zigbee_matches:
            # 1. Proteger persianas: NUNCA cerrar persianas si el usuario no lo pidió expresamente
            if not has_blind_close_intent:
                def _strip_blind_close(m):
                    nonlocal intercepted_safety
                    ent = m.group(1).strip().lower()
                    act = (m.group(2) or "ON").strip().upper()
                    if ent.startswith("cover.") and act in ("CLOSE", "DOWN", "OFF"):
                        logger.warning(f"🚨 [Safety Shield] Bloqueado cierre de persiana alucinado por LLM ('{user_text}'): {m.group(0)}")
                        intercepted_safety = True
                        return ""
                    return m.group(0)

                answer = re.sub(
                    r'\[?ZIGBEE:\s*([a-zA-Z0-9_.]+)(?:,\s*([^,\]]+))?(?:,\s*([^,\]]+))?(?:,\s*([^,\]]+))?\]?',
                    _strip_blind_close,
                    answer,
                    flags=re.IGNORECASE
                )

            # 2. Proteger luces: Bloquear apagados masivos no solicitados (>2 entidades OFF o comando afirmativo tipo 'pon ...')
            if not has_shutdown_intent:
                off_count = sum(1 for m in raw_zigbee_matches if (m[1] or "ON").strip().upper() in ("OFF", "TURN_OFF", "0"))
                if off_count >= 3 or (is_pon_or_query and off_count >= 1):
                    logger.warning(f"🚨 [Safety Shield] Bloqueado apagado múltiple ({off_count} dispositivos) no solicitado por el usuario ('{user_text}')")
                    intercepted_safety = True
                    answer = re.sub(
                        r'\[?ZIGBEE:\s*[a-zA-Z0-9_.]+(?:,\s*(?:OFF|TURN_OFF|0))[^\]]*\]?',
                        "",
                        answer,
                        flags=re.IGNORECASE
                    )

        if intercepted_safety:
            low_ans = answer.lower()
            if any(w in low_ans for w in ("apagado general", "apagando", "descanso nocturno", "secuencia de apagado", "buenas noches", "cerrando persianas", "apagare")):
                answer = "No he entendido bien el canal o dispositivo que me has pedido, Tomás. ¿Me lo puedes repetir?"

        # Limpiar acciones de la respuesta hablada (para no decir [GC:los40] en voz alta)
        # Limpia tags con o sin corchetes por si el LLM se equivoca
        clean_spoken_answer = re.sub(r'\[.*?\]', '', answer)
        clean_spoken_answer = re.sub(r'(ZIGBEE|RADIO|TV|VOLUMEN|GC|AGENDA|RECORDAR|ENVIAR_DOCUMENTO|RUTINA|TIEMPO|WHATSAPP_ENVIAR|BUNKER_WIDGET):[a-zA-Z0-9_.,: ]+', '', clean_spoken_answer, flags=re.IGNORECASE).strip()

        audio_url = ""

        # Generar Audio

        if clean_spoken_answer:

            audio_url = tts_service.generate_audio(clean_spoken_answer, persona=state_manager.get_state().active_persona)

            if audio_url:

                state = state_manager.get_state()

                # 1. PC: Actualizar estado para que el Dashboard de React lo reproduzca (fallback)

                state_manager.update_state({"latest_audio": audio_url})

                

                # 2. Google Cast: Enviar orden si está activo (con soporte de altavoz seleccionado)

                if state.audio_output == "google_cast" or state.audio_output == "both":

                    abs_url = f"http://192.168.1.139:8050{audio_url}"

                    target = "todos"

                    if state.current_speaker_ip:

                        for name, ip in cast_service.known_casts.items():

                            if ip == state.current_speaker_ip:

                                target = name

                                break

                    logger.info(f"Enviando audio al altavoz Google Cast: {target} (IP: {state.current_speaker_ip})")



                    cast_service.play_url(target, abs_url)



        clean_text_response = self._parse_actions(answer, user_text=user_text)

        

        if source == "whatsapp" and from_number:
            target_jid = from_number
            # Evitar enviar a JID @lid de Tomás (da error XML no bien formado en WhatsApp)
            if "34647797575" in from_number or "157505124577342" in from_number or "128161958351005" in from_number:
                target_jid = "34647797575@s.whatsapp.net"
            wa_bridge.send_message(target_jid, clean_text_response)



        return clean_text_response, audio_url



    def _parse_actions(self, text: str, user_text: str = "") -> str:
        # 0. Plugins dinámicos
        try:
            from app.core.plugin_loader import plugin_registry
            for plugin_name, rec in plugin_registry.plugins.items():
                pattern = re.compile(rf'\[?{plugin_name.upper()}(?::\s*([^\]]+))?\]?', re.IGNORECASE)
                
                def dynamic_replacer(match, p_name=plugin_name, handler=rec.handler):
                    args = match.group(1)
                    kwargs = {}
                    if args:
                        kwargs = {'args': args}
                    logger.info(f"Ejecutando Plugin Dinámico: {p_name} con args {kwargs}")
                    try:
                        handler(**kwargs)
                    except Exception as e:
                        logger.error(f"Error en plugin dinámico {p_name}: {e}")
                    return ""
                
                text = pattern.sub(dynamic_replacer, text)
        except Exception as e:
            logger.error(f"Error parseando plugins dinámicos: {e}")

        # 1. GC tags: [GC:los40,salon] or [GC:stop,todos] or [GC:volume:50,despacho_2]

        gc_pattern = re.compile(r'\[?GC:\s*([a-zA-Z0-9_:]+)(?:,\s*([a-zA-Z0-9_]+))?\]?', re.IGNORECASE)

        

        def cast_replacer(match):

            action_type = match.group(1).lower()

            target = match.group(2).lower() if match.group(2) else "todos"

            logger.info(f"Ejecutando acción Cast: {action_type} en {target}")

            

            if action_type == "stop":

                cast_service.stop(target)

            elif action_type.startswith("volume:"):

                try:

                    vol_val = float(action_type.split(":")[1]) / 100.0

                    cast_service.set_volume(vol_val, target)

                except Exception as e:

                    logger.error(f"Error parsing volume action: {e}")

            else:

                return match.group(0)

            return ""



        # 1.5 TV tags: [TV:salon,telecinco] or [TV:habitacion,antena3] or [TV:cocina,off]
        tv_pattern = re.compile(r'\[?TV:\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_ ]+)\]?', re.IGNORECASE)

        def tv_replacer(match):
            import threading
            from app.services.tv_media_orchestrator import tv_manager
            raw_tv = match.group(1).strip().lower()
            raw_act = match.group(2).strip().lower()
            tv_id = tv_manager.resolve_tv_target(raw_tv, default_tv="salon")
            tv_manager.mark_active_tv(tv_id)
            targets = ["salon", "habitacion", "cocina"] if tv_id == "todas" else [tv_id]
            logger.info(f"📺 Ejecutando etiqueta TV: {raw_act} en {targets}")
            if raw_act in ("on", "off", "encender", "apagar", "stop"):
                p_act = "on" if raw_act in ("on", "encender") else "off"
                for tk in targets:
                    threading.Thread(target=tv_manager.power_control, args=(tk, p_act), daemon=True).start()
            elif raw_act in ("vol_up", "up", "subir"):
                for tk in targets:
                    threading.Thread(target=tv_manager.volume_control, args=(tk, None, "up"), daemon=True).start()
            elif raw_act in ("vol_down", "down", "bajar"):
                for tk in targets:
                    threading.Thread(target=tv_manager.volume_control, args=(tk, None, "down"), daemon=True).start()
            elif raw_act in ("mute", "silenciar"):
                for tk in targets:
                    threading.Thread(target=tv_manager.volume_control, args=(tk, None, "mute"), daemon=True).start()
            else:
                ch_key = tv_manager.resolve_channel_by_voice(raw_act) or raw_act
                for tk in targets:
                    threading.Thread(target=tv_manager._wake_and_play_bg, args=(tk, ch_key), daemon=True).start()
            return ""

        text = tv_pattern.sub(tv_replacer, text)

        # 2. ZIGBEE tags: [ZIGBEE:luz_salon,ON] o [ZIGBEE:led_cama_andrea,ON,50%,calida]
        zigbee_pattern = re.compile(
            r'\[?ZIGBEE:\s*([a-zA-Z0-9_.]+)(?:,\s*([^,\]]+))?(?:,\s*([^,\]]+))?(?:,\s*([^,\]]+))?\]?',
            re.IGNORECASE
        )

        u_norm_act = normalize_text(user_text).lower() if user_text else ""
        has_shutdown_intent_act = any(kw in u_norm_act for kw in (
            "apaga todo", "apagar todo", "apaga toda", "apagar toda", "apaga todas", "apagar todas",
            "apaga la casa", "apagar la casa", "apaga todas las luces", "apagar todas las luces",
            "apaga luces", "apagar luces", "buenas noches", "modo noche", "modo dormir", "a dormir",
            "me voy de casa", "desconecta todo", "desconectar todo", "apagon general", "apagar el hogar"
        )) if u_norm_act else False

        has_blind_close_act = any(kw in u_norm_act for kw in (
            "persiana", "persianas", "cortina", "cortinas", "estor", "estores",
            "buenas noches", "modo noche", "modo dormir", "a dormir",
            "cierra la casa", "cerrar la casa", "baja todo", "bajar todo"
        )) if u_norm_act else False

        off_executed_count = 0

        def zigbee_replacer(match):
            nonlocal off_executed_count
            from app.services.z2m_lighting_engine import z2m_engine
            entity = match.group(1).strip()
            z2m_ids = {d["entity_id"] for d in z2m_engine.get_habana_devices_list()}
            if entity not in z2m_ids:
                try:
                    resolved = device_mapping_service.find_entity_by_alias(entity)
                    if resolved:
                        entity = resolved
                except Exception:
                    pass
            action = match.group(2).strip() if match.group(2) else "ON"
            p3 = match.group(3).strip() if match.group(3) else ""
            p4 = match.group(4).strip() if match.group(4) else ""
            extra_params = [p for p in (p3, p4) if p]

            brightness_pct = None
            color_temp_kelvin = None
            rgb_color = None

            for p in extra_params:
                p_clean = p.lower()
                if "%" in p_clean or p_clean.isdigit():
                    try:
                        digits = int(p_clean.replace("%", "").strip())
                        brightness_pct = max(0, min(100, digits))
                    except Exception:
                        pass
                elif "calid" in p_clean or "calient" in p_clean:
                    color_temp_kelvin = 2700
                elif "fri" in p_clean:
                    color_temp_kelvin = 5500
                elif "neutr" in p_clean or "blanc" in p_clean:
                    color_temp_kelvin = 4000
                elif p_clean.endswith("k") and p_clean[:-1].isdigit():
                    color_temp_kelvin = max(2000, min(6500, int(p_clean[:-1])))

            if entity.startswith("cover.") and action in ("CLOSE", "DOWN", "OFF") and user_text and not has_blind_close_act:
                logger.warning(f"🚨 [Safety Shield _parse_actions] Bloqueado cierre persiana no solicitado ({entity}) con orden '{user_text}'")
                return ""
            if action.upper() in ("OFF", "TURN_OFF", "0") and user_text and not has_shutdown_intent_act:
                off_executed_count += 1
                if off_executed_count >= 3:
                    logger.warning(f"🚨 [Safety Shield _parse_actions] Bloqueado apagado masivo ({entity}) con orden '{user_text}'")
                    return ""
            logger.info(f"Ejecutando acción Z2M: {entity} -> {action} (pct={brightness_pct}, kelvin={color_temp_kelvin}, rgb={rgb_color})")
            res_z2m = z2m_engine.control_habana_entity(
                entity, action,
                brightness_pct=brightness_pct,
                color_temp_kelvin=color_temp_kelvin,
                rgb_color=rgb_color
            )
            if not res_z2m.get("ok"):
                home_assistant_service.control_device(
                    entity, action,
                    brightness_pct=brightness_pct,
                    color_temp_kelvin=color_temp_kelvin,
                    rgb_color=rgb_color
                )
            return ""



        # 3. AGENDA tags: [AGENDA:titulo,fecha_iso,tipo,descripcion]


        # 3.5 RUTINA tags: [RUTINA:entidad,accion,fecha_iso]
        rutina_pattern = re.compile(r'\[RUTINA:\s*([^,\]]+),\s*([^,\]]+),\s*([^,\]]+)\]', re.IGNORECASE)
        def rutina_replacer(match):
            entidad = match.group(1).strip()
            accion = match.group(2).strip()
            fecha = match.group(3).strip()
            logger.info(f"Ejecutando accion RUTINA: {accion} en {entidad} para {fecha}")
            try:
                from app.services.agenda import agenda_service
                agenda_service.add_routine(
                    entity_id=entidad,
                    action=accion,
                    execute_at=fecha
                )
            except Exception as e:
                logger.error(f"Error guardando rutina desde etiqueta: {e}")
            return ""

        agenda_pattern = re.compile(r'\[AGENDA:\s*([^,\]]+)(?:,\s*([^,\]]+))?(?:,\s*([^,\]]+))?(?:,\s*([^,\]]*))?\]', re.IGNORECASE)

        

        def agenda_replacer(match):

            titulo = match.group(1).strip()

            fecha = match.group(2).strip() if match.group(2) else ""

            tipo = match.group(3).strip() if match.group(3) else "recordatorio"

            desc = match.group(4).strip() if match.group(4) else ""

            

            logger.info(f"Ejecutando accion AGENDA: {titulo} para {fecha} (Tipo: {tipo})")

            

            if not fecha:

                from datetime import datetime

                fecha = datetime.now().isoformat()

                

            try:

                from app.services.agenda import agenda_service

                agenda_service.add_event(

                    title=titulo,

                    due_date=fecha,

                    description=desc,

                    event_type=tipo

                )

            except Exception as e:

                logger.error(f"Error guardando recordatorio desde etiqueta: {e}")

            return ""



        # 5. WHATSAPP_ENVIAR tags
        whatsapp_enviar_pattern = re.compile(r'\[?WHATSAPP_ENVIAR:\s*([^,\]]+),\s*([^\]]+)\]?', re.IGNORECASE)
        
        def whatsapp_enviar_replacer(match):
            nombre = match.group(1).strip().lower()
            mensaje = match.group(2).strip()
            logger.info(f"Ejecutando accion WHATSAPP_ENVIAR a {nombre}")
            
            import json, os
            contacts_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "config", "contacts.json")
            try:
                if os.path.exists(contacts_file):
                    with open(contacts_file, "r", encoding="utf-8") as f:
                        contacts = json.load(f)
                        for k, v in contacts.items():
                            if k.lower() == nombre:
                                from app.services.whatsapp import wa_bridge
                                wa_bridge.send_message(v, mensaje)
                                logger.info(f"Mensaje de WhatsApp enviado a {k} ({v})")
                                return ""
                logger.error(f"Contacto no encontrado para enviar WhatsApp: {nombre}")
            except Exception as e:
                logger.error(f"Error enviando WhatsApp desde etiqueta: {e}")
            return ""

        text = whatsapp_enviar_pattern.sub(whatsapp_enviar_replacer, text)
        
        # 4. TIEMPO tags: [TIEMPO:ciudad,fecha,tipo...]

        tiempo_pattern = re.compile(r'\[?TIEMPO:\s*([^,\]]+)(?:,\s*([^,\]]+))?(?:,\s*([^,\]]+))?(?:,\s*([^,\]]+))?\]?', re.IGNORECASE)

        

        def tiempo_replacer(match):

            ciudad = match.group(1).strip()

            try:

                geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={ciudad}&count=1&language=es&format=json"

                geo_resp = requests.get(geo_url, timeout=5).json()

                if not geo_resp.get('results'):

                    return f"[Clima en {ciudad} no disponible]"

                res = geo_resp['results'][0]

                lat, lon = res['latitude'], res['longitude']

                w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&timezone=auto"

                data = requests.get(w_url, timeout=5).json()

                cw = data.get('current_weather', {})

                return f"[El tiempo en {res.get('name')}: {cw.get('temperature')}°C]"

            except Exception as e:

                return f"[Clima en {ciudad} no disponible]"



        # 5. UNIVERSAL RADIO FALLBACK

        universal_radio = re.compile(r'\[[a-zA-Z_]+:.*?\b(los40_classic|los40_dance|los40_urban|ser_madrid|cadena_dial|virgin_radio|cadena_ser|radiole|kebuena|rac105|los40|radio3|radio4|rac1|m80|rfm|stop)\b[^\]]*\]', re.IGNORECASE)

        def univ_replacer(match):
            action = match.group(1).lower()
            logger.info(f"Universal Radio trigger: {action}")
            if action == 'stop':
                radio_service.stop()
                cast_service.stop("todos")
            else:
                res = radio_service.play(action)
                if "stream_url" in res:
                    import threading
                    logger.info("Programando radio en 6 segundos para no pisar la voz de la IA...")
                    threading.Timer(6.0, cast_service.play_url, args=["todos", res["stream_url"]]).start()
            return "" 

        


        # 6. VOLUME FALLBACK
        volumen_pattern = re.compile(r'\[VOLUMEN:(\d+)\]', re.IGNORECASE)
        def volumen_replacer(match):
            try:
                vol_level = float(match.group(1)) / 10.0
                vol_level = max(0.0, min(1.0, vol_level))
                logger.info(f"Volume trigger: {vol_level}")
                cast_service.set_volume(vol_level, "todos")
            except Exception as e:
                logger.error(f"Error setting volume: {e}")
            return ""
        
        clean_text = gc_pattern.sub(cast_replacer, text)


        clean_text = zigbee_pattern.sub(zigbee_replacer, clean_text)

        clean_text = agenda_pattern.sub(agenda_replacer, clean_text)
        clean_text = rutina_pattern.sub(rutina_replacer, clean_text)

        clean_text = tiempo_pattern.sub(tiempo_replacer, clean_text)

        clean_text = universal_radio.sub(univ_replacer, clean_text)

        # 7. RECORDAR FALLBACK
        recordar_pattern = re.compile(r'\[RECORDAR:(.*?)\]', re.IGNORECASE)
        def recordar_replacer(match):
            mem = match.group(1).strip()
            if mem:
                import uuid
                logger.info(f"Guardando memoria: {mem}")
                memory_service.add_memory(str(uuid.uuid4()), mem)
                try:
                    from app.services.obsidian_service import obsidian_service
                    obsidian_service.record_memory(title=mem[:40], content_text=mem, author="Tomas", category="recuerdos")
                except Exception as ex:
                    logger.warning(f"Error sincronizando memoria con Obsidian: {ex}")
            return ""
        
        # 7.1 LECCION APRENDIDA (Auto-aprendizaje y corrección de Tomás)
        leccion_pattern = re.compile(r'\[(?:LECCION|APRENDER_REGLA):\s*([^\]\|]+)(?:\|([^\]\|]+))?(?:\|([^\]\|]+))?(?:\|([^\]]+))?\]', re.IGNORECASE)
        def leccion_replacer(match):
            try:
                p1 = (match.group(1) or '').strip()
                p2 = (match.group(2) or '').strip()
                p3 = (match.group(3) or '').strip()
                p4 = (match.group(4) or '').strip()
                
                title = p1 if p1 else "Corrección de usuario"
                failure = p2 if p2 else "Acción previa no deseada"
                correction = p3 if p3 else p1
                rule = p4 if p4 else (p3 or p1)
                
                from app.services.obsidian_service import obsidian_service
                obsidian_service.record_lesson(
                    title=title,
                    failure_context=failure,
                    correction=correction,
                    rule=rule,
                    source="Tomas"
                )
                logger.info(f"🧠 [AutoAprendizaje] Regla aprendida guardada en Obsidian: {title} -> {rule}")
            except Exception as ex:
                logger.warning(f"Error procesando etiqueta LECCION: {ex}")
            return ""
        
        clean_text = volumen_pattern.sub(volumen_replacer, clean_text)
        clean_text = recordar_pattern.sub(recordar_replacer, clean_text)
        clean_text = leccion_pattern.sub(leccion_replacer, clean_text)


        
        # 8. BUNKER WIDGET GENERATION
        bunker_pattern = re.compile(r'\[BUNKER_WIDGET:\s*([^\]]+)\]', re.IGNORECASE)
        def bunker_replacer(match):
            try:
                b_prompt = match.group(1).strip()
                from app.bunker.knowledge import bunker_knowledge
                from app.bunker.storage import bunker_storage
                w_data = bunker_knowledge.generate_widget_from_prompt(b_prompt)
                bunker_storage.save_widget(w_data)
                logger.info(f"Bunker widget dynamically created from voice: {b_prompt}")
            except Exception as e:
                logger.error(f"Error creating bunker widget: {e}")
            return ""

        clean_text = bunker_pattern.sub(bunker_replacer, clean_text)

        # 9. ENVIAR_DOCUMENTO FALLBACK
        documento_pattern = re.compile(r'\[ENVIAR_DOCUMENTO:(.*?)\]', re.IGNORECASE)
        def documento_replacer(match):
            archivo = match.group(1).strip()
            if archivo:
                logger.info(f"Trigger Enviar Documento: {archivo}")
                # Resolve file path
                base_dir = r"C:\Users\tomas\.gemini\antigravity-ide\brain\85979ff1-8594-4fe2-9b0d-96f024fedf64"
                file_path = os.path.join(base_dir, archivo)
                if os.path.exists(file_path):
                    from app.services.whatsapp import wa_bridge
                    # Asumimos que si estamos aqu es porque nos lo pidi Tomas
                    wa_bridge.send_document("34647797575@s.whatsapp.net", file_path, f"Aqu tienes el documento: {archivo}")
                else:
                    logger.error(f"El archivo {file_path} no existe.")
            return ""
        
        clean_text = documento_pattern.sub(documento_replacer, clean_text)

        return clean_text.strip()



agent = NeuralAgent()

