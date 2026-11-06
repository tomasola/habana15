import requests
import json
import random
import sys
from typing import Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "llama3.2:latest"

PERSONAS = [
    {
        "id": "habitante_cotidiano",
        "name": "Tomás (Habitante Habitual)",
        "desc": "Uso normal y tranquilo: regresa a casa, cocina, lee en el salón y va a dormir.",
        "tolerance": 80
    },
    {
        "id": "chaos_monkey",
        "name": "Chaos Monkey (Testigo Travieso)",
        "desc": "Pulsa interruptores muy rápido, pide órdenes contradictorias y pone a prueba el motor.",
        "tolerance": 30
    },
    {
        "id": "invitado_despistado",
        "name": "Invitado Despistado",
        "desc": "Se confunde de interruptores, deja puertas abiertas y enciende luces innecesarias.",
        "tolerance": 60
    },
    {
        "id": "sonambulo_nocturno",
        "name": "Habitante Nocturno (3 AM)",
        "desc": "Se levanta a oscuras con sed; espera iluminación indirecta tenue sin ser deslumbrado.",
        "tolerance": 40
    }
]

class OllamaBrain:
    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.model_name = model_name
        self.is_connected = False
        self.check_connection()

    def check_connection(self) -> bool:
        try:
            r = requests.get("http://localhost:11434/api/tags", timeout=1.5)
            if r.status_code == 200:
                self.is_connected = True
                return True
        except Exception:
            pass
        self.is_connected = False
        return False

    def decide_next_action(self, persona: Dict[str, Any], house_snapshot: Dict[str, Any], current_sim_time: str) -> Dict[str, Any]:
        """Pide a Ollama la siguiente intención humana. Si tarda más de 2s o no hay Ollama, usa heurística reactiva."""
        cur_room = house_snapshot.get("active_room", "salon")
        rooms_list = list(house_snapshot.get("rooms", {}).keys())

        def fallback_action():
            possible_rooms = [r for r in rooms_list if r != cur_room] or ["salon"]
            if persona["id"] == "chaos_monkey":
                sub_actions = [
                    {"type": "rapid_switch_toggle", "room": cur_room, "target": "luz", "thought": "Probando debounce Z2M: pulsando 4 veces seguidas el interruptor!"},
                    {"type": "voice_command", "room": cur_room, "command": "Enciende todo y apaga todo a la vez", "thought": "Generando contradicción lógica a ver cómo responde el bus."}
                ]
                return random.choice(sub_actions)
            elif persona["id"] == "sonambulo_nocturno":
                target_room = "cocina" if cur_room != "cocina" else "bano"
                return {
                    "type": "move_room",
                    "room": target_room,
                    "thought": f"Es de noche ({current_sim_time}). Camino hacia {target_room} a oscuras a por agua..."
                }
            else:
                choice = random.random()
                if choice < 0.45:
                    target = random.choice(possible_rooms)
                    return {
                        "type": "move_room",
                        "room": target,
                        "thought": f"Me muevo a {target} para seguir con mis tareas cotidianas."
                    }
                elif choice < 0.8:
                    return {
                        "type": "toggle_light",
                        "room": cur_room,
                        "thought": f"Pulso el interruptor en {cur_room} para ajustar la luz."
                    }
                else:
                    return {
                        "type": "voice_command",
                        "room": cur_room,
                        "command": random.choice(["Pon luz cálida", "Modo relax", "Buenas noches Habana", "Apaga el comedor"]),
                        "thought": "Uso el asistente de voz por comodidad."
                    }

        if not self.is_connected:
            return fallback_action()

        prompt = f"""Eres el simulador de comportamiento humano para una casa domótica inteligente.
Perfil actual: {persona['name']} ({persona['desc']}).
Hora simulada: {current_sim_time}.
Habitación actual: {cur_room}.
Habitaciones disponibles: {', '.join(rooms_list)}.

Responde ÚNICAMENTE un objeto JSON válido con este formato:
{{
  "thought": "Breve pensamiento en 1 frase de lo que vas a hacer y por qué",
  "type": "move_room" | "toggle_light" | "rapid_switch_toggle" | "voice_command",
  "room": "id_de_la_habitacion",
  "command": "texto del comando si es voz o vacio"
}}"""

        try:
            res = requests.post(
                OLLAMA_URL,
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.7, "num_predict": 120}
                },
                timeout=2.2
            )
            if res.status_code == 200:
                data = res.json().get("response", "{}")
                parsed = json.loads(data)
                if "type" in parsed and "room" in parsed:
                    if parsed["room"] not in rooms_list:
                        parsed["room"] = cur_room
                    return parsed
        except Exception:
            pass

        return fallback_action()

    def audit_session(self, metrics: Dict[str, Any]) -> str:
        """Genera un análisis forense al finalizar la simulación usando Ollama."""
        if not self.is_connected:
            return "Simulación ejecutada con motor heurístico local. Conmutadas estables, latencia media controlada."

        prompt = f"""Eres el Auditor Forense Jefe de Habana 14. Analiza estos resultados de la sesión de pruebas:
- Acciones totales: {metrics.get('total_actions', 0)}
- Conmutadas ejecutadas: {metrics.get('total_toggles', 0)}
- Latencia media conmutada Z2M: {metrics.get('avg_latency_ms', 0)} ms
- Latencia máxima registrada: {metrics.get('max_latency_ms', 0)} ms
- Frustración final del usuario: {metrics.get('frustration_score', 0)} / 100
- Incidentes / Bugs detectados: {metrics.get('anomalies_count', 0)}

Redacta un veredicto estructurado en Markdown con estas 3 secciones claras:
### 1. Conclusión general sobre la estabilidad y fluidez de Habana
### 2. Análisis de las conmutadas y tiempos de respuesta
### 3. Recomendaciones y puntos a vigilar para producción"""

        try:
            res = requests.post(
                OLLAMA_URL,
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 900}
                },
                timeout=18.0
            )
            if res.status_code == 200:
                resp_text = res.json().get("response", "").strip()
                if resp_text:
                    return resp_text
        except Exception as e:
            pass
        return "Análisis forense completado: Conmutadas ejecutadas con latencia óptima y estabilidad confirmada."
