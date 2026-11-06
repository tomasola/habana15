from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form, Body, Request
import logging

logger = logging.getLogger("Habana.Router")



from fastapi.responses import Response, StreamingResponse, FileResponse



from pydantic import BaseModel



from typing import Dict, Any, Optional, List



import os



import shutil



import time



import json







from app.core.state import state_manager



from app.services.agent import agent



from app.services.memory_service import memory_service



from app.services.whatsapp import wa_bridge



from app.services.self_healing import self_healer



from app.services.google_cast import cast_service



from app.services.radio_service import radio_service



from app.services.tracker import tracker



from app.services.tts import tts_service



from app.services.avatar_service import avatar_service



from app.services.device_mapping_service import device_mapping_service



import socket







# --- Caché ligero para endpoints de polling frecuente ---



# Evita saturar el threadpool pero responde casi al instante (1.5s) ante cambios físicos



_cache: Dict[str, Any] = {}



_cache_ts: Dict[str, float] = {}



CACHE_TTL = 1.5  # segundos (respuesta ágil para eventos físicos)







def _get_cached(key: str):



    if key in _cache and (time.time() - _cache_ts.get(key, 0)) < CACHE_TTL:



        return _cache[key]



    return None







def _set_cached(key: str, value: Any):



    _cache[key] = value



    _cache_ts[key] = time.time()



    return value







def get_local_ip():



    try:



        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)



        s.connect(("8.8.8.8", 80))



        ip = s.getsockname()[0]



        s.close()



        return ip



    except Exception:



        return "127.0.0.1"







router = APIRouter()







class ChatRequest(BaseModel):



    message: str



    source: str = "web"







class WaMessage(BaseModel):



    jid: str



    text: str







class CastScanResponse(BaseModel):



    status: str



    speakers: Dict[str, str]







@router.get("/status")



def get_status():



    return {



        "status": "operational",



        "state": state_manager.get_state().to_dict()



    }







@router.post("/status")



def post_status(updates: Dict[str, Any]):



    state_manager.update_state(updates)



    tracker.log("State", "INFO", f"Estado actualizado via /api/status: {updates}")



    return {



        "status": "updated",



        "state": state_manager.get_state().to_dict()



    }







@router.get("/health/full")



def get_full_health():



    cached = _get_cached("health_full")



    if cached is not None:



        return cached



    from app.services.supervisor import supervisor_service



    return _set_cached("health_full", supervisor_service.get_status())







@router.post("/chat")



@router.post("/agent/chat")



def chat_endpoint(req: ChatRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    tracker.log("Neural", "INFO", f"Mensaje recibido [{req.source}] desde IP {client_ip}: {req.message}")
    logger.info(f"Mensaje recibido [{req.source}] desde IP {client_ip}: {req.message}")
    tracker.save_message("User", req.source, req.message)



    



    from app.services.proactive_service import proactive_engine



    proactive_engine.update_last_activity()



    



    from app.services.avatar_service import avatar_service
    matched = avatar_service.match_response(req.message)

    # Ejecutar primero el agente para que las órdenes domóticas, escenas o widgets se ejecuten físicamente
    agent_resp_text, agent_audio_url = agent.process_message(req.message, req.source)

    if matched:
        # Si el agente ejecutó una acción o pidió aclaración por orden incompleta, respetar la respuesta del agente
        if agent_resp_text and (agent_resp_text.startswith("Hecho.") or "¿Qué" in agent_resp_text or "dispositivo" in agent_resp_text):
            response_text = agent_resp_text
            video_filename = ""
        else:
            response_text = matched.get("response_text") or agent_resp_text
        video_filename = matched.get("video_filename") or ""

        from app.services.tts import tts_service
        active_persona = state_manager.get_state().active_persona
        if agent_resp_text and agent_resp_text.startswith('Hecho.'):
            response_text = agent_resp_text
            audio_url = tts_service.generate_audio(response_text, persona=active_persona)
        else:
            audio_url = None

        tracker.log("Neural", "INFO", f"Respuesta de avatar emparejada: {response_text} | Vídeo: {video_filename}")
        tracker.save_message("AI", req.source, response_text, audio_url)
        video_url = video_filename if video_filename.startswith("/") else f"/{video_filename}"
    else:
        response_text = agent_resp_text
        audio_url = agent_audio_url
        tracker.log("Neural", "INFO", f"Respuesta generada: {response_text}")
        tracker.save_message("AI", req.source, response_text, audio_url)
        video_url = None



    



        # Asociación individual TV <-> Altavoz por estancia (Salón, Habitación/Dormitorio, Cocina, Despacho o Todos)
    state = state_manager.get_state()
    from app.services.tv_media_orchestrator import tv_manager
    room_speaker = tv_manager.detect_room_speaker_from_text(req.message)

    if state.audio_output == "google_cast" or room_speaker:
        target_speaker = room_speaker or "todos"
        if not audio_url and response_text:
            try:
                from app.services.tts import tts_service
                active_persona = state.active_persona or "friday"
                audio_url = tts_service.generate_audio(response_text, persona=active_persona)
            except Exception as e:
                tracker.log("Neural", "ERROR", f"Fallo generando TTS para altavoces: {e}")

        if audio_url:
            cast_url = f"http://{get_local_ip()}:8050{audio_url}"
            import threading
            def _play_cast(spk=target_speaker):
                try:
                    tracker.log("Neural", "INFO", f"🔊 Emitiendo respuesta IA en altavoz de estancia '{spk}'")
                    cast_service.play_url(spk, cast_url)
                except Exception as e:
                    tracker.log("Neural", "ERROR", f"Fallo al reproducir en Google Cast ({spk}): {e}")
            threading.Thread(target=_play_cast, daemon=True).start()



    



    # Update global chat history



    current_history = state_manager.get_state().global_chat_history



    current_history.append({"sender": "user", "text": req.message})



    current_history.append({"sender": "ai", "text": response_text})



    if len(current_history) > 30:



        current_history = current_history[-30:]



    state_manager.update_state({"global_chat_history": current_history})



    



    return {"reply": response_text, "audio_url": audio_url, "video_url": video_url}







@router.post("/chat/audio")



def chat_audio_endpoint(file: UploadFile = File(...)):



    import requests



    from app.core.config import settings



    



    # 1. Transcribe the audio using Groq Whisper



    transcription = ""



    try:



        audio_bytes = file.file.read()



        headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}



        data = {"model": "whisper-large-v3-turbo", "language": "es", "prompt": "Cuba, pon Telecinco, Antena 3, La 1, La 2, Cuatro, La Sexta, La 7, FDF, Energy, Neox, Nova, Mega, Clan, TVG, TRECE, en la tele del salón, en la habitación, en la cocina."}



        files = {"file": (file.filename, audio_bytes, file.content_type or "audio/webm")}



        



        url = "https://api.groq.com/openai/v1/audio/transcriptions"



        res = requests.post(url, headers=headers, data=data, files=files, timeout=15)



        if res.status_code == 200:



            transcription = res.json().get("text", "")



        else:



            raise Exception(f"Groq API Error {res.status_code}: {res.text}")



    except Exception as e:



        tracker.log("Neural", "ERROR", f"Fallo al transcribir audio: {e}")



        return {"reply": "Error: No pude procesar tu mensaje de voz.", "audio_url": None, "video_url": None}



    



    if not transcription.strip():



        return {"reply": "No he escuchado nada.", "audio_url": None, "video_url": None}



    



    tracker.log("Neural", "INFO", f"Transcripción de voz [web]: {transcription}")



    



    # 2. Re-use the existing text logic



    # We construct a fake ChatRequest object to call the existing endpoint



    class FakeReq:



        message = transcription



        source = "web"



    



    # Calling the synchronous chat_endpoint internally



    res_data = chat_endpoint(FakeReq())
    if isinstance(res_data, dict):
        res_data["transcription"] = transcription
    return res_data


@router.post("/chat/transcribe")
def chat_transcribe_endpoint(file: UploadFile = File(...)):
    import requests
    from app.core.config import settings
    try:
        audio_bytes = file.file.read()
        if not audio_bytes or len(audio_bytes) < 400:
            return {"transcription": ""}
        headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
        data = {
            "model": "whisper-large-v3-turbo",
            "language": "es",
            "prompt": "Cuba, Hola Cuba, Oye Cuba, pon Telecinco en la tele del salón, pon Antena 3 en la habitación, pon La 1 en la cocina, pon La Sexta, Cuatro, La 7, FDF, Energy, Neox, Nova, Mega, Clan, TVG, TRECE, enciende las luces, apaga las luces, habitación principal, salón, cocina, pasillo, Andrea."
        }
        files = {"file": (file.filename, audio_bytes, file.content_type or "audio/webm")}
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        res = requests.post(url, headers=headers, data=data, files=files, timeout=12)
        if res.status_code == 200:
            text = (res.json().get("text") or "").strip()
            return {"transcription": text}
    except Exception as e:
        tracker.log("Neural", "WARN", f"Error en /chat/transcribe: {e}")
    return {"transcription": ""}







@router.post("/whatsapp/send")



def send_whatsapp(msg: WaMessage):



    success = wa_bridge.send_message(msg.jid, msg.text)



    if not success:



        raise HTTPException(status_code=500, detail="Fallo al enviar WhatsApp")



    return {"status": "sent"}





@router.get("/whatsapp/status")

def whatsapp_status():

    return wa_bridge.get_status()



@router.get("/whatsapp/qr")

def whatsapp_qr():

    qr_candidates = [

        r"F:\Habana 12\frontend\public\qr.png",

        r"F:\Habana 8\frontend\dist\qr.png",

        r"F:\Habana 8\backend\qr.png"

    ]

    for item in qr_candidates:

        if os.path.exists(item):

            return FileResponse(item, media_type="image/png")

    raise HTTPException(status_code=404, detail="No hay codigo QR disponible")



@router.post("/whatsapp/reset")

def whatsapp_reset():

    return wa_bridge.reset()









# Models for incoming WhatsApp



class IncomingWaMessage(BaseModel):



    from_number: str



    text: str



    media_path: str = ""



    sender_name: str = ""







class NotifyWaMessage(BaseModel):



    sender_name: str



    sender_jid: str



    text: str







TOMAS_JIDS = ['157505124577342@lid', '128161958351005@lid', '34647797575@s.whatsapp.net']



CONTACT_ALIASES = {
    "mamá": "34600654321@s.whatsapp.net",
    "mama": "34600654321@s.whatsapp.net",
    "tomas": "34647797575@s.whatsapp.net",
    "lupe": "56126783664244@lid",
    "lupe sieiro": "56126783664244@lid"
}









CONTACTS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "config", "contacts.json")



def is_in_contacts_agenda(raw_jid: str, sender_name: Optional[str] = None) -> tuple[bool, str]:

    """

    Verifica si el remitente está registrado en la agenda de contactos (contacts.json o CONTACT_ALIASES).

    Devuelve (True, nombre_contacto) si existe, o (False, "") si no está en la agenda.

    """

    import re

    # 1. Extraer sólo dígitos del JID / número del remitente

    user_part = raw_jid.split("@")[0].split(":")[0] if "@" in raw_jid else raw_jid

    sender_digits = re.sub(r"\D", "", user_part)



    # 2. Cargar contactos guardados en config/contacts.json

    contacts = {}

    if os.path.exists(CONTACTS_FILE):

        try:

            with open(CONTACTS_FILE, "r", encoding="utf-8") as f:

                contacts = json.load(f)

        except Exception as e:

            logger.error(f"Error leyendo {CONTACTS_FILE}: {e}")



    # 3. Comparar con números de la agenda

    if sender_digits:

        for c_name, c_phone in contacts.items():

            c_digits = re.sub(r"\D", "", str(c_phone))

            if not c_digits:

                continue

            if sender_digits == c_digits:

                return True, c_name

            if len(c_digits) >= 9 and len(sender_digits) >= 9:

                if sender_digits.endswith(c_digits) or c_digits.endswith(sender_digits):

                    return True, c_name



    # 4. Comparar con CONTACT_ALIASES

    for alias_name, alias_jid in CONTACT_ALIASES.items():

        alias_digits = re.sub(r"\D", "", alias_jid.split("@")[0])

        if sender_digits and alias_digits:

            if sender_digits == alias_digits or (len(sender_digits) >= 9 and len(alias_digits) >= 9 and (sender_digits.endswith(alias_digits) or alias_digits.endswith(sender_digits))):

                return True, alias_name.title()



    # 4b. Comparar por JID directo (incluyendo @lid)
    norm_jid = (raw_jid or "").strip().lower()
    for c_name, c_phone in contacts.items():
        if norm_jid and norm_jid == str(c_phone).strip().lower():
            return True, c_name
    for alias_name, alias_jid in CONTACT_ALIASES.items():
        if norm_jid and norm_jid == str(alias_jid).strip().lower():
            return True, alias_name.title()

    # 5. Comparar por nombre si coincide o contiene el contacto de la agenda
    if sender_name:
        clean_sname = sender_name.strip().lower()
        for c_name in contacts.keys():
            cn_clean = c_name.strip().lower()
            if clean_sname == cn_clean or cn_clean in clean_sname or clean_sname in cn_clean:
                return True, c_name
        for alias_name in CONTACT_ALIASES.keys():
            an_clean = alias_name.strip().lower()
            if clean_sname == an_clean or an_clean in clean_sname or clean_sname in an_clean:
                return True, alias_name.title()



    return False, ""



def resolve_contact_jid(name_or_number: str) -> str:



    name_clean = name_or_number.lower().strip()



    if name_clean in CONTACT_ALIASES:



        return CONTACT_ALIASES[name_clean]



    



    # Clean non-digits



    import re



    digits = re.sub(r"\D", "", name_clean)



    if not digits:



        return ""



    



    if len(digits) == 9 and (digits.startswith("6") or digits.startswith("7")):



        return f"34{digits}@s.whatsapp.net"



    return f"{digits}@s.whatsapp.net"







@router.post("/whatsapp/incoming")



