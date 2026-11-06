from fastapi import APIRouter, HTTPException, Body, UploadFile, File, Form
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from app.bunker.storage import bunker_storage
from app.bunker.gatekeeper import bunker_gatekeeper
from app.bunker.knowledge import bunker_knowledge
from app.bunker.information import bunker_information
from app.bunker.lola_prompt_engine import bunker_lola_engine
from app.bunker.meteorology_service import bunker_meteorology_service

router = APIRouter(prefix="/api/bunker", tags=["Búnker IA"])

class KillSwitchPayload(BaseModel):
    enabled: bool

class GenerateWidgetPayload(BaseModel):
    prompt: str

class WidgetPayload(BaseModel):
    id: Optional[str] = None
    title: str
    icon: Optional[str] = "🧱"
    category: Optional[str] = "macro"
    author: Optional[str] = "IA Local"
    description: Optional[str] = ""
    color: Optional[str] = "#00f3ff"
    actions: List[Dict[str, Any]]

class SnapshotCreatePayload(BaseModel):
    description: Optional[str] = ""

@router.get("/status")
def get_bunker_status():
    return bunker_storage.get_status()

@router.post("/kill-switch")
def toggle_kill_switch(payload: KillSwitchPayload):
    new_state = bunker_storage.set_kill_switch(payload.enabled)
    return {
        "status": "success",
        "enabled": new_state,
        "message": f"Búnker {'CONECTADO' if new_state else 'AISLADO'}"
    }

@router.get("/widgets")
def get_bunker_widgets():
    return {
        "status": "success",
        "enabled": bunker_storage.is_enabled(),
        "widgets": bunker_storage.get_widgets()
    }

@router.post("/widgets")
def save_bunker_widget(payload: WidgetPayload):
    saved = bunker_storage.save_widget(payload.dict())
    return {
        "status": "success",
        "widget": saved
    }

@router.put("/widgets/{widget_id}")
def update_bunker_widget(widget_id: str, payload: WidgetPayload):
    data = payload.dict()
    data["id"] = widget_id
    saved = bunker_storage.save_widget(data)
    return {
        "status": "success",
        "widget": saved
    }

