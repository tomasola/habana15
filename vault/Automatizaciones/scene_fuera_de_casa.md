---
id: scene_fuera_de_casa
nombre: "Modo Salir / Fuera de Casa"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Modo Salir / Fuera de Casa

Apagado maestro total de iluminación, cierre de persianas y armado completo de seguridad perimetral.

- **Disparador**: `{"type": "manual"}`
- **Acciones**: `[{"type": "device", "entity_id": "luz_luz_principal_del_salon_53c1", "action": "turn_off"}, {"type": "device", "entity_id": "luz_luz_del_comedor_d9b2", "action": "turn_off"}, {"type": "device", "entity_id": "luz_techo_cocina", "action": "turn_off"}, {"type": "device", "entity_id": "luz_techo_pasillo", "action": "turn_off"}, {"type": "device", "entity_id": "luz_lazos_andrea", "action": "turn_off"}, {"type": "device", "entity_id": "cover.persiana_salon", "action": "close_cover"}, {"type": "device", "entity_id": "cover.persiana_principal", "action": "close_cover"}, {"type": "device", "entity_id": "cover.persiana_andrea", "action": "close_cover"}, {"type": "tts", "text": "Modo salir activado. Toda la casa apagada y vigilancia perimetral armada."}]`
- **Última ejecución**: `None`
