---
tipo: especificacion_tecnica
modulo: Arquitectura y Puertos
actualizado: 2026-10-26
tags:
  - puertos
  - red
  - topologia
  - habana12
---

# 🔌 Arquitectura de Red y Puertos de HABANA 12

HABANA 12 opera bajo una arquitectura concurrente de ultra-baja latencia (**0 ms**) dividida en 5 procesos esenciales comunicados por sockets locales:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          HABANA 12 ECOSYSTEM                           │
├─────────────────┬──────────────────────┬───────────────────────────────┤
│ SERVICIO        │ PUERTO / CANAL       │ FUNCIÓN                       │
├─────────────────┼──────────────────────┼───────────────────────────────┤
│ Frontend Vite   │ 5175 (HTTPS / HTTP)  │ Interfaz de Usuario y 3D Twin │
│ Backend FastAPI │ 8050 (HTTP / WS)     │ Lógica, IA, REST y Estado     │
│ Broker MQTT     │ 1883 (TCP amqtt)     │ Bus de Mensajería Domótico    │
│ Zigbee2MQTT     │ COM9 (Sonoff) / 8090 │ Controlador Mesh Zigbee       │
│ WhatsApp Bridge │ 3000 (Node Baileys)  │ Mensajería y Alertas Lola     │
│ Cloudflare Tun. │ trycloudflare.com    │ Acceso Remoto Tablet / APK    │
└─────────────────┴──────────────────────┴───────────────────────────────┘
```

---

## 🛠️ Detalle de Componentes

### 1. Broker MQTT (Puerto 1883)
- **Implementación**: Python `amqtt` ejecutado con `F:\Habana 8\backend\venv\Scripts\python.exe run_mqtt_broker.py`.
- **Ruta**: `F:\Habana 12\backend\run_mqtt_broker.py`
- **Función**: Enlace central de telemetría y órdenes entre Zigbee2MQTT y el Backend.

### 2. Zigbee2MQTT Daemon (Puerto 8090 / COM9)
- **Coordinador**: Dongle USB Silicon Labs CP210x (Sonoff ZBDongle-E/P) en puerto serie `COM9` (115200 baud).
- **Ruta**: `F:\Habana 12\services\zigbee2mqtt` (ejecutado con `node index.js`).
- **Dispositivos en red**: 25 dispositivos Zigbee enlazados (placas táctiles de pared de 1, 2 y 3 botones, controladores de tiras LED, dimmers de salón y enchufes).

### 3. Backend FastAPI (Puerto 8050)
- **Ruta**: `F:\Habana 14\backend` (`main.py`).
- **Puntos clave**:
  - `z2m_lighting_engine.py`: Driver nativo de luces reales y conmutadas sincronizadas en tiempo real.
  - `obsidian_service.py`: Puente directo con la bóveda de conocimiento Markdown (`F:\Habana 14\vault`).
  - `agent.py`: Cerebro conversacional multimodo (Groq / Gemini / Ollama local).
  - `app/bunker/`: Entorno aislado de experimentación Búnker IA (Gatekeeper, Storage y Knowledge Engine).

### 4. Frontend Web & APK Android Universal (Puerto 5175)
- **Tecnología**: React 18 + Vite 8.
- **Detección Automática de Dispositivo (Método A)**:
  - **Smartphone / Teléfono Móvil**: Detecta `Android` + `Mobile` en el User-Agent o resolución física menor a 600 dp. Abre automáticamente **`MobileCyberLayout`** (interfaz vertical de pulgar con avatar y comandos rápidos), anulando el protector de pantalla de kiosco aunque la APK tenga `?tablet=true`.
  - **Tablet de Pared**: Detecta `Android` sin `Mobile` o pantalla táctil $\ge 600$ dp. Abre automáticamente la interfaz de pared con **`TabletSidebar`**, detección de voz VAD y protector de pantalla interactivo **`TabletScreensaver`**.
  - **PC / Escritorio**: Carga los layouts completos de alta resolución (**`PremiumCyberLayout`**, **`BentoLayout`**, etc.).


### 4. Frontend Vite React (Puerto 5175)
- **Ruta**: `F:\Habana 12\frontend` (`npm run dev`).
- **Características**: Interfaz Cyberpunk de alta gama con selector especial para tablets (`?tablet=true`), gemelo digital 3D y visor fotorrealista.

### 5. WhatsApp Bridge (Puerto 3000)
- **Ruta**: `F:\Habana 8\backend\wa_index_current.js`.
- **Teléfono enlazado**: `+34 647 79 75 75`.
- **Funcionalidad**: Envío de alertas de intrusión, transcripción de audios y auto-guardado en Obsidian.

---

## 🚀 Script de Lanzamiento Unificado
El script maestro que arranca y monitoriza los 5 servicios en orden correcto tras cualquier apagón o reinicio es:  
📁 `F:\Habana 12\start_habana12.bat`
