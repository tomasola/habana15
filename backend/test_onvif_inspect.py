import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from onvif import ONVIFCamera

def test_onvif(ip, port, user, pwd):
    print(f"\n--- Probando ONVIF en {ip}:{port} (User: {user}) ---")
    try:
        mycam = ONVIFCamera(ip, port, user, pwd, no_cache=True)
        resp = mycam.devicemgmt.GetDeviceInformation()
        print(f"  [OK] Device Information:")
        print(f"     Manufacturer: {resp.Manufacturer}")
        print(f"     Model:        {resp.Model}")
        print(f"     Firmware:     {resp.FirmwareVersion}")
        print(f"     Serial:       {resp.SerialNumber}")
        
        media = mycam.create_media_service()
        profiles = media.GetProfiles()
        print(f"  [OK] Perfiles de Video ({len(profiles)}):")
        for p in profiles:
            token = p.token
            name = p.Name
            print(f"     - Perfil '{name}' [token: {token}]")
            try:
                stream_uri = media.GetStreamUri({
                    'StreamSetup': {'Stream': 'RTP-Unicast', 'Transport': {'Protocol': 'RTSP'}},
                    'ProfileToken': token
                })
                print(f"       RTSP Stream URI: {stream_uri.Uri}")
            except Exception as e_stream:
                print(f"       Error GetStreamUri: {e_stream}")
            try:
                snap_uri = media.GetSnapshotUri({'ProfileToken': token})
                print(f"       Snapshot URI:    {snap_uri.Uri}")
            except Exception as e_snap:
                print(f"       Error GetSnapshotUri: {e_snap}")
        return True
    except Exception as e:
        print(f"  [ERROR] Error ONVIF: {e}")
        return False

# Probar combinaciones
cams_to_try = [
    ("192.168.1.128", 8000, "admin", "tomas30ola"),
    ("192.168.1.129", 8000, "admin", "tomas30ola"),
    ("192.168.1.129", 80, "admin", "tomas30ola"),
    ("192.168.1.133", 8000, "admin", "tomas30ola"),
    ("192.168.1.132", 80, "admin", "tomas30ola"),
    ("192.168.1.132", 8899, "admin", "tomas30ola"),
    ("192.168.1.132", 80, "admin", "admin"),
    ("192.168.1.132", 8899, "admin", "admin"),
    ("192.168.1.132", 80, "admin", "123456"),
    ("192.168.1.132", 8899, "admin", "123456")
]

for ip, port, user, pwd in cams_to_try:
    test_onvif(ip, port, user, pwd)
