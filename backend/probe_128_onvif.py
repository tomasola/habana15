import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
from onvif import ONVIFCamera

print("Conectando a Pasillo (192.168.1.128:8000)...", flush=True)
try:
    mycam = ONVIFCamera("192.168.1.128", 8000, "admin", "tomas30ola", no_cache=True)
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
        try:
            snap = media.GetSnapshotUri({'ProfileToken': p.token})
            print(f"    Snapshot URI: {snap.Uri}", flush=True)
        except Exception as e:
            print(f"    Snapshot URI Error: {e}", flush=True)
except Exception as e:
    print(f"ERROR: {e}", flush=True)
