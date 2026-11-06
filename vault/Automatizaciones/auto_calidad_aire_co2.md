---
id: auto_calidad_aire_co2
nombre: "Alerta Ventilación por Nivel Alto de CO2"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Alerta Ventilación por Nivel Alto de CO2

Avisa cuando el nivel de dióxido de carbono en el salón supera los 1000 ppm recomendados.

- **Disparador**: `{"type": "sensor", "entity_id": "sensor_clima_co2_salon", "to_state": "warning"}`
- **Acciones**: `[{"type": "tts", "text": "El nivel de CO2 en el salón es elevado. Se recomienda abrir las ventanas durante unos minutos para renovar el aire."}]`
- **Última ejecución**: `N/A`
