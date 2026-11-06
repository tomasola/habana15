---
id: auto_camara_cam720_salon
nombre: "Luz Nocturna Salón por Visión Cam720"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Luz Nocturna Salón por Visión Cam720

Enciende la tira LED del sofá al ver entrar a una persona en el salón (24/7), ignorando a los gatos.

- **Disparador**: `{"type": "camera", "camera_id": "camara_cam720", "event": "person_detected"}`
- **Acciones**: `[{"type": "device", "entity_id": "led_sofa_salon", "action": "turn_on", "brightness": 25, "color_temp_kelvin": 2700}]`
- **Última ejecución**: `2026-10-25T21:57:55.998788`