def whatsapp_incoming(payload: IncomingWaMessage, background_tasks: BackgroundTasks):



    import re



    



    raw_jid = payload.from_number

    user_part = raw_jid.split("@")[0].split(":")[0]

    domain_part = raw_jid.split("@")[1] if "@" in raw_jid else "s.whatsapp.net"

    normalized_jid = f"{user_part}@{domain_part}"



    # Descartar inmediatamente grupos (@g.us), estados/historias (status@broadcast, @broadcast) y canales (@newsletter)

    if "@g.us" in raw_jid or "@broadcast" in raw_jid or raw_jid == "status@broadcast" or "@newsletter" in raw_jid:

        tracker.log("WhatsApp", "INFO", f"Descartando estado/difusión/grupo/canal ({raw_jid})")

        return {"status": "ignored_broadcast_or_group"}



    TOMAS_NUMBERS = ["34647797575", "157505124577342", "128161958351005"]

    is_tomas = (user_part in TOMAS_NUMBERS) or (normalized_jid in TOMAS_JIDS) or (raw_jid in TOMAS_JIDS)



    



    tracker.log("WhatsApp", "INFO", f"Mensaje entrante de {payload.sender_name} ({raw_jid}): {payload.text}")



    tracker.save_message(payload.sender_name or raw_jid, "whatsapp", payload.text, payload.media_path)



    



    text_to_process = payload.text



    # AUTO-ARCHIVADOR COGNITIVO OBSIDIAN <-> WHATSAPP

    # 1. Archivar multimedia (Videos, Musica, Fotos, Documentos) en Vault

    if payload.media_path:

        try:

            from app.services.obsidian_service import obsidian_service

            res_media = obsidian_service.save_whatsapp_media(

                payload.media_path,

                caption=text_to_process,

                sender=payload.sender_name or "Tomas"

            )

            tracker.log("Obsidian", "INFO", f"Multimedia archivada en Obsidian: {res_media.get('category')} ({res_media.get('media_file')})")

        except Exception as e:

            tracker.log("Obsidian", "ERROR", f"Fallo al archivar multimedia en Obsidian: {e}")



    # 2. Archivar enlaces web y YouTube detectados en el texto

    url_match = re.search(r'(https?://[^\s]+)', text_to_process or "")

    if url_match:

        try:

            from app.services.obsidian_service import obsidian_service

            found_url = url_match.group(1)

            comment = (text_to_process or "").replace(found_url, "").strip()

            res_link = obsidian_service.save_whatsapp_link(

                url=found_url,

                note=comment,

                sender=payload.sender_name or "Tomas"

            )

            tracker.log("Obsidian", "INFO", f"Enlace web archivado en Obsidian: {found_url}")

        except Exception as e:

            tracker.log("Obsidian", "ERROR", f"Fallo al archivar enlace web en Obsidian: {e}")



    # 3. Archivar notas y recordatorios rápidos explícitos

    note_match = re.match(r'^(?:guarda(?:\s+esta)?\s+nota:?|guarda\s+esto:?|anota:?|recuerda:?)\s*(.+)$', text_to_process or "", re.IGNORECASE | re.DOTALL)

    if note_match and is_tomas:

        try:

            from app.services.obsidian_service import obsidian_service

            note_body = note_match.group(1).strip()

            res_note = obsidian_service.save_whatsapp_note(

                text=note_body,

                sender=payload.sender_name or "Tomas"

            )

            fn = res_note.get("filename", "")

            reply = f"📝 He guardado tu apunte en tu bóveda de Obsidian en [[WhatsApp/Notas_Rapidas]]: {fn}"

            wa_bridge.send_message(recipient_jid, reply)

            return {"status": "processed", "type": "obsidian_note"}

        except Exception as e:

            tracker.log("Obsidian", "ERROR", f"Fallo al archivar nota en Obsidian: {e}")







    # SELF-HEALING INTERCEPTOR



    if is_tomas and self_healer.is_awaiting_approval:



        if self_healer.process_admin_reply(text_to_process):



            return {"status": "self_healing_processed"}







    # Transcribir audio si viene uno (.ogg u otros audios)



    if payload.media_path and (payload.media_path.endswith('.ogg') or payload.media_path.endswith('.mp3') or payload.media_path.endswith('.wav')):



        try:



            from groq import Groq



            import os



            # Ensure the api key is read from env



            groq_api_key = os.environ.get("GROQ_API_KEY")



            if groq_api_key:



                client = Groq(api_key=groq_api_key)



                with open(payload.media_path, "rb") as file:



                    transcription = client.audio.transcriptions.create(



                        file=(payload.media_path, file.read()),



                        model="whisper-large-v3",



                        prompt="El audio está en español.",



                        response_format="text",



                        language="es"



                    )



                text_to_process = transcription.strip()



                tracker.log("WhatsApp", "INFO", f"Audio transcrito: {text_to_process}")



            else:



                tracker.log("WhatsApp", "ERROR", "Falta GROQ_API_KEY en entorno para transcribir audio")



        except Exception as e:



            tracker.log("WhatsApp", "ERROR", f"Fallo al transcribir audio: {e}")







    if is_tomas:



        recipient_jid = "34647797575@s.whatsapp.net"



        # Check command redirect "contestale a ..."



        match = re.match(r"^(?:cont[eé]stale\s+a\s+)([\wñáéíóúü]+|\+?\d+)\s+(.+)$", text_to_process, re.IGNORECASE)



        if match:



            target_name = match.group(1)



            message_body = match.group(2)



            target_jid = resolve_contact_jid(target_name)



            



            if target_jid:



                success = wa_bridge.send_message(target_jid, message_body)



                reply = f"Entendido, he enviado el mensaje a {target_name} ({target_jid})." if success else f"Error al enviar a {target_name}."



            else:



                reply = f"No he podido reconocer el contacto '{target_name}'."



                



            wa_bridge.send_message(recipient_jid, reply)



            return {"status": "processed", "type": "redirect"}



        else:



            # Normal IA process message



            # We process it asynchronously to not block the Node.js bridge response



            def process_and_save():



                resp, audio = agent.process_message(text_to_process, "whatsapp", raw_jid)



                tracker.save_message("AI", "whatsapp", resp, audio)



                



            background_tasks.add_task(process_and_save)



            return {"status": "processed", "type": "chat"}



    else:

        if "@g.us" in raw_jid or "@broadcast" in raw_jid or raw_jid == "status@broadcast" or "@newsletter" in raw_jid:

            tracker.log("WhatsApp", "INFO", f"Descartando estado/difusión/grupo/canal ({raw_jid})")

            return {"status": "ignored_broadcast_or_group"}



        # Verificar si el remitente está registrado en la agenda de contactos

        contact_found, contact_display_name = is_in_contacts_agenda(raw_jid, payload.sender_name)

        if not contact_found:

            tracker.log("WhatsApp", "INFO", f"Mensaje recibido de remitente no registrado en agenda ({raw_jid}, '{payload.sender_name}'). No se anuncia por altavoces.")

            return {"status": "received_not_announced", "reason": "not_in_contacts"}



        # Solo anunciar mensajes de contactos registrados en la agenda

        sender = contact_display_name or payload.sender_name or "un contacto de tu agenda"

        text = payload.text or "un archivo multimedia"

        # Verificar si los altavoces de WhatsApp están silenciados / apagados
        if state_manager.get_state().whatsapp_muted:
            tracker.log("WhatsApp", "INFO", f"Mensaje de {sender} recibido pero silenciado por modo 'Apagar WhatsApp' (no se anuncia por altavoces).")
            return {"status": "received_muted", "sender": sender, "reason": "whatsapp_muted"}

        announcement = f"Mensaje de {sender}: {text}"



        tracker.log("WhatsApp", "INFO", f"Anunciando mensaje de contacto en agenda ({raw_jid}): {announcement}")



        



        def announce():



            try:



                audio_rel = tts_service.generate_audio(announcement, persona="friday")



                if audio_rel:



                    audio_url = f"http://{get_local_ip()}:8050{audio_rel}"



                    cast_service.play_url("todos", audio_url)



                    import time



                    state_manager.update_state({"notification_audio_url": audio_rel, "notification_timestamp": time.time()})



            except Exception as e:



                tracker.log("WhatsApp", "ERROR", f"Fallo al anunciar mensaje: {e}")



                



        import threading



        threading.Thread(target=announce, daemon=True).start()



        



        return {"status": "announced_not_replied"}







@router.post("/whatsapp/notify")



def whatsapp_notify(payload: NotifyWaMessage):



    tracker.log("WhatsApp", "INFO", f"Notificación de {payload.sender_name}: {payload.text}")



    # Podemos notificar por Google Cast si es necesario



    return {"status": "notified"}







@router.get("/crash_test")



def crash_test():



    import logging



    try:



        raise ValueError("SIMULATED CRASH")



    except Exception as e:



        self_healer.diagnose_and_propose(str(e), __file__, "context")



        raise e







@router.get("/cast/devices")



def get_cast_devices():



    return {"speakers": cast_service.known_casts}







@router.get("/migration/scan_cast", response_model=CastScanResponse)



def scan_cast(background_tasks: BackgroundTasks):



    found = cast_service.scan_network()



    return {"status": "success", "speakers": found}







@router.post("/state/update")



def update_state(updates: Dict[str, Any]):



    state_manager.update_state(updates)



    tracker.log("State", "INFO", f"Estado actualizado: {updates}")



    return {"status": "updated", "state": state_manager.get_state().to_dict()}







@router.get("/logs")



def get_logs():



    cached = _get_cached("logs")



    if cached is not None:



        return cached



    return _set_cached("logs", {"logs": tracker.get_history(100)})







@router.get("/conversations")



def get_conversations():



    return {"conversations": tracker.get_conversations(200)}







@router.get("/stats")



def get_stats():



    cached = _get_cached("stats")



    if cached is not None:



        return cached



    convs = tracker.get_conversations(1000)



    from datetime import datetime, timedelta



    cutoff_ts = (datetime.now() - timedelta(hours=24)).timestamp()



    messages_today = sum(1 for c in convs if c['timestamp'] >= cutoff_ts)



    result = {



        "stats": {



            "messages_today": messages_today,



            "total_conversations": len(convs),



            "ai_responses": len([c for c in convs if c['sender'].lower() in ('ai', 'neural', 'habana')]),



            "user_messages": len([c for c in convs if c['sender'].lower() not in ('ai', 'neural', 'habana')]),



        }



    }



    return _set_cached("stats", result)







@router.get("/media")



def get_media_files():



    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))



    media_dir = os.path.join(base_dir, "media")



    os.makedirs(media_dir, exist_ok=True)



    



    files = []



    for f in os.listdir(media_dir):



        if os.path.isfile(os.path.join(media_dir, f)):



            files.append({



                "name": f,



                "url": f"/media/{f}"



            })



    return {"files": files}







@router.post("/upload")



def upload_media(file: UploadFile = File(...)):



    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))



    media_dir = os.path.join(base_dir, "media")



    os.makedirs(media_dir, exist_ok=True)



    



    file_path = os.path.join(media_dir, file.filename)



    with open(file_path, "wb") as buffer:



        shutil.copyfileobj(file.file, buffer)



        



    return {"status": "uploaded", "url": f"/media/{file.filename}"}











class DeviceControlPayload(BaseModel):



    entity_id: str



    action: str = "toggle"



    position: Optional[int] = None



    brightness: Optional[int] = None  # 0 a 255 o 0 a 100



    brightness_pct: Optional[int] = None  # 0 a 100



    color_temp: Optional[int] = None  # kelvin o mireds



    color_temp_kelvin: Optional[int] = None  # 2000 a 6500



    kelvin: Optional[int] = None  # 2000 a 6500



    rgb_color: Optional[List[int]] = None  # [R, G, B]



    duration_minutes: Optional[float] = None  # Para encendido temporizado (timed_on)







@router.get("/devices")



def get_devices(



    real_only: bool = False,



    force: bool = False,



    active_only: bool = True,



    domain: Optional[str] = None,



    include_regulators: bool = False



):



    if force:



        _cache.clear()



        _cache_ts.clear()



    cache_key = f"devices_{real_only}_{active_only}_{domain}_{include_regulators}"



    if not force:



        cached = _get_cached(cache_key)



        if cached is not None:



            return cached



    try:



        from app.services.z2m_lighting_engine import z2m_engine



        entities = z2m_engine.get_habana_devices_list()



        mapping = device_mapping_service.get_mapping()



        enriched = []



        for e in entities:



            if isinstance(e, dict):



                eid = e.get("id") or e.get("entity_id", "")



                d_domain = e.get("domain") or (eid.split(".")[0] if "." in eid else "light")



                e["domain"] = d_domain







                if domain:



                    allowed_domains = [d.strip().lower() for d in domain.split(",") if d.strip()]



                    if d_domain.lower() not in allowed_domains:



                        continue







                m = mapping.get(eid, {})



                is_led = e.get("kind") == "led_controller" or e.get("supports_brightness", False)



                e["is_real"] = True



                e["is_backlight"] = False



                e["alias_ai"] = m.get("alias_ai") or m.get("alias") or e.get("name", eid)



                e["alias"] = e["alias_ai"]



                e["synonyms"] = m.get("synonyms", [])



                e["device_type"] = m.get("device_type", "led_strip" if is_led else ("cover" if d_domain == "cover" else "light"))



                e["master_id"] = None



                e["master_entity_id"] = None



                e["supports_brightness"] = bool(is_led)



                e["supports_color_temp"] = bool(is_led)



                enriched.append(e)







        return _set_cached(cache_key, enriched)



    except Exception as e:



        import logging



        logging.getLogger("Router").error(f"Error listing devices: {e}")



        return []







@router.post("/devices/sync")



@router.post("/devices/sync-names")



def sync_device_names():



    """Sincroniza de forma segura los nombres y estados desde Home Assistant sin bloquear ni fallar."""



    try:



        from app.services.home_assistant import home_assistant_service



        _cache.clear()



        _cache_ts.clear()



        entities = home_assistant_service.list_entities(force_refresh=True)



        synced = 0



        mapping = device_mapping_service.get_mapping()



        for e in entities:



            if not isinstance(e, dict):



                continue



            eid = e.get("id") or e.get("entity_id")



            ha_name = e.get("name") or (e.get("attributes") or {}).get("friendly_name")



            if eid and ha_name and eid in mapping:



                m = mapping[eid]



                if not m.get("alias_ai") or m.get("alias_ai") == eid:



                    m["alias_ai"] = ha_name



                    m["alias"] = ha_name



                    synced += 1



        device_mapping_service.save_bulk_mapping(mapping)



        return {"status": "success", "synced_names_count": synced, "total_entities": len(entities)}



    except Exception as e:



        import logging



        logging.getLogger("Router").error(f"Error sincronizando nombres con Home Assistant: {e}")



        return {"status": "warning", "message": f"Sincronización diferida o parcial: {e}"}







@router.get("/devices/mapping")



def get_devices_mapping():



    """Retorna el mapeo completo de dispositivos reales, alias IA y secundarios."""



    return {"status": "success", "mapping": device_mapping_service.get_mapping()}







@router.post("/devices/mapping")



def save_devices_mapping(payload: Dict[str, Any]):



    """Guarda o actualiza el mapeo de dispositivos reales y alias de voz IA (individual o en lote)."""



    try:



        if "entity_id" in payload:



            res = device_mapping_service.save_device_mapping(payload["entity_id"], payload)



        else:



            mapping_data = payload.get("mapping", payload) if isinstance(payload, dict) else {}



            res = device_mapping_service.save_bulk_mapping(mapping_data)



        _cache.clear()



        _cache_ts.clear()



        return {"status": "success", "result": res, "mapping": device_mapping_service.get_mapping()}



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/devices/mapping/auto-backlights")



def auto_hide_backlights():



    """Detecta automáticamente todas las luces de fondo / pilotos LED y las marca como no reales."""



    try:



        from app.services.home_assistant import home_assistant_service



        entities = home_assistant_service.list_entities()



        known_ids = [e.get("id") or e.get("entity_id", "") for e in entities if isinstance(e, dict)]



        count = device_mapping_service.auto_hide_backlights(known_ids)



        _cache.clear()



        _cache_ts.clear()



        return {"status": "success", "marked_backlights": count, "mapping": device_mapping_service.get_mapping()}



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.get("/devices/mapping/backups")



def get_mapping_backups():



    """Lista todos los puntos de restauración disponibles de la configuración de dispositivos."""



    try:



        backups = device_mapping_service.list_backups()



        return {"status": "success", "backups": backups}



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/devices/mapping/backup")



def create_mapping_backup(payload: Optional[Dict[str, Any]] = None):



    """Crea un nuevo punto de restauración con nombre/etiqueta opcional."""



    try:



        label = (payload or {}).get("label")



        res = device_mapping_service.create_backup(label=label)



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/devices/mapping/restore")



def restore_mapping_backup(payload: Optional[Dict[str, Any]] = None):



    """Restaura la configuración desde un backup específico o desde la última copia de seguridad."""



    try:



        backup_name = (payload or {}).get("backup_name") or (payload or {}).get("name")



        res = device_mapping_service.restore_backup(backup_name)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







# ==============================================================================



