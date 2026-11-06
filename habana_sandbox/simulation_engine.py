import time
import threading
import random
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from mock_house import MockHouse
from ollama_brain import OllamaBrain, PERSONAS
from specialist_council import SpecialistCouncil
from auto_refiner import AutoRefiner
from export_obsidian import save_report_to_obsidian

class SimulationEngine:
    def __init__(self):
        self.house = MockHouse()
        self.ollama = OllamaBrain()
        self.council = SpecialistCouncil()
        self.refiner = AutoRefiner(self)
        
        self.is_running = False
        self.is_paused = False
        self.is_generating_report = False
        self.council_status_msg = ""
        self.speed_multiplier = 1.0  # 1x, 2x, 5x, 10x, 20x
        
        self.total_target_seconds = 3600 # 1 hora
        self.simulated_elapsed_seconds = 0.0
        self.real_start_time = None
        
        self.personas = PERSONAS
        self.current_persona_idx = 0
        self.current_persona = self.personas[0]
        self.last_thought = "Iniciando gemelo digital de Habana 14..."
        self.last_action_text = "Esperando arranque..."
        
        # Métricas
        self.latencies: List[float] = []
        self.total_actions = 0
        self.total_toggles = 0
        self.anomalies_count = 0
        self.frustration_score = 0  # 0 a 100
        
        # Logs de eventos para el streaming web
        self.event_logs: List[Dict[str, Any]] = []
        
        self._thread = None
        self._stop_event = threading.Event()
        self.report_path = None
        self.council_results: Dict[str, str] = {}

    def add_log(self, source: str, message: str, level: str = "info"):
        now_str = datetime.now().strftime("%H:%M:%S")
        entry = {
            "time": now_str,
            "source": source,
            "message": message,
            "level": level
        }
        self.event_logs.append(entry)
        if len(self.event_logs) > 150:
            self.event_logs.pop(0)

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.is_paused = False
        self.is_generating_report = False
        self._stop_event.clear()
        self.real_start_time = time.time()
        self.add_log("SISTEMA", "🚀 Simulación iniciada en modo Sandbox Aislado (0 interferencia física).", "success")
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def set_speed(self, multiplier: float):
        self.speed_multiplier = max(1.0, min(multiplier, 25.0))
        self.add_log("CONTROL", f"⏩ Velocidad ajustada a {self.speed_multiplier:.0f}x.", "warning")

    def toggle_pause(self):
        self.is_paused = not self.is_paused
        status = "Pausada" if self.is_paused else "Reanudada"
        self.add_log("CONTROL", f"⏸️ Simulación {status}.", "info")

    def reset_and_start(self):
        self._stop_event.set()
        self.is_running = False
        time.sleep(0.3)
        self.simulated_elapsed_seconds = 0.0
        self.latencies = []
        self.total_actions = 0
        self.total_toggles = 0
        self.anomalies_count = 0
        self.frustration_score = 0
        self.report_path = None
        self.council_results = {}
        self.is_generating_report = False
        self.last_thought = "Iniciando nueva sesión de pruebas..."
        self.last_action_text = "Esperando..."
        self.start()

    def stop_and_finalize(self):
        if not self.is_running and not self.is_generating_report:
            return
        self.is_running = False
        self.is_generating_report = True
        self._stop_event.set()
        self.add_log("SISTEMA", "🛑 Deteniendo simulación. Convocando al Consejo de Especialistas...", "warning")
        
        threading.Thread(target=self._run_council_audit, daemon=True).start()

    def run_immediate_audit(self):
        """Permite auditar el estado actual sin esperar a que termine la simulación."""
        if self.is_generating_report:
            return
        self.is_generating_report = True
        self.add_log("CONSEJO", "👥 Convocando al Consejo de Agentes Especialistas a demanda...", "info")
        threading.Thread(target=self._run_council_audit, daemon=True).start()

    def _run_council_audit(self):
        avg_lat = round(sum(self.latencies) / len(self.latencies), 2) if self.latencies else 3.2
        max_lat = round(max(self.latencies), 2) if self.latencies else 4.5
        
        metrics = {
            "elapsed_seconds": int(self.simulated_elapsed_seconds),
            "elapsed_str": str(timedelta(seconds=int(self.simulated_elapsed_seconds))),
            "speed_multiplier": self.speed_multiplier,
            "total_actions": self.total_actions,
            "total_toggles": self.total_toggles,
            "avg_latency_ms": avg_lat,
            "max_latency_ms": max_lat,
            "frustration_score": int(self.frustration_score),
            "anomalies_count": self.anomalies_count,
            "model_used": self.ollama.model_name if self.ollama.is_connected else "Heurístico Local",
            "recent_logs_text": "\n".join([f"[{l['time']}] [{l['source']}] {l['message']}" for l in self.event_logs[-40:]])
        }

        self.council_status_msg = "⚡ Agente 1: Auditando rendimiento del motor Z2M..."
        self.add_log("CONSEJO", self.council_status_msg, "info")
        
        # Ejecutar la mesa redonda multi-agente
        self.council_results = self.council.run_full_council_audit(metrics)
        
        self.council_status_msg = "💾 Guardando informe consolidado en Obsidian..."
        self.report_path = save_report_to_obsidian(metrics, self.council_results)
        
        self.is_generating_report = False
        self.council_status_msg = "Dictamen finalizado"
        self.add_log("OBSIDIAN", f"📄 Informe del Consejo guardado con éxito en: {self.report_path}", "success")

    def trigger_chaos(self):
        chaos_types = [
            "rapid_switch_bounce",
            "zigbee_packet_loss",
            "midnight_sensor_flash"
        ]
        chosen = random.choice(chaos_types)
        
        if chosen == "rapid_switch_bounce":
            cur_room = self.house.active_human_room
            self.add_log("CHAOS", f"⚡ [Rebote Mecánico] Simulando 4 pulsaciones Z2M en 25ms en {cur_room}!", "danger")
            for _ in range(4):
                res = self.house.toggle_light(cur_room)
                self.latencies.append(res.get("latency_ms", 3.0))
            self.total_toggles += 4
            self.total_actions += 4
            self.frustration_score = min(100, self.frustration_score + 3)
            
        elif chosen == "zigbee_packet_loss":
            self.add_log("CHAOS", "📡 [Caída de Red] Simulando retardo de red Zigbee de 350ms...", "warning")
            time.sleep(0.05)
            self.latencies.append(350.0)
            self.frustration_score = min(100, self.frustration_score + 5)
            self.anomalies_count += 1
            
        elif chosen == "midnight_sensor_flash":
            self.add_log("CHAOS", "👻 [Falso Positivo] Sensor de presencia activado sin presencia real.", "warning")
            self.frustration_score = min(100, self.frustration_score + 2)

    def _run_loop(self):
        base_step_interval = 2.0
        
        while not self._stop_event.is_set():
            if self.is_paused:
                time.sleep(0.2)
                continue

            step_sim_seconds = base_step_interval * self.speed_multiplier
            self.simulated_elapsed_seconds += step_sim_seconds

            persona_cycle = int((self.simulated_elapsed_seconds // 900) % len(self.personas))
            if persona_cycle != self.current_persona_idx:
                self.current_persona_idx = persona_cycle
                self.current_persona = self.personas[self.current_persona_idx]
                self.add_log("AGENTE", f"🎭 Cambio de habitante sintético: Ahora actúa '{self.current_persona['name']}'.", "info")

            sim_clock = (datetime(2026, 11, 4, 18, 0, 0) + timedelta(seconds=int(self.simulated_elapsed_seconds))).strftime("%H:%M:%S")

            snapshot = self.house.get_snapshot()
            decision = self.ollama.decide_next_action(self.current_persona, snapshot, sim_clock)
            self.last_thought = decision.get("thought", "Observando el entorno...")

            act_type = decision.get("type", "move_room")
            target_room = decision.get("room", self.house.active_human_room)

            if act_type == "move_room":
                self.house.set_human_presence(target_room)
                self.last_action_text = f"Caminando hacia {self.house.rooms.get(target_room, {}).get('name', target_room)}"
                self.add_log("HUMANO", f"🚶 Se desplaza a {target_room}. Presencia activada.", "info")
                self.total_actions += 1

            elif act_type == "toggle_light":
                res = self.house.toggle_light(target_room)
                lat = res.get("latency_ms", 3.0)
                self.latencies.append(lat)
                self.total_toggles += 1
                self.total_actions += 1
                self.last_action_text = f"Conmutada {target_room} -> {res.get('new_state')} ({lat} ms)"
                self.add_log("Z2M_ENGINE", f"💡 Pulsación física en {target_room}: {res.get('new_state')} en {lat} ms.", "success")
                
                if lat > 20.0:
                    self.frustration_score = min(100, self.frustration_score + 4)
                elif self.frustration_score > 0:
                    self.frustration_score = max(0, self.frustration_score - 1)

            elif act_type == "rapid_switch_toggle":
                self.last_action_text = f"Prueba de estrés: pulsaciones rápidas en {target_room}"
                for _ in range(3):
                    r = self.house.toggle_light(target_room)
                    self.latencies.append(r.get("latency_ms", 3.2))
                self.total_toggles += 3
                self.total_actions += 3
                self.add_log("TESTER", f"⚡ Doble-clic rápido en {target_room} para probar rechazo de bucles.", "warning")

            elif act_type == "voice_command":
                cmd = decision.get("command", "Hola Habana")
                self.last_action_text = f"Comando de voz: '{cmd}'"
                self.add_log("VOZ", f"🗣️ Humano dice a Habana: '{cmd}'", "info")
                self.total_actions += 1

            if self.simulated_elapsed_seconds >= self.total_target_seconds:
                self.add_log("SISTEMA", "🎉 ¡1 Hora simulada completada con éxito!", "success")
                self.stop_and_finalize()
                break

            real_wait = max(0.08, base_step_interval / self.speed_multiplier)
            time.sleep(real_wait)

    def get_ui_state(self) -> Dict[str, Any]:
        avg_lat = round(sum(self.latencies) / len(self.latencies), 2) if self.latencies else 3.2
        max_lat = round(max(self.latencies), 2) if self.latencies else 4.1
        
        sim_clock = (datetime(2026, 11, 4, 18, 0, 0) + timedelta(seconds=int(self.simulated_elapsed_seconds))).strftime("%H:%M:%S")
        progress_pct = round(min(100.0, (self.simulated_elapsed_seconds / self.total_target_seconds) * 100), 1)

        return {
            "is_running": self.is_running,
            "is_paused": self.is_paused,
            "is_generating_report": self.is_generating_report,
            "council_status_msg": self.council_status_msg,
            "speed_multiplier": self.speed_multiplier,
            "elapsed_seconds": int(self.simulated_elapsed_seconds),
            "elapsed_str": str(timedelta(seconds=int(self.simulated_elapsed_seconds))),
            "sim_clock": sim_clock,
            "progress_pct": progress_pct,
            "current_persona": self.current_persona,
            "last_thought": self.last_thought,
            "last_action_text": self.last_action_text,
            "ollama_connected": self.ollama.is_connected,
            "ollama_model": self.ollama.model_name,
            "total_actions": self.total_actions,
            "total_toggles": self.total_toggles,
            "avg_latency_ms": avg_lat,
            "max_latency_ms": max_lat,
            "frustration_score": int(self.frustration_score),
            "anomalies_count": self.anomalies_count,
            "house": self.house.get_snapshot(),
            "event_logs": self.event_logs[-25:],
            "report_path": self.report_path,
            "council_results": self.council_results,
            "autorefine": self.refiner.get_state()
        }
