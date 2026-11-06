import os
import sys
import time
import json
import copy
import random
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "llama3.2:latest"

VAULT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vault")
SIM_DIR = os.path.join(VAULT_DIR, "Sistema", "Simulaciones")

class AutoRefiner:
    """Motor de Auto-Optimización Evolutiva Continua para el Sandbox Habana 14.
    
    CRITERIOS DE PARADA:
    1. CONVERGENCIA: La IA determina que ya no hay mejoras posibles o el score toca techo.
    2. MANUAL: El usuario pulsa 'Detener Bucle'.
    3. ROTURA / FALLO: Una modificación empeora drásticamente el sistema o causa excepción -> Rollback inmediato.
    """
    def __init__(self, simulation_engine):
        self.engine = simulation_engine
        
        # Parámetros sintonizables del motor Sandbox
        self.current_params: Dict[str, Any] = {
            "debounce_ms": 25,
            "cache_ttl_s": 30,
            "concurrency_workers": 2,
            "circadian_ramp_s": 0.4,
            "packet_loss_recovery_ms": 200,
            "event_priority_queue": True
        }
        
        # Historial de versiones para Rollback
        self.param_history: List[Dict[str, Any]] = [copy.deepcopy(self.current_params)]
        self.iteration_history: List[Dict[str, Any]] = []
        
        self.is_running = False
        self.status = "IDLE"  # IDLE, TESTING, ANALYZING, APPLYING, CONVERGED, USER_STOPPED, BROKEN
        self.status_message = "Listo para iniciar auto-optimización."
        self.current_iteration = 0
        self.max_iterations = 8
        self.active_candidate_improvement = ""
        self.last_score = 0.0
        
        self._stop_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None
        self.report_path: Optional[str] = None

    def start_loop(self):
        if self.is_running:
            return
        self.is_running = True
        self._stop_event.clear()
        self.status = "TESTING"
        self.status_message = "Iniciando bucle de optimización evolutiva..."
        self.current_iteration = 0
        self.iteration_history = []
        self._worker_thread = threading.Thread(target=self._run_evolutionary_loop, daemon=True)
        self._worker_thread.start()

    def stop_loop(self, reason: str = "Detenido por el usuario"):
        self.is_running = False
        self._stop_event.set()
        self.status = "USER_STOPPED"
        self.status_message = f"🛑 {reason}"
        self.engine.add_log("AUTOREFINER", f"Bucle detenido: {reason}", "warning")

    def _calculate_score(self, avg_lat: float, frustration: float, anomalies: int) -> float:
        """Calcula el Fitness Score de 0 a 100 con penalizaciones rigurosas."""
        score = 100.0 - (avg_lat * 2.5) - (frustration * 0.4) - (anomalies * 25.0)
        return max(0.0, min(100.0, round(score, 1)))

    def _run_test_round(self, actions_count: int = 40) -> Dict[str, Any]:
        """Ejecuta una ronda de prueba acelerada controlada dentro del Sandbox."""
        latencies = []
        anomalies = 0
        cur_room = self.engine.house.active_human_room
        
        # Simular ráfaga de conmutadas y eventos bajo los parámetros actuales
        debounce = self.current_params.get("debounce_ms", 25)
        
        for i in range(actions_count):
            if self._stop_event.is_set():
                break
            
            # Simular posible estrés o conmutada
            t0 = time.perf_counter()
            res = self.engine.house.toggle_light(cur_room)
            base_lat = res.get("latency_ms", 3.0)
            
            # Simular efecto de debounce y worker queue en latencia
            adjusted_lat = base_lat + (debounce / 1000.0 * 5.0)
            
            # Inyectar una pequeña perturbación aleatoria para comprobar resiliencia
            if i % 15 == 0:
                adjusted_lat += random.uniform(1.0, 3.5)
            
            # Simular posible anomalía si el debounce es menor a 15ms (rebote)
            if debounce < 15 and random.random() < 0.25:
                anomalies += 1
                adjusted_lat += 80.0
                
            latencies.append(adjusted_lat)
            time.sleep(0.02) # Ejecución ultrarrápida
            
        avg_lat = round(sum(latencies) / len(latencies), 2) if latencies else 3.2
        max_lat = round(max(latencies), 2) if latencies else 4.0
        frustration = min(100, int(anomalies * 15 + max(0, (avg_lat - 4.0) * 8)))
        
        score = self._calculate_score(avg_lat, frustration, anomalies)
        return {
            "avg_latency_ms": avg_lat,
            "max_latency_ms": max_lat,
            "anomalies": anomalies,
            "frustration": frustration,
            "score": score
        }

    def _query_ollama_for_improvements(self, iteration: int, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Pide a Ollama una lista de posibles mejoras y la mejor candidata."""
        prompt = f"""Eres el Optimizador Autónomo de Habana 14.
Iteración actual: #{iteration}.
Parámetros actuales del Sandbox:
{json.dumps(self.current_params, indent=2)}

Métricas obtenidas en la prueba de estrés:
- Score: {metrics['score']}/100
- Latencia media: {metrics['avg_latency_ms']} ms (Objetivo < 4 ms)
- Latencia máxima: {metrics['max_latency_ms']} ms
- Anomalías / Rebotes detectados: {metrics['anomalies']}
- Frustración: {metrics['frustration']}/100

¿Es posible seguir mejorando el sistema o ya se ha alcanzado la convergencia óptima?
Responde ÚNICAMENTE un JSON válido con esta estructura:
{{
  "converged": true | false,
  "reason": "Explicación breve de por qué se converge o qué se va a mejorar",
  "candidate_improvements": [
    "Mejora 1...",
    "Mejora 2..."
  ],
  "best_patch": {{
    "param_name": "debounce_ms" | "cache_ttl_s" | "concurrency_workers" | "circadian_ramp_s",
    "new_value": numero_o_valor,
    "expected_gain": "Qué esperamos que mejore"
  }}
}}"""

        try:
            r = requests.post(
                OLLAMA_URL,
                json={
                    "model": DEFAULT_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.2, "num_predict": 300}
                },
                timeout=15.0
            )
            if r.status_code == 200:
                data = json.loads(r.json().get("response", "{}"))
                if "converged" in data:
                    return data
        except Exception:
            pass

        # Heurística de respaldo evolutiva si Ollama no responde
        debounce = self.current_params["debounce_ms"]
        if metrics["anomalies"] > 0 and debounce < 40:
            return {
                "converged": False,
                "reason": "Detectados rebotes mecánicos; aumentando ventana de debounce para filtrar ruido.",
                "candidate_improvements": ["Aumentar debounce_ms a 32ms", "Activar buffer circular"],
                "best_patch": {"param_name": "debounce_ms", "new_value": min(50, debounce + 6), "expected_gain": "0% rebotes"}
            }
        elif metrics["avg_latency_ms"] > 3.5 and debounce > 18:
            return {
                "converged": False,
                "reason": "Latencia algo alta; reduciendo debounce para acercarse al objetivo de <3 ms.",
                "candidate_improvements": ["Reducir debounce_ms a 20ms", "Ampliar cache_ttl"],
                "best_patch": {"param_name": "debounce_ms", "new_value": max(18, debounce - 4), "expected_gain": "-0.4 ms latencia"}
            }
        else:
            return {
                "converged": True,
                "reason": "Sistema en equilibrio perfecto. Latencia y tasa de rebotes óptimas. Techo de rendimiento alcanzado.",
                "candidate_improvements": [],
                "best_patch": None
            }

    def _run_evolutionary_loop(self):
        self.engine.add_log("AUTOREFINER", "🧬 Iniciando ciclo de auto-optimización continua...", "success")
        
        while self.is_running and self.current_iteration < self.max_iterations:
            if self._stop_event.is_set():
                break

            self.current_iteration += 1
            iter_num = self.current_iteration
            self.status = "TESTING"
            self.status_message = f"🧪 Iteración #{iter_num}: Ejecutando batería de pruebas..."
            self.engine.add_log("AUTOREFINER", f"Iteración #{iter_num}: Evaluando parámetros...", "info")

            # 1. Ejecutar prueba
            try:
                metrics = self._run_test_round(actions_count=35)
            except Exception as e:
                # SE ROMPIÓ -> Detención y Rollback
                self._handle_crash(f"Excepción en ejecución de test: {e}")
                return

            score = metrics["score"]
            self.last_score = score

            # Comprobar si hubo regresión grave frente a la iteración anterior
            if self.iteration_history:
                prev_score = self.iteration_history[-1]["score"]
                if score < (prev_score - 15.0):
                    # SE ROMPIÓ POR REGRESIÓN DE RENDIMIENTO
                    self._handle_crash(f"Regresión crítica: Score cayó de {prev_score} a {score}. Parámetro inestable.")
                    return

            # 2. Análisis con Consejo / Ollama
            self.status = "ANALYZING"
            self.status_message = f"🤖 Iteración #{iter_num}: El Consejo analiza debilidades y mejoras..."
            
            analysis = self._query_ollama_for_improvements(iter_num, metrics)
            converged = analysis.get("converged", False)
            reason = analysis.get("reason", "")
            candidates = analysis.get("candidate_improvements", [])
            best_patch = analysis.get("best_patch")

            # Registrar iteración
            iter_record = {
                "iteration": iter_num,
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "params": copy.deepcopy(self.current_params),
                "metrics": metrics,
                "score": score,
                "reason": reason,
                "candidates": candidates,
                "patch_applied": best_patch
            }
            self.iteration_history.append(iter_record)

            # CRITERIO 1: CONVERGENCIA ALCANZADA
            if converged or not best_patch:
                self.is_running = False
                self.status = "CONVERGED"
                self.status_message = f"🏆 Techo Óptimo Alcanzado (Score: {score}/100). {reason}"
                self.engine.add_log("AUTOREFINER", f"✅ Convergencia: {reason}", "success")
                self._export_summary_to_obsidian()
                return

            # CRITERIO 2: EL USUARIO PULSÓ DETENER
            if self._stop_event.is_set():
                break

            # 3. Aplicar mejora (Fase de Staging)
            self.status = "APPLYING"
            p_name = best_patch.get("param_name")
            p_val = best_patch.get("new_value")
            
            if p_name in self.current_params:
                old_val = self.current_params[p_name]
                # Guardar snapshot para posible rollback
                self.param_history.append(copy.deepcopy(self.current_params))
                self.current_params[p_name] = p_val
                
                self.active_candidate_improvement = f"{p_name}: {old_val} ➜ {p_val} ({best_patch.get('expected_gain')})"
                self.status_message = f"⚙️ Aplicando parche: {self.active_candidate_improvement}"
                self.engine.add_log("AUTOREFINER", f"Parche aplicado: {self.active_candidate_improvement}", "warning")
                time.sleep(1.2) # Pausa visual para ver el cambio
            else:
                self.active_candidate_improvement = "Sin cambios de parámetros requeridos"

        # Fin por límite de iteraciones
        if self.is_running:
            self.is_running = False
            self.status = "CONVERGED"
            self.status_message = f"🏁 Completadas {self.max_iterations} iteraciones de optimización."
            self._export_summary_to_obsidian()

    def _handle_crash(self, error_desc: str):
        """Maneja la condición de parada: SE ROMPIÓ -> Rollback automático."""
        self.is_running = False
        self.status = "BROKEN"
        self.status_message = f"💥 Se rompió: {error_desc}. Ejecutando Rollback automático."
        self.engine.add_log("AUTOREFINER", f"ALERTA: {error_desc}", "danger")
        
        # Rollback al último estado seguro
        if len(self.param_history) > 1:
            self.current_params = copy.deepcopy(self.param_history[-2])
            self.engine.add_log("AUTOREFINER", "🛡️ Rollback completado: Parámetros restaurados al último estado estable.", "success")
        
        self._export_summary_to_obsidian(broke=True, error_detail=error_desc)

    def _export_summary_to_obsidian(self, broke: bool = False, error_detail: str = ""):
        os.makedirs(SIM_DIR, exist_ok=True)
        now = datetime.now()
        filename = f"Optimizacion_Autonoma_{now.strftime('%Y%m%d_%H%M%S')}.md"
        filepath = os.path.join(SIM_DIR, filename)

        status_label = "💥 Detenido por Fallo (Rollback Aplicado)" if broke else ("🏆 Convergencia Óptima Alcanzada" if self.status == "CONVERGED" else "🛑 Detenido por Usuario")

        rows = []
        for it in self.iteration_history:
            m = it["metrics"]
            p = it.get("patch_applied")
            patch_str = f"`{p['param_name']}={p['new_value']}`" if p else "Ninguno"
            rows.append(f"| #{it['iteration']} | **{it['score']}/100** | {m['avg_latency_ms']} ms | {m['anomalies']} | {patch_str} | {it['reason'][:60]}... |")

        table_md = "\n".join(rows)

        if broke:
            conclusion_text = f"> ⚠️ **Motivo de Ruptura / Fallo**: {error_detail}\n> Se ejecutó un **Rollback Automático** para salvaguardar la estabilidad."
        else:
            conclusion_text = "> ✅ **Conclusión**: El sistema iteró de forma autónoma hasta encontrar el punto de equilibrio óptimo entre latencia física de conmutadas y rechazo de rebote mecánico."

        content = f"""---
tipo: optimizacion_autonoma
sistema: Habana 14 Sandbox
fecha: {now.strftime('%Y-%m-%d %H:%M:%S')}
iteraciones: {self.current_iteration}
score_final: {self.last_score}
estado: {self.status}
tags:
  - habana/sandbox
  - optimizacion/autonoma
  - ollama/evolutivo
---

# 🧬 Informe de Auto-Optimización Continua (Sandbox Habana 14)

> **Resultado Final**: `{status_label}`  
> **Fecha**: {now.strftime('%d/%m/%Y %H:%M:%S')}  
> **Iteraciones Ejecutadas**: {self.current_iteration} de {self.max_iterations}  
> **Puntuación Final Alcanzada**: **{self.last_score} / 100**  
> **Seguridad**: Código real de Habana 14 inmutable. Modificaciones confinadas en Sandbox.

---

## 📊 1. Progresión de Iteraciones y Fitness Score

| Iteración | Score (0-100) | Latencia Media | Anomalías | Parche Aplicado | Veredicto del Consejo |
| :---: | :---: | :---: | :---: | :--- | :--- |
{table_md}

---

## ⚙️ 2. Configuración Óptima Consolidada (Parámetros Sandbox)

```json
{json.dumps(self.current_params, indent=2)}
```

---

## 📋 3. Detalle de Finalización

{conclusion_text}

---
*Generado automáticamente por el AutoRefiner de Habana 14.*
"""
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            self.report_path = filepath
            self.engine.add_log("OBSIDIAN", f"📄 Informe evolutivo guardado en: {filepath}", "success")
        except Exception as e:
            print(f"[AutoRefiner] Error guardando en Obsidian: {e}")

    def get_state(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "status": self.status,
            "status_message": self.status_message,
            "current_iteration": self.current_iteration,
            "max_iterations": self.max_iterations,
            "last_score": self.last_score,
            "active_candidate_improvement": self.active_candidate_improvement,
            "current_params": self.current_params,
            "iteration_history": self.iteration_history,
            "report_path": self.report_path
        }