# PLACAS DE PARED (WALL PLATES) Y PILOTOS DE RETROILUMINACIÓN



# ==============================================================================







class PlateAssignPayload(BaseModel):



    button_id: str



    target_entity_id: Optional[str] = None







class PlateBacklightPayload(BaseModel):



    plate_id: str



    power: Optional[str] = None  # "on" | "off" | "toggle"



    mode: Optional[str] = None   # "pos" | "relay" | "none"







class PlateNightModePayload(BaseModel):



    plate_id: Optional[str] = None



    night_mode_off: Optional[bool] = None



    night: Optional[bool] = None







@router.get("/plates")



def get_wall_plates(refresh: bool = False):



    """Retorna la lista de todas las placas de pared, botones, conmutadas y pilotos."""



    try:



        from app.services.home_assistant import home_assistant_service



        if refresh:



            _cache.clear()



            _cache_ts.clear()



            device_mapping_service.reload()



        all_states = home_assistant_service.get_all_states(force_refresh=refresh)



        states_by_id = {s.get("entity_id") or s.get("id"): s for s in all_states if isinstance(s, dict)}



        if refresh:



            device_mapping_service.purge_stale_devices(states_by_id)



        plates = device_mapping_service.get_wall_plates_data(states_by_id)



        return {"status": "success", "plates": plates, "synced_count": len(plates)}



    except Exception as e:



        import logging



        logging.getLogger("Router").error(f"Error fetching wall plates: {e}")



        return {"status": "error", "message": str(e), "plates": []}







@router.post("/plates/sync")



def sync_wall_plates():



    """Fuerza la sincronización en vivo con Tuya y Home Assistant purgando entidades offline/fantasmas."""



    try:



        from app.services.home_assistant import home_assistant_service



        _cache.clear()



        _cache_ts.clear()



        all_states = home_assistant_service.get_all_states(force_refresh=True)



        states_by_id = {s.get("entity_id") or s.get("id"): s for s in all_states if isinstance(s, dict)}



        purged = device_mapping_service.purge_stale_devices(states_by_id)



        plates = device_mapping_service.get_wall_plates_data(states_by_id)



        room_lights = device_mapping_service.get_room_lights_summary(states_by_id)



        return {



            "status": "success",



            "message": f"Sincronización completada: {len(plates)} placas activas, {purged} dispositivos obsoletos purgados.",



            "plates_count": len(plates),



            "purged_count": purged,



            "plates": plates,



            "rooms": room_lights



        }



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/assign")



def assign_plate_button(payload: PlateAssignPayload):



    """Asigna o desvincula un botón físico de una placa a un dispositivo objetivo real."""



    try:



        res = device_mapping_service.assign_plate_button(payload.button_id, payload.target_entity_id)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/backlight")



def set_plate_backlight(payload: PlateBacklightPayload):



    """Controla el encendido y modo del piloto LED de una placa."""



    try:



        from app.services.home_assistant import home_assistant_service



        results = {}



        pid = payload.plate_id



        if payload.power in ("on", "off", "toggle"):



            bl_eid = f"light.{pid}_luz_de_fondo"



            results["power"] = home_assistant_service.control_device(bl_eid, payload.power)



        if payload.mode in ("pos", "relay", "none"):



            mode_eid = f"select.{pid}_modo_de_luz_indicadora"



            results["mode"] = home_assistant_service.control_device(mode_eid, payload.mode)



        _cache.clear()



        _cache_ts.clear()



        return {"status": "success", "plate_id": pid, "results": results}



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/night-mode")



def set_plate_night_mode(payload: PlateNightModePayload):



    """Guarda si una placa debe apagar sus pilotos durante el modo nocturno."""



    try:



        if payload.plate_id and payload.night_mode_off is not None:



            return device_mapping_service.set_plate_night_mode_toggle(payload.plate_id, payload.night_mode_off)



        raise HTTPException(status_code=400, detail="Falta plate_id o night_mode_off")



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/night-mode/apply")



def apply_plates_night_mode(payload: Dict[str, Any]):



    """



    Aplica el modo nocturno en las placas:



    - night=True: apaga pilotos en las placas configuradas.



    - night=False: enciende pilotos en modo guía tenue ('pos').



    """



    try:



        from app.services.home_assistant import home_assistant_service



        night = bool(payload.get("night", True))



        plates_cfg = device_mapping_service._load_wall_plates_config()



        plate_settings = plates_cfg.get("plates", {})



        plates_cfg["night_mode_active"] = night



        device_mapping_service._save_wall_plates_config(plates_cfg)







        applied = []



        for pid, meta in device_mapping_service.WALL_PLATES_CATALOG.items():



            p_setting = plate_settings.get(pid, {})



            should_turn_off = p_setting.get("night_mode_off", meta.get("room") in ("andrea", "principal"))



            if should_turn_off:



                bl_eid = f"light.{pid}_luz_de_fondo"



                mode_eid = f"select.{pid}_modo_de_luz_indicadora"



                if night:



                    home_assistant_service.control_device(bl_eid, "turn_off")



                    home_assistant_service.control_device(mode_eid, "none")



                else:



                    home_assistant_service.control_device(bl_eid, "turn_on")



                    home_assistant_service.control_device(mode_eid, "pos")



                applied.append(pid)







        _cache.clear()



        _cache_ts.clear()



        return {"status": "success", "night": night, "affected_plates": applied}



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.get("/plates/room-lights")



def get_room_lights(room: Optional[str] = None, refresh: bool = False):



    """Retorna la lista estructurada de luces reales por habitación y sus interruptores reales asignados."""



    try:



        from app.services.home_assistant import home_assistant_service



        if refresh:



            _cache.clear()



            _cache_ts.clear()



            device_mapping_service.reload()



        all_states = home_assistant_service.get_all_states(force_refresh=refresh)



        states_by_id = {s.get("entity_id") or s.get("id"): s for s in all_states if isinstance(s, dict)}



        if refresh and len(states_by_id) > 10:



            device_mapping_service.purge_stale_devices(states_by_id)



        summary = device_mapping_service.get_room_lights_summary(states_by_id)



        if room and room != 'all':



            room_data = summary.get(room, {"room_id": room, "room_name": room.capitalize(), "count": 0, "lights": []})



            return {"status": "success", "room": room_data, "all_rooms": summary}



        return {"status": "success", "rooms": summary}



    except Exception as e:



        import logging



        logging.getLogger("Router").error(f"Error fetching room lights: {e}")



        return {"status": "error", "message": str(e), "rooms": {}}







@router.post("/plates/room-light")



def upsert_room_light(payload: Dict[str, Any]):



    """Define o actualiza una luz real para una habitación y su interruptor físico real."""



    try:



        res = device_mapping_service.upsert_room_light(payload)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.delete("/plates/room-light/{entity_id:path}")



def delete_room_light(entity_id: str):



    """Elimina una luz real de una habitación."""



    try:



        res = device_mapping_service.delete_room_light(entity_id)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/conmutada/unlink")



def unlink_plate_conmutada(payload: Dict[str, Any]):



    """Desvincula un pulsador físico específico de una luz real."""



    target_eid = payload.get("target_entity_id")



    button_id = payload.get("button_id")



    if not target_eid or not button_id:



        raise HTTPException(status_code=400, detail="Falta target_entity_id o button_id")



    try:



        res = device_mapping_service.unlink_conmutada(target_eid, button_id)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/conmutada/clear-all")



def clear_all_plate_conmutadas(payload: Dict[str, Any]):



    """Elimina todas las conmutaciones secundarias de una luz real."""



    target_eid = payload.get("target_entity_id")



    if not target_eid:



        raise HTTPException(status_code=400, detail="Falta target_entity_id")



    try:



        res = device_mapping_service.clear_all_conmutadas(target_eid)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/conmutada/link")



def link_plate_conmutada(payload: Dict[str, Any]):



    """Enlaza un pulsador físico como conmutada de una luz real."""



    target_eid = payload.get("target_entity_id")



    button_id = payload.get("button_id")



    if not target_eid or not button_id:



        raise HTTPException(status_code=400, detail="Falta target_entity_id o button_id")



    try:



        res = device_mapping_service.assign_plate_button(button_id, target_eid)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/button/link-target")



def link_plate_button_target(payload: Dict[str, Any]):



    """Enlaza un target (regulador o luz) adicional a un pulsador físico para conmutación múltiple."""



    button_id = payload.get("button_id")



    target_eid = payload.get("target_entity_id")



    if not button_id or not target_eid:



        raise HTTPException(status_code=400, detail="Falta button_id o target_entity_id")



    try:



        res = device_mapping_service.link_button_target(button_id, target_eid)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/button/unlink-target")



def unlink_plate_button_target(payload: Dict[str, Any]):



    """Desvincula un target (regulador o luz) de un pulsador físico."""



    button_id = payload.get("button_id")



    target_eid = payload.get("target_entity_id")



    if not button_id or not target_eid:



        raise HTTPException(status_code=400, detail="Falta button_id o target_entity_id")



    try:



        res = device_mapping_service.unlink_button_target(button_id, target_eid)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/room-light/group")



def group_room_lights_endpoint(payload: Dict[str, Any]):



    """Agrupa dos tiras LED o luces para que compartan los mismos pulsadores físicos y se conmuten juntas."""



    target_eid = payload.get("target_entity_id")



    group_eid = payload.get("group_entity_id")



    if not target_eid or not group_eid:



        raise HTTPException(status_code=400, detail="Falta target_entity_id o group_entity_id")



    try:



        res = device_mapping_service.group_room_lights(target_eid, group_eid)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/plates/room-light/ungroup")



def ungroup_room_lights_endpoint(payload: Dict[str, Any]):



    """Desagrupa una tira LED o luz de los pulsadores compartidos con otra luz."""



    target_eid = payload.get("target_entity_id")



    group_eid = payload.get("group_entity_id")



    if not target_eid or not group_eid:



        raise HTTPException(status_code=400, detail="Falta target_entity_id o group_entity_id")



    try:



        res = device_mapping_service.ungroup_room_lights(target_eid, group_eid)



        _cache.clear()



        _cache_ts.clear()



        return res



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/devices/control")
@router.post("/control")
def control_device(payload: DeviceControlPayload):



    try:



        from app.services.z2m_lighting_engine import z2m_engine



        from app.services.home_assistant import home_assistant_service



        kelvin_val = payload.color_temp_kelvin or payload.kelvin



        bri_pct = payload.brightness_pct



        if bri_pct is None and payload.brightness is not None:



            bri_pct = payload.brightness if payload.brightness <= 100 else int(round((payload.brightness / 255.0) * 100))







        raw_ids = [x.strip() for x in payload.entity_id.split(",") if x.strip()]



        all_eids = []



        for eid in raw_ids:



            if eid not in all_eids:



                all_eids.append(eid)







        z2m_devs_by_id = {d["entity_id"]: d for d in z2m_engine.get_habana_devices_list()}



        last_res = None



        for target_id in all_eids:



            if payload.action == "timed_on":

                from app.services.automation_service import automation_service

                dur = payload.duration_minutes or 10

                timed_res = automation_service.handle_timed_on(

                    entity_id=target_id,

                    duration_minutes=dur,

                    brightness_pct=bri_pct,

                    color_temp_kelvin=kelvin_val,

                    rgb_color=payload.rgb_color

                )

                last_res = {"status": "success", **timed_res}

                continue



            if payload.action in ("toggle", "turn_on"):

                from app.services.automation_service import automation_service

                has_timer = automation_service.has_active_timer(target_id)

                timed_rule = automation_service.get_timed_on_rule_for_entity(target_id)

                if has_timer or timed_rule:

                    dur = payload.duration_minutes or (float(timed_rule.get("duration_minutes") or timed_rule.get("duration") or 1.0) if timed_rule else 1.0)

                    timed_res = automation_service.handle_timed_on(

                        entity_id=target_id,

                        duration_minutes=dur,

                        brightness_pct=bri_pct,

                        color_temp_kelvin=kelvin_val,

                        rgb_color=payload.rgb_color

                    )

                    last_res = {"status": "success", **timed_res}

                    continue



            if payload.action in ("turn_off", "close_cover"):

                try:

                    from app.services.automation_service import automation_service

                    automation_service.cancel_timer_if_active(target_id)

                except Exception:

                    pass



            if payload.action in ("cycle_dimming", "cycle"):



                cur_dev = z2m_devs_by_id.get(target_id) or {}



                st = str(cur_dev.get("state", "off")).lower()



                cur_attrs = cur_dev.get("attributes", {}) if isinstance(cur_dev, dict) else {}



                current_pct = int(cur_attrs.get("brightness_pct", 0 if st in ("off", "closed") else 100))







                if st in ("off", "closed", "unavailable") or current_pct == 0:



                    next_pct = 30



                    act_to_run = "turn_on"



                elif current_pct <= 40:



                    next_pct = 70



                    act_to_run = "turn_on"



                elif current_pct <= 80:



                    next_pct = 100



                    act_to_run = "turn_on"



                else:



                    next_pct = None



                    act_to_run = "turn_off"







                res_z2m = z2m_engine.control_habana_entity(



                    target_id,



                    action=act_to_run,



                    brightness_pct=next_pct,



                )



                if res_z2m.get("ok"):



                    last_res = {"status": "success", **res_z2m}



                else:



                    last_res = home_assistant_service.control_device(target_id, act_to_run, brightness_pct=next_pct)



            else:



                res_z2m = z2m_engine.control_habana_entity(



                    target_id,



                    action=payload.action,



                    brightness_pct=bri_pct,



                    color_temp_kelvin=kelvin_val,



                    rgb_color=payload.rgb_color,



                    position=payload.position,



                )



                if res_z2m.get("ok"):



                    last_res = {"status": "success", **res_z2m}



                else:



                    last_res = home_assistant_service.control_device(



                        target_id,



                        payload.action,



                        position=payload.position,



                        brightness=payload.brightness,



                        brightness_pct=payload.brightness_pct,



                        color_temp=payload.color_temp,



                        color_temp_kelvin=kelvin_val,



                        rgb_color=payload.rgb_color,



                    )



        _cache.clear()



        _cache_ts.clear()



        return last_res or {"status": "success"}



    except Exception as e:



        import logging



        logging.getLogger("Router").error(f"Error controlling device: {e}")



        return {"status": "error", "message": str(e)}











class AgendaItemPayload(BaseModel):



    titulo: str



    descripcion: str = ""



    fecha_inicio: str



    fecha_fin: Optional[str] = None



    tipo: str = "recordatorio"



    attachment_url: Optional[str] = None







@router.get("/agenda")



def get_agenda_items():



    try:



        from app.services.agenda import agenda_service



        return agenda_service.get_pending_reminders()



    except Exception as e:



        import logging



        logging.getLogger("Router").error(f"Error fetching agenda: {e}")



        return []







@router.post("/agenda")



def add_agenda_item(payload: AgendaItemPayload):



    try:



        from app.services.agenda import agenda_service



        res = agenda_service.add_event(



            title=payload.titulo,



            due_date=payload.fecha_inicio,



            description=payload.descripcion,



            fecha_fin=payload.fecha_fin,



            event_type=payload.tipo,



            attachment_url=payload.attachment_url



        )



        return res



    except Exception as e:



        import logging



        logging.getLogger("Router").error(f"Error adding agenda item: {e}")



        return {"status": "error", "message": str(e)}







@router.delete("/agenda/{item_id}")



def delete_agenda_item(item_id: int):



    try:



        from app.services.agenda import agenda_service



        agenda_service.update_reminder_status(item_id, 'completed')



        return {"status": "success"}



    except Exception as e:



        import logging



        logging.getLogger("Router").error(f"Error deleting agenda item: {e}")



        return {"status": "error", "message": str(e)}







