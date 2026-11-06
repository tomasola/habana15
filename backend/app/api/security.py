from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Body, UploadFile, File
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import asyncio
import logging
import base64
import os

from app.services.security_service import security_service
from app.services.alarm_service import alarm_service

logger = logging.getLogger("SecurityAPI")
router = APIRouter(prefix="/security", tags=["security"])

active_connections: List[WebSocket] = []

async def broadcast_alarm_state(data: dict):
    dead_connections = []
    for connection in list(active_connections):
        try:
            await connection.send_json(data)
        except Exception as e:
            logger.error(f"Error enviando evento SSE/WS de seguridad: {e}")
            dead_connections.append(connection)
    for dead in dead_connections:
        if dead in active_connections:
            active_connections.remove(dead)

# Conectar el callback del servicio de alarmas
alarm_service.set_callback(broadcast_alarm_state)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Enviar estado actual al conectar
        await websocket.send_json({
            "type": "alarm_state", 
            "phase": alarm_service.current_phase,
            "enabled": alarm_service.is_enabled
        })
        while True:
            data = await websocket.receive_text()
            # Si el cliente manda comandos WS
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)

# -- Rutas de Usuarios Autorizados (Fase 1) --
@router.get("/users")
def get_users():
    return {"users": security_service.get_users()}

@router.post("/users")
def add_user(
    name: str = Body(...),
    pin: str = Body(...),
    image_path: Optional[str] = Body(None),
    image_base64: Optional[str] = Body(None)
):
    saved_path = image_path
    if image_base64 and not saved_path:
        try:
            b64_data = image_base64.split(",")[1] if "," in image_base64 else image_base64
            img_bytes = base64.b64decode(b64_data)
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            faces_dir = os.path.join(base_dir, "media", "faces")
            os.makedirs(faces_dir, exist_ok=True)
            safe_name = "".join(c if c.isalnum() else "_" for c in name.lower())
            saved_path = os.path.join(faces_dir, f"{safe_name}.jpg")
            with open(saved_path, "wb") as f:
                f.write(img_bytes)
        except Exception as e:
            logger.error(f"Error guardando imagen base64 de usuario: {e}")

    success = security_service.add_authorized_user(name, pin, saved_path)
    if success:
        return {"status": "ok"}
    raise HTTPException(status_code=400, detail="Error al crear usuario")

@router.delete("/users/{user_id}")
def delete_user(user_id: int):
    success = security_service.delete_user(user_id)
    if success:
        return {"status": "ok"}
    raise HTTPException(status_code=400, detail="Error al borrar usuario")


# -- Rutas de Control de Alarma --
@router.get("/status")
@router.get("/alarm/status")
def get_alarm_status():
    return {
        "status": "ok",
        "enabled": alarm_service.is_enabled,
        "phase": alarm_service.current_phase,
        "lights": alarm_service.alarm_lights
    }

@router.post("/alarm/toggle")
def toggle_alarm(payload: Any = Body(None)):
    if isinstance(payload, bool):
        enabled = payload
    elif isinstance(payload, dict) and "enabled" in payload:
        enabled = bool(payload["enabled"])
    else:
        enabled = not alarm_service.is_enabled

    if enabled:
        alarm_service.enable()
    else:
        alarm_service.disable()
    return {"status": "ok", "enabled": alarm_service.is_enabled, "phase": alarm_service.current_phase}

@router.post("/alarm/lights")
def set_alarm_lights(payload: Any = Body(...)):
    entity_ids = payload.get("entity_ids", payload.get("lights", [])) if isinstance(payload, dict) else (payload if isinstance(payload, list) else [])
    alarm_service.set_lights(entity_ids)
    return {"status": "ok", "lights": alarm_service.alarm_lights}

@router.post("/pin")
def handle_pin_action(payload: Dict[str, Any] = Body(...)):
    pin = str(payload.get("pin", ""))
    action = str(payload.get("action", "disarm"))
    if action == "disarm":
        if alarm_service.verify_pin(pin):
            return {"status": "success", "valid": True, "message": "Alarma desarmada", "phase": alarm_service.current_phase}
        else:
            return {"status": "error", "valid": False, "message": "PIN incorrecto"}
    elif action == "arm":
        if alarm_service.verify_pin(pin):
            alarm_service.trigger_phase3()
            return {"status": "success", "valid": True, "message": "Alarma armada manual", "phase": alarm_service.current_phase}
        else:
            return {"status": "error", "valid": False, "message": "PIN incorrecto"}
    return {"status": "error", "valid": False}

