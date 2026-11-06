import paho.mqtt.client as mqtt
import json
import time

def on_connect(c, u, f, rc):
    print("Connected to MQTT broker rc=", rc)
    c.subscribe("zigbee2mqtt/andrea_placa_entrada")
    c.subscribe("zigbee2mqtt/andrea_placa_ventana")
    c.subscribe("zigbee2mqtt/andrea_placa_cama_izq")
    c.subscribe("zigbee2mqtt/andrea_placa_cama_der")

def on_msg(c, u, msg):
    print(f"[{msg.topic}] -> {msg.payload.decode()}")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_msg
client.connect("localhost", 1883)
client.loop_start()

# Request state from andrea_placa_entrada
print("Requesting state from andrea_placa_entrada...")
client.publish("zigbee2mqtt/andrea_placa_entrada/get", json.dumps({"state_l1": "", "state_l2": "", "state_l3": ""}))

time.sleep(3)
client.loop_stop()
