import os
import sys

# Forzar codificación UTF-8 para consola de Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import asyncio
import json
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from simulation_engine import SimulationEngine

engine = SimulationEngine()
active_websockets = set()

async def broadcast_loop():
    """Envía el estado del motor a todos los clientes web conectados cada 250ms."""
    while True:
        try:
            if active_websockets:
                payload = json.dumps(engine.get_ui_state(), ensure_ascii=False)
                dead_sockets = set()
                for ws in list(active_websockets):
                    try:
                        await ws.send_text(payload)
                    except Exception:
                        dead_sockets.add(ws)
                active_websockets.difference_update(dead_sockets)
        except Exception:
            pass
        await asyncio.sleep(0.25)

@asynccontextmanager
async def lifespan(app: FastAPI):
    engine.start()
    b_task = asyncio.create_task(broadcast_loop())
    yield
    b_task.cancel()
    engine.stop_and_finalize()

app = FastAPI(title="Habana 14 Sandbox Digital Twin", lifespan=lifespan)

# Montar estáticos
static_dir = os.path.join(CURRENT_DIR, "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def get_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.add(websocket)
    try:
        await websocket.send_text(json.dumps(engine.get_ui_state(), ensure_ascii=False))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_websockets.discard(websocket)
    except Exception:
        active_websockets.discard(websocket)

@app.post("/api/speed")
async def set_speed(multiplier: float = Query(..., ge=1.0, le=25.0)):
    engine.set_speed(multiplier)
    return {"status": "ok", "speed": engine.speed_multiplier}

@app.post("/api/pause")
async def toggle_pause():
    engine.toggle_pause()
    return {"status": "ok", "is_paused": engine.is_paused}

@app.post("/api/chaos")
async def trigger_chaos():
    engine.trigger_chaos()
    return {"status": "ok", "message": "Caos inyectado"}

@app.post("/api/stop")
async def stop_sim():
    engine.stop_and_finalize()
    return {"status": "ok", "message": "Detenido"}

@app.post("/api/restart")
async def restart_sim():
    engine.reset_and_start()
    return {"status": "ok", "message": "Reiniciado"}

@app.post("/api/council/audit")
async def trigger_council_audit():
    engine.run_immediate_audit()
    return {"status": "ok", "message": "Auditoría del Consejo iniciada"}

@app.post("/api/autorefine/start")
async def start_autorefine():
    engine.refiner.start_loop()
    return {"status": "ok", "message": "Bucle autónomo iniciado"}

@app.post("/api/autorefine/stop")
async def stop_autorefine():
    engine.refiner.stop_loop("Detenido por el usuario")
    return {"status": "ok", "message": "Bucle autónomo detenido"}

@app.get("/api/autorefine/status")
async def get_autorefine_status():
    return engine.refiner.get_state()

@app.post("/api/report/open")
async def open_report_file():
    if engine.report_path and os.path.exists(engine.report_path):
        try:
            os.startfile(engine.report_path)
            return {"status": "ok", "opened": True}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    return {"status": "error", "error": "No hay archivo de reporte generado"}

@app.get("/api/report/latest")
async def get_latest_report():
    if engine.report_path and os.path.exists(engine.report_path):
        try:
            with open(engine.report_path, "r", encoding="utf-8") as f:
                content = f.read()
            return {"status": "ok", "content": content, "path": engine.report_path, "council": engine.council_results}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    return {"status": "none", "content": ""}

if __name__ == "__main__":
    print("\n" + "="*60)
    print("[HABANA 14] SANDBOX DIGITAL TWIN & SIMULADOR HUMANO")
    print("Panel de Control en vivo: http://localhost:8088")
    print("="*60 + "\n")
    uvicorn.run("server:app", host="0.0.0.0", port=8088, log_level="info")
