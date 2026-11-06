import asyncio
import time
import logging
from typing import Dict, Any, Callable, Awaitable, Optional

logger = logging.getLogger("PriorityEventBus")

class PriorityEventBus:
    """Bus de Mensajería con Prioridad Asíncrona (QoS) para Habana 14.2 Fusión.
    
    P0 = Prioridad Crítica (Pulsadores físicos de pared, conmutadas Z2M, relés).
    P1 = Prioridad Media (Automatizaciones, cambios de escena, comandos de voz).
    P2 = Prioridad Baja (Telemetría de sensores de temperatura, estado de batería, LQI).
    """
    def __init__(self):
        # PriorityQueue ordena por tupla: (prioridad, timestamp, payload)
        self.queue = asyncio.PriorityQueue()
        self.handlers: Dict[str, list] = {}
        self.is_running = False
        self._worker_task: Optional[asyncio.Task] = None
        self.stats = {
            "processed_p0": 0,
            "processed_p1": 0,
            "processed_p2": 0,
            "avg_latency_p0_ms": 1.2
        }

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._worker_task = asyncio.create_task(self._process_loop())
        logger.info("[PriorityEventBus] Bus con QoS de 3 niveles iniciado.")

    async def stop(self):
        self.is_running = False
        if self._worker_task:
            self._worker_task.cancel()

    def subscribe(self, topic: str, handler: Callable[[Dict[str, Any]], Awaitable[None]]):
        if topic not in self.handlers:
            self.handlers[topic] = []
        self.handlers[topic].append(handler)

    async def publish_p0(self, topic: str, payload: Dict[str, Any]):
        """Publica evento de Máxima Prioridad (Conmutada o Interruptor Físico)."""
        t0 = time.perf_counter()
        # Prioridad 0: sale primero
        await self.queue.put((0, t0, topic, payload))

    async def publish_p1(self, topic: str, payload: Dict[str, Any]):
        """Publica evento de Prioridad Media (Automatizaciones o Escenas)."""
        t0 = time.perf_counter()
        await self.queue.put((1, t0, topic, payload))

    async def publish_p2(self, topic: str, payload: Dict[str, Any]):
        """Publica evento de Prioridad Baja (Telemetría periódica de sensores)."""
        t0 = time.perf_counter()
        await self.queue.put((2, t0, topic, payload))

    async def _process_loop(self):
        while self.is_running:
            try:
                priority, t_queued, topic, payload = await self.queue.get()
                t_dispatch = time.perf_counter()
                latency_ms = round((t_dispatch - t_queued) * 1000, 2)

                if priority == 0:
                    self.stats["processed_p0"] += 1
                    # Actualizar latencia P0
                    cur_avg = self.stats["avg_latency_p0_ms"]
                    self.stats["avg_latency_p0_ms"] = round((cur_avg * 0.9) + (latency_ms * 0.1), 2)
                elif priority == 1:
                    self.stats["processed_p1"] += 1
                else:
                    self.stats["processed_p2"] += 1

                # Despachar a handlers registrados
                matched_handlers = self.handlers.get(topic, [])
                for h in matched_handlers:
                    try:
                        await h(payload)
                    except Exception as e:
                        logger.error(f"[PriorityEventBus] Error en handler {topic}: {e}")

                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[PriorityEventBus] Error en bucle: {e}")

priority_bus = PriorityEventBus()
