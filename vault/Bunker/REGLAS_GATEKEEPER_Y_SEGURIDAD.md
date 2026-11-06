---
tipo: reglas_seguridad
sistema: HABANA Búnker IA
actualizado: 2026-11-02
tags:
  - bunker
  - seguridad
  - gatekeeper
  - firewall
---

# 🔒 Reglas del Gatekeeper y Seguridad del Búnker

El **Gatekeeper** (`backend/app/bunker/gatekeeper.py`) es el cortafuegos domótico que se sitúa entre el código o los widgets generados por la IA y el hardware real de la casa (Zigbee2MQTT, relés, persianas y altavoces).

---

## 🛡️ 1. Principios de Protección

1. **Aislamiento Total**: Ningún widget puede ejecutar código arbitrario del sistema operativo ni llamadas a `subprocess.Popen` no autorizadas.
2. **Validación de Entidades**: Antes de emitir una orden hacia un interruptor o relé, el Gatekeeper comprueba que el `entity_id` pertenezca al catálogo oficial de dispositivos registrados en la casa.
3. **Control de Bucles (Anti-Loop)**: Si un widget emite más de **20 acciones en menos de 2 segundos**, el Gatekeeper corta el flujo temporalmente para proteger el coordinador Zigbee (Dongle COM9) de saturación de buffers.

---

## 🚫 2. Operaciones Prohibidas (Blacklist)

Bajo ninguna circunstancia el Gatekeeper aceptará:
- Modificación directa de archivos del sistema operativo fuera de `backend/config/bunker_manifest.json` y `vault/Bunker/`.
- Acciones de reseteo de fábrica de dispositivos Zigbee (`permit_join`, `factory_reset`).
- Órdenes de apagado o reinicio del PC anfitrión (`shutdown`, `reboot`).
- Manipulación de puertos o detención de brokers (`kill_broker`, `stop_mqtt`).

---

## ✅ 3. Servicios Permitidos (Whitelist)

El Gatekeeper autoriza exclusivamente las siguientes operaciones:

| Servicio | Acción | Entidades Válidas | Efecto |
|---|---|---|---|
| `light` | `turn_on` / `turn_off` | `all_lights`, o cualquier ID de `vault/Dispositivos/` | Conmuta luces individuales o generales |
| `cover` | `open` / `close` / `stop` | `all_covers`, `cover.persiana_salon`, `cover.persiana_andrea`, `cover.persiana_principal` | Maniobra persianas motorizadas |
| `radio` | `toggle` / `play` / `stop` | `radio_master`, emisoras de `RADIO_STATIONS` | Streaming de audio en PC y navegadores |
| `scene` | `activate` | `modo_cine`, `modo_relax`, `scene_good_morning`, etc. | Ajustes de escena lumínica y persianas |
| `tts`   | `speak` | Altavoces locales / web | Síntesis de voz informativa para el usuario |

---

## 🔌 4. Comportamiento del Kill Switch

El Kill Switch es la última línea de defensa:
- Se conmuta desde la cabecera del Búnker (`🔌 BÚNKER: ACTIVO / AISLADO`).
- Cuando está en modo **AISLADO**:
  - Toda llamada a `/api/bunker/execute-action` o `/api/bunker/widgets/*/execute` devuelve inmediatamente un error HTTP 400: *"El Búnker está AISLADO por el Kill Switch"*.
  - Las luces y persianas físicas no reciben ningún comando.
  - El usuario puede seguir inspeccionando o editando widgets visualmente sin peligro.

Enlace al catálogo: [[Bunker/CATALOGO_DISPOSITIVOS_Y_ENTIDADES]]
Enlace al índice del Búnker: [[Bunker/00_INDICE_BUNKER]]
