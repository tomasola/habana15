import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
from onvif import ONVIFCamera

for ip in ["192.168.1.129", "192.168.1.133"]:
    print(f"\n--- Probando ONVIF en {ip}:8000 ---", flush=True)
    try:
        mycam = ONVIFCamera(ip, 8000, "admin", "tomas30ola", no_cache=True)
        info = mycam.devicemgmt.GetDeviceInformation()
        print(f"INFO: Manuf={info.Manufacturer}, Model={info.Model}, FW={info.FirmwareVersion}", flush=True)
        
        media = mycam.create_media_service()
        profiles = media.GetProfiles()
        print(f"Perfiles encontrados: {len(profiles)}", flush=True)
        for p in profiles:
            print(f"  Perfil: {p.Name} (Token: {p.token})", flush=True)
            try:
                uri = media.GetStreamUri({'StreamSetup': {'Stream': 'RTP-Unicast', 'Transport': {'Protocol': 'RTSP'}}, 'ProfileToken': p.token})
                print(f"    Stream URI: {uri.Uri}", flush=True)
            except Exception as e:
                print(f"    Stream URI Error: {e}", flush=True)
    except Exception as e:
        print(f"ERROR en {ip}: {e}", flush=True)
