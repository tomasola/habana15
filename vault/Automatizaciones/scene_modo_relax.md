---
id: scene_modo_relax
nombre: "Modo Relax & Desconexión"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Modo Relax & Desconexión

Iluminación indirecta cálida al 20%, cierre suave de persianas y ambiente acústico relajante.

- **Disparador**: `{"type": "manual"}`
- **Acciones**: `[{"type": "device", "entity_id": "luz_luz_principal_del_salon_53c1", "action": "turn_off"}, {"type": "device", "entity_id": "led_aparador_salon", "action": "turn_on", "brightness": 20, "color_temp_kelvin": 2400}, {"type": "device", "entity_id": "led_sofa_salon", "action": "turn_on", "brightness": 18, "color_temp_kelvin": 2400}, {"type": "device", "entity_id": "cover.persiana_salon", "action": "set_cover_position", "position": 15}, {"type": "tts", "text": "Modo relax activado. Disfruta de tu descanso."}]`
- **Última ejecución**: `N/A`
