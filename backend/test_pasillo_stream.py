import os
import requests
import cv2

os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

# 1. Probar Snapshot HTTP
print("Descargando snapshot HTTP...")
try:
    r = requests.get("http://192.168.1.128:8000/snapshot/PROFILE_85738", auth=("admin", "tomas30ola"), timeout=3)
    print(f"HTTP Status: {r.status_code}, Length: {len(r.content)} bytes")
    if r.status_code == 200:
        with open("snapshot_pasillo.jpg", "wb") as f:
            f.write(r.content)
        print("✅ Snapshot guardado en snapshot_pasillo.jpg!")
except Exception as e:
    print(f"Error HTTP snapshot: {e}")

# 2. Probar RTSP OpenCV
rtsp_url = "rtsp://admin:tomas30ola@192.168.1.128:5543/e4a2f62f9342b7b662a9d72917a1190a/live/channel0"
print(f"\nProbando RTSP en {rtsp_url}...")
cap = cv2.VideoCapture(rtsp_url)
if cap.isOpened():
    ret, frame = cap.read()
    if ret and frame is not None:
        h, w, c = frame.shape
        cv2.imwrite("rtsp_pasillo.jpg", frame)
        print(f"[OK] EXITO RTSP: Frame capturado {w}x{h} ({os.path.getsize('rtsp_pasillo.jpg')} bytes)!")
    else:
        print("RTSP abrió pero no leyó frame")
    cap.release()
else:
    print("RTSP no abrió")