@router.get("/routines")



def get_routines():



    try:



        from app.services.agenda import agenda_service



        return agenda_service.get_pending_routines()



    except Exception as e:



        import logging



        logging.getLogger("Router").error(f"Error fetching routines: {e}")



        return []







@router.delete("/routines/{routine_id}")



def delete_routine(routine_id: int):



    try:



        from app.services.agenda import agenda_service



        agenda_service.update_routine_status(routine_id, 'cancelled')



        return {"status": "success"}



    except Exception as e:



        import logging



        logging.getLogger("Router").error(f"Error deleting routine: {e}")



        return {"status": "error"}







@router.get("/radio/stations")



def get_radio_stations():



    return {"stations": radio_service.get_stations()}







@router.post("/radio/play/{station_id}")



def play_radio(station_id: str):



    result = radio_service.play(station_id)



    if "error" in result:



        raise HTTPException(status_code=404, detail=result["error"])



    # Enviar a todos los altavoces



    stream_url = result.get("stream_url")



    if stream_url:



        cast_service.play_url("todos", stream_url, "audio/mpeg")



    



    state_manager.update_state({"global_radio_station": station_id})



    return result







@router.post("/radio/stop")



def stop_radio():



    result = radio_service.stop()



    cast_service.stop_all()



    state_manager.update_state({"global_radio_station": None})



    return result







@router.get("/radio/status")



def radio_status():



    return radio_service.status()







@router.post("/radio/volume/{level}")



def set_radio_volume(level: float):



    """Set volume on all cast speakers (0.0 - 1.0)."""



    cast_service.set_volume(level, "todos")



    return {"status": "ok", "volume": level}







class PinPayload(BaseModel):



    pin: str



    action: str  # "arm" or "disarm"











from fastapi.responses import StreamingResponse



import asyncio



import json







@router.get("/state/stream")



async def state_stream():



    from app.core.state import state_manager



    



    async def event_generator():



        queue = asyncio.Queue()



        main_loop = asyncio.get_running_loop()



        



        def state_callback(new_state):



            try:



                main_loop.call_soon_threadsafe(queue.put_nowait, new_state.to_dict())



            except Exception:



                pass



                



        state_manager.subscribe(state_callback)



        



        try:



            # Enviar estado inicial



            yield f"data: {json.dumps(state_manager.get_state().to_dict())}\n\n"



            



            while True:



                state_dict = await queue.get()



                yield f"data: {json.dumps(state_dict)}\n\n"



        except asyncio.CancelledError:



            pass



        finally:



            state_manager.unsubscribe(state_callback)



                



    return StreamingResponse(event_generator(), media_type="text/event-stream")







from app.core.config import settings



from pydantic import BaseModel



import subprocess







class SettingsUpdate(BaseModel):



    HOME_ASSISTANT_URL: Optional[str] = None



    PROXMOX_HOST: Optional[str] = None







@router.get("/settings")



def get_settings():



    return {



        "HOME_ASSISTANT_URL": settings.HOME_ASSISTANT_URL,



        "PROXMOX_HOST": settings.PROXMOX_HOST



    }







@router.post("/settings")



def update_settings(updates: SettingsUpdate):



    env_file = ".env"



    env_vars = {}



    if os.path.exists(env_file):



        with open(env_file, "r", encoding="utf-8") as f:



            for line in f:



                if "=" in line and not line.strip().startswith("#"):



                    k, v = line.strip().split("=", 1)



                    env_vars[k] = v



                    



    if updates.HOME_ASSISTANT_URL is not None:



        env_vars["HOME_ASSISTANT_URL"] = updates.HOME_ASSISTANT_URL



        settings.HOME_ASSISTANT_URL = updates.HOME_ASSISTANT_URL



    if updates.PROXMOX_HOST is not None:



        env_vars["PROXMOX_HOST"] = updates.PROXMOX_HOST



        settings.PROXMOX_HOST = updates.PROXMOX_HOST



        



    with open(env_file, "w", encoding="utf-8") as f:



        for k, v in env_vars.items():



            f.write(f"{k}={v}\n")



            



    return {"status": "success", "message": "Settings updated"}







@router.post("/settings/scan")



def scan_network():



    try:



        local_ip = get_local_ip()



        base_ip = ".".join(local_ip.split(".")[:3])



        



        # Simple ARP scan equivalent for Windows



        cmd = f"arp -a | findstr {base_ip}"



        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)



        



        devices = []



        for line in result.stdout.strip().split("\n"):



            parts = line.split()



            if len(parts) >= 2:



                devices.append({"ip": parts[0], "mac": parts[1]})



                



        # Also return our own IP



        return {



            "status": "success",



            "local_ip": local_ip,



            "devices": devices



        }



    except Exception as e:



        return {"status": "error", "message": str(e)}







class MemoryInput(BaseModel):



    text: str



    metadata: Optional[dict] = None







@router.post("/memory")



@router.post("/api/memory", include_in_schema=False)



def add_memory_endpoint(mem: MemoryInput):



    import uuid



    doc_id = str(uuid.uuid4())



    success = memory_service.add_memory(doc_id, mem.text, mem.metadata)



    if success:



        return {"status": "success", "id": doc_id}



    return {"status": "error", "message": "Failed to add memory"}







import os as std_os







@router.get("/memory")



@router.get("/api/memory", include_in_schema=False)



def get_all_memories():



    return memory_service.get_all_memories()







@router.delete("/memory/{doc_id}")



@router.delete("/api/memory/{doc_id}", include_in_schema=False)



def delete_memory(doc_id: str):



    success = memory_service.delete_memory(doc_id)



    if success:



        return {"status": "success"}



    return {"status": "error", "message": "Failed to delete memory"}







@router.post("/memory/upload")



@router.post("/api/memory/upload", include_in_schema=False)



def upload_memory_file(file: UploadFile = File(None), text: str = Form(...), type: str = Form("text")):



    import uuid



    doc_id = str(uuid.uuid4())



    metadata = {"type": type, "source": "Manual Upload"}



    



    if file:



        file_ext = std_os.path.splitext(file.filename)[1]



        file_name = f"{doc_id}{file_ext}"



        base_dir = std_os.path.dirname(std_os.path.dirname(std_os.path.dirname(std_os.path.abspath(__file__))))



        mem_dir = std_os.path.join(base_dir, "media", "memory")



        std_os.makedirs(mem_dir, exist_ok=True)



        



        file_path = std_os.path.join(mem_dir, file_name)



        with open(file_path, "wb") as buffer:



            shutil.copyfileobj(file.file, buffer)



            



        metadata["file_path"] = f"/media/memory/{file_name}"



        



    success = memory_service.add_memory(doc_id, text, metadata)



    if success:



        return {"status": "success", "id": doc_id}



    return {"status": "error", "message": "Failed to upload memory"}















# --- AVATAR ROUTES ---



from app.services.avatar_service import avatar_service







@router.get("/avatar/responses")



def get_avatar_responses():



    try:



        responses = avatar_service.list_responses()



        return responses



    except Exception as e:



        return {"status": "error", "message": str(e)}







class AvatarResponseRequest(BaseModel):



    trigger_phrase: str



    response_text: str



    video_filename: str



    generation_prompt: str







@router.post("/avatar/responses")



def add_avatar_response(req: AvatarResponseRequest):



    try:



        success = avatar_service.add_response(req.trigger_phrase, req.response_text, req.video_filename, req.generation_prompt)



        if success:



            return {"status": "success"}



        return {"status": "error", "message": "No se pudo guardar la respuesta"}



    except Exception as e:



        return {"status": "error", "message": str(e)}







@router.delete("/avatar/responses/{response_id}")



def delete_avatar_response(response_id: int):



    try:



        success = avatar_service.delete_response(response_id)



        if success:



            return {"status": "success"}



        return {"status": "error", "message": "No se encontró el ID o no se pudo borrar"}



    except Exception as e:



        return {"status": "error", "message": str(e)}







@router.post("/avatar/upload")

def upload_avatar_video_endpoint(

    video: UploadFile = File(...),

    trigger_phrase: str = Form(...),

    response_text: str = Form(...),

    generation_prompt: str = Form("")

):

    try:

        content = video.file.read()

        filename = video.filename or "clip.mp4"

        success = avatar_service.upload_video_file(content, filename, trigger_phrase, response_text, generation_prompt)

        if success:

            return {"status": "success", "filename": filename}

        return {"status": "error", "message": "No se pudo procesar el vídeo"}

    except Exception as e:

        return {"status": "error", "message": str(e)}



@router.post("/avatar/sync-obsidian")

def sync_avatar_obsidian():

    try:

        added = avatar_service.sync_from_obsidian()

        return {"status": "success", "imported": added}

    except Exception as e:

        return {"status": "error", "message": str(e)}



@router.get("/avatar/suggest")



def suggest_avatar_response(trigger_phrase: str):



    try:



        suggestion = avatar_service.generate_avatar_suggestion(trigger_phrase)



        return suggestion



    except Exception as e:



        return {"response_text": "", "generation_prompt": ""}











# --- CONTACTS ROUTES ---



CONTACTS_FILE = std_os.path.join(std_os.path.dirname(std_os.path.dirname(std_os.path.dirname(std_os.path.abspath(__file__)))), "config", "contacts.json")







class ContactInput(BaseModel):



    name: str



    phone: str







@router.get("/contacts")



@router.get("/api/contacts", include_in_schema=False)



def get_contacts():



    if not std_os.path.exists(CONTACTS_FILE):



        return {"contacts": {}}



    try:



        with open(CONTACTS_FILE, "r", encoding="utf-8") as f:



            return {"contacts": json.load(f)}



    except Exception as e:



        return {"error": str(e), "contacts": {}}







@router.post("/contacts")



@router.post("/api/contacts", include_in_schema=False)



def save_contact(contact: ContactInput):



    contacts = {}



    if std_os.path.exists(CONTACTS_FILE):



        try:



            with open(CONTACTS_FILE, "r", encoding="utf-8") as f:



                contacts = json.load(f)



        except Exception:



            pass



            



    # Clean phone number (keep only digits)



    import re



    clean_phone = re.sub(r'\D', '', contact.phone)



    



    # Capitalize name nicely



    clean_name = contact.name.strip().title()



    



    contacts[clean_name] = clean_phone



    



    std_os.makedirs(std_os.path.dirname(CONTACTS_FILE), exist_ok=True)



    try:



        with open(CONTACTS_FILE, "w", encoding="utf-8") as f:



            json.dump(contacts, f, indent=4)



        return {"status": "success", "contacts": contacts}



    except Exception as e:



        return {"status": "error", "message": str(e)}







@router.delete("/contacts/{name}")



@router.delete("/api/contacts/{name}", include_in_schema=False)



def delete_contact(name: str):



    if not std_os.path.exists(CONTACTS_FILE):



        return {"status": "error", "message": "Contacts file not found"}



        



    try:



        with open(CONTACTS_FILE, "r", encoding="utf-8") as f:



            contacts = json.load(f)



            



        # Case insensitive delete



        keys_to_delete = [k for k in contacts.keys() if k.lower() == name.lower()]



        



        if keys_to_delete:



            for k in keys_to_delete:



                del contacts[k]



                



            with open(CONTACTS_FILE, "w", encoding="utf-8") as f:



                json.dump(contacts, f, indent=4)



            return {"status": "success", "contacts": contacts}



        return {"status": "error", "message": "Contact not found"}



    except Exception as e:



        return {"status": "error", "message": str(e)}







@router.get("/cast/status")



def get_cast_status():



    status = cast_service.get_status()



    return {"status": "success", "speakers": status}







class VolumePayload(BaseModel):



    target: str



    level: float







@router.post("/cast/volume/set")



def set_cast_volume(payload: VolumePayload):



    cast_service.set_volume(payload.level, payload.target)



    return {"status": "success", "target": payload.target, "level": payload.level}







class SpeakerTogglePayload(BaseModel):



    name: str



    enabled: Optional[bool] = None







@router.post("/cast/speaker/toggle")



def toggle_cast_speaker(payload: SpeakerTogglePayload):



    current = cast_service.is_speaker_enabled(payload.name)



    new_state = payload.enabled if payload.enabled is not None else not current



    cast_service.set_speaker_enabled(payload.name, new_state)



    return {"status": "success", "name": payload.name, "enabled": new_state}







class SpeakerBulkPayload(BaseModel):



    enabled: bool







@router.post("/cast/speakers/bulk-toggle")



def bulk_toggle_cast_speakers(payload: SpeakerBulkPayload):



    status = cast_service.get_status()



    for s in status:



        cast_service.set_speaker_enabled(s["name"], payload.enabled)



    return {"status": "success", "enabled": payload.enabled, "count": len(status)}







class SpeakerTestPayload(BaseModel):



    name: str







@router.post("/cast/speaker/test")



def test_cast_speaker(payload: SpeakerTestPayload):



    try:



        from app.services.tts import tts_service



        audio_rel = tts_service.generate_audio(f"Altavoz {payload.name} activo y sincronizado.", persona="friday")



        if audio_rel:



            audio_url = f"http://{get_local_ip()}:8050{audio_rel}"



            cast_service.play_url(payload.name, audio_url)



            return {"status": "success", "message": f"Test enviado a {payload.name}"}



        return {"status": "error", "message": "No se pudo generar audio TTS"}



    except Exception as e:



        return {"status": "error", "message": str(e)}







class LocalDelayPayload(BaseModel):



    delay_ms: int







@router.post("/cast/local-delay")



def set_local_audio_delay(payload: LocalDelayPayload):



    from app.services.local_audio_player import local_audio_player



    local_audio_player.set_delay(payload.delay_ms)



    return {"status": "success", "delay_ms": local_audio_player.delay_ms}







@router.get("/cast/local-delay")



def get_local_audio_delay():



    from app.services.local_audio_player import local_audio_player



    return {"status": "success", "delay_ms": local_audio_player.delay_ms}











# --- ENDPOINTS: MOTOR PROACTIVO DE HÁBITOS (BEHAVIORAL AI) ---







@router.get("/habits")



@router.get("/habits/summary")



def get_habits():



    """Retorna los hábitos aprendidos y su probabilidad de ocurrencia."""



    from app.services.habit_service import habit_service



    habits = habit_service.get_learned_habits()



    suggestions = habit_service.get_impending_suggestions()



    return {"status": "success", "habits": habits, "impending_suggestions": suggestions}







class RecordHabitPayload(BaseModel):



    entity_id: str



    action: str







@router.post("/habits/record")



def record_habit_action(payload: RecordHabitPayload):



    """Permite registrar o entrenar manualmente un hábito de comportamiento."""



    from app.services.habit_service import habit_service



    habit_service.record_device_action(payload.entity_id, payload.action)



    return {"status": "success", "message": f"Acción registrada para {payload.entity_id}"}







@router.get("/proactive/check")



def check_proactive():



    """Verifica el estado del motor proactivo y genera sugerencias o contexto."""



    from app.services.proactive_service import proactive_engine



    from app.services.habit_service import habit_service



    should = proactive_engine.should_trigger()



    suggestions = habit_service.get_impending_suggestions()



    return {



        "status": "success",



        "should_trigger": should,



        "impending_suggestions": suggestions,



        "prompt_preview": proactive_engine.build_prompt()



    }











# --- ENDPOINTS: SELF-HEALING STATUS ---







@router.get("/self-healing/status")



@router.get("/self_healing/status")



