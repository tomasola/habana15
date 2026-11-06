import os
import sys
import datetime
from typing import Dict, Any

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

VAULT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vault")
SIM_DIR = os.path.join(VAULT_DIR, "Sistema", "Simulaciones")

def save_report_to_obsidian(summary: Dict[str, Any], council_results: Dict[str, str]) -> str:
    """Guarda el informe multi-agente en formato Markdown en la bóveda de Obsidian."""
    os.makedirs(SIM_DIR, exist_ok=True)
    now = datetime.datetime.now()
    filename = f"Simulacion_Habana_{now.strftime('%Y%m%d_%H%M%S')}.md"
    filepath = os.path.join(SIM_DIR, filename)

    content = f"""---
tipo: test_simulacion_multiagente
sistema: Habana 14
fecha: {now.strftime('%Y-%m-%d %H:%M:%S')}
duracion_segundos: {summary.get('elapsed_seconds', 0)}
velocidad_max: {summary.get('speed_multiplier', 1)}x
acciones_totales: {summary.get('total_actions', 0)}
latencia_media_ms: {summary.get('avg_latency_ms', 0)}
frustracion_score: {summary.get('frustration_score', 0)}
tags:
  - habana/sandbox
  - test/stress
  - ollama/multiagente
  - consejo/especialistas
---

# 🏛️ Informe de Simulación & Auditoría del Consejo Multi-Agente (Sandbox Habana 14)

> **Fecha de Ejecución**: {now.strftime('%d/%m/%Y %H:%M:%S')}  
> **Modo**: Sandbox Digital Twin Aislado (0 interferencia en casa física)  
> **Motor de IA**: Consejo de Especialistas Ollama Local ({summary.get('model_used', 'Llama 3.2')})  
> **Aislamiento**: Confinado en memoria y broker virtual. Código original de Habana 14 inmutable.

---

## 📊 1. Resumen Ejecutivo de Métricas

| Métrica de Prueba | Valor Obtenido | Umbral de Salud Operativa |
| :--- | :--- | :--- |
| **Tiempo Simulado Transcurrido** | `{summary.get('elapsed_str', '00:00:00')}` | Planificado: 1 hora |
| **Acciones Humanas Ejecutadas** | `{summary.get('total_actions', 0)}` eventos | - |
| **Conmutadas Físicas Probadas** | `{summary.get('total_toggles', 0)}` pulsaciones | > 50 |
| **Latencia Media Z2M Engine** | **`{summary.get('avg_latency_ms', 0)} ms`** | < 10 ms (Meta Habana: < 4 ms) |
| **Latencia Máxima Registrada** | **`{summary.get('max_latency_ms', 0)} ms`** | < 50 ms |
| **Índice de Confort del Usuario** | **`{100 - summary.get('frustration_score', 0)} / 100`** | > 85 / 100 |
| **Incidentes / Anomalías de Red** | **`{summary.get('anomalies_count', 0)}`** | 0 crítico |

---

## 👥 2. Dictamen del Consejo de Agentes Especialistas

### ⚡ Agente 1: Arquitectura de Código & Rendimiento
{council_results.get('performance', 'Sin datos de rendimiento')}

---

### 🛡️ Agente 2: Ciberseguridad & Blindaje de Red
{council_results.get('security', 'Sin datos de seguridad')}

---

### 🎨 Agente 3: Ergonomía, UX Domótica & Confort
{council_results.get('ux', 'Sin datos de UX')}

---

### 🌐 Agente 4: Investigador del Estado del Arte & Benchmarks
{council_results.get('benchmarks', 'Sin datos de investigación externa')}

---

## 💡 3. Propuesta de Mejora Certificada para el Sandbox (Staging)

{council_results.get('proposal', 'Sin propuesta generada')}

> [!NOTE]
> Esta propuesta ha sido evaluada de forma virtual. No altera el código original de producción de Habana 14.

---

## 📋 4. Registro de Eventos y Telemetría Destacada

```log
{summary.get('recent_logs_text', 'Sin logs registrados')}
```

---
*Generado automáticamente por el Consejo Multi-Agente de Habana Sandbox Runner.*
"""

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[ExportObsidian] Reporte guardado con éxito en: {filepath}")
        return filepath
    except Exception as e:
        print(f"[ExportObsidian] Error guardando en Obsidian: {e}")
        return ""
