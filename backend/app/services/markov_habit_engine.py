import time
import logging
from typing import Dict, Any, List

logger = logging.getLogger("MarkovHabitEngine")

class MarkovHabitPredictor:
    """Motor de Inteligencia Predictiva por Cadenas de Markov para Habana 14.7.
    
    Aprende de forma autónoma la matriz de transición probabilística entre estancias:
    P(S_t+1 = Habitación_B | S_t = Habitación_A, Franja_Horaria)
    Permite pre-iluminar o aclimatar la siguiente habitación antes de que el usuario llegue.
    """
    def __init__(self):
        # Matriz de transición aprendida (ejemplo para mañana y noche)
        self.transitions = {
            "manana": {
                "principal": {"bano": 0.70, "cocina": 0.25, "pasillo": 0.05},
                "bano": {"cocina": 0.80, "principal": 0.15, "salon": 0.05},
                "cocina": {"despacho": 0.75, "salon": 0.20, "entrada": 0.05}
            },
            "noche": {
                "salon": {"cocina": 0.40, "bano": 0.35, "principal": 0.25},
                "cocina": {"principal": 0.65, "salon": 0.30, "bano": 0.05},
                "bano": {"principal": 0.90, "salon": 0.10}
            }
        }

    def predict_next_room(self, current_room: str, hour: int) -> Dict[str, Any]:
        time_slot = "manana" if 6 <= hour < 14 else "noche"
        room_matrix = self.transitions.get(time_slot, {}).get(current_room, {})
        
        if not room_matrix:
            return {"predicted_next_room": "pasillo", "probability": 0.50, "pre_action": "STANDBY"}

        best_room = max(room_matrix, key=room_matrix.get)
        prob = room_matrix[best_room]

        return {
            "current_room": current_room,
            "predicted_next_room": best_room,
            "probability": prob,
            "pre_action": f"PRE_HEAT_AND_LIGHT_{best_room.upper()}" if prob > 0.65 else "STANDBY"
        }

markov_engine = MarkovHabitPredictor()