@router.delete("/widgets/{widget_id}")
def delete_bunker_widget(widget_id: str):
    ok = bunker_storage.delete_widget(widget_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Widget no encontrado")
    return {"status": "success", "deleted": True}

@router.post("/execute-action")
def execute_direct_action(payload: Dict[str, Any] = Body(...)):
    res = bunker_gatekeeper.execute_single_action(payload)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error", "Error ejecutando acción"))
    return {"status": "success", "result": res}

@router.post("/widgets/{widget_id}/execute")
def execute_bunker_widget(widget_id: str):
    res = bunker_gatekeeper.execute_widget_action(widget_id)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error", "Error de ejecución en Búnker"))
    return {"status": "success", "result": res}

@router.post("/widgets/{widget_id}/promote")
def promote_bunker_widget(widget_id: str):
    res = bunker_storage.promote_to_official(widget_id)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error", "Error al promocionar"))
    return {"status": "success", **res}

@router.get("/snapshots")
def list_bunker_snapshots():
    return {
        "status": "success",
        "snapshots": bunker_storage.list_snapshots()
    }

@router.post("/snapshots")
def create_bunker_snapshot(payload: SnapshotCreatePayload):
    res = bunker_storage.create_snapshot(payload.description)
    return res

@router.post("/snapshots/{snapshot_id}/restore")
def restore_bunker_snapshot(snapshot_id: str):
    res = bunker_storage.restore_snapshot(snapshot_id)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return {"status": "success", **res}

@router.get("/history")
def get_bunker_history():
    return {
        "status": "success",
        "history": bunker_gatekeeper.get_execution_history()
    }

@router.get("/knowledge")
def get_bunker_knowledge():
    return {
        "status": "success",
        "knowledge": bunker_knowledge.get_full_topology()
    }

@router.post("/generate-widget")
def generate_bunker_widget(payload: GenerateWidgetPayload):
    widget_data = bunker_knowledge.generate_widget_from_prompt(payload.prompt)
    saved = bunker_storage.save_widget(widget_data)
    return {
        "status": "success",
        "widget": saved,
        "message": f"Widget generado con éxito a partir de '{payload.prompt}'"
    }

# ==========================================
# SUBPROYECTO: INFORMACIÓN & BRIEFING MATINAL
# ==========================================
@router.get("/information/overview")
def get_information_overview():
    """
    Retorna telemetría meteorológica (Ourense), últimas noticias RSS y último análisis de Marc Vidal.
    """
    weather = bunker_information.get_weather()
    news = bunker_information.get_news(limit_per_feed=3)
    youtube = bunker_information.get_youtube_latest()
    return {
        "status": "success",
        "weather": weather,
        "news": news,
        "youtube": youtube,
        "last_briefing": bunker_information.config.get("last_briefing")
    }

@router.post("/information/briefing")
def generate_briefing():
    """
    Genera el informe matinal completo, el guión para altavoces y lo archiva en Obsidian.
    """
    briefing = bunker_information.generate_morning_briefing()
    return {
        "status": "success",
        "briefing": briefing
    }

class SpeakPayload(BaseModel):
    text: Optional[str] = None

@router.post("/information/speak")
def speak_information_briefing(payload: Optional[SpeakPayload] = None):
    """
    Genera el audio con Edge TTS y lo reproduce en altavoces.
    """
    custom_text = payload.text if payload else None
    result = bunker_information.speak_briefing(custom_text=custom_text)
    if not result.get("ok"):
        raise HTTPException(status_code=500, detail=result.get("error", "Error generando locución"))
    return {
        "status": "success",
        "result": result
    }

@router.get("/information/config")
def get_information_config():
    return {
        "status": "success",
        "config": bunker_information.config
    }

@router.post("/information/config")
def update_information_config(payload: Dict[str, Any] = Body(...)):
    bunker_information._save_config(payload)
    return {
        "status": "success",
        "config": bunker_information.config
    }

# ==========================================
# SUBPROYECTO: ESTUDIO LOLA (PROMPTS & VÍDEOS)
# ==========================================
@router.get("/lola/phrases")
def get_lola_phrases():
    """
    Retorna el catálogo maestro de frases para Lola con sus prompts para Flow y Veo.
    """
    return {
        "status": "success",
        "phrases": bunker_lola_engine.get_catalog()
    }

class LolaGeneratePayload(BaseModel):
    action: str

@router.post("/lola/generate")
def generate_lola_prompts(payload: LolaGeneratePayload):
    """
    Genera al vuelo el texto hablado, el prompt para Flow y el prompt para Veo.
    """
    res = bunker_lola_engine.generate_custom_prompt(payload.action)
    return {
        "status": "success",
        "result": res
    }

@router.post("/lola/save-obsidian")
def save_lola_to_obsidian(payload: Dict[str, Any] = Body(...)):
    """
    Guarda la ficha técnica en la bóveda de Obsidian (vault/Avatar).
    """
    fpath = bunker_lola_engine.save_phrase_to_obsidian(payload)
    return {
        "status": "success",
        "filepath": fpath
    }

@router.post("/lola/upload-video")
async def upload_lola_video(
    file: UploadFile = File(...),
    trigger_phrase: str = Form(...),
    response_text: str = Form(...),
    generation_prompt: Optional[str] = Form("")
):
    """
    Sube un vídeo .mp4 generado en Flow/Veo, lo almacena en media/videos/ y lo enlaza al avatar de Lola.
    """
    if not file.filename.lower().endswith((".mp4", ".webm")):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos de vídeo (.mp4, .webm)")

    contents = await file.read()
    try:
        from app.services.avatar_service import AvatarService
        avatar_srv = AvatarService()
        ok = avatar_srv.upload_video_file(
            file_bytes=contents,
            filename=file.filename,
            trigger_phrase=trigger_phrase,
            response_text=response_text,
            generation_prompt=generation_prompt or ""
        )
        if not ok:
            raise HTTPException(status_code=500, detail="Error al registrar el vídeo en la base de datos de Lola")

        return {
            "status": "success",
            "message": f"Vídeo '{file.filename}' subido y asignado con éxito a Lola",
            "trigger_phrase": trigger_phrase
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# SUBPROYECTO: METEOROLOGÍA, CLIMA & PERSIANAS
# ==========================================
@router.get("/meteorology/status")
def get_meteorology_status():
    """
    Retorna la telemetría en tiempo real de todos los sensores de temperatura y humedad,
    previsión exterior Open-Meteo Ourense, estado de persianas y climatización HVAC.
    """
    return bunker_meteorology_service.get_meteorology_overview()

class CoverControlPayload(BaseModel):
    cover_id: str
    action: str  # 'open', 'close', 'stop', 'set_cover_position'
    position: Optional[int] = None

@router.post("/meteorology/covers/control")
def control_bunker_cover(payload: CoverControlPayload):
    """
    Control individual de una persiana (Salón, Habitación Andrea, Dormitorio Principal).
    """
    res = bunker_meteorology_service.control_cover(
        cover_id=payload.cover_id,
        action=payload.action,
        position=payload.position
    )
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error", "Error controlando persiana"))
    return {"status": "success", "result": res}

class AllCoversPayload(BaseModel):
    action: str  # 'open', 'close', 'stop'
    position: Optional[int] = None

@router.post("/meteorology/covers/all")
def control_all_bunker_covers(payload: AllCoversPayload):
    """
    Acción global sobre todas las persianas de la vivienda.
    """
    res = bunker_meteorology_service.control_all_covers(
        action=payload.action,
        position=payload.position
    )
    return {"status": "success", "result": res}

@router.post("/meteorology/hvac")
def update_bunker_hvac(payload: Dict[str, Any] = Body(...)):
    """
    Ajusta la configuración del termostato / aire acondicionado.
    """
    res = bunker_meteorology_service.update_hvac_settings(payload)
    return {"status": "success", "result": res}

class RuleTogglePayload(BaseModel):
    enabled: bool

@router.post("/meteorology/rules/{rule_id}/toggle")
def toggle_bunker_climate_rule(rule_id: str, payload: RuleTogglePayload):
    """
    Activa o desactiva una regla de automatización climática / persianas.
    """
    res = bunker_meteorology_service.toggle_rule(rule_id, payload.enabled)
    return {"status": "success", "result": res}


class CoverCalibrationPayload(BaseModel):
    cover_id: str
    time_up: float
    time_down: float
    motor_reversal: Optional[bool] = None

@router.get("/meteorology/covers/calibration")
def get_bunker_covers_calibration():
    """
    Retorna la configuración de tiempos diferenciados de subida/bajada y reversal de persianas.
    """
    return bunker_meteorology_service.get_covers_calibration()

@router.post("/meteorology/covers/calibration")
def update_bunker_cover_calibration(payload: CoverCalibrationPayload):
    """
    Configura y sincroniza los tiempos de subida, bajada e inversión de una persiana.
    """
    res = bunker_meteorology_service.update_cover_calibration(
        cover_id=payload.cover_id,
        time_up=payload.time_up,
        time_down=payload.time_down,
        motor_reversal=payload.motor_reversal
    )
    return {"status": "success", "result": res}

class CoverSyncPositionPayload(BaseModel):
    cover_id: str
    position: int

@router.post("/meteorology/covers/sync_position")
def sync_bunker_cover_position(payload: CoverSyncPositionPayload):
    """
    Fuerza el valor de posición física de una persiana (ej. 0% abajo o 100% arriba).
    """
    res = bunker_meteorology_service.sync_cover_position(
        cover_id=payload.cover_id,
        position=payload.position
    )
    return {"status": "success", "result": res}
