import paho.mqtt.client as mqtt
import time
import json
import urllib.request
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

API_BASE = "http://127.0.0.1:8050"

mqtt_tx_commands = []

def on_connect(client, userdata, flags, rc):
    client.subscribe("zigbee2mqtt/#")

def on_mqtt_msg(client, userdata, msg):
    if msg.topic.endswith("/set") or "/set" in msg.topic:
        try:
            pay = json.loads(msg.payload.decode('utf-8'))
        except:
            pay = msg.payload.decode('utf-8')
        mqtt_tx_commands.append((time.time(), msg.topic, pay))

import uuid

uid = uuid.uuid4().hex[:6]
monitor = mqtt.Client(client_id=f"comm_mon_{uid}")
monitor.on_connect = on_connect
monitor.on_message = on_mqtt_msg
monitor.connect("127.0.0.1", 1883, 60)
monitor.loop_start()

publisher = mqtt.Client(client_id=f"comm_pub_{uid}")
publisher.connect("127.0.0.1", 1883, 60)
publisher.loop_start()

time.sleep(1.0)

print("=" * 70)
print("AUDITORIA FINAL DE CONMUTACIONES ZIGBEE2MQTT - HABANA 10")
print("=" * 70)

# Asegurar reposo inicial
print("\n[Paso 0] Apagado general inicial...")
urllib.request.urlopen(urllib.request.Request(f"{API_BASE}/api/z2m-hub/control/all-off", method="POST"))
time.sleep(5.0)

req = urllib.request.urlopen(f"{API_BASE}/api/z2m-hub/state")
state_data = json.loads(req.read().decode())
real_lights = state_data.get("real_lights", [])

test_targets = [
    ("luz_lazos_andrea", "Habitación Andrea (Lámpara Lazos · 4 interruptores)"),
    ("luz_luz_del_comedor_d9b2", "Salón (Luz Comedor · 2 interruptores)"),
    ("luz_luz_principal_del_salon_53c1", "Salón (Luz Principal · 2 interruptores)"),
    ("luz_techo_principal", "Dormitorio Principal (Luz Techo · 4 interruptores)"),
    ("luz_techo_pasillo", "Pasillo (Luz Techo · 3 interruptores)")
]

passed_tests = 0
failed_tests = 0