@router.post("/simulate_face")
@router.post("/alarm/simulate_face")
def simulate_face(payload: Any = Body(None)):
    """ Endpoint de prueba para simular que la cámara ha detectado un rostro """
    if isinstance(payload, dict):
        name = payload.get("name")
    elif isinstance(payload, str):
        name = payload
    else:
        name = None
    alarm_service.process_face(name)
    return {"status": "ok", "phase": alarm_service.current_phase, "recognized": name}

@router.get("/frame")
def get_security_frame():
    """Retorna el estado del último fotograma de seguridad o confirmación de servicio."""
    return {
        "status": "ok",
        "phase": alarm_service.current_phase,
        "enabled": alarm_service.is_enabled,
        "frame": getattr(alarm_service, "last_frame_b64", None)
    }

@router.post("/frame")
def process_security_frame(file: UploadFile = File(None)):
    """Recibe fotograma de BackgroundCamera o EntranceTablet, transmite a WS y evalúa rostros."""
    try:
        if file is None:
            return {"status": "empty", "user": None}
        frame_bytes = file.file.read()
        if not frame_bytes:
            return {"status": "empty", "user": None}
            
        b64_frame = base64.b64encode(frame_bytes).decode("utf-8")
        alarm_service.last_frame_b64 = b64_frame
        alarm_service._notify({"type": "frame", "data": b64_frame})
        
        recognized_name = None
        if security_service.known_face_encodings:
            try:
                import face_recognition
                import io
                img = face_recognition.load_image_file(io.BytesIO(frame_bytes))
                recognized_name = security_service.recognize_face(img)
            except Exception as e:
                logger.debug(f"Reconocimiento facial en frame omitido: {e}")
                
        if recognized_name:
            alarm_service.process_face(recognized_name)
            return {"status": "recognized", "user": recognized_name}
            
        return {"status": "processed", "user": None}
    except Exception as e:
        logger.error(f"Error procesando frame de seguridad: {e}")
        return {"status": "error", "message": str(e)}

# --- ENDPOINTS: INMUNIDAD A MASCOTAS (PET-SAFE AI) ---

class PetImmunityPayload(BaseModel):
    enabled: Optional[bool] = None
    ignore_pets_for_lights: Optional[bool] = None

@router.get("/pet-immunity")
def get_pet_immunity_status():
    """Retorna la configuración actual del filtro de mascotas y el registro de eventos recientes."""
    return {
        "status": "ok",
        "enabled": alarm_service.pet_immunity_enabled,
        "ignore_pets_for_lights": alarm_service.ignore_pets_for_lights,
        "recent_events": alarm_service.pet_events_log
    }

@router.post("/pet-immunity")
def update_pet_immunity(payload: PetImmunityPayload):
    """Actualiza la configuración de discriminación e inmunidad a mascotas."""
    if payload.enabled is not None:
        alarm_service.pet_immunity_enabled = payload.enabled
    if payload.ignore_pets_for_lights is not None:
        alarm_service.ignore_pets_for_lights = payload.ignore_pets_for_lights
    alarm_service.save_pet_config()
    return {
        "status": "ok",
        "enabled": alarm_service.pet_immunity_enabled,
        "ignore_pets_for_lights": alarm_service.ignore_pets_for_lights
    }

@router.post("/pet-immunity/test/{camera_id}")
def test_pet_immunity_camera(camera_id: str):
    """Prueba en vivo la clasificación de personas vs mascotas sobre el fotograma de la cámara."""
    from app.services.camera_service import camera_service
    classification = camera_service.classify_subject(camera_id)
    if classification.get("has_pet"):
        alarm_service.log_pet_event(camera_id, classification.get("details", "Mascota detectada"))
    return {
        "status": "ok",
        "camera_id": camera_id,
        "classification": classification
    }
