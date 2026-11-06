from fastapi import APIRouter, Query, Body
from typing import Dict, Any, Optional
from app.services.bayesian_presence_fusion import bayesian_presence
from app.services.circadian_lighting_engine import circadian_engine
from app.services.priority_event_bus import priority_bus

router = APIRouter(prefix="/api/fusion", tags=["Habana 14.2 Fusion"])

@router.get("/status")
def get_fusion_status():
    """Estado unificado del ecosistema Habana 14.2 Fusión."""
    return {
        "edition": "Habana 14.2 Fusión",
        "presence_summary": bayesian_presence.get_all_presence_states(),
        "circadian": circadian_engine.get_circadian_profile(),
        "bus_stats": priority_bus.stats
    }

@router.get("/presence")
def get_presence_states():
    """Devuelve las probabilidades bayesianas de presencia por estancia."""
    return bayesian_presence.get_all_presence_states()

@router.post("/presence/{room_id}/event")
def inject_presence_event(room_id: str, event_type: str = Query(...), value: bool = Query(...)):
    """Registra evidencia de PIR, puerta o dispositivo para recalcular la probabilidad."""
    if event_type == "pir":
        bayesian_presence.register_pir_event(room_id, value)
    elif event_type == "door":
        bayesian_presence.register_door_event(room_id, value)
    elif event_type == "device":
        bayesian_presence.register_device_activity(room_id, value)
    return {
        "status": "ok",
        "room_id": room_id,
        "new_probability": bayesian_presence.get_room_probability(room_id),
        "is_occupied": bayesian_presence.is_occupied(room_id)
    }

@router.get("/circadian")
def get_circadian_lighting():
    """Devuelve el perfil solar, Kelvin recomendado y fase circadiana."""
    return circadian_engine.get_circadian_profile()

@router.get("/bus/stats")
def get_bus_stats():
    """Telemetría de la cola de prioridades P0, P1 y P2."""
    return priority_bus.stats