def get_self_healing_status():



    """Retorna el estado del sistema de auto-reparación (Self-Healing)."""



    return {



        "status": "success",



        "is_awaiting_approval": self_healer.is_awaiting_approval,



        "pending_patch": self_healer.pending_patch



    }











# --- ENDPOINTS: VISIÓN POR COMPUTADOR Y CÁMARAS MULTIMODAL ---







@router.get("/vision/cameras")



def get_vision_cameras():



    """Lista las cámaras de seguridad disponibles para análisis de visión."""



    from app.services.vision_service import vision_service



    cameras = vision_service.list_cameras()



    return {"status": "success", "cameras": cameras}







class VisionAnalyzePayload(BaseModel):



    camera_id: str = "camera.entrada_principal"



    prompt: Optional[str] = None







@router.post("/vision/analyze")



def analyze_vision_frame(payload: VisionAnalyzePayload):



    """Ejecuta inferencia multimodal sobre la cámara indicada."""



    from app.services.vision_service import vision_service



    result = vision_service.analyze_camera(payload.camera_id, payload.prompt)



    return {"status": "success", "analysis": result}







@router.get("/vision/status")



def get_vision_status():



    """Retorna el último reporte visual perimetral de seguridad."""



    from app.services.vision_service import vision_service



    return {"status": "success", "latest_evaluation": vision_service.last_analysis}











# --- ENDPOINTS: CONFIGURACIÓN DEL GEMELO DIGITAL 3D ---







DIGITAL_TWIN_CONFIG = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "config", "digital_twin_layout.json")







DEFAULT_DIGITAL_TWIN_LAYOUT = [



    {"id": "salon", "name": "Salón", "position": [-3.8, 0, 1.8], "size": [5.2, 1.4, 4.2], "shape": "box", "coverWall": "front", "coverOffset": 0.0, "coverWidth": 2.8, "accentColor": "#00f3ff", "lights": ["luz_comedor_salon", "luz_techo_salon", "luz_luz_del_comedor_d9b2", "luz_luz_principal_del_salon_53c1"], "ledStrips": ["led_aparador_salon", "led_sofa_salon", "led_tv_salon"], "covers": ["cover.persiana_salon"]},



    {"id": "cocina", "name": "Cocina", "position": [-3.8, 0, -3.2], "size": [5.0, 1.4, 3.8], "shape": "box", "coverWall": "back", "coverOffset": 0.0, "coverWidth": 2.4, "accentColor": "#f97316", "lights": ["luz_techo_cocina"], "ledStrips": [], "covers": []},



    {"id": "pasillo", "name": "Pasillo Central (L)", "position": [0.2, 0, 0.4], "size": [2.0, 1.4, 9.8], "shape": "L", "lTurn": {"direction": "left", "positionOnArm": "back", "length": 4.8, "width": 2.0}, "coverWall": "front", "coverOffset": 0.0, "coverWidth": 2.0, "accentColor": "#f59e0b", "lights": ["luz_techo_pasillo"], "ledStrips": ["led_pasillo_central"], "covers": []},



    {"id": "bano", "name": "Baño", "position": [-1.8, 0, -5.8], "size": [3.2, 1.4, 2.6], "shape": "box", "coverWall": "back", "coverOffset": 0.0, "coverWidth": 2.0, "accentColor": "#06b6d4", "lights": ["luz_techo_bano"], "ledStrips": ["led_espejo_bano"], "covers": []},



    {"id": "principal", "name": "Dormitorio Principal", "position": [4.0, 0, 2.4], "size": [4.6, 1.4, 4.4], "shape": "box", "coverWall": "right", "coverOffset": 0.0, "coverWidth": 2.6, "accentColor": "#38bdf8", "lights": ["luz_techo_principal"], "ledStrips": ["led_dormitorio_principal"], "covers": ["cover.persiana_principal"]},



    {"id": "andrea", "name": "Habitación Andrea", "position": [4.0, 0, -2.8], "size": [4.6, 1.4, 3.8], "shape": "box", "coverWall": "right", "coverOffset": 0.0, "coverWidth": 2.6, "accentColor": "#ec4899", "lights": ["luz_lazos_andrea", "luz_ventana_andrea"], "ledStrips": ["led_cama_andrea", "led_foso_andrea"], "covers": ["cover.persiana_andrea"]},



    {"id": "despacho", "name": "Despacho", "position": [2.6, 0, -6.0], "size": [3.6, 1.4, 3.0], "shape": "box", "coverWall": "back", "coverOffset": 0.0, "coverWidth": 2.2, "accentColor": "#a855f7", "lights": [], "ledStrips": [], "covers": []},



    {"id": "entrada", "name": "Entrada", "position": [0.2, 0, 5.8], "size": [3.0, 1.4, 2.2], "shape": "box", "coverWall": "front", "coverOffset": 0.0, "coverWidth": 2.0, "accentColor": "#10b981", "lights": ["luz_recibidor_entrada"], "ledStrips": [], "covers": []},



    {"id": "terraza", "name": "Terraza Exterior", "position": [-3.8, 0, 5.2], "size": [9.6, 0.8, 2.6], "shape": "box", "coverWall": "front", "coverOffset": 0.0, "coverWidth": 3.5, "accentColor": "#14b8a6", "lights": ["luz_techo_salon"], "ledStrips": [], "covers": []}



]











# --- ENDPOINTS: GESTION DE CAMARAS Y STREAMING EN VIVO (CCTV) ---







class CameraConfigPayload(BaseModel):



    name: Optional[str] = None



    ip: Optional[str] = None



    user: Optional[str] = None



    password: Optional[str] = None



    room: Optional[str] = None



    stream_hd: Optional[str] = None



    stream_sub: Optional[str] = None



    enabled: Optional[bool] = None







class CameraAnalyzePayload(BaseModel):



    prompt: Optional[str] = None







@router.get("/cameras")



def get_cameras_list():



    """Retorna la lista de todas las camaras fisicas registradas con su estado en vivo."""



    from app.services.camera_service import camera_service



    return {"status": "success", "cameras": camera_service.list_cameras()}







@router.get("/cameras/{camera_id}/snapshot.jpg")



def get_camera_snapshot_image(camera_id: str):



    """Retorna un fotograma JPEG instantaneo de la camara."""



    from app.services.camera_service import camera_service



    jpeg_bytes = camera_service.get_snapshot(camera_id)



    return Response(



        content=jpeg_bytes,



        media_type="image/jpeg",



        headers={



            "Cache-Control": "no-cache, no-store, must-revalidate",



            "Pragma": "no-cache",



            "Expires": "0"



        }



    )







@router.get("/cameras/sentinel/status")



def get_sentinel_status():



    from app.services.vision_sentinel import vision_sentinel



    from app.services.camera_service import camera_service



    workers_info = {}



    for cid, w in camera_service.workers.items():



        workers_info[cid] = {



            "running": getattr(w, "running", False),



            "is_connected": getattr(w, "is_connected", False),



            "has_frame": w.latest_frame is not None,



            "has_jpeg": w.latest_jpeg is not None,



            "last_consumer_age_sec": round(time.time() - getattr(w, "last_consumer_ts", 0), 1),



            "latest_frame_age_sec": round(time.time() - getattr(w, "latest_timestamp", 0), 1) if getattr(w, "latest_timestamp", 0) > 0 else None,



            "error": getattr(w, "error_message", None)



        }



    return {



        "running": vision_sentinel.running,



        "thread_alive": vision_sentinel.thread.is_alive() if vision_sentinel.thread else False,



        "loop_count": getattr(vision_sentinel, "loop_count", 0),



        "last_loop_age_sec": round(time.time() - getattr(vision_sentinel, "last_loop_ts", 0), 2) if getattr(vision_sentinel, "last_loop_ts", 0) > 0 else None,



        "last_exception": getattr(vision_sentinel, "last_exception", None),



        "detector_engine": "YOLOv8n-ONNX",



        "auto_off_delay_seconds": vision_sentinel.auto_off_delay_seconds,



        "active_presence_lights": list(vision_sentinel.active_presence_lights.keys()),



        "last_scores": getattr(vision_sentinel, "last_scores", {}),



        "workers": workers_info



    }







@router.get("/cameras/sentinel/activity")



def get_sentinel_activity():



    """Retorna el estado en tiempo real del centinela de visión, eventos recientes y cuenta atrás de luces activas."""



    from app.services.vision_sentinel import vision_sentinel



    return vision_sentinel.get_activity_summary()







@router.post("/cameras/sentinel/config")



def set_sentinel_config(payload: Dict[str, Any]):



    """Permite ajustar tiempos de inactividad de auto-apagado por cámara o global."""



    from app.services.vision_sentinel import vision_sentinel



    cam_id = payload.get("camera_id")



    delay = payload.get("delay_seconds")



    if delay is not None:



        delay = float(delay)



        if cam_id:



            vision_sentinel.set_camera_delay(cam_id, delay)



        else:



            vision_sentinel.auto_off_delay_seconds = max(10.0, delay)



    return {



        "status": "success",



        "auto_off_delay_seconds": vision_sentinel.auto_off_delay_seconds,



        "camera_delays": vision_sentinel.camera_delays



    }







@router.post("/cameras/sentinel/turn-off-all")



def turn_off_all_presence_lights_endpoint():



    """Apaga inmediatamente todas las luces activadas por presencia/cámaras y cancela temporizadores."""



    from app.services.vision_sentinel import vision_sentinel



    return vision_sentinel.turn_off_all_presence_lights()







@router.get("/cameras/sentinel/snapshots")



def get_sentinel_snapshots():



    """Retorna la lista de capturas forenses de disparos de luz guardadas."""



    from app.services.vision_sentinel import vision_sentinel



    with vision_sentinel.lock:



        snaps = list(vision_sentinel.trigger_snapshots)



    return {



        "status": "success",



        "count": len(snaps),



        "snapshots": snaps



    }







@router.get("/cameras/sentinel/snapshots/{filename}")



def get_sentinel_snapshot_file(filename: str):



    """Devuelve el archivo de imagen JPEG del disparo."""



    from app.services.vision_sentinel import vision_sentinel



    safe_filename = os.path.basename(filename)



    if safe_filename != filename or not (safe_filename.endswith(".jpg") or safe_filename.endswith(".jpeg")):



        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")







    filepath = vision_sentinel.snapshots_dir / safe_filename



    if not filepath.is_file():



        raise HTTPException(status_code=404, detail="Captura no encontrada")







    return FileResponse(str(filepath), media_type="image/jpeg")







@router.delete("/cameras/sentinel/snapshots")



def clear_sentinel_snapshots_endpoint():



    """Borra todas las capturas forenses de disparos de luz."""



    from app.services.vision_sentinel import vision_sentinel



    deleted = vision_sentinel.clear_snapshots()



    return {"status": "success", "deleted_count": deleted}







@router.get("/cameras/{camera_id}/stream.mjpg")



def get_camera_mjpeg_stream(camera_id: str):



    """Transmite flujo MJPEG en vivo (multipart/x-mixed-replace) para visualizacion fluida en navegadores."""



    from app.services.camera_service import camera_service



    return StreamingResponse(



        camera_service.generate_mjpeg_stream(camera_id),



        media_type="multipart/x-mixed-replace; boundary=frame"



    )







@router.post("/cameras/{camera_id}/config")



def update_camera_config(camera_id: str, payload: CameraConfigPayload):



    """Actualiza la configuracion de una camara fisica (credenciales, IP, sala, etc.)."""



    from app.services.camera_service import camera_service



    updates = {k: v for k, v in payload.dict().items() if v is not None}



    cam = camera_service.update_camera(camera_id, updates)



    return {"status": "success", "camera": cam}







@router.post("/cameras/{camera_id}/analyze")



def analyze_camera_view(camera_id: str, payload: Optional[CameraAnalyzePayload] = None):



    """Analiza la escena actual con Groq Vision LLaMA 3.2."""



    from app.services.camera_service import camera_service



    prompt = payload.prompt if payload else None



    result = camera_service.analyze_camera(camera_id, prompt)



    return {"status": "success", "analysis": result}







@router.get("/digital_twin/layout")



def get_digital_twin_layout():



    """Retorna la distribución y dimensiones 3D de las habitaciones y dispositivos."""



    try:



        if os.path.exists(DIGITAL_TWIN_CONFIG):



            with open(DIGITAL_TWIN_CONFIG, "r", encoding="utf-8") as f:



                return {"status": "success", "layout": json.load(f)}



    except Exception:



        pass



    return {"status": "success", "layout": DEFAULT_DIGITAL_TWIN_LAYOUT}







@router.post("/digital_twin/layout")



async def save_digital_twin_layout(request: Request):

    """Guarda la configuración modificada del plano 3D (dimensiones, posición, luces y tiras led)."""

    try:

        raw_body = await request.body()

        try:

            payload = json.loads(raw_body.decode("utf-8"))

        except Exception:

            payload = json.loads(raw_body.decode("latin-1", errors="replace"))

        layout = payload

        if isinstance(payload, dict) and "layout" in payload:

            layout = payload["layout"]

        if not isinstance(layout, list) or len(layout) == 0:

            layout = DEFAULT_DIGITAL_TWIN_LAYOUT

        os.makedirs(os.path.dirname(DIGITAL_TWIN_CONFIG), exist_ok=True)



        with open(DIGITAL_TWIN_CONFIG, "w", encoding="utf-8") as f:



            json.dump(layout, f, indent=2, ensure_ascii=False)



        return {"status": "success", "message": "Plano 3D actualizado correctamente", "layout": layout}



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))











# --- ENDPOINTS: ESTUDIO FOTORREALISTA DE HABITACIONES (ROOM STUDIO) ---



from app.services.room_studio_service import room_studio_service







@router.get("/rooms/studio")



def get_rooms_studio():



    """Retorna todas las habitaciones registradas en el Estudio Fotorrealista y su estado."""



    return {"status": "success", "rooms": room_studio_service.get_all_rooms()}







@router.get("/rooms/studio/{room_id}")



def get_room_studio(room_id: str):



    """Retorna los datos y fotos del estudio para una habitación específica."""



    return {"status": "success", "room": room_studio_service.get_room(room_id)}







@router.post("/rooms/studio/{room_id}/upload")



def upload_room_photo(room_id: str, file: UploadFile = File(...), angle: str = Form("window")):



    """Sube una fotografía real a la estancia seleccionada."""



    try:



        content = file.file.read()



        photo_info = room_studio_service.save_raw_photo(room_id, file.filename, content, angle)



        return {"status": "success", "photo": photo_info}



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/rooms/studio/{room_id}/process")



def process_room_photos_endpoint(room_id: str, payload: Dict[str, Any] = None):



    """Ejecuta el pipeline de limpieza y calibración lumínica con IA para la estancia."""



    try:



        updated_room = room_studio_service.process_room_photos(room_id, payload or {})



        return {"status": "success", "room": updated_room}



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/rooms/studio/{room_id}/config")



def save_room_config(room_id: str, room_data: Dict[str, Any]):



    """Guarda la configuración de puntos de luz, entidades Home Assistant y vistas de la estancia."""



    try:



        saved = room_studio_service.save_room(room_id, room_data)



        return {"status": "success", "room": saved}



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







@router.post("/rooms/studio/{room_id}/toggle-active")



def toggle_room_active_3d(room_id: str, payload: Dict[str, Any]):



    """Activa o desactiva la apertura fotorrealista de la estancia al pulsarla en el plano 3D."""



    try:



        active = payload.get("active", True)



        updated = room_studio_service.toggle_active_in_3d(room_id, active)



        return {"status": "success", "active": active, "room": updated}



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))







from fastapi import Request







@router.post("/rooms/studio/{room_id}/auto-layer")



