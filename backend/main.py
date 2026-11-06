import sys
import io
# Force UTF-8 stdout/stderr to avoid encoding errors with emojis/accents
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'buffer'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from contextlib import asynccontextmanager
import asyncio
import uvicorn
import logging
import os
import threading

from app.api import router as api_router
from app.api import security as security_router
from app.api import robot as robot_router
from app.api.fusion_router import router as fusion_router
from app.api.apex_router import router as apex_router
from app.api.tv_router import router as tv_router
from app.bunker.router import router as bunker_router
from app.core.config import settings
from app.services.proactive_service import proactive_engine

# Setup logging
from logging.handlers import RotatingFileHandler
import os

log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(log_dir, exist_ok=True)

# Configure basic logging with rotation (10MB max, 5 backups) with force=True
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        RotatingFileHandler(os.path.join(log_dir, "habana.log"), maxBytes=10*1024*1024, backupCount=5, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ],
    force=True
)
logger = logging.getLogger("Habana-Backend")


async def check_reminders_loop():
    from app.services.agenda import agenda_service
    from app.services.whatsapp import wa_bridge
    from datetime import datetime
    
    logger.info("â° Iniciando programador de recordatorios por WhatsApp en Habana...")
    
    def _process_pending_reminders():
        rows = agenda_service.get_pending_reminders()
        now = datetime.now()
        
        for r in rows:
            fecha_str = r.get('fecha_inicio') or r.get('due_date', '')
            if not fecha_str:
                continue
            try:
                dt = datetime.fromisoformat(fecha_str.replace("Z", ""))
            except Exception as e:
                logger.error(f"Error parsing date {fecha_str} for event {r['id']}: {e}")
                continue
            
            time_diff = (dt - now).total_seconds()
            
            # Notificar si falta <= 15 min (900 seg) y >= -5 min (300 seg)
            if -300 <= time_diff <= 900:
                titulo = r.get('titulo') or r.get('title', 'Recordatorio')
                descripcion = r.get('descripcion') or r.get('message', '')
                msg = (
                    f"â° *Recordatorio de Agenda:*\n"
                    f"ðŸ‘‰ *{titulo}*\n"
                )
                if descripcion and descripcion != titulo:
                    msg += f"ðŸ“ {descripcion}\n"
                
                hora_str = dt.strftime("%H:%M")
                msg += f"ðŸ“… Hoy a las {hora_str}"
                
                logger.info(f"â° Enviando recordatorio de WhatsApp para: {titulo}")
                res = wa_bridge.send_message("tomas", msg)
                
                if res:
                    agenda_service.update_reminder_status(r['id'], 'sent')
                    logger.info(f"âœ” Recordatorio marcado como notificado para ID {r['id']}")
                else:
                    logger.error("âŒ Error al enviar WhatsApp")

    while True:
        try:
            await asyncio.to_thread(_process_pending_reminders)
        except Exception as ex:
            logger.error(f"Error en bucle de recordatorios: {ex}")
            
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.supervisor import supervisor_service
    from app.services.agent import agent
    from app.services.tts import tts_service
    from app.core.state import state_manager
    from app.core.plugin_loader import plugin_registry
    
    # Descubrimiento automÃ¡tico de plugins
    plugin_registry.discover_plugins(os.path.join(os.path.dirname(__file__), "app", "skills"))
    
    supervisor_service.start()
    
    def proactive_trigger(prompt: str):
        logger.info(f"Proactive Trigger activado con prompt: {prompt}")
        response_text, audio_url = agent.process_message(prompt, "proactive")
        if not audio_url:
            active_persona = state_manager.get_state().active_persona
            audio_url = tts_service.generate_audio(response_text, persona=active_persona)
            
        logger.info(f"Respuesta proactiva generada: {response_text}. Reproduciendo audio localmente.")
        # Opcionalmente, lanzar esto por websockets a los clientes conectados
        
    proactive_engine.start(proactive_trigger)
    
    # Iniciar motor de automatizaciones y escenas
    from app.services.automation_service import automation_service
    automation_service.start_scheduler()

    # Iniciar Centinela de VisiÃ³n Artificial para CÃ¡maras y DetecciÃ³n Pet-Safe
    try:
        from app.services.vision_sentinel import vision_sentinel
        vision_sentinel.start()
    except Exception as e:
        logger.error(f"Error iniciando vision_sentinel: {e}")
    
    # Iniciar Motor 100% Nativo Zigbee2MQTT (Conmutadas, Dimmers, LEDs y Luces Reales)
    try:
        from app.services.z2m_lighting_engine import z2m_engine
        z2m_engine.start_mqtt()
    except Exception as e:
        logger.error(f"Error iniciando z2m_engine: {e}")
    
    reminder_task = asyncio.create_task(check_reminders_loop())
    yield
    reminder_task.cancel()
    automation_service.stop_scheduler()
    try:
        from app.services.vision_sentinel import vision_sentinel
        vision_sentinel.stop()
    except Exception:
        pass
    proactive_engine.stop()
    supervisor_service.stop()

