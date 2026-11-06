---
id: scene_cinema
nombre: "Modo Cine Salón"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Modo Cine Salón

Baja la persiana del salón, apaga luces de techo y enciende la tira LED del sofá y mueble TV.

- **Disparador**: `{"type": "manual"}`
- **Acciones**: `[{"type": "device", "entity_id": "cover.persiana_salon", "action": "close_cover"}, {"type": "device", "entity_id": "luz_luz_principal_del_salon_53c1", "action": "turn_off"}, {"type": "device", "entity_id": "luz_luz_del_comedor_d9b2", "action": "turn_off"}, {"type": "device", "entity_id": "led_sofa_salon", "action": "turn_on", "brightness": 25, "color_temp_kelvin": 2700}, {"type": "device", "entity_id": "led_tv_salon", "action": "turn_on", "brightness": 35, "color_temp_kelvin": 4000}, {"type": "device", "entity_id": "led_aparador_salon", "action": "turn_off"}, {"type": "tts", "text": "Modo cine activado en el salón. Disfruta de la película."}]`
- **Última ejecución**: `N/A`
