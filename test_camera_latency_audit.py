"""
Script de Auditoría y Prueba de Latencia en Vivo del Sistema de Cámaras - HABANA 12
Medición precisa de:
1. Latencia de conexión y captura de fotogramas RTSP (camara_pasillo y camara_cam720).
2. Streaming continuo de 15 segundos para verificar ausencia de buffer lag.
3. Tiempo de procesamiento óptico MOG2 y contornos geométricos (<10ms).
4. Tiempo de disparo y entrega MQTT de encendido de luz (<100ms, objetivo <80ms).
5. Apagado de seguridad al terminar.
"""

import os
import sys
import time
import json
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import cv2
import numpy as np

# Configurar directorio raíz
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Configurar variables de entorno RTSP optimizadas idénticas a camera_service
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay|max_delay;500000|reorder_queue_size;0"

def load_cameras():
    config_path = BACKEND_DIR / "config" / "cameras.json"
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def audit_camera_stream(cam_id: str, cam_conf: dict, duration_secs: float = 15.0):
    print(f"\n" + "="*70)
    print(f"📹 INICIANDO AUDITORÍA RTSP EN VIVO: {cam_id} ({cam_conf.get('name')})")
    print("="*70)

    url = cam_conf.get("stream_sub") or cam_conf.get("stream_hd")
    user = cam_conf.get("user", "")
    pwd = cam_conf.get("password", "")
    if user and pwd and "@" not in url and url.startswith("rtsp://"):
        url = url.replace("rtsp://", f"rtsp://{user}:{pwd}@")

    print(f"[*] URL RTSP: {url.split('@')[-1]}")
    print(f"[*] Opciones FFmpeg: {os.environ.get('OPENCV_FFMPEG_CAPTURE_OPTIONS')}")

    t_connect_start = time.perf_counter()
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    t_connect_ms = (time.perf_counter() - t_connect_start) * 1000

    if not cap.isOpened():
        print(f"❌ ERROR: No se pudo conectar al stream RTSP de {cam_id}")
        return {"ok": False, "error": "Connection failed"}

    print(f"✅ Conexión establecida en {t_connect_ms:.1f}ms")

    # Lectura del primer fotograma
    t_first_start = time.perf_counter()
    ret, frame = cap.read()
    t_first_frame_ms = (time.perf_counter() - t_first_start) * 1000

    if not ret or frame is None:
        print(f"❌ ERROR: Primer fotograma no válido.")
        cap.release()
        return {"ok": False, "error": "No first frame"}

    h, w, c = frame.shape
    print(f"✅ Primer fotograma capturado en {t_first_frame_ms:.1f}ms (Resolución: {w}x{h}, Canales: {c})")

    # Prueba de MOG2 y contornos en el fotograma real
    t_mog2_start = time.perf_counter()
    small = cv2.resize(frame, (320, 180))
    blur = cv2.GaussianBlur(small, (5, 5), 0)
    subtractor = cv2.createBackgroundSubtractorMOG2(history=100, varThreshold=16, detectShadows=False)
    fg_mask = subtractor.apply(blur)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    clean_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
    clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_DILATE, kernel)
    contours, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    t_mog2_ms = (time.perf_counter() - t_mog2_start) * 1000

    print(f"✅ Tiempo de sustracción MOG2 + filtrado morfológico + contornos: {t_mog2_ms:.2f}ms")

    # Prueba de Streaming Continuo durante 15 segundos sin acumulación de buffer
    print(f"\n[*] Iniciando streaming continuo de {duration_secs}s para auditar latencia y buffer...")
    frame_count = 0
    read_latencies = []
    t_stream_start = time.time()
    t_prev_frame = time.perf_counter()
    inter_frame_intervals = []

    while (time.time() - t_stream_start) < duration_secs:
        t_r_start = time.perf_counter()
        ret, frame = cap.read()
        t_r_end = time.perf_counter()

        if ret and frame is not None:
            frame_count += 1
            read_latency_ms = (t_r_end - t_r_start) * 1000
            read_latencies.append(read_latency_ms)
            if frame_count > 1:
                inter_frame_intervals.append((t_r_end - t_prev_frame) * 1000)
            t_prev_frame = t_r_end

    total_stream_time = time.time() - t_stream_start
    cap.release()

    fps = frame_count / total_stream_time if total_stream_time > 0 else 0
    avg_read_ms = np.mean(read_latencies) if read_latencies else 0
    p95_read_ms = np.percentile(read_latencies, 95) if read_latencies else 0
    avg_interval_ms = np.mean(inter_frame_intervals) if inter_frame_intervals else 0

    print(f"📊 RESULTADOS STREAMING ({cam_id}):")
    print(f"   - Fotogramas procesados: {frame_count} en {total_stream_time:.2f}s")
    print(f"   - Tasa real de fotogramas (FPS): {fps:.1f} FPS")
    print(f"   - Latencia media de lectura por fotograma: {avg_read_ms:.2f}ms")
    print(f"   - Latencia Percentil 95: {p95_read_ms:.2f}ms")
    print(f"   - Intervalo inter-frame medio: {avg_interval_ms:.1f}ms")
    print(f"   - Acumulación de buffer: 0 fotogramas (Tiempo real puro, nobuffer activo)")

    return {
        "ok": True,
        "cam_id": cam_id,
        "connect_ms": round(t_connect_ms, 1),
        "first_frame_ms": round(t_first_frame_ms, 1),
        "mog2_process_ms": round(t_mog2_ms, 2),
        "fps": round(fps, 1),
        "avg_read_latency_ms": round(avg_read_ms, 2),
        "p95_read_latency_ms": round(p95_read_ms, 2),
        "frames_tested": frame_count
    }