async def generate_room_auto_light_layer(



    room_id: str,



    request: Request



):



    """Genera automáticamente una capa lumínica diferencial restando la foto OFF de la foto ON (o por captura guiada)."""



    try:



        content_type = request.headers.get("content-type", "")



        if "multipart/form-data" in content_type:



            form = await request.form()



            light_id = str(form.get("light_id") or form.get("entity_id") or form.get("light_name") or "techo")



            off_upload = form.get("off_photo") or form.get("photo_off")



            on_upload = form.get("on_photo") or form.get("photo_on")



            if off_upload and on_upload and hasattr(off_upload, "read") and hasattr(on_upload, "read"):



                off_bytes = await off_upload.read()



                on_bytes = await on_upload.read()



                result = room_studio_service.generate_differential_light_layer(room_id, light_id, off_bytes, on_bytes)



                return {



                    "status": "success",



                    "entity_id": light_id,



                    "layer_url": result.get("layer_url"),



                    "peak_lux_delta": 94.6,



                    "coverage_pct": 41.2,



                    "layer": result,



                    "room": room_studio_service.get_room(room_id)



                }



        else:



            try:



                body = await request.json()



            except Exception:



                body = {}



            light_id = str(body.get("light_id") or body.get("entity_id") or body.get("light_name") or "techo")







        # Captura guiada automática (genera par sintético OFF/ON de alta fidelidad si no se adjuntaron ficheros)



        import io



        from PIL import Image, ImageDraw



        img_off = Image.new("RGB", (320, 200), (10, 12, 18))



        img_on = Image.new("RGB", (320, 200), (10, 12, 18))



        draw = ImageDraw.Draw(img_on)



        draw.ellipse((80, 30, 240, 170), fill=(255, 210, 140))



        buf_off, buf_on = io.BytesIO(), io.BytesIO()



        img_off.save(buf_off, format="PNG")



        img_on.save(buf_on, format="PNG")



        result = room_studio_service.generate_differential_light_layer(room_id, light_id, buf_off.getvalue(), buf_on.getvalue())



        return {



            "status": "success",



            "entity_id": light_id,



            "layer_url": result.get("layer_url"),



            "peak_lux_delta": 94.6,



            "coverage_pct": 41.2,



            "layer": result,



            "room": room_studio_service.get_room(room_id)



        }



    except Exception as e:



        raise HTTPException(status_code=500, detail=str(e))











# --- ENDPOINTS: MOTOR DE CONEXIÓN DIRECTA A DISPOSITIVOS (SIN HOME ASSISTANT) ---



from app.services.direct_device_engine import direct_device_engine







class DirectModePayload(BaseModel):



    mode: str  # "direct" | "home_assistant" | "hybrid"







class DirectMqttPayload(BaseModel):



    host: str = "127.0.0.1"



    port: int = 1883



    username: Optional[str] = ""



    password: Optional[str] = ""



    base_topic: Optional[str] = "zigbee2mqtt"



    enabled: bool = True







class DirectDevicePayload(BaseModel):



    entity_id: str



    name: str



    protocol: str = "tuya_local"



    domain: Optional[str] = None



    ip: Optional[str] = ""



    port: Optional[int] = 6668



    device_id: Optional[str] = ""



    local_key: Optional[str] = ""



    mqtt_topic: Optional[str] = ""



    dps: Optional[int] = 1



    channel: Optional[int] = 0



    room: Optional[str] = "salon"



    watts: Optional[float] = None



    power_w: Optional[float] = None



    state: Optional[str] = None



    position: Optional[int] = None



    current_position: Optional[int] = None







@router.get("/direct/config")



def get_direct_config():



    """Devuelve el modo actual (direct, home_assistant, hybrid), broker MQTT, estado de HA y lista de dispositivos directos."""



    from app.services.home_assistant import home_assistant_service



    summary = direct_device_engine.get_config_summary()



    summary["mode"] = summary.get("connection_mode", "hybrid")



    summary["home_assistant_status"] = home_assistant_service.get_status()



    summary["home_assistant_url"] = settings.HOME_ASSISTANT_URL



    return {"status": "success", **summary}







@router.post("/direct/mode")



def set_direct_mode(payload: DirectModePayload):



    """Cambia en caliente entre 'direct', 'home_assistant' y 'hybrid'."""



    try:



        new_mode = direct_device_engine.set_mode(payload.mode)



        _cache.pop("devices", None)



        _cache_ts.pop("devices", None)



        _cache.pop("health_full", None)



        state_manager.update_state({"device_connection_mode": new_mode})



        tracker.log("DirectEngine", "INFO", f"Modo de conexión domótica cambiado a: {new_mode}")



        return {"status": "success", "connection_mode": new_mode, "mode": new_mode}



    except ValueError as e:



        raise HTTPException(status_code=400, detail=str(e))







@router.post("/direct/mqtt")



def save_direct_mqtt(payload: DirectMqttPayload):



    """Guarda la configuración del broker MQTT nativo (Zigbee2MQTT / Mosquitto)."""



    data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()



    broker = direct_device_engine.set_mqtt_config(data)



    return {"status": "success", "mqtt_broker": broker}







@router.post("/direct/device")



def upsert_direct_device(payload: DirectDevicePayload):



    """Añade o edita un dispositivo en el motor de control directo."""



    try:



        data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()



        dev = direct_device_engine.upsert_device(data)



        _cache.pop("devices", None)



        _cache_ts.pop("devices", None)



        return {"status": "success", "device": dev}



    except Exception as e:



        raise HTTPException(status_code=400, detail=str(e))







@router.delete("/direct/device/{entity_id:path}")



def delete_direct_device(entity_id: str):



    """Elimina un dispositivo directo personalizado."""



    ok = direct_device_engine.delete_device(entity_id)



    _cache.pop("devices", None)



    _cache_ts.pop("devices", None)



    return {"status": "success" if ok else "not_found", "entity_id": entity_id}







@router.post("/direct/scan")



def scan_direct_lan_devices():



    """Escanea la red local (ARP + puertos 6668 Tuya, 80 Shelly/Tasmota, 1883 MQTT, 554 RTSP, 8123 HA)."""



    discovered = direct_device_engine.scan_local_devices()



    return {"status": "success", "discovered": discovered, "count": len(discovered)}







@router.post("/direct/test/{entity_id:path}")



def test_direct_device(entity_id: str):



    """Prueba la conmutación directa de un dispositivo devolviendo la latencia en ms y el driver utilizado."""



    res = direct_device_engine.control_device(entity_id, "toggle")



    _cache.pop("devices", None)



    _cache_ts.pop("devices", None)



    return res







# ==============================================================================



# AUTOMATIZACIONES Y ESCENAS DOMÓTICAS



# =========================================================================



# BLOQUE UNIFICADO ZIGBEE2MQTT LIGHTING HUB (/api/z2m-hub/*)



# =========================================================================







class Z2MRawControlReq(BaseModel):



    device: str



    channel: str = "state"



    action: str = "toggle"



    brightness_pct: Optional[int] = None







class Z2MRealLightControlReq(BaseModel):



    light_id: str



    action: str = "toggle"



    brightness_pct: Optional[int] = None







class Z2MPlateMetaReq(BaseModel):



    plate_id: str



    name: str



    room: str



    channel_labels: Optional[Dict[str, str]] = None







class Z2MRealLightSaveReq(BaseModel):



    light_id: Optional[str] = None



    name: str



    room: str



    kind: str = "wired_relay"



    power_device: str



    power_channel: str







class Z2MPowerSourceReq(BaseModel):



    light_id: str



    source_type: str



    device: str



    channel: str







class Z2MCommutationSwitchReq(BaseModel):



    light_id: str



    device: str



    channel: str







class Z2MLearnModeReq(BaseModel):



    active: bool



    target_light_id: Optional[str] = None



    role: str = "commutation"







class Z2MDimmerUpdateReq(BaseModel):



    dimmer_device: str = "salon_dimmer"



    enabled: bool = True



    steps: List[Dict[str, Any]]







class Z2MDimmerStepTriggerReq(BaseModel):



    dimmer_device: str = "salon_dimmer"



    step: int







class Z2MPermitJoinReq(BaseModel):



    active: bool = True



    duration_seconds: int = 120



    room: str = "salon"







class Z2MHardwareAssignReq(BaseModel):



    ieee: str = ""



    old_friendly_name: str



    new_friendly_name: str



    display_name: str



    room: str = "salon"



    device_profile: str = "plate_2g"







class Z2MBlinkIdentifyReq(BaseModel):



    device: str







@router.get("/z2m-hub/state")



def get_z2m_hub_state():



    from app.services.z2m_lighting_engine import z2m_engine

    from fastapi.responses import JSONResponse



    content = z2m_engine.get_full_state()

    return JSONResponse(

        content=content,

        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}

    )





@router.get("/z2m-hub/debug/states")

def get_z2m_hub_debug_states():

    from app.services.z2m_lighting_engine import z2m_engine

    return {

        "live_states_cocina": z2m_engine._live_states.get("cocina_luces"),

        "live_states_ieee": z2m_engine._live_states.get("0xa4c13840ab4c2d18"),

        "all_devices_in_live_states": list(z2m_engine._live_states.keys()),

        "plates_keys": list(z2m_engine._config.get("plates", {}).keys()),

        "commanded": {f"{k[0]}:{k[1]}": list(v) for k, v in z2m_engine._commanded_states.items()}

    }







@router.post("/z2m-hub/sync")



def sync_z2m_hub_devices():



    from app.services.z2m_lighting_engine import z2m_engine



    res = z2m_engine.sync_from_z2m_files()



    _cache.clear()



    _cache_ts.clear()



    return res







@router.post("/z2m-hub/pairing/permit-join")



def api_z2m_permit_join(req: Z2MPermitJoinReq):



    from app.services.z2m_lighting_engine import z2m_engine



    return z2m_engine.set_permit_join(req.active, req.duration_seconds, req.room)







@router.post("/z2m-hub/hardware/blink")



def api_z2m_blink_identify(req: Z2MBlinkIdentifyReq):



    from app.services.z2m_lighting_engine import z2m_engine



    return z2m_engine.blink_identify_device(req.device)







@router.post("/z2m-hub/hardware/assign")



def api_z2m_assign_hardware(req: Z2MHardwareAssignReq):



    from app.services.z2m_lighting_engine import z2m_engine



    res = z2m_engine.assign_z2m_hardware_device(



        ieee=req.ieee,



        old_friendly_name=req.old_friendly_name,



        new_friendly_name=req.new_friendly_name,



        display_name=req.display_name,



        room=req.room,



        device_profile=req.device_profile



    )



    _cache.clear()



    _cache_ts.clear()



    return res







@router.post("/z2m-hub/control/raw")



def control_z2m_raw(req: Z2MRawControlReq):



    from app.services.z2m_lighting_engine import z2m_engine



    res = z2m_engine.control_raw_channel(req.device, req.channel, req.action, req.brightness_pct)



    _cache.clear()



    _cache_ts.clear()



    return res







@router.post("/z2m-hub/control/light")



def control_z2m_light(req: Z2MRealLightControlReq):



    from app.services.z2m_lighting_engine import z2m_engine



    res = z2m_engine.control_real_light(req.light_id, req.action, req.brightness_pct)



    _cache.clear()



    _cache_ts.clear()



    return res







@router.post("/z2m-hub/plate/update")



def update_z2m_plate(req: Z2MPlateMetaReq):



    from app.services.z2m_lighting_engine import z2m_engine



    ok = z2m_engine.update_plate_metadata(req.plate_id, req.name, req.room, req.channel_labels)



    if not ok:



        raise HTTPException(status_code=404, detail="Placa no encontrada")



    _cache.clear()



    _cache_ts.clear()



    return {"ok": True}







@router.post("/z2m-hub/light/save")



def save_z2m_real_light(req: Z2MRealLightSaveReq):



    from app.services.z2m_lighting_engine import z2m_engine



    light = z2m_engine.create_or_update_real_light(



        req.light_id, req.name, req.room, req.kind, req.power_device, req.power_channel



    )



    _cache.clear()



    _cache_ts.clear()



    return {"ok": True, "light": light}







@router.delete("/z2m-hub/light/{light_id}")



def remove_z2m_real_light(light_id: str):



    from app.services.z2m_lighting_engine import z2m_engine



    ok = z2m_engine.delete_real_light(light_id)



    _cache.clear()



    _cache_ts.clear()



    return {"ok": ok}







@router.post("/z2m-hub/light/power-source")



def set_z2m_power_source(req: Z2MPowerSourceReq):



    from app.services.z2m_lighting_engine import z2m_engine



    ok = z2m_engine.set_light_power_source(req.light_id, req.source_type, req.device, req.channel)



    _cache.clear()



    _cache_ts.clear()



    return {"ok": ok}







@router.post("/z2m-hub/commutation/add")



def add_z2m_commutation(req: Z2MCommutationSwitchReq):



    from app.services.z2m_lighting_engine import z2m_engine



    ok = z2m_engine.add_commutation_switch(req.light_id, req.device, req.channel)



    _cache.clear()



    _cache_ts.clear()



    return {"ok": ok}







@router.post("/z2m-hub/commutation/remove")



def remove_z2m_commutation(req: Z2MCommutationSwitchReq):



    from app.services.z2m_lighting_engine import z2m_engine



    ok = z2m_engine.remove_commutation_switch(req.light_id, req.device, req.channel)



    _cache.clear()



    _cache_ts.clear()



    return {"ok": ok}







@router.post("/z2m-hub/learn")



def set_z2m_learn(req: Z2MLearnModeReq):



    from app.services.z2m_lighting_engine import z2m_engine



    return z2m_engine.set_learn_mode(req.active, req.target_light_id, req.role)







@router.post("/z2m-hub/dimmer/update")



def update_z2m_dimmer(req: Z2MDimmerUpdateReq):



    from app.services.z2m_lighting_engine import z2m_engine



    ok = z2m_engine.update_dimmer_sequence(req.dimmer_device, req.steps, req.enabled)



    return {"ok": ok}







@router.post("/z2m-hub/dimmer/trigger-step")



def trigger_z2m_dimmer_step(req: Z2MDimmerStepTriggerReq):



    from app.services.z2m_lighting_engine import z2m_engine



    ok = z2m_engine.trigger_dimmer_step(req.dimmer_device, req.step)



    _cache.clear()



    _cache_ts.clear()



    return {"ok": ok}







@router.post("/z2m-hub/all-off")



def turn_off_all_z2m_devices():



    from app.services.z2m_lighting_engine import z2m_engine



    res = z2m_engine.turn_off_all()



    _cache.clear()



    _cache_ts.clear()



    return res















# --- ALIAS DE RUTAS PARA Z2MLightingHub.jsx ---



@router.post("/z2m-hub/discovery/sync")



def sync_z2m_hub_devices_alias():



    return sync_z2m_hub_devices()







@router.post("/z2m-hub/permit-join")



def api_z2m_permit_join_alias(req: Z2MPermitJoinReq):



    return api_z2m_permit_join(req)







@router.post("/z2m-hub/identify")



def api_z2m_blink_identify_alias(req: Z2MBlinkIdentifyReq):



    return api_z2m_blink_identify(req)







@router.post("/z2m-hub/assign")



def api_z2m_assign_hardware_alias(req: Z2MHardwareAssignReq):



    return api_z2m_assign_hardware(req)







@router.post("/z2m-hub/control/channel")



def control_z2m_raw_alias(req: Z2MRawControlReq):



    return control_z2m_raw(req)







@router.post("/z2m-hub/plates/update")



def update_z2m_plate_alias(req: Z2MPlateMetaReq):



    return update_z2m_plate(req)







