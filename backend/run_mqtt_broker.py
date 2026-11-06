import asyncio
import logging
import sys
from amqtt.broker import Broker

# Silence noisy amqtt protocol debug/trace logs that fill buffer on Windows
logging.getLogger("amqtt").setLevel(logging.WARNING)

config = {
    'listeners': {
        'default': {
            'type': 'tcp',
            'bind': '0.0.0.0:1883',
            'max_connections': 100
        }
    },
    'sys_interval': 0,
    'auth': {
        'allow-anonymous': True
    }
}

async def start_broker():
    while True:
        try:
            broker = Broker(config)
            await broker.start()
            print("Embedded MQTT Broker started on 0.0.0.0:1883", flush=True)
            while True:
                await asyncio.sleep(3600)
        except Exception as e:
            print(f"MQTT Broker error: {e}, restarting broker in 2s...", flush=True)
            await asyncio.sleep(2)

if __name__ == '__main__':
    asyncio.run(start_broker())
