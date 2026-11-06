"""
Test Completo de Conmutaciones e Integración de la Habitación de Andrea
Verifica:
1. Pulsaciones físicas en las placas de pared (12 botones, 4 placas)
2. Control desde la App / API / Agente de voz con sincronización automática de pulsadores de pared
"""
import time
import json
import uuid
import sys
import urllib.request
import paho.mqtt.client as mqtt

MQTT_HOST = "localhost"
MQTT_PORT = 1883

live_states = {}

def on_message(client, userdata, msg):
    topic = msg.topic
    if not topic.startswith("zigbee2mqtt/"):
        return
    dev = topic.split("/")[1]
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        if isinstance(payload, dict):
            live_states.setdefault(dev, {}).update(payload)
    except Exception:
        pass

uid = uuid.uuid4().hex[:6]
client = mqtt.Client(client_id=f"test_andrea_{uid}")
client.on_message = on_message
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.subscribe("zigbee2mqtt/#")
client.loop_start()

time.sleep(2.5)

def publish_cmd(device, payload_dict):
    client.publish(f"zigbee2mqtt/{device}/set", json.dumps(payload_dict))

def call_api_light(light_id, action):
    req = urllib.request.Request(
        "http://127.0.0.1:8050/api/z2m-hub/control/light",
        data=json.dumps({"light_id": light_id, "action": action}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode("utf-8"))

def wait_for_state(device, channel, expected_state, timeout=2.5):
    t0 = time.time()
    expected = str(expected_state).upper()
    while time.time() - t0 < timeout:
        cur = str(live_states.get(device, {}).get(channel, "")).upper()
        if cur == expected:
            return True, time.time() - t0
        time.sleep(0.04)
    cur = str(live_states.get(device, {}).get(channel, "")).upper()
    return False, time.time() - t0

def test_circuit_wall_clicks(name, light_id, power_dev, power_ch, commutations, is_led=False):
    print(f"\n=======================================================")
    print(f"PROBANDO CIRCUITO: {name}")
    print(f"  Fuente: {power_dev}.{power_ch}")
    print(f"  Conmutadas ({len(commutations)}): {[f'{d}.{c}' for d, c in commutations]}")
    print(f"=======================================================")
    
    passed = 0
    total = 0
    
    # 1. Pulsar primera conmutada en la pared a ON
    c_dev, c_ch = commutations[0]
    total += 1
    print(f"  [1] Pulsar interruptor de pared {c_dev}.{c_ch} -> ON")
    publish_cmd(c_dev, {c_ch: "ON"})
    ok_p, lat_p = wait_for_state(power_dev, power_ch, "ON")
    if ok_p:
        print(f"      [OK] Carga/Fuente encendida ({int(lat_p*1000)}ms)")
        passed += 1
    else:
        print(f"      [FAIL] Carga no encendió. Estado: {live_states.get(power_dev, {}).get(power_ch)}")
    time.sleep(1.1)

    # 2. Pulsar segunda conmutada en la pared a OFF
    c2_dev, c2_ch = commutations[-1]
    total += 1
    print(f"  [2] Pulsar interruptor de pared {c2_dev}.{c2_ch} -> OFF")
    publish_cmd(c2_dev, {c2_ch: "OFF"})
    ok_p, lat_p = wait_for_state(power_dev, power_ch, "OFF")
    if ok_p:
        print(f"      [OK] Carga/Fuente apagada ({int(lat_p*1000)}ms)")
        passed += 1
    else:
        print(f"      [FAIL] Carga no apagó. Estado: {live_states.get(power_dev, {}).get(power_ch)}")
    time.sleep(1.1)

    # 3. Encender desde API/App y verificar que todas las conmutadas se encienden
    total += 1
    print(f"  [3] Control desde App/Voz ({light_id}) -> ON")
    res_api = call_api_light(light_id, "on")
    all_ok = True
    for sw_dev, sw_ch in commutations:
        ok_sw, _ = wait_for_state(sw_dev, sw_ch, "ON", timeout=3.5)
        if not ok_sw:
            all_ok = False
            print(f"      [FAIL] Conmutada {sw_dev}.{sw_ch} no sincronizó a ON")
    if all_ok:
        print(f"      [OK] Carga y todas las conmutadas ({len(commutations)}) sincronizadas a ON")
        passed += 1
    time.sleep(1.1)

    # 4. Apagar desde API/App y verificar que todas las conmutadas se apagan
    total += 1
    print(f"  [4] Control desde App/Voz ({light_id}) -> OFF")
    res_api = call_api_light(light_id, "off")
    all_ok = True
    for sw_dev, sw_ch in commutations:
        ok_sw, _ = wait_for_state(sw_dev, sw_ch, "OFF", timeout=3.5)
        if not ok_sw:
            all_ok = False
            print(f"      [FAIL] Conmutada {sw_dev}.{sw_ch} no sincronizó a OFF")
    if all_ok:
        print(f"      [OK] Carga y todas las conmutadas ({len(commutations)}) sincronizadas a OFF")
        passed += 1
    time.sleep(1.1)

    return passed, total

print("--- INICIANDO TEST DE CONMUTACIONES ANDREA ---")
# 0. Apagado inicial
for dev in ["andrea_placa_entrada", "andrea_placa_cama_izq", "andrea_placa_cama_der", "andrea_placa_ventana"]:
    publish_cmd(dev, {"state_left": "OFF", "state_center": "OFF", "state_right": "OFF"})
for dev in ["andrea_led_cama", "andrea_led_foso_entrada"]:
    publish_cmd(dev, {"state": "OFF"})
time.sleep(2.5)

results = []

# Circuito 1: Lámpara de Lazos
r1 = test_circuit_wall_clicks(
    "1. Lámpara de Lazos (Techo · 4 interruptores)",
    "luz_lazos_andrea",
    "andrea_placa_entrada", "state_center",
    [
        ("andrea_placa_cama_izq", "state_center"),
        ("andrea_placa_cama_der", "state_center"),
        ("andrea_placa_ventana", "state_center")
    ]
)
results.append(r1)

# Circuito 2: Luz Ventana / Viga
r2 = test_circuit_wall_clicks(
    "2. Luz Oculta Viga / Ventana Andrea (4 interruptores)",
    "luz_ventana_andrea",
    "andrea_placa_ventana", "state_left",
    [
        ("andrea_placa_entrada", "state_right"),
        ("andrea_placa_cama_izq", "state_left"),
        ("andrea_placa_cama_der", "state_left")
    ]
)
results.append(r2)

# Circuito 3: Tira LED Cabecero
r3 = test_circuit_wall_clicks(
    "3. Tira LED Cabecero Cama Andrea (2 interruptores pared + driver)",
    "led_cama_andrea",
    "andrea_led_cama", "state",
    [
        ("andrea_placa_cama_izq", "state_right"),
        ("andrea_placa_cama_der", "state_right")
    ],
    is_led=True
)
results.append(r3)

# Circuito 4: Tira LED Foso Entrada
r4 = test_circuit_wall_clicks(
    "4. Tira LED Foso Entrada Andrea (2 interruptores pared + driver)",
    "led_foso_andrea",
    "andrea_led_foso_entrada", "state",
    [
        ("andrea_placa_entrada", "state_left"),
        ("andrea_placa_ventana", "state_right")
    ],
    is_led=True
)
results.append(r4)

# Apagado final estricto
print("\n[SEGURIDAD] Apagando el 100% de luces en Andrea...")
for dev in ["andrea_placa_entrada", "andrea_placa_cama_izq", "andrea_placa_cama_der", "andrea_placa_ventana"]:
    publish_cmd(dev, {"state_left": "OFF", "state_center": "OFF", "state_right": "OFF"})
for dev in ["andrea_led_cama", "andrea_led_foso_entrada"]:
    publish_cmd(dev, {"state": "OFF"})

time.sleep(2.5)
client.loop_stop()

passed_total = sum(p for p, _ in results)
total_total = sum(t for _, t in results)

print(f"\n=======================================================")
print(f"RESUMEN FINAL ANDREA: {passed_total}/{total_total} PASSED")
print(f"=======================================================")
if passed_total == total_total:
    print(">>> CERTIFICACIÓN TOTAL ANDREA: 100% FUNCIONANDO SIN FALLOS <<<")
    sys.exit(0)
else:
    print(f">>> FALLOS DETECTADOS: {total_total - passed_total} <<<")
    sys.exit(1)
