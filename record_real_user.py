import os
import sys
import time
import urllib.request
import cv2
import numpy as np

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
os.makedirs("F:/Habana 12/recordings", exist_ok=True)

DURATION_SECONDS = 15
FPS = 10
FRAME_INTERVAL = 1.0 / FPS
TOTAL_FRAMES = int(DURATION_SECONDS * FPS)

def fetch_frame(cam_id):
    try:
        url = f"http://127.0.0.1:8050/api/cameras/{cam_id}/snapshot.jpg"
        with urllib.request.urlopen(url, timeout=2.5) as resp:
            data = resp.read()
        nparr = np.frombuffer(data, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        return None

print("=================================================================")
print("🎥 HABANA 12 - GRABADOR DE PRUEBA REAL DE PRESENCIA HUMANA")
print(f"Duración: {DURATION_SECONDS} segundos (~{TOTAL_FRAMES} fotogramas a {FPS} FPS)")
print("Grabando simultáneamente: Pasillo y Salón Cam720")
print("=================================================================")

# Obtener primer fotograma para configurar VideoWriter con resoluciones exactas
f_pasillo = fetch_frame("camara_pasillo")
f_salon = fetch_frame("camara_cam720")

if f_pasillo is None or f_salon is None:
    print("❌ Error: No se pudo conectar a los snapshots del backend. Revisa que el backend esté activo.")
    sys.exit(1)

h_p, w_p = f_pasillo.shape[:2]
h_s, w_s = f_salon.shape[:2]

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out_pasillo = cv2.VideoWriter("F:/Habana 12/recordings/pasillo_user_walk.mp4", fourcc, FPS, (w_p, h_p))
out_salon = cv2.VideoWriter("F:/Habana 12/recordings/salon_user_walk.mp4", fourcc, FPS, (w_s, h_s))

print(f"Resolución Pasillo: {w_p}x{h_p}")
print(f"Resolución Salón:   {w_s}x{h_s}")
print("\n🔴 ¡GRABANDO AHORA MISMO! Camina por el pasillo y el salón...")

frames_pasillo = []
frames_salon = []
start_time = time.time()

for i in range(TOTAL_FRAMES):
    t_loop = time.perf_counter()
    
    fp = fetch_frame("camara_pasillo")
    fs = fetch_frame("camara_cam720")
    
    if fp is not None:
        out_pasillo.write(fp)
        frames_pasillo.append(fp)
    if fs is not None:
        out_salon.write(fs)
        frames_salon.append(fs)
        
    elapsed = time.time() - start_time
    rem = max(0.0, DURATION_SECONDS - elapsed)
    if (i + 1) % FPS == 0:
        print(f"⏱️ Grabando: {int(elapsed)}s / {DURATION_SECONDS}s (Restan {int(rem)}s)... [Pasillo: {len(frames_pasillo)} frames, Salón: {len(frames_salon)} frames]")
        
    t_proc = time.perf_counter() - t_loop
    sleep_time = max(0.001, FRAME_INTERVAL - t_proc)
    time.sleep(sleep_time)

out_pasillo.release()
out_salon.release()

size_p = os.path.getsize("F:/Habana 12/recordings/pasillo_user_walk.mp4") / 1024.0
size_s = os.path.getsize("F:/Habana 12/recordings/salon_user_walk.mp4") / 1024.0

print("\n=================================================================")
print("✅ ¡GRABACIÓN COMPLETADA CON ÉXITO!")
print(f"📹 Pasillo: F:/Habana 12/recordings/pasillo_user_walk.mp4 ({len(frames_pasillo)} frames, {size_p:.1f} KB)")
print(f"📹 Salón:   F:/Habana 12/recordings/salon_user_walk.mp4 ({len(frames_salon)} frames, {size_s:.1f} KB)")
print("=================================================================")

# Ahora analizamos automáticamente ambos vídeos fotograma a fotograma
def analyze_recorded_frames(frames, name):
    print(f"\n🔬 ANALIZANDO VÍDEO REAL: {name} ({len(frames)} fotogramas)")
    if len(frames) < 5:
        print("Vídeo demasiado corto.")
        return
        
    subtractor = cv2.createBackgroundSubtractorMOG2(history=150, varThreshold=16, detectShadows=False)
    k5 = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    
    # Calentar con los primeros 5 fotogramas
    for f in frames[:5]:
        small = cv2.resize(f, (320, 180))
        blur = cv2.GaussianBlur(small, (5, 5), 0)
        subtractor.apply(blur, learningRate=0.25)
        
    detected_frames = []
    
    for idx, f in enumerate(frames[5:], start=5):
        small = cv2.resize(f, (320, 180))
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
        is_human = (not is_sensor_noise) and (
            (max_area >= 200.0 and max_h >= 32) or
            max_area >= 400.0 or
            max_h >= 48
        )
        
        if score > 0.001 or max_area > 30 or is_human:
            mark = "🏃 DETECCIÓN HUMANA" if is_human else "⚪ Movimiento suave/ruido"
            print(f"  Frame {idx:03d}: score={score:.4f}, max_area={int(max_area)}px, max_h={max_h}px, cnts={len(contours)} | {mark}")
            if is_human:
                detected_frames.append(idx)
                
    print(f"-> Resultado {name}: {len(detected_frames)} fotogramas con detección de silueta humana confirmada.")

analyze_recorded_frames(frames_pasillo, "Pasillo")
analyze_recorded_frames(frames_salon, "Salón Cam720")
