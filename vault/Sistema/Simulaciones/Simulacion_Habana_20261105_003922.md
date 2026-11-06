---
tipo: test_simulacion
sistema: Habana 14
fecha: 2026-11-05 00:39:22
duracion_segundos: 3600
velocidad_max: 10.0x
acciones_totales: 233
latencia_media_ms: 6.79
frustracion_score: 0
tags:
  - habana/sandbox
  - test/stress
  - ollama/auditoria
---

# 🧪 Informe de Simulación y Pruebas Habana 14 (Sandbox)

> **Fecha de Ejecución**: 05/11/2026 00:39:22  
> **Modo**: Sandbox Digital Twin Aislado (0 interferencia en casa física)  
> **Entorno de IA**: Ollama Local (llama3.2:latest)  

---

## 📊 1. Resumen Ejecutivo de Métricas

| Métrica | Valor Obtenido | Umbral de Salud |
| :--- | :--- | :--- |
| **Tiempo Simulado Transcurrido** | `1:00:00` | Planificado: 1 hora |
| **Acciones Humanas Ejecutadas** | `233` eventos | - |
| **Conmutadas Físicas Probadas** | `105` pulsaciones | > 50 |
| **Latencia Media Z2M Engine** | **`6.79 ms`** | < 10 ms (Meta Habana: < 4 ms) |
| **Latencia Máxima Z2M** | **`350.0 ms`** | < 50 ms |
| **Índice de Confort del Usuario** | **`100 / 100`** | > 85 / 100 |
| **Incidentes / Anomalías** | **`1`** | 0 crítico |

---

## 🤖 2. Dictamen Forense del Agente Auditor (Ollama)

**Veredicto de Auditoría Forense**

### Conclusión general sobre la estabilidad y fluidez de Habana

En general, los resultados de la sesión de pruebas muestran que Habana presenta una buena estabilidad y fluidez, con una latencia media conmutada Z2M de 6.79 ms y una frustración final del usuario del 0%. Esto indica que el sistema está funcionando de manera eficiente y sin errores significativos. Sin embargo, es importante destacar que la latencia máxima registrada de 350.0 ms es un poco más alta de lo esperado, lo que podría ser un indicador de problemas de escalabilidad o sobrecarga en ciertas situaciones.

### Análisis de las conmutadas y tiempos de respuesta

La cantidad de acciones totales y conmutadas ejecutadas es de 233 y 105, respectivamente, lo que sugiere que el sistema está procesando una cantidad significativa de tráfico. La latencia media conmutada Z2M es de 6.79 ms, lo que es razonable para una respuesta rápida y eficiente. Sin embargo, la latencia máxima registrada de 350.0 ms es un poco más alta de lo esperado, lo que podría indicar problemas de escalabilidad o sobrecarga en ciertas situaciones. Es importante investigar y entender las causas de esta latencia para poder tomar medidas correctivas.

### Recomendaciones o puntos a vigilar para producción

En base a los resultados de la sesión de pruebas, se recomienda vigilar los siguientes puntos para asegurar la estabilidad y fluidez de Habana en producción:

* **Monitorear la latencia máxima**: Es importante monitorear la latencia máxima registrada para detectar cualquier problema de escalabilidad o sobrecarga.
* **Investigar

---

## 📋 3. Registro de Eventos Destacados y Caos

```log
[00:36:32] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:36:36] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:36:40] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:36:45] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:36:49] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:36:54] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:36:58] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:37:03] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:37:07] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:37:12] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:37:16] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:37:20] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:37:25] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:37:29] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:37:34] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:37:38] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:37:43] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:37:47] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:37:51] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:37:56] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:38:00] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:38:05] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:38:09] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:38:14] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:38:18] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:38:22] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:38:27] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:38:31] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:38:36] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:38:40] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:38:45] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:38:49] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:38:53] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:38:58] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:39:02] [HUMANO] 🚶 Se desplaza a bano. Presencia activada.
[00:39:07] [HUMANO] 🚶 Se desplaza a cocina. Presencia activada.
[00:39:07] [AGENTE] 🎭 Cambio de habitante sintético: Ahora actúa 'Tomás (Habitante Habitual)'.
[00:39:11] [HUMANO] 🚶 Se desplaza a entrada. Presencia activada.
[00:39:11] [SISTEMA] 🎉 ¡1 Hora simulada completada con éxito!
[00:39:11] [SISTEMA] 🛑 Deteniendo simulación y compilando informe forense...
```

---
*Generado automáticamente por Habana Sandbox Runner.*
