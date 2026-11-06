---
id: auto_camara_pasillo_humano
nombre: "Luz Pasillo por Visión de Cámara (Pet-Safe)"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Luz Pasillo por Visión de Cámara (Pet-Safe)

Enciende la luz del pasillo al detectar una persona humana en la cámara (24/7), ignorando a los gatos.

- **Disparador**: `{"type": "camera", "camera_id": "camara_pasillo", "event": "person_detected"}`
- **Acciones**: `[{"type": "device", "entity_id": "led_pasillo_central", "action": "turn_on", "brightness": 60, "color_temp_kelvin": 3000}]`
- **Última ejecución**: `2026-10-25T21:58:14.440660`