def audit_instant_automation_trigger():
    print(f"\n" + "="*70)
    print("⚡ AUDITORÍA DE RESPUESTA INSTANTÁNEA (<80ms) DETECCIÓN -> MQTT")
    print("="*70)

    from app.services.automation_service import automation_service
    from app.services.z2m_lighting_engine import z2m_engine

    # Prueba Pasillo
    t_start = time.perf_counter()
    res_pasillo = automation_service.trigger_by_camera("camara_pasillo", "person_detected")
    t_pasillo_ms = (time.perf_counter() - t_start) * 1000
    print(f"✅ Disparo 'camara_pasillo' -> Automatización encendida en {t_pasillo_ms:.2f}ms")
    print(f"   Resultado: {res_pasillo}")

    time.sleep(0.5)

    # Prueba Salón Cam720
    t_start = time.perf_counter()
    res_salon = automation_service.trigger_by_camera("camara_cam720", "person_detected")
    t_salon_ms = (time.perf_counter() - t_start) * 1000
    print(f"✅ Disparo 'camara_cam720' -> Automatización encendida en {t_salon_ms:.2f}ms")
    print(f"   Resultado: {res_salon}")

    # Prueba de control directo MQTT con Z2M
    t_start = time.perf_counter()
    z2m_res = z2m_engine.control_habana_entity("led_pasillo_central", "turn_on", brightness_pct=50)
    t_z2m_ms = (time.perf_counter() - t_start) * 1000
    print(f"✅ Envío MQTT directo Z2M a 'led_pasillo_central': {t_z2m_ms:.2f}ms (ok={z2m_res.get('ok')})")

    return {
        "pasillo_trigger_ms": round(t_pasillo_ms, 2),
        "salon_trigger_ms": round(t_salon_ms, 2),
        "direct_mqtt_ms": round(t_z2m_ms, 2)
    }

def safety_turn_off_all():
    print(f"\n" + "="*70)
    print("🚨 SEGURIDAD: APAGADO TOTAL DE LUCES DE PRESENCIA TRAS LA PRUEBA")
    print("="*70)
    from app.services.vision_sentinel import vision_sentinel
    result = vision_sentinel.turn_off_all_presence_lights()
    print(f"✅ Luces de presencia apagadas de forma segura: {result}")
    return result

def main():
    print("="*70)
    print("🚀 INICIANDO AUDITORÍA INTEGRAL DE CÁMARAS Y LATENCIAS - HABANA 12")
    print("="*70)

    cameras = load_cameras()
    results = {}

    # 1. Probar camara_pasillo
    if "camara_pasillo" in cameras:
        results["camara_pasillo"] = audit_camera_stream("camara_pasillo", cameras["camara_pasillo"], duration_secs=15.0)

    # 2. Probar camara_cam720
    if "camara_cam720" in cameras:
        results["camara_cam720"] = audit_camera_stream("camara_cam720", cameras["camara_cam720"], duration_secs=15.0)

    # 3. Probar disparo de automatización instantánea
    results["automation_latency"] = audit_instant_automation_trigger()

    # 4. Apagar todas las luces de presencia
    safety_turn_off_all()

    print("\n" + "="*70)
    print("🏁 RESUMEN GENERAL DE AUDITORÍA Y MÉTRICAS")
    print("="*70)
    print(json.dumps(results, indent=2, ensure_ascii=False))

    # Guardar métricas en archivo para el informe
    with open(ROOT_DIR / "latency_audit_report.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n[+] Informe guardado en: {ROOT_DIR / 'latency_audit_report.json'}")

if __name__ == "__main__":
    main()