for light_id, desc in test_targets:
    light = next((l for l in real_lights if l["id"] == light_id), None)
    if not light:
        continue

    ps = light.get("power_source", {})
    ps_dev = ps.get("device")
    ps_ch = ps.get("channel")
    comm_switches = light.get("commutation_switches", [])

    print(f"\n--- Circuito: {desc} ---")
    print(f"  Fuente Potencia: {ps_dev}.{ps_ch}")
    print(f"  Conmutadas ({len(comm_switches)}): {', '.join(s.get('device')+'.'+s.get('channel') for s in comm_switches)}")

    # 1. Pulsación en CONMUTADA SATÉLITE para ENCENDER (OFF -> ON)
    if comm_switches:
        c_dev = comm_switches[0]["device"]
        c_ch = comm_switches[0]["channel"]

        # Asegurar estado base OFF
        publisher.publish(f"zigbee2mqtt/{c_dev}", json.dumps({c_ch: "OFF"}))
        time.sleep(0.6)

        mqtt_tx_commands.clear()
        print(f"  [1] Pulsar conmutada satélite: {c_dev}.{c_ch} -> ON")
        publisher.publish(f"zigbee2mqtt/{c_dev}", json.dumps({c_ch: "ON"}))
        
        t0 = time.time()
        power_on = False
        while time.time() - t0 < 2.0:
            if any(top == f"zigbee2mqtt/{ps_dev}/set" and isinstance(p, dict) and p.get(ps_ch) == "ON" for t, top, p in mqtt_tx_commands):
                power_on = True
                break
            time.sleep(0.05)

        if power_on:
            print(f"      [OK] Relé de potencia ({ps_dev}) encendido.")
            passed_tests += 1
        else:
            print(f"      [FAIL] Relé de potencia ({ps_dev}) no encendió! TX: {mqtt_tx_commands}")
            failed_tests += 1

        # 2. Pulsación en OTRA conmutada satélite para APAGAR (ON -> OFF)
        c2_dev = comm_switches[-1]["device"]
        c2_ch = comm_switches[-1]["channel"]

        mqtt_tx_commands.clear()
        print(f"  [2] Pulsar conmutada satélite: {c2_dev}.{c2_ch} -> OFF")
        publisher.publish(f"zigbee2mqtt/{c2_dev}", json.dumps({c2_ch: "OFF"}))
        
        t0 = time.time()
        power_off = False
        while time.time() - t0 < 2.0:
            if any(top == f"zigbee2mqtt/{ps_dev}/set" and isinstance(p, dict) and p.get(ps_ch) == "OFF" for t, top, p in mqtt_tx_commands):
                power_off = True
                break
            time.sleep(0.05)

        if power_off:
            print(f"      [OK] Relé de potencia ({ps_dev}) apagado.")
            passed_tests += 1
        else:
            print(f"      [FAIL] Relé de potencia ({ps_dev}) no apagó! TX: {mqtt_tx_commands}")
            failed_tests += 1

    # 3. Pulsación en INTERRUPTOR DE POTENCIA para ENCENDER
    mqtt_tx_commands.clear()
    print(f"  [3] Pulsar interruptor de potencia: {ps_dev}.{ps_ch} -> ON")
    publisher.publish(f"zigbee2mqtt/{ps_dev}", json.dumps({ps_ch: "ON"}))
    
    t0 = time.time()
    all_synced_on = False
    while time.time() - t0 < 2.0:
        if all(any(top == f"zigbee2mqtt/{sw['device']}/set" and isinstance(p, dict) and p.get(sw['channel']) == "ON" for t, top, p in mqtt_tx_commands) for sw in comm_switches):
            all_synced_on = True
            break
        time.sleep(0.05)

    if all_synced_on:
        print(f"      [OK] Todas las conmutadas ({len(comm_switches)}) sincronizadas a ON.")
        passed_tests += 1
    else:
        print(f"      [FAIL] Falló sincronización de conmutadas a ON! TX: {mqtt_tx_commands}")
        failed_tests += 1

    # 4. Pulsación en INTERRUPTOR DE POTENCIA para APAGAR
    mqtt_tx_commands.clear()
    print(f"  [4] Pulsar interruptor de potencia: {ps_dev}.{ps_ch} -> OFF")
    publisher.publish(f"zigbee2mqtt/{ps_dev}", json.dumps({ps_ch: "OFF"}))
    
    t0 = time.time()
    all_synced_off = False
    while time.time() - t0 < 2.0:
        if all(any(top == f"zigbee2mqtt/{sw['device']}/set" and isinstance(p, dict) and p.get(sw['channel']) == "OFF" for t, top, p in mqtt_tx_commands) for sw in comm_switches):
            all_synced_off = True
            break
        time.sleep(0.05)

    if all_synced_off:
        print(f"      [OK] Todas las conmutadas ({len(comm_switches)}) sincronizadas a OFF.")
        passed_tests += 1
    else:
        print(f"      [FAIL] Falló sincronización de conmutadas a OFF! TX: {mqtt_tx_commands}")
        failed_tests += 1

    time.sleep(0.8)

print("\n" + "=" * 70)
print(f"RESUMEN FINAL: {passed_tests} PASSED | {failed_tests} FAILED")
print("=" * 70)

# LIMPIEZA TOTAL
print("\n[SEGURIDAD] Apagando el 100% de las luces físicas...")
urllib.request.urlopen(urllib.request.Request(f"{API_BASE}/api/z2m-hub/control/all-off", method="POST"))
time.sleep(1.2)

monitor.loop_stop()
publisher.loop_stop()
if failed_tests == 0:
    print("\n>>> CERTIFICACION TOTAL: 100% FUNCIONANDO SIN FALLOS <<<")
    sys.exit(0)
else:
    print("\n>>> HUBO FALLOS EN EL TEST <<<")
    sys.exit(1)