def create_app() -> FastAPI:
    app = FastAPI(
        title="Proyecto Habana - API Maestro",
        description="Core API for AI and Domotics",
        version="2.0.0",
        lifespan=lifespan
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Router setup
    app.include_router(api_router, prefix="/api")
    app.include_router(security_router.router, prefix="/api")
    app.include_router(robot_router.router, prefix="/ws")
    app.include_router(robot_router.router, prefix="/api/robot")
    app.include_router(fusion_router)
    app.include_router(apex_router)
    app.include_router(tv_router)
    app.include_router(bunker_router)


    # Live Notify WebSocket for NowPlaying & UI Real-Time Events
    notify_clients = set()

    @app.websocket("/ws/notify")
    async def websocket_notify(websocket: WebSocket):
        await websocket.accept()
        notify_clients.add(websocket)
        try:
            while True:
                data = await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        except Exception:
            pass
        finally:
            notify_clients.discard(websocket)

    @app.websocket("/ws/gemini_live")
    async def websocket_gemini_live(websocket: WebSocket):
        await websocket.accept()
        logging.getLogger("Main").info("Cliente WebSocket Conectado a Gemini Live (Navegador)")
        try:
            from app.services.gemini_live import GeminiLiveManager
            from app.services.agent import agent
            manager = GeminiLiveManager(agent)
            await manager.handle_live_stream(websocket)
        except WebSocketDisconnect:
            logging.getLogger("Main").info("Cliente navegador desconectado de Gemini Live")
        except Exception as e:
            logging.getLogger("Main").error(f"Error en websocket de Gemini Live: {e}")

    # Serve generated audio files directly from backend (bypasses frontend server caching)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    audio_path = os.path.join(base_dir, "audio")
    os.makedirs(audio_path, exist_ok=True)
    app.mount("/audio", StaticFiles(directory=audio_path), name="audio")
    
    media_path = os.path.join(base_dir, "media")
    os.makedirs(media_path, exist_ok=True)
    app.mount("/media", StaticFiles(directory=media_path), name="media")

    @app.get("/health")
    @app.get("/api/health")
    def health_check():
        return {"status": "online", "version": "2.0.0", "core": "Habana"}

    # Serve the React frontend from the root
    frontend_dist_path = os.path.join(base_dir, "frontend", "dist")
    os.makedirs(frontend_dist_path, exist_ok=True)
    
    # Custom handler for index.html to prevent aggressive caching on Fully Kiosk
    from fastapi.responses import FileResponse, RedirectResponse
    @app.get("/")
    def serve_index(request: Request):
        # Force a redirect if the version is not '4' to bypass Fully Kiosk cache
        v = request.query_params.get("v")
        if v != "4":
            return RedirectResponse(url="/?v=4", status_code=302)
            
        return FileResponse(
            os.path.join(frontend_dist_path, "index.html"),
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        )
        
    
    @app.get("/habana.apk")
    @app.get("/habana-tablet.apk")
    @app.get("/api/download-apk")
    def serve_apk_download():
        apk_candidates = [
            os.path.join(base_dir, "backend", "habana-tablet.apk"),
            os.path.join(base_dir, "habana-tablet.apk"),
            os.path.join(base_dir, "frontend", "public", "habana-tablet.apk"),
            os.path.join(base_dir, "habana.apk"),
            os.path.join(base_dir, "backend", "habana.apk"),
            os.path.join(base_dir, "frontend", "public", "habana.apk")
        ]
        for p in apk_candidates:
            if os.path.exists(p):
                return FileResponse(p, media_type="application/vnd.android.package-archive", filename=os.path.basename(p))
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="APK no encontrada")

    @app.get("/qr.png")
    def serve_root_qr():
        qr_candidates = [
            os.path.join(base_dir, "frontend", "public", "qr.png"),
            os.path.join(base_dir, "frontend", "dist", "qr.png"),
            r"F:\Habana 12\frontend\public\qr.png",
            r"F:\Habana 8\frontend\dist\qr.png",
            r"F:\Habana 8\backend\qr.png"
        ]
        for p in qr_candidates:
            if os.path.exists(p):
                return FileResponse(p, media_type="image/png")
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="QR not available")

    app.mount("/", StaticFiles(directory=frontend_dist_path, html=False), name="frontend")

    return app

app = create_app()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get('HABANA_PORT', 8050)), reload=False, log_level="warning", ws_ping_interval=None, ws_ping_timeout=None)
