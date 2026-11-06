---
id: auto_eco_clima_ventana
nombre: "Eco-Clima: Ventana Abierta con Climatización"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Eco-Clima: Ventana Abierta con Climatización

Recuerda cerrar la ventana del salón si se abre mientras la estancia está climatizada.

- **Disparador**: `{"type": "sensor", "entity_id": "sensor_ventana_salon", "to_state": "open"}`
- **Acciones**: `[{"type": "tts", "text": "Ventana del salón abierta. Recuerde mantenerla cerrada para no perder climatización."}]`
- **Última ejecución**: `N/A`