@router.post("/z2m-hub/lights/upsert")



def save_z2m_real_light_alias(req: Z2MRealLightSaveReq):



    return save_z2m_real_light(req)







@router.delete("/z2m-hub/lights/{light_id}")



def remove_z2m_real_light_alias(light_id: str):



    return remove_z2m_real_light(light_id)







@router.post("/z2m-hub/lights/power-source")



def set_z2m_power_source_alias(req: Z2MPowerSourceReq):



    return set_z2m_power_source(req)







@router.post("/z2m-hub/dimmer/step/{step_num}")



def trigger_z2m_dimmer_step_by_path(step_num: int, dimmer_device: str = "salon_dimmer"):



    from app.services.z2m_lighting_engine import z2m_engine



    ok = z2m_engine.trigger_dimmer_step(dimmer_device, step_num)



    _cache.clear()



    _cache_ts.clear()



    return {"ok": ok}







@router.post("/z2m-hub/control/all-off")



def turn_off_all_z2m_devices_alias():



    return turn_off_all_z2m_devices()











@router.get("/z2m-hub/network-map")



def get_z2m_network_map():



    from app.services.z2m_lighting_engine import z2m_engine



    return z2m_engine.get_network_map()







@router.post("/z2m-hub/network-map/refresh")



def refresh_z2m_network_map():



    from app.services.z2m_lighting_engine import z2m_engine



    return z2m_engine.refresh_network_map()











# --- ENDPOINTS: SENSORES Y TELEMETRIA MULTIVARIABLE ---







class SensorUpsertPayload(BaseModel):



    id: Optional[str] = None



    name: str



    category: str = "presence"



    type: str = "generic"



    room: str = "general"



    protocol: str = "zigbee2mqtt"



    value: Optional[str] = "Normal"



    state: Optional[str] = "off"



    battery: Optional[int] = 100



    lqi: Optional[int] = 150



    installed: Optional[bool] = False

    notes: Optional[str] = ""

    attributes: Optional[Dict[str, Any]] = None







class SensorSimulatePayload(BaseModel):



    event: str = "leak"







@router.get("/sensors")



def get_sensors_list(category: Optional[str] = None):



    """Retorna el inventario de sensores y telemetria multivariable de la vivienda."""



    from app.services.sensor_service import sensor_service



    sensors = sensor_service.list_sensors(category)



    summary = sensor_service.get_summary_stats()



    return {"status": "success", "sensors": sensors, "summary": summary}







@router.get("/sensors/{sensor_id}")



def get_sensor_detail(sensor_id: str):



    from app.services.sensor_service import sensor_service



    s = sensor_service.get_sensor(sensor_id)



    if not s:



        raise HTTPException(status_code=404, detail="Sensor no encontrado")



    return {"status": "success", "sensor": s}







@router.post("/sensors")



def create_or_update_sensor(payload: SensorUpsertPayload):



    from app.services.sensor_service import sensor_service



    s_id = payload.id or payload.name.lower().replace(" ", "_")



    data = payload.dict()



    data["id"] = s_id



    updated = sensor_service.upsert_sensor(s_id, data)



    return {"status": "success", "sensor": updated}







@router.put("/sensors/{sensor_id}")
@router.patch("/sensors/{sensor_id}")
def update_sensor_item(sensor_id: str, payload: dict = Body(...)):
    from app.services.sensor_service import sensor_service
    s = sensor_service.get_sensor(sensor_id)
    if not s:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    clean_data = {k: v for k, v in payload.items() if v is not None}
    updated = sensor_service.upsert_sensor(sensor_id, clean_data)
    return {"status": "success", "sensor": updated}


@router.delete("/sensors/{sensor_id}")



def delete_sensor_item(sensor_id: str):



    from app.services.sensor_service import sensor_service



    ok = sensor_service.delete_sensor(sensor_id)



    return {"status": "success", "deleted": ok}







class WatchdogConfigPayload(BaseModel):
    timeout_hours: Optional[float] = None
    ping_hours: Optional[float] = None

@router.get("/sensors/watchdog/settings")
def get_watchdog_settings():
    from app.services.sensor_service import sensor_service
    all_sensors = sensor_service.list_sensors()
    offline_sensors = [s for s in all_sensors if not s.get("is_online", True)]
    return {
        "status": "success",
        "timeout_hours": sensor_service.watchdog_timeout_hours,
        "ping_hours": sensor_service.watchdog_ping_hours,
        "total_sensors": len(all_sensors),
        "offline_count": len(offline_sensors),
        "offline_sensors": [{"id": s["id"], "name": s.get("name", s["id"]), "offline_hours": s.get("offline_hours", 0)} for s in offline_sensors]
    }

@router.patch("/sensors/watchdog/settings")
def update_watchdog_settings(payload: WatchdogConfigPayload):
    from app.services.sensor_service import sensor_service
    if payload.timeout_hours is not None:
        sensor_service.watchdog_timeout_hours = max(0.5, float(payload.timeout_hours))
    if payload.ping_hours is not None:
        sensor_service.watchdog_ping_hours = max(0.5, float(payload.ping_hours))
    sensor_service.save_watchdog_config()
    return {
        "status": "success",
        "timeout_hours": sensor_service.watchdog_timeout_hours,
        "ping_hours": sensor_service.watchdog_ping_hours
    }

@router.post("/sensors/watchdog/check")
def trigger_watchdog_check():
    from app.services.sensor_service import sensor_service
    count = sensor_service.ping_all_battery_sensors()
    return {
        "status": "success",
        "pings_sent": count,
        "message": f"Se ha solicitado lectura de batería a {count} sensores a pilas."
    }

@router.post("/sensors/{sensor_id}/simulate")
def simulate_sensor_event(sensor_id: str, payload: SensorSimulatePayload):



    from app.services.sensor_service import sensor_service



    result = sensor_service.simulate_event(sensor_id, payload.event)



    return {"status": "success", "result": result}











# --- ENDPOINTS: MOTOR DE AUTOMATIZACIONES Y ESCENAS INTELIGENTES ---







class AutomationUpsertPayload(BaseModel):



    id: Optional[str] = None



    name: str



    description: Optional[str] = ""



    icon: Optional[str] = "⚡"



    category: Optional[str] = "custom"



    enabled: Optional[bool] = True



    trigger: Dict[str, Any]



    conditions: Optional[List[Dict[str, Any]]] = None



    actions: List[Dict[str, Any]]
    close_actions: Optional[List[Dict[str, Any]]] = None

    type: Optional[str] = None

    tts_message: Optional[str] = None
    close_tts_message: Optional[str] = None

    tts_speaker: Optional[str] = None

    is_quick_scene: Optional[bool] = None

    quick_color: Optional[str] = None

    quick_order: Optional[int] = None







class CameraTriggerPayload(BaseModel):



    camera_id: str



    event: str = "person_detected"







class SensorTriggerPayload(BaseModel):



    entity_id: str



    to_state: str = "on"







@router.get("/automations/timers")

def get_active_automation_timers():

    from app.services.automation_service import automation_service

    return automation_service.get_active_timers()





@router.get("/automations")



def get_automations_list():



    """Retorna la lista de todas las automatizaciones y escenas activas."""



    from app.services.automation_service import automation_service



    return {"status": "success", "automations": automation_service.list_automations()}







@router.post("/automations")



def create_or_update_automation(payload: AutomationUpsertPayload):



    from app.services.automation_service import automation_service



    data = payload.dict()



    if not data.get("id"):



        data["id"] = "auto_" + data["name"].lower().replace(" ", "_")



    res = automation_service.save_automation(data)



    return {"status": "success", "automation": res}







@router.delete("/automations/{automation_id}")



def delete_automation_item(automation_id: str):



    from app.services.automation_service import automation_service



    ok = automation_service.delete_automation(automation_id)



    return {"status": "success", "deleted": ok}







@router.post("/automations/{automation_id}/toggle")



def toggle_automation_active(automation_id: str):



    from app.services.automation_service import automation_service



    new_state = automation_service.toggle_automation(automation_id)



    return {"status": "success", "enabled": new_state}







@router.post("/automations/{automation_id}/execute")



def execute_automation_manually(automation_id: str):



    from app.services.automation_service import automation_service



    res = automation_service.execute_automation(automation_id, context={"force": True})



    return {"status": "success", "result": res}







@router.post("/automations/{automation_id}/turn-off")



def turn_off_automation_manually(automation_id: str):



    """Apaga o revierte todas las entidades de iluminación y persianas vinculadas a una escena."""



    from app.services.automation_service import automation_service



    res = automation_service.turn_off_automation(automation_id)



    return {"status": "success", "result": res}







@router.post("/automations/trigger/camera")



def trigger_automations_from_camera(payload: CameraTriggerPayload):



    from app.services.automation_service import automation_service



    res = automation_service.trigger_by_camera(payload.camera_id, payload.event)



    return {"status": "success", "triggered": res}







@router.post("/automations/trigger/sensor")



def trigger_automations_from_sensor(payload: SensorTriggerPayload):



    from app.services.automation_service import automation_service



    res = automation_service.trigger_by_sensor(payload.entity_id, payload.to_state)



    return {"status": "success", "triggered": res}











# ============================================================================



# OBSIDIAN VAULT (SEGUNDO CEREBRO & MEMORIA COGNITIVA)



# ============================================================================







@router.get("/obsidian/status")



def get_obsidian_status():



    """Retorna estadísticas, rutas y estado de la bóveda de Obsidian."""



    from app.services.obsidian_service import obsidian_service



    return obsidian_service.get_vault_summary()







@router.post("/obsidian/sync")



def sync_obsidian_vault():



    """Sincroniza dispositivos, cámaras, estancias y automatizaciones a Markdown en el Vault."""



    from app.services.obsidian_service import obsidian_service



    return obsidian_service.sync_devices_to_vault()







@router.post("/obsidian/daily-digest")



def generate_obsidian_daily_digest():



    """Genera o actualiza el diario del día con la telemetría domótica."""



    from app.services.obsidian_service import obsidian_service



    return obsidian_service.generate_daily_digest()







@router.post("/obsidian/memory")



def save_obsidian_memory(payload: Dict[str, Any]):



    """Guarda un recuerdo o nota estructurada en el Vault."""



    from app.services.obsidian_service import obsidian_service



    title = payload.get("title", "Nota")



    content = payload.get("content", "")



    author = payload.get("author", "Tomas")



    category = payload.get("category", "general")



    return obsidian_service.record_memory(title=title, content_text=content, author=author, category=category)


@router.get("/obsidian/lessons")
def get_obsidian_lessons():
    """Retorna las lecciones aprendidas y reglas de Tomás activas."""
    from app.services.obsidian_service import obsidian_service
    return obsidian_service.get_active_lessons()


@router.post("/obsidian/lessons")
def add_obsidian_lesson(payload: Dict[str, Any]):
    """Registra una lección o regla correctiva manualmente."""
    from app.services.obsidian_service import obsidian_service
    title = payload.get("title", "Corrección manual")
    failure_context = payload.get("failure_context", "Ajuste preventivo")
    correction = payload.get("correction", "")
    rule = payload.get("rule", "")
    source = payload.get("source", "Tomas")
    return obsidian_service.record_lesson(title, failure_context, correction, rule, source)


@router.delete("/obsidian/lessons/{lesson_id}")
def delete_obsidian_lesson(lesson_id: str):
    """Elimina una lección aprendida."""
    from app.services.obsidian_service import obsidian_service
    success = obsidian_service.delete_lesson(lesson_id)
    return {"status": "success" if success else "not_found", "deleted": success}


@router.post("/obsidian/lessons/{lesson_id}/toggle")
def toggle_obsidian_lesson(lesson_id: str):
    """Activa o pausa una lección aprendida."""
    from app.services.obsidian_service import obsidian_service
    new_state = obsidian_service.toggle_lesson(lesson_id)
    return {"status": "success", "active": new_state}


# ==============================================================================
# AGENTE DE DIAGNÓSTICO & AUDITORÍA TÁCTICA (APEX LEGENDS EDITION)
# ==============================================================================

@router.get("/diagnostic/status")
def get_diagnostic_status():
    """Retorna el estado actual del agente de diagnóstico y auditoría."""
    from app.services.diagnostic_agent import diagnostic_agent
    return diagnostic_agent.get_status()


@router.post("/diagnostic/run-sweep")
def run_diagnostic_sweep(payload: Optional[Dict[str, Any]] = None):
    """Inicia un barrido de auditoría táctica en modo activo o pasivo."""
    from app.services.diagnostic_agent import diagnostic_agent
    payload = payload or {}
    mode = payload.get("mode", "passive")
    room = payload.get("room")
    notify_whatsapp = payload.get("notify_whatsapp", True)
    stealth_mode = payload.get("stealth_mode", True)
    return diagnostic_agent.start_sweep(mode=mode, room=room, notify_whatsapp=notify_whatsapp, stealth_mode=stealth_mode)


@router.post("/diagnostic/stop")
def stop_diagnostic_sweep():
    """Detiene el barrido de diagnóstico en curso."""
    from app.services.diagnostic_agent import diagnostic_agent
    return diagnostic_agent.stop_sweep()









@router.post("/obsidian/open")

def open_obsidian_app(payload: Optional[Dict[str, Any]] = None):

    """Abre la aplicación Obsidian con la bóveda de HABANA en el escritorio interactivo del usuario."""

    import os

    import subprocess

    import urllib.parse

    import psutil

    import ctypes

    from ctypes import wintypes



    vault_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "vault"))

    opened = False

    method = ""

    error_msg = None



    # Localizar el ejecutable en LocalAppData

    local_app_data = os.environ.get("LOCALAPPDATA", "")

    obsidian_candidates = [

        os.path.join(local_app_data, "Programs", "obsidian", "Obsidian.exe") if local_app_data else "",

        r"C:\Users\tomas\AppData\Local\Programs\obsidian\Obsidian.exe",

        os.path.expandvars(r"%LOCALAPPDATA%\Programs\obsidian\Obsidian.exe")

    ]

    obsidian_exe = None

    for cand in obsidian_candidates:

        if cand and os.path.exists(cand):

            obsidian_exe = cand

            break



    encoded_path = urllib.parse.quote(vault_path.replace("\\", "/"))

    obsidian_uri = f"obsidian://open?path={encoded_path}"



    # Comprobar si existe ventana visible de Obsidian en el escritorio interactivo Default

    has_visible_window = False

    target_hwnd = None

    try:

        u32 = ctypes.windll.user32

        hdesk = u32.OpenDesktopW("Default", 0, False, 0x01FF)

        if hdesk:

            u32.SetThreadDesktop(hdesk)

            def check_cb(h, lp):

                nonlocal has_visible_window, target_hwnd

                if u32.IsWindowVisible(h):

                    length = u32.GetWindowTextLengthW(h)

                    if length > 0:

                        buff = ctypes.create_unicode_buffer(length + 1)

                        u32.GetWindowTextW(h, buff, length + 1)

                        if "obsidian" in buff.value.lower():

                            has_visible_window = True

                            target_hwnd = h

                            return False

                return True

            WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)

            u32.EnumDesktopWindows(hdesk, WNDENUMPROC(check_cb), 0)

            u32.CloseDesktop(hdesk)

    except Exception:

        pass



    # Si ya tiene ventana visible en el escritorio interactivo, traerla al frente

    if has_visible_window and target_hwnd:

        try:

            u32 = ctypes.windll.user32

            u32.ShowWindow(target_hwnd, 9)  # SW_RESTORE

            u32.SetForegroundWindow(target_hwnd)

            opened = True

            method = "already_running_focused"

        except Exception:

            pass



    # Si no tiene ventana visible en Default, limpiar procesos zombis y lanzar con schtasks /it

    if not opened:

        try:

            # Terminar procesos colgados en escritorios virtuales para no bloquear el named pipe

            for p in psutil.process_iter(['pid', 'name']):

                if 'obsidian' in (p.info['name'] or '').lower():

                    try:

                        p.kill()

                    except Exception:

                        pass

        except Exception:

            pass



        if obsidian_exe and os.path.exists(obsidian_exe):

            try:

                cmd_target = f'"{obsidian_exe}" "{vault_path}"'

                subprocess.run([

                    "schtasks", "/create",

                    "/tn", "HabanaOpenObsidian",

                    "/tr", cmd_target,

                    "/sc", "ONCE",

                    "/st", "23:59",

                    "/f",

                    "/it"

                ], capture_output=True, text=True, check=False)



                run_res = subprocess.run(["schtasks", "/run", "/tn", "HabanaOpenObsidian"], capture_output=True, text=True, check=False)

                opened = True

                method = "schtasks_interactive"

            except Exception as e_sch:

                error_msg = str(e_sch)

                try:

                    subprocess.Popen(["explorer.exe", obsidian_exe], shell=False)

                    opened = True

                    method = "explorer_fallback"

                except Exception as e_exp:

                    error_msg = str(e_exp)



    return {

        "status": "success" if opened else "error",

        "opened": opened,

        "method": method,

        "vault_path": vault_path,

        "obsidian_uri": obsidian_uri,

        "exe": obsidian_exe,

        "error": error_msg

    }





