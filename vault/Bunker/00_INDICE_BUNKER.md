---
tipo: bunker_index
sistema: HABANA Búnker IA & Arquitectura Sandbox
version: 1.0
actualizado: 2026-11-02
tags:
  - bunker
  - sandbox
  - ia
  - seguridad
  - cerebro
---

# 🛡️ BÚNKER IA · Arquitectura Sandbox & Entorno Seguro

Bienvenido al centro neurálgico del **Búnker IA** de HABANA. Este entorno aislado permite a la Inteligencia Artificial (Lola, Friday, Ghost o agentes externos) generar, probar y desplegar controles domóticos, widgets y macros complejas **sin ningún riesgo de provocar fallos en el sistema principal ni pantallas negras**.

---

## 🧭 Mapa de Navegación del Búnker

```
                   ┌──────────────────────────────┐
                   │  🛡️ [[Bunker/00_INDICE_BUNKER]]  │
                   └──────────────┬───────────────┘
                                  │
      ┌───────────────────────────┼───────────────────────────┐
      ▼                           ▼                           ▼
📖 [[Bunker/CATALOGO_DISPOSITIVOS_Y_ENTIDADES]]  ⚙️ [[Bunker/GUIA_CREACION_MACROS_Y_WIDGETS]]  🔒 [[Bunker/REGLAS_GATEKEEPER_Y_SEGURIDAD]]
```

Enlace al panel general: [[00_HABANA_CEREBRO_CENTRAL]]

---

## ⚡ Los 4 Pilares del Búnker IA

### 1. 🛡️ Cero Pantalla Negra (`ErrorBoundary` Reforzado)
Cualquier widget generado por la IA se renderiza dentro de un contenedor reactivo protegido en el Frontend (`frontend/src/bunker/DynamicWidgetLoader.jsx` y `BunkerContainer.jsx`).
Si un componente contiene sintaxis inválida, variables indefinidas o excepciones en runtime:
- El error es absorbido de forma silenciosa por el Búnker.
- Se presenta un estado visual de contingencia con mensaje claro.
- **El resto de Habana (Dashboard, Luces, Cámaras, Música) sigue funcionando al 100%**.

### 2. 🔌 Kill Switch Maestro (Aislamiento Físico y Digital)
- **Estado ACTIVO (Verde)**: La IA puede proponer y ejecutar acciones domóticas a través del Gatekeeper.
- **Estado AISLADO (Rojo)**: Se bloquea cualquier llamada saliente del Búnker en menos de 1 ms mediante `/api/bunker/kill-switch`. Ninguna orden llega a los interruptores físicos ni a Zigbee2MQTT.

### 3. 🚦 Gatekeeper (Firewall de Hardware & Anti-Bucles)
Ubicado en `backend/app/bunker/gatekeeper.py`:
- Valida que cada entidad solicitada exista en la casa.
- Impide sobrecarga de comandos (Rate limit: máximo 20 acciones por ráfaga).
- Prohíbe llamadas a servicios peligrosos (reinicio del sistema, flasheo Zigbee o borrado de bases de datos).

### 4. ⏳ Time Machine & Rollback Instantáneo
Cada vez que la IA o el usuario crean o modifican un widget en el Búnker:
- Se genera un snapshot atómico en `backend/config/bunker_manifest.json` y `backend/app/bunker/storage.py`.
- Permite restaurar el estado anterior en 1 clic.
- Opción de **Promocionar a Producción** para convertir un widget experimental en un control permanente de Habana.

---

## 📌 Documentos de Referencia Rápida
- 📋 [[Bunker/CATALOGO_DISPOSITIVOS_Y_ENTIDADES]]: Catálogo completo de luces, persianas, sensores y emisoras de radio disponibles.
- 🛠️ [[Bunker/GUIA_CREACION_MACROS_Y_WIDGETS]]: Cómo pedirle a la IA (o bola de voz) que cree nuevos botones y ventanas.
- 🛡️ [[Bunker/REGLAS_GATEKEEPER_Y_SEGURIDAD]]: Políticas de protección, endpoints permitidos y restricciones.
