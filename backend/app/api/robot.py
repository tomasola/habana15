import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Body
from typing import Dict, Any

from app.services.robot_service import robot_service

router = APIRouter()
logger = logging.getLogger("RobotWS")

import audioop

@router.websocket("/robot")
async def websocket_robot(websocket: WebSocket):
    await websocket.accept()
    await robot_service.register(websocket)
    
    pcm_buffer = bytearray()
    pre_roll = bytearray()
    speech_active = False
    speech_start_time = 0.0
    last_voice_time = 0.0
    last_chunk_time = asyncio.get_event_loop().time()
    
    VOICE_THRESHOLD = 800
    SILENCE_DURATION = 0.75
    MAX_SPEECH_DURATION = 10.0

    async def check_silence_loop():
        nonlocal pcm_buffer, speech_active, last_voice_time, speech_start_time, last_chunk_time
        while True:
            await asyncio.sleep(0.12)
            now = asyncio.get_event_loop().time()
            
            # Caso A: Fin de frase detectado por energía en audio continuo
            if speech_active and len(pcm_buffer) > 12000:
                if (now - last_voice_time) > SILENCE_DURATION or (now - speech_start_time) > MAX_SPEECH_DURATION:
                    speech_active = False
                    to_process = bytes(pcm_buffer)
                    pcm_buffer.clear()
                    asyncio.create_task(robot_service.process_pcm_buffer(to_process))
            
            # Caso B: Corte de paquetes por fin de sesión física (botón soltado)
            elif len(pcm_buffer) > 16000 and (now - last_chunk_time) > 0.8:
                speech_active = False
                to_process = bytes(pcm_buffer)
                pcm_buffer.clear()
                asyncio.create_task(robot_service.process_pcm_buffer(to_process))

    silence_task = asyncio.create_task(check_silence_loop())

    try:
        while True:
            data = await websocket.receive()
            now = asyncio.get_event_loop().time()
            if "bytes" in data:
                chunk = data["bytes"]
                last_chunk_time = now
                
                rms = 0
                if len(chunk) >= 2:
                    try:
                        rms = audioop.rms(chunk, 2)
                    except Exception:
                        pass
                
                if rms > VOICE_THRESHOLD:
                    if not speech_active:
                        speech_active = True
                        speech_start_time = now
                        pcm_buffer = bytearray(pre_roll)
                        asyncio.create_task(robot_service.set_state("listen"))
                    last_voice_time = now
                    pcm_buffer.extend(chunk)
                elif speech_active:
                    pcm_buffer.extend(chunk)
                else:
                    pre_roll.extend(chunk)
                    if len(pre_roll) > 16000:
                        pre_roll = pre_roll[-16000:]
                        
            elif "text" in data:
                text_msg = data["text"]
                logger.info(f"Mensaje de texto del robot: {text_msg}")
    except (WebSocketDisconnect, RuntimeError):
        silence_task.cancel()
        robot_service.unregister(websocket)
    except Exception as e:
        silence_task.cancel()
        logger.error(f"Error en WebSocket del robot: {e}")
        robot_service.unregister(websocket)

# --- ENDPOINTS REST PARA CONTROL DE LA ESFERA ---

@router.get("/status")
def get_robot_status():
    """Retorna el estado de la esfera, clientes conectados, volumen, altavoz de salida y última interacción."""
    from app.services.google_cast import cast_service
    return {
        "connected_clients": len(robot_service.active_connections),
        "current_state": robot_service.current_state,
        "volume": robot_service.volume,
        "audio_output": robot_service.audio_output,
        "last_interaction": robot_service.last_interaction,
        "recent_logs": robot_service.recent_logs[-10:]
    }

@router.get("/output")
def get_robot_output():
    """Retorna el altavoz asignado actualmente y la lista de todos los altavoces de la casa."""
    from app.services.google_cast import cast_service
    from app.services.radio_service import radio_service
    speakers = cast_service.get_status()
    radio_st = radio_service.status()
    return {
        "audio_output": robot_service.audio_output,
        "radio_playing": radio_st.get("playing", False),
        "radio_station": radio_st.get("station_name"),
        "speakers": speakers
    }

@router.post("/output")
def set_robot_output(payload: Dict[str, Any] = Body(...)):
    """Selecciona por qué altavoz de la casa debe responder HABANA al hablarle por la esfera."""
    target = payload.get("target", "Salón")
    new_target = robot_service.set_audio_output(target)
    return {"ok": True, "audio_output": new_target}

@router.get("/volume")
def get_robot_volume():
    """Retorna el volumen actual de la esfera (0-100%)."""
    return {"volume": robot_service.volume}

@router.post("/volume")
def set_robot_volume(payload: Dict[str, Any] = Body(...)):
    """Regula el volumen de la esfera (0-100%) y persiste la configuración."""
    vol = payload.get("volume", 20)
    new_vol = robot_service.set_volume(int(vol))
    return {"ok": True, "volume": new_vol}

@router.post("/speak")
async def robot_speak(payload: Dict[str, Any] = Body(...)):
    """Hace hablar a HABANA (por el altavoz seleccionado o por la esfera si se especifica target='esfera')."""
    text = payload.get("text", "")
    persona = payload.get("persona", "friday")
    target = payload.get("target")
    if not text:
        return {"ok": False, "error": "Texto requerido"}
    if target:
        prev = robot_service.audio_output
        robot_service.audio_output = target
        success = await robot_service.dispatch_response(text, persona)
        robot_service.audio_output = prev
    else:
        success = await robot_service.dispatch_response(text, persona)
    return {"ok": success, "text": text}

@router.post("/listen")
async def robot_listen():
    """Activa el micrófono de la esfera (Reactor Azul)."""
    await robot_service.trigger_listen()
    return {"ok": True, "state": "listen"}

@router.post("/state")
async def robot_set_state(payload: Dict[str, Any] = Body(...)):
    """Cambia el estado visual del reactor de la esfera ('listen', 'think', 'start', 'stop')."""
    state = payload.get("state", "stop")
    await robot_service.set_state(state)
    return {"ok": True, "state": state}

@router.post("/continuous")
async def robot_set_continuous(payload: Dict[str, Any] = Body(...)):
    """Activa o desactiva el modo de escucha continua por palabra clave 'Cuba'."""
    enabled = bool(payload.get("enabled", True))
    return await robot_service.set_continuous_mode(enabled)

@router.post("/clean")
async def robot_clean():
    """Inicia ciclo de limpieza o acción de robot."""
    await robot_service.set_state("start")
    return {"ok": True, "action": "clean", "state": "start"}