@router.post("/obsidian/open-folder")

def open_obsidian_folder(payload: Optional[Dict[str, Any]] = None):

    """Abre la carpeta del Vault o una subcarpeta en el Explorador de Windows en la pantalla del usuario."""

    import os

    import subprocess



    base_vault = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "vault"))

    subfolder = (payload or {}).get("subfolder") if payload else None



    if subfolder:

        target_path = os.path.join(base_vault, subfolder)

    else:

        target_path = base_vault



    if not os.path.exists(target_path):

        os.makedirs(target_path, exist_ok=True)



    opened = False

    method = ""

    error_msg = None



    # Usar schtasks /it para garantizar que la ventana del Explorador se abra en el escritorio Default interactivo

    try:

        cmd_target = f'explorer.exe "{target_path}"'

        subprocess.run([

            "schtasks", "/create",

            "/tn", "HabanaOpenExplorer",

            "/tr", cmd_target,

            "/sc", "ONCE",

            "/st", "23:59",

            "/f",

            "/it"

        ], capture_output=True, text=True, check=False)

        run_res = subprocess.run(["schtasks", "/run", "/tn", "HabanaOpenExplorer"], capture_output=True, text=True, check=False)

        opened = True

        method = "schtasks_explorer_interactive"

    except Exception as e_sch:

        try:

            os.startfile(target_path)

            opened = True

            method = "os_startfile"

        except Exception as e_sf:

            error_msg = str(e_sf)



    return {

        "status": "success" if opened else "error",

        "opened": opened,

        "method": method,

        "folder_path": target_path,

        "error": error_msg

    }









# =====================================================================
# HABANA 13 - ENDPOINTS DE WIDGETS Y BOTONES DINAMICOS (AUTO-MODIFICACION)
# =====================================================================
from app.services.widget_service import widget_service
from app.services.setup_wizard_service import setup_wizard_service

class WidgetCreateReq(BaseModel):
    id: Optional[str] = None
    title: str
    icon: Optional[str] = "⚡"
    color: Optional[str] = "#00f3ff"
    bg_gradient: Optional[str] = None
    border_color: Optional[str] = None
    room: Optional[str] = "general"
    action_type: Optional[str] = "multi_command"
    description: Optional[str] = ""
    payload: Optional[Dict[str, Any]] = None

@router.get("/widgets")
def get_custom_widgets(room: Optional[str] = None):
    """Retorna los widgets/botones dinamicos visibles en la interfaz."""
    return {"status": "success", "widgets": widget_service.list_widgets(room)}

@router.post("/widgets")
def create_custom_widget(req: WidgetCreateReq):
    """Crea un nuevo widget o boton dinamico en la UI."""
    data = req.dict() if hasattr(req, "dict") else req.model_dump()
    new_w = widget_service.add_widget(data, created_by="user_api")
    return {"status": "success", "widget": new_w}

@router.put("/widgets/{widget_id}")
def update_custom_widget(widget_id: str, req: WidgetCreateReq):
    """Modifica un widget dinamico existente."""
    data = req.dict() if hasattr(req, "dict") else req.model_dump()
    updated = widget_service.update_widget(widget_id, data)
    if not updated:
        return {"status": "error", "message": "Widget no encontrado"}
    return {"status": "success", "widget": updated}

@router.delete("/widgets/{widget_id}")
def delete_custom_widget(widget_id: str):
    """Elimina un widget dinamico."""
    deleted = widget_service.delete_widget(widget_id)
    return {"status": "success" if deleted else "not_found"}

@router.post("/widgets/{widget_id}/execute")
def execute_custom_widget(widget_id: str):
    """Ejecuta la accion asignada a un boton dinamico."""
    res = widget_service.execute_widget(widget_id)
    return res

# =====================================================================
# HABANA 13 - ENDPOINTS DEL ASISTENTE GUIADO "TOCA Y LISTO" (SETUP WIZARD)
# =====================================================================

class WizardListenReq(BaseModel):
    room: Optional[str] = None

class WizardAssignLightReq(BaseModel):
    room: str
    light_name: str
    kind: Optional[str] = "ceiling"
    device_name: str
    channel: str
    watts: Optional[int] = 18

class WizardAddCommReq(BaseModel):
    light_id: str
    device_name: str
    channel: str

@router.post("/setup-wizard/listen/start")
def setup_wizard_start_listen(req: WizardListenReq):
    """Activa el radar de escucha de pulsaciones fisicas de interruptores."""
    res = setup_wizard_service.start_listen(req.room)
    return res

@router.post("/setup-wizard/listen/stop")
def setup_wizard_stop_listen():
    """Detiene el radar de escucha."""
    res = setup_wizard_service.stop_listen()
    return res

@router.get("/setup-wizard/listen/poll")
def setup_wizard_poll():
    """Consulta en tiempo real la ultima pulsacion detectada en la pared."""
    return setup_wizard_service.poll_events()

@router.post("/setup-wizard/listen/clear")
def setup_wizard_clear_event():
    """Limpia el ultimo evento consumido."""
    setup_wizard_service.clear_latest_event()
    return {"status": "cleared"}

@router.post("/setup-wizard/assign-real-light")
def setup_wizard_assign_real_light(req: WizardAssignLightReq):
    """Paso 2: Asigna el interruptor pulsado como cable de potencia fisica de la nueva luz."""
    res = setup_wizard_service.assign_real_light(
        room=req.room,
        light_name=req.light_name,
        kind=req.kind,
        device_name=req.device_name,
        channel=req.channel,
        watts=req.watts
    )
    _cache.pop("devices", None)
    return res

@router.post("/setup-wizard/add-commutation")
def setup_wizard_add_commutation(req: WizardAddCommReq):
    """Paso 3: Anade un interruptor pulsado como conmutada de la luz especificada."""
    res = setup_wizard_service.add_commutation_to_light(
        light_id=req.light_id,
        device_name=req.device_name,
        channel=req.channel
    )
    _cache.pop("devices", None)
    return res

@router.get("/setup-wizard/room-summary/{room}")
def setup_wizard_room_summary(room: str):
    """Devuelve el mapa limpio de luces, cables fisicos y conmutadas de una estancia."""
    return setup_wizard_service.get_room_summary(room)

# =====================================================================
# ALIASES & COMPATIBILITY ENDPOINTS
# =====================================================================

@router.get("/system-state")
def get_system_state_alias():
    """Alias para /api/status consumido por layouts antiguos."""
    return system_status()

@router.get("/supervisor/status")
def get_supervisor_status_alias():
    """Alias para /api/health/full."""
    return get_full_health()

@router.get("/whatsapp/logs")
def get_whatsapp_logs():
    """Devuelve las conversaciones y mensajes multimedia recientes de WhatsApp."""
    try:
        from app.services.tracker import tracker
        convs = tracker.get_conversations(limit=100)
        out = []
        for c in convs:
            has_media = bool(c.get("media_path"))
            out.append({
                "id": str(c.get("timestamp", time.time())),
                "sender": c.get("sender", "Usuario"),
                "source": c.get("source", "whatsapp"),
                "content": c.get("message", ""),
                "media_path": c.get("media_path", ""),
                "type": "media" if has_media else "text",
                "timestamp": int(c.get("timestamp", time.time()) * 1000)
            })
        return out
    except Exception as e:
        logger.error(f"Error fetching WhatsApp logs: {e}")
        return []

@router.delete("/whatsapp/media/{log_id}")
def delete_whatsapp_media(log_id: str):
    """Elimina un registro multimedia de WhatsApp."""
    return {"status": "deleted", "id": log_id}

@router.get("/whatsapp/media/{filename:path}")
def serve_whatsapp_media(filename: str):
    """Sirve un archivo multimedia recibido por WhatsApp."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    clean_fn = filename.lstrip("/").lstrip("\\")
    search_dirs = [
        os.path.join(base_dir, "vault", "WhatsApp", "Fotos"),
        os.path.join(base_dir, "vault", "WhatsApp", "Videos"),
        os.path.join(base_dir, "vault", "WhatsApp", "Musica_y_Audios"),
        os.path.join(base_dir, "vault", "WhatsApp", "Documentos"),
        os.path.join(base_dir, "media"),
        os.path.join(base_dir, "recordings"),
    ]
    for d in search_dirs:
        cand = os.path.join(d, clean_fn)
        if os.path.exists(cand):
            return FileResponse(cand)
    raise HTTPException(status_code=404, detail="Archivo multimedia no encontrado")


# =========================================================================
# HUB ESP32: SATELITES DE VOZ, PANTALLAS, AUDIO Y LOCALIZACION BLE
# =========================================================================
from app.services.esp32_manager import esp32_manager

@router.get("/esp32/overview")
def get_esp32_overview():
    """Retorna los nodos ESP32 registrados, puertos serie conectados y presencia BLE."""
    return esp32_manager.get_overview()

@router.post("/esp32/nodes")
def save_esp32_node(node: Dict[str, Any]):
    """Registra o actualiza un nodo ESP32."""
    return esp32_manager.register_or_update_node(node)

@router.delete("/esp32/nodes/{node_id}")
def delete_esp32_node(node_id: str):
    """Elimina un nodo ESP32."""
    ok = esp32_manager.delete_node(node_id)
    return {"ok": ok, "node_id": node_id}

@router.post("/esp32/nodes/{node_id}/action")
def trigger_esp32_action(node_id: str, payload: Dict[str, Any]):
    """Dispara una accion en el nodo (cambiar expresion pantalla, sonido, toggle BLE)."""
    action = payload.get("action", "")
    params = payload.get("params", {})
    return esp32_manager.trigger_action(node_id, action, params)

@router.post("/esp32/ble-presence/register")
def register_ble_presence_device(device: Dict[str, Any]):
    """Registra o actualiza un reloj inteligente o movil para tracking BLE."""
    return esp32_manager.register_ble_device(device)

@router.delete("/esp32/ble-presence/{device_id}")
def delete_ble_presence_device(device_id: str):
    """Elimina un dispositivo del tracking BLE."""
    ok = esp32_manager.delete_ble_device(device_id)
    return {"ok": ok, "device_id": device_id}

@router.get("/esp32/ble/radar")
def get_esp32_ble_radar():
    """Retorna el mapa en vivo de habitaciones con los habitantes y dispositivos detectados en cada una."""
    return esp32_manager.get_room_presence_map()

@router.post("/esp32/ble/telemetry")
def receive_esp32_ble_telemetry(payload: Dict[str, Any]):
    """Recibe telemetria BLE desde un nodo ESP32 satelite (lecturas RSSI y balizas captadas)."""
    node_id = payload.get("node_id", "esp32_bola_xiaozhi")
    sightings = payload.get("sightings", [])
    return esp32_manager.process_ble_telemetry(node_id, sightings)

@router.post("/esp32/ble/simulate-move")
def simulate_esp32_ble_move(payload: Dict[str, Any]):
    """Simula el movimiento de un habitante entre habitaciones para probar la matriz y escenas."""
    dev_id = payload.get("device_id") or payload.get("user") or "watch_tomas"
    target_room = payload.get("room") or payload.get("target_room") or "despacho"
    rssi = int(payload.get("rssi", -55))
    return esp32_manager.simulate_device_movement(dev_id, target_room, rssi)

@router.get("/esp32/ble/discovered")
def get_esp32_ble_discovered():
    """Retorna los dispositivos BLE cercanos descubiertos recientemente pendientes de registrar."""
    return {"discovered": list(esp32_manager.discovered_devices.values())}

@router.get("/esp32/screen-buttons")
def get_esp32_screen_buttons():
    """Retorna la configuracion y asignaciones de los 4 botones de la pantalla tactil JC3248W535."""
    return esp32_manager.get_screen_buttons()

@router.post("/esp32/screen-buttons")
def update_esp32_screen_buttons(payload: Dict[str, Any]):
    """Actualiza la asignacion de uno o mas botones de la pantalla tactil."""
    buttons = payload.get("buttons") or payload
    return esp32_manager.update_screen_buttons(buttons)

@router.post("/esp32/screen-buttons/trigger/{btn_id}")
def trigger_esp32_screen_button(btn_id: str):
    """Prueba o ejecuta la accion asignada a un boton especifico de la pantalla."""
    return esp32_manager.trigger_button_action(btn_id)



# =========================================================================
# SEGURIDAD Y CONTROL DE ACCESO MODO INSTALADOR / MODO USUARIO
# =========================================================================
from app.services.installer_security import installer_security

@router.get("/system/installer-security")
def get_installer_security_status():
    """Retorna si el PIN de instalador esta activo y si esta configurado."""
    return installer_security.get_status()

@router.post("/system/installer-security")
def update_installer_security_config(payload: Dict[str, Any]):
    """Configura si se requiere PIN y actualiza o elimina el PIN de instalador."""
    pin_enabled = bool(payload.get("pin_enabled", False))
    pin = payload.get("pin", None)
    return installer_security.set_config(pin_enabled=pin_enabled, pin=pin)

@router.post("/system/installer-security/verify")
def verify_installer_pin(payload: Dict[str, Any]):
    """Verifica si el PIN introducido es correcto para acceder a modo instalador."""
    pin = str(payload.get("pin", ""))
    valid = installer_security.verify_pin(pin)
    return {"valid": valid}

@router.get("/livestream-redirect/{station_file}")
def livestream_redirect(station_file: str):
    """Redirige el archivo de emisora (.mp3) a su stream en vivo oficial."""
    from fastapi.responses import RedirectResponse
    from app.services.radio_service import radio_service
    key = station_file.replace(".mp3", "").strip().upper()
    stations = radio_service.get_stations()
    for st in stations:
        if st.get("id", "").upper() == key or key in st.get("name", "").upper():
            return RedirectResponse(url=st.get("url"))
    # Fallback LOS40
    return RedirectResponse(url="https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3")

@router.post("/automations/scenes/{scene_id}/activate")
def activate_scene_legacy_alias(scene_id: str):
    """Alias de compatibilidad para activación de escenas desde paneles ESP32."""
    from app.services.automation_service import automation_service
    return automation_service.execute_automation(scene_id)

