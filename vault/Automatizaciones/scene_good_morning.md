---
id: scene_good_morning
nombre: "Buenos Días Habana"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Buenos Días Habana

Sube las persianas principales, apaga luces nocturnas y da el parte matutino por voz.

- **Disparador**: `{"type": "time", "time": "05:00", "end_time": "05:30"}`
- **Acciones**: `[{"entity_id": "led_tv_salon", "action": "turn_on", "brightness": 50, "color_temp_kelvin": 2700}, {"entity_id": "led_pasillo_central", "action": "turn_on", "brightness": 37, "color_temp_kelvin": 2700}, {"type": "device", "entity_id": "luz_techo_bano", "action": "turn_on", "brightness": 50, "color_temp_kelvin": 3000, "duration_minutes": 2}]`
- **Última ejecución**: `2026-10-30T05:00:01.447650`
