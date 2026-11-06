import sys
import time
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, 'F:/Habana 12/backend')
from app.services.camera_service import camera_service

def overlay_human(base_img, x, y, scale=1.0):
    """Superpone una silueta humana realista caminando sobre la imagen base."""
    img = base_img.copy()
    # Cabeza
    cv2.circle(img, (int(x), int(y - 50*scale)), int(12*scale), (180, 160, 150), -1)
    # Torso (chaqueta)
    cv2.rectangle(img, (int(x - 16*scale), int(y - 38*scale)), (int(x + 16*scale), int(y + 20*scale)), (80, 70, 120), -1)
    # Piernas (pantalón)
    cv2.rectangle(img, (int(x - 14*scale), int(y + 20*scale)), (int(x - 3*scale), int(y + 70*scale)), (50, 50, 70), -1)
    cv2.rectangle(img, (int(x + 3*scale), int(y + 20*scale)), (int(x + 14*scale), int(y + 70*scale)), (50, 50, 70), -1)
    return img

def run_simulation(cam_id: str):
    print(f"\n=======================================================")
    print(f"🚶 SIMULACIÓN HUMANA EN VIVO EN '{cam_id}'")
    print(f"=======================================================")
    
    # Obtener fotograma directamente del snapshot del backend (sin competir por el socket RTSP)
    import urllib.request
    try:
        url = f"http://127.0.0.1:8050/api/cameras/{cam_id}/snapshot.jpg"
        with urllib.request.urlopen(url, timeout=4) as resp:
            jpg_data = resp.read()
        nparr = np.frombuffer(jpg_data, np.uint8)
        base_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"Error obteniendo snapshot de {cam_id}: {e}")
        return

    if base_frame is None:
        print(f"Error: No se pudo decodificar snapshot de {cam_id}")
        return

    h_frame, w_frame = base_frame.shape[:2]
    print(f"Fotograma base obtenido: {w_frame}x{h_frame}")

    # Configurar algoritmo de detección idéntico al VisionSentinel de producción
    subtractor = cv2.createBackgroundSubtractorMOG2(history=150, varThreshold=16, detectShadows=False)
    k5 = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    
    # 1. Warmup de 12 fotogramas con habitación vacía
    print("\n--- Fase 1: Calentamiento de fondo (Habitación vacía) ---")
    for _ in range(12):
        small = cv2.resize(base_frame, (320, 180))
        blur = cv2.GaussianBlur(small, (5, 5), 0)
        subtractor.apply(blur, learningRate=0.20)
        
    # Verificar reposo
    small = cv2.resize(base_frame, (320, 180))
    blur = cv2.GaussianBlur(small, (5, 5), 0)
    fg = subtractor.apply(blur, learningRate=0.01)
    dil = cv2.dilate(fg, k5, iterations=1)
    clean = cv2.medianBlur(dil, 3)
    score = np.count_nonzero(clean) / (320.0 * 180.0)
    print(f"Fondo establecido. Score en reposo absoluto: {score:.5f}")

    # 2. Simulación de Persona Caminando
    # En 320x180: Persona entra por x=20, camina hacia x=280 a y=110
    print("\n--- Fase 2: Persona caminando por el encuadre (Entrada y Cruce) ---")
    steps = 30
    x_positions = np.linspace(30, 290, steps)
    
    detected_at_frame = None
    first_trigger_latency_ms = None
    
    for i, x_pos in enumerate(x_positions):
        t0 = time.perf_counter()
        # Generar fotograma con persona en posición x_pos
        human_frame = overlay_human(base_frame, x_pos * (w_frame / 320.0), 110 * (h_frame / 180.0), scale=0.85)
        
        # Procesar con el centinela
        small = cv2.resize(human_frame, (320, 180))
        blur = cv2.GaussianBlur(small, (5, 5), 0)
        fg_mask = subtractor.apply(blur, learningRate=0.01)
        
        dilated = cv2.dilate(fg_mask, k5, iterations=1)
        clean_mask = cv2.medianBlur(dilated, 3)
        score = np.count_nonzero(clean_mask) / (320.0 * 180.0)
        
        contours, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        max_area = 0.0
        max_h = 0
        for c in contours:
            a = cv2.contourArea(c)
            if a > max_area:
                max_area = a
            _, _, _, h = cv2.boundingRect(c)
            if h > max_h:
                max_h = h
                
        is_sensor_noise = len(contours) > 20 and max_area < 250
        is_human_motion = (not is_sensor_noise) and (
            (max_area >= 200.0 and max_h >= 32) or
            max_area >= 400.0 or
            max_h >= 48
        )
        
        dt_ms = (time.perf_counter() - t0) * 1000
        
        status_icon = "🟢 DISPARO HUMANO" if is_human_motion else "⚪ Sin disparo"
        if is_human_motion and detected_at_frame is None:
            detected_at_frame = i
            first_trigger_latency_ms = dt_ms
            
        if i % 3 == 0 or is_human_motion:
            print(f"Paso {i:02d} (x={int(x_pos)}px): score={score:.4f}, área={int(max_area)}px, h={max_h}px, cnts={len(contours)} | {status_icon} ({dt_ms:.1f}ms)")
            
    print(f"\nResultado Simulación Persona Caminando en '{cam_id}':")
    if detected_at_frame is not None:
        print(f"✅ DETECCIÓN EXITOSA en el paso {detected_at_frame}!")
        print(f"⚡ Latencia de procesamiento: {first_trigger_latency_ms:.2f} ms")
    else:
        print(f"❌ FALLO: La persona no fue detectada.")

    # 3. Fase 3: Simulación de Transición Lumínica (Apagado / Encendido)
    print("\n--- Fase 3: Simulación de cambio brusco de luz (Encendido -> Apagado) ---")
    # Simular caída de luz al 20% (apagado repentino)
    dark_frame = (base_frame * 0.2).astype(np.uint8)
    
    # Aplicar la lógica de transición (5.5s = ~35 frames de absorción)
    print("Simulando período de gracia de 5.5s tras apagado...")
    for f in range(15):
        small = cv2.resize(dark_frame, (320, 180))
        blur = cv2.GaussianBlur(small, (5, 5), 0)
        subtractor.apply(blur, learningRate=0.30)
        
    # Calentamiento post-transición (6 frames)
    for _ in range(6):
        small = cv2.resize(dark_frame, (320, 180))
        blur = cv2.GaussianBlur(small, (5, 5), 0)
        subtractor.apply(blur, learningRate=0.20)
        
    # Verificar si tras apagarse hay falso disparo
    small = cv2.resize(dark_frame, (320, 180))
    blur = cv2.GaussianBlur(small, (5, 5), 0)
    fg_mask = subtractor.apply(blur, learningRate=0.01)
    dilated = cv2.dilate(fg_mask, k5, iterations=1)
    clean_mask = cv2.medianBlur(dilated, 3)
    score = np.count_nonzero(clean_mask) / (320.0 * 180.0)
    contours, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    max_area = 0.0
    max_h = 0
    for c in contours:
        a = cv2.contourArea(c)
        if a > max_area:
            max_area = a
        _, _, _, h = cv2.boundingRect(c)
        if h > max_h:
            max_h = h
            
    is_sensor_noise = len(contours) > 20 and max_area < 250
    rebound_trigger = (not is_sensor_noise) and (
        (max_area >= 200.0 and max_h >= 32) or
        max_area >= 400.0 or
        max_h >= 48
    )
    print(f"Estado tras apagarse: score={score:.5f}, max_area={int(max_area)}px, h={max_h}px")
    if rebound_trigger:
        print("🚨 ERROR: Se produjo rebote en falso al apagarse la luz!")
    else:
        print("✅ REBOTE EVITADO: 0 disparos en falso tras apagarse la luz.")

if __name__ == '__main__':
    run_simulation("camara_pasillo")
    run_simulation("camara_cam720")
