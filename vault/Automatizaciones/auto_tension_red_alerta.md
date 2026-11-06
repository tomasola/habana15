---
id: auto_tension_red_alerta
nombre: "Alerta por Caída de Tensión 230V"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Alerta por Caída de Tensión 230V

Monitoriza la estabilidad eléctrica de la vivienda y avisa si el voltaje desciende por debajo de 200V.

- **Disparador**: `{"type": "sensor", "entity_id": "monitor_tension_general", "to_state": "warning"}`
- **Acciones**: `[{"type": "tts", "text": "Aviso técnico. Detectada caída anormal de tensión en el suministro eléctrico general."}]`
- **Última ejecución**: `N/A`
