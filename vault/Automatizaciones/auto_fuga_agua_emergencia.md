---
id: auto_fuga_agua_emergencia
nombre: "Protocolo de Emergencia por Fuga de Agua"
activo: false
tipo: automation
tags:
  - automatizacion
  - regla
---

# Protocolo de Emergencia por Fuga de Agua

Si el sensor de la lavadora o baño detecta agua, avisa por altavoces y WhatsApp inmediatamente.

- **Disparador**: `{"type": "sensor", "entity_id": "sensor_fuga_lavadora", "to_state": "leak"}`
- **Acciones**: `[{"type": "tts", "text": "¡Atención! Se ha detectado una fuga de agua en la zona de lavadora. Compruebe la instalación de inmediato."}, {"type": "whatsapp", "text": "🚨 ALERTA HABANA: Fuga de agua detectada en cocina/lavadora. Actuación requerida."}]`
- **Última ejecución**: `2026-10-25T08:46:49.653234`
