import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
from onvif import ONVIFCamera

print("Conectando a Terraza (192.168.1.133:8000)...", flush=True)
mycam = ONVIFCamera("192.168.1.133", 8000, "admin", "tomas30ola", no_cache=True)
# Patch xaddrs so all services connect to 192.168.1.133 instead of the reported 192.168.1.129
for k, v in list(mycam.xaddrs.items()):
    mycam.xaddrs[k] = v.replace("192.168.1.129", "192.168.1.133")

media = mycam.create_media_service()
profiles = media.GetProfiles()
print(f"Perfiles encontrados en Terraza: {len(profiles)}", flush=True)
for p in profiles:
    print(f"  Perfil: {p.Name} (Token: {p.token})", flush=True)
    uri = media.GetStreamUri({'StreamSetup': {'Stream': 'RTP-Unicast', 'Transport': {'Protocol': 'RTSP'}}, 'ProfileToken': p.token})
    actual_rtsp = uri.Uri.replace("192.168.1.129", "192.168.1.133")
    print(f"    Stream URI Real: {actual_rtsp}", flush=True)

    import cv2, os
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
    cred_rtsp = actual_rtsp.replace("rtsp://", "rtsp://admin:tomas30ola@")
    cap = cv2.VideoCapture(cred_rtsp)
    if cap.isOpened():
        ret, frame = cap.read()
        if ret and frame is not None:
            cv2.imwrite("rtsp_terraza.jpg", frame)
            print(f"    [OK] Frame Terraza capturado: {frame.shape[1]}x{frame.shape[0]} ({os.path.getsize('rtsp_terraza.jpg')} bytes)!", flush=True)
        cap.release()
    break
