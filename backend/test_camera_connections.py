import cv2
import os
import requests
import socket

os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

print("=" * 60)
print("AUDITORIA DE CONEXION DE CAMARAS HABANA 12")
print("=" * 60)

ips_to_test = {
    "terraza_129": ("192.168.1.129", "Terraza (Tuya)"),
    "terraza_alt_133": ("192.168.1.133", "Posible Terraza / Tuya 133"),
    "pasillo_128": ("192.168.1.128", "Pasillo (Tuya)"),
    "cam720_132": ("192.168.1.132", "Cam720")
}

passwords_to_test = ["tomas30ola", "tomas30", "admin", "123456", ""]
users_to_test = ["admin", "Tomas", "tomas"]

# 1. Comprobar conectividad IP y puertos
for key, (ip, desc) in ips_to_test.items():
    print(f"\n--- Probando conectividad en {desc} ({ip}) ---")
    open_ports = []
    for p in [554, 80, 8000, 8080, 8899, 6668]:
        s = socket.socket()
        s.settimeout(0.4)
        try:
            s.connect((ip, p))
            open_ports.append(p)
            s.close()
        except:
            pass
    print(f"  Puertos abiertos en {ip}: {open_ports}")

# 2. Probar RTSP en cada una
rtsp_paths = [
    "/live/ch0", "/onvif1", "/live/ch1", "/11", "/stream1", "/live",
    "/h264Preview_01_main", "/ch01.264", "/cam/realmonitor?channel=1&subtype=0",
    "/media/stream1", "/onvif-media/media.amp"
]

results = {}

for key, (ip, desc) in ips_to_test.items():
    print(f"\nBuscando stream RTSP para {desc} ({ip})...")
    found = False
    for pwd in passwords_to_test:
        for u in users_to_test:
            for path in rtsp_paths:
                cred = f"{u}:{pwd}@" if pwd else f"{u}@"
                for port in [554, 8000, 8554]:
                    url = f"rtsp://{cred}{ip}:{port}{path}"
                    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
                    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 1200)
                    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 1200)
                    if cap.isOpened():
                        ret, frame = cap.read()
                        if ret and frame is not None and frame.size > 0:
                            h, w, c = frame.shape
                            print(f"  >>> EXITO! Stream OK: {url} ({w}x{h})")
                            out_img = f"stream_{key}.jpg"
                            cv2.imwrite(out_img, frame)
                            results[key] = {
                                "url": url,
                                "resolution": f"{w}x{h}",
                                "image": out_img
                            }
                            found = True
                            cap.release()
                            break
                    cap.release()
                if found:
                    break
            if found:
                break
        if found:
            break
    if not found:
        print(f"  No se pudo abrir RTSP directo en {ip} con las combinaciones probadas.")

print("\n" + "=" * 60)
print(f"RESULTADOS FINALES: {len(results)}/{len(ips_to_test)} conectadas")
for k, v in results.items():
    print(f"  {k}: {v['url']} -> {v['resolution']}")
print("=" * 60)
