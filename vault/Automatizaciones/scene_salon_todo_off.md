---
id: scene_salon_todo_off
nombre: "Apagar Todo el Salón"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Apagar Todo el Salón

Apagado completo e instantáneo de todas las luces de techo y tiras LED del salón.

- **Disparador**: `{"type": "manual"}`
- **Acciones**: `[{"type": "device", "entity_id": "luz_luz_principal_del_salon_53c1", "action": "turn_off"}, {"type": "device", "entity_id": "luz_luz_del_comedor_d9b2", "action": "turn_off"}, {"type": "device", "entity_id": "led_sofa_salon", "action": "turn_off"}, {"type": "device", "entity_id": "led_tv_salon", "action": "turn_off"}, {"type": "device", "entity_id": "led_aparador_salon", "action": "turn_off"}]`
- **Última ejecución**: `2026-10-25T10:01:01.069532`
