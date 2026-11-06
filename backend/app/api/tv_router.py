"""
tv_router.py - Endpoints REST para el Centro Multimedia y Mando a Distancia Universal de Habana 15
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
import urllib.request
import urllib.parse
import re
from app.services.tv_media_orchestrator import tv_manager

router = APIRouter(prefix="/api/tv", tags=["Smart TV & Mando Universal"])

class PlayChannelRequest(BaseModel):
    tv_id: str
    channel_key: str

class PowerRequest(BaseModel):
    tv_id: str
    action: str  # "on", "off"

class VolumeRequest(BaseModel):
    tv_id: str
    level: Optional[float] = None # 0.0 a 1.0
    step: Optional[str] = None    # "up", "down", "mute"

class FavoriteToggleRequest(BaseModel):
    channel_key: str

@router.get("/devices")
def get_tv_devices():
    """Devuelve las 3 televisiones de la casa y su estado."""
    return tv_manager.get_devices()

@router.get("/channels")
def get_tv_channels():
    """Devuelve la lista completa de canales de televisión disponibles."""
    return tv_manager.get_channels()

@router.get("/favorites")
def get_tv_favorites():
    """Devuelve la lista de IDs de canales marcados como favoritos."""
    return {"favorites": tv_manager.get_favorites()}

@router.post("/favorites/toggle")
def toggle_tv_favorite(req: FavoriteToggleRequest):
    """Marca o desmarca un canal como favorito."""
    return tv_manager.toggle_favorite(req.channel_key)

@router.post("/play")
def play_channel(req: PlayChannelRequest):
    """Sintoniza un canal en una televisión concreta."""
    result = tv_manager.play_channel(req.tv_id, req.channel_key)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@router.post("/power")
def control_power(req: PowerRequest):
    """Enciende o apaga la televisión seleccionada."""
    result = tv_manager.power_control(req.tv_id, req.action)
    return result

@router.post("/volume")
def control_volume(req: VolumeRequest):
    """Ajusta el volumen o silencia la televisión."""
    result = tv_manager.volume_control(req.tv_id, level=req.level, step=req.step)
    return result

@router.get("/stream_info/{channel_key}")
def get_stream_info(channel_key: str):
    """Devuelve metadatos y URL de stream directo para el canal."""
    channels = tv_manager.get_channels()
    ch = channels.get(channel_key)
    if not ch:
        raise HTTPException(status_code=404, detail="Canal no encontrado")
    from app.services.tv_media_orchestrator import _resolve_dynamic_master_url
    master_url = _resolve_dynamic_master_url(ch)
    return {
        "channel_key": channel_key,
        "name": ch.get("name"),
        "stream_url": master_url,
        "proxy_url": f"/api/tv/stream/{channel_key}.m3u8"
    }

@router.get("/stream/{channel_key}")
def get_hls_stream(channel_key: str):
    """Proxy HLS con CORS abierto y rutas absolutas para previsualización."""
    from app.services.tv_media_orchestrator import (
        CHANNELS, _resolve_dynamic_master_url, _resolve_sub_playlist, _get_headers_for_url
    )
    clean_key = channel_key.replace(".m3u8", "").strip().lower()
    ch = CHANNELS.get(clean_key) or CHANNELS.get("la1")
    try:
        master_url = _resolve_dynamic_master_url(ch)
        sub_url = _resolve_sub_playlist(master_url)
        headers = _get_headers_for_url(sub_url)
        req = urllib.request.Request(sub_url, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as r:
            pl_text = r.read().decode('utf-8', errors='ignore')
            base_url = r.geturl()

        out_lines = []
        for line in pl_text.splitlines():
            s = line.strip()
            if not s:
                continue
            if s.startswith('#'):
                if 'URI="' in s:
                    s = re.sub(
                        r'URI="([^"]+)"',
                        lambda m: f'URI="{urllib.parse.urljoin(base_url, m.group(1))}"',
                        s
                    )
                out_lines.append(s)
            else:
                out_lines.append(urllib.parse.urljoin(base_url, s))

        body = "\n".join(out_lines) + "\n"
        return Response(
            content=body,
            media_type="application/vnd.apple.mpegurl",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error resolviendo stream: {str(e)}")

