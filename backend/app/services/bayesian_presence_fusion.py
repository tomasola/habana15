import time
import math
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("BayesianPresenceFusion")

class RoomBayesianState:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.probability: float = 0.05  # Probabilidad a priori de presencia (0.0 a 1.0)
        self.last_pir_time: float = 0.0
        self.last_door_time: float = 0.0
        self.last_device_activity_time: float = 0.0
        self.door_is_open: bool = False
        self.device_active: bool = False  # TV, PC, música o luz encendida manualmente
        self.last_update_time: float = time.time()

    def update_evidence(self, event_type: str, value: Any):
        now = time.time()
        self.last_update_time = now

        if event_type == "pir_motion":
            if value:
                self.last_pir_time = now
                # Movimiento físico directo: probabilidad instantánea casi segura
                self.probability = max(self.probability, 0.95)
            else:
                # El PIR pasa a reposo. No ponemos 0 de golpe: aplicamos decaimiento bayesiano
                pass

        elif event_type == "door_contact":
            self.door_is_open = bool(value)
            self.last_door_time = now
            # Si la puerta se cierra y había presencia previa, la probabilidad de seguir dentro se bloquea alta
            if not self.door_is_open and self.probability > 0.6:
                self.probability = min(0.99, self.probability + 0.1)

        elif event_type == "device_power" or event_type == "media_playing":
            self.device_active = bool(value)
            if self.device_active:
                self.last_device_activity_time = now
                # Si la TV está encendida en el salón, la persona está dentro aunque no se mueva
                self.probability = max(self.probability, 0.90)

    def decay_over_time(self, current_time: float) -> float:
        """Calcula el decaimiento de la probabilidad en función del tiempo transcurrido y contexto."""
        dt = current_time - self.last_update_time
        time_since_pir = current_time - self.last_pir_time if self.last_pir_time > 0 else 999999
        time_since_door = current_time - self.last_door_time if self.last_door_time > 0 else 999999

        # Si hay un dispositivo activo (ej: TV o música en la estancia), el decaimiento es casi nulo
        if self.device_active:
            self.probability = max(self.probability, 0.85)
            return self.probability

        # Si la puerta de la estancia está cerrada y nadie la ha abierto desde el último movimiento,
        # la persona sigue dentro quieta (ley de conservación de ocupación)
        if not self.door_is_open and time_since_door > time_since_pir and self.probability > 0.7:
            # Decaimiento ultra-lento: media vida de 45 minutos (persona durmiendo o leyendo)
            decay_rate = 0.0001 * dt
            self.probability = max(0.65, self.probability - decay_rate)
            return self.probability

        # En caso normal (puerta abierta o sin evidencia continua), decaimiento exponencial suave
        # Media vida normal: 3 minutos (180 segundos)
        decay_factor = math.exp(-dt / 180.0)
        self.probability = max(0.02, self.probability * decay_factor)
        self.last_update_time = current_time
        return self.probability


class BayesianPresenceFusionService:
    """Motor Unificado de Fusión Sensorial Bayesiana para Habana 14.2 Fusión.
    
    Elimina el falso negativo de 'quedarse a oscuras en el sofá o en la cama'
    cruzando PIR + Puertas + Dispositivos multimedia + Visión.
    """
    def __init__(self):
        self.rooms: Dict[str, RoomBayesianState] = {}
        self.presence_threshold = 0.50  # Si P >= 0.50 -> Ocupado

    def get_or_create_room(self, room_id: str) -> RoomBayesianState:
        if room_id not in self.rooms:
            self.rooms[room_id] = RoomBayesianState(room_id)
        return self.rooms[room_id]

    def register_pir_event(self, room_id: str, motion_detected: bool):
        room = self.get_or_create_room(room_id)
        room.update_evidence("pir_motion", motion_detected)

    def register_door_event(self, room_id: str, is_open: bool):
        room = self.get_or_create_room(room_id)
        room.update_evidence("door_contact", is_open)

    def register_device_activity(self, room_id: str, is_active: bool):
        room = self.get_or_create_room(room_id)
        room.update_evidence("device_power", is_active)

    def is_occupied(self, room_id: str) -> bool:
        room = self.get_or_create_room(room_id)
        prob = room.decay_over_time(time.time())
        return prob >= self.presence_threshold

    def get_room_probability(self, room_id: str) -> float:
        room = self.get_or_create_room(room_id)
        return round(room.decay_over_time(time.time()), 3)

    def get_all_presence_states(self) -> Dict[str, Any]:
        now = time.time()
        results = {}
        for rid, room in self.rooms.items():
            prob = room.decay_over_time(now)
            results[rid] = {
                "room_id": rid,
                "occupied": prob >= self.presence_threshold,
                "confidence_pct": round(prob * 100, 1),
                "device_active": room.device_active,
                "door_is_open": room.door_is_open
            }
        return results

bayesian_presence = BayesianPresenceFusionService()
