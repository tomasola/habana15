"""
apex_router.py - Endpoints REST unificados para Habana 14.9 Apex
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
from app.services.apex_master_kernel import apex_kernel
from app.services.energy_ai_optimizer import energy_optimizer
from app.services.markov_habit_engine import markov_engine
from app.services.circadian_lighting_engine import circadian_engine
from app.services.bayesian_presence_fusion import bayesian_presence
from app.services.zigbee_direct_binding import zigbee_p2p

router = APIRouter(prefix="/api/apex", tags=["Apex Master Kernel"])

class ActionPayload(BaseModel):
    room: str
    device: str
    action: str
    priority: Optional[int] = 0

class EnergyReportPayload(BaseModel):
    total_consumption_w: float
    solar_generation_w: float

@router.get("/status")
def get_apex_status():
    """Devuelve la telemetría consolidada de todos los subsistemas Apex."""
    return apex_kernel.get_full_apex_telemetry()

@router.post("/dispatch")
async def dispatch_action(payload: ActionPayload):
    """Ejecuta una acción a través del kernel con filtrado perimetral y QoS."""
    result = await apex_kernel.dispatch_user_action(
        source_room=payload.room,
        device_id=payload.device,
        action=payload.action,
        priority=payload.priority
    )
    return result

@router.post("/energy/balance")
def balance_energy(payload: EnergyReportPayload):
    """Calcula balance neto instantáneo y ejecuta peak-shaving preventivo."""
    return energy_optimizer.analyze_grid_balance(
        total_consumption_w=payload.total_consumption_w,
        solar_generation_w=payload.solar_generation_w
    )

@router.get("/markov/predict/{room}")
def predict_next_room(room: str, hour: Optional[int] = None):
    """Devuelve la estancia predicha estocásticamente."""
    from datetime import datetime
    h = hour if hour is not None else datetime.now().hour
    return markov_engine.predict_next_room(room, h)

@router.get("/circadian/profile")
def get_circadian_profile():
    """Devuelve los valores circadianos calculados por la posición solar."""
    return circadian_engine.get_circadian_profile()

@router.get("/zigbee/bindings")
def get_zigbee_bindings():
    """Lista todas las parejas físicas de conmutación [Pulsador -> Relé Potencia]."""
    return zigbee_p2p.get_bindings()

@router.post("/zigbee/apply_bindings")
def apply_zigbee_bindings():
    """Envía a Zigbee2MQTT los comandos de Direct Binding / Groups a nivel hardware."""
    return zigbee_p2p.apply_hardware_bindings()

@router.get("/zigbee/outage_resilience")
def get_outage_resilience():
    """Diagnóstico de supervivencia a cortes eléctricos y grado de autonomía P2P."""
    return zigbee_p2p.simulate_host_failure_test()

@router.get("/shadow-audit")
def run_shadow_audit_endpoint():
    """Ejecuta el Agente Centinela Auditor en Modo Sombra (Dry-Run) sin accionar relés físicos."""
    import importlib
    import shadow_auditor
    importlib.reload(shadow_auditor)
    return shadow_auditor.run_full_shadow_audit()


