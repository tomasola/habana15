# ESTADO DEL PROYECTO: HABANA 12 (PRODUCCIÓN & CCTV MULTI-CÁMARA)

**Fecha**: 25 de Octubre de 2026  
**Estado General**: ✅ PRODUCCIÓN CERTIFICADA (100% PASS)  
**Workspace**: `F:\Habana 12`

---

## 1. Subsistema de Cámaras y Videovigilancia Cognitiva (100% Operativo)

Se han integrado las 3 cámaras físicas en el motor nativo de streaming y visión multimodal:

1. **Cámara Pasillo Interior (`192.168.1.128:5543`)**:
   - Fabricante / Firmware: Tuya ONVIF Happytimesoft IPCamera.
   - Stream HD: `rtsp://admin:tomas30ola@192.168.1.128:5543/e4a2f62f9342b7b662a9d72917a1190a/live/channel0` (2304x1296).
   - Substream: `rtsp://admin:tomas30ola@192.168.1.128:5543/e4a2f62f9342b7b662a9d72917a1190a/live/channel1`.
   - Estado: 🟢 **EN VIVO**.

2. **Cámara Terraza Exterior (`192.168.1.133:5543` / alias `.129`)**:
   - Fabricante / Firmware: Tuya ONVIF Happytimesoft IPCamera (DHCP actual `.133`).
   - Stream HD: `rtsp://admin:tomas30ola@192.168.1.133:5543/e4a2f62f9342b7b662a9d72917a1190a/live/channel0` (2560x1440 2K QHD).
   - Substream: `rtsp://admin:tomas30ola@192.168.1.133:5543/e4a2f62f9342b7b662a9d72917a1190a/live/channel1`.
   - Estado: 🟢 **EN VIVO**.

3. **Cámara Cam720 (`192.168.1.132:554`)**:
   - Fabricante / Firmware: Novatek JA-K12 NVT IPC (v05.02.31.41).
   - Clave de verificación de dispositivo: `UHCDRTJ1`.
   - RTSP activado en firmware vía GoAhead CGI (`authset=1` / `RtspConf`).
   - Stream HD: `rtsp://192.168.1.132:554/live/ch00_0` (2304x1296 3MP).
   - Substream: `rtsp://192.168.1.132:554/live/ch00_1` (512x288 fluido).
   - Estado: 🟢 **EN VIVO**.

---

## 2. Componentes Implementados

- **`camera_service.py`**:
  - Hilos de captura OpenCV TCP en segundo plano con auto-sleep tras 60s sin espectadores.
  - Streaming continuo MJPEG `multipart/x-mixed-replace` en `/api/cameras/{id}/stream.mjpg`.
  - Fotogramas instantáneos JPEG en `/api/cameras/{id}/snapshot.jpg`.
  - Inferencia de Visión Multimodal con Groq LLaMA / Qwen (`POST /api/cameras/{id}/analyze`).
- **`LiveCamerasPanel.jsx`**:
  - Muro CCTV de alta fidelidad estética Cyberpunk/Glassmorphism.
  - Modos de visualización: Mosaico y Enfoque Individual.
  - Botón de análisis cognitivo de amenazas, captura de instantáneas y pantalla completa.
- **`App.jsx`**:
  - Pestaña directa **`📹 CÁMARAS`** en la barra de navegación y **`📹 VIGILANCIA CCTV`** en Sistemas.
  - Nuevo panel **`⚡ AUTOMATIZACIONES Y SENSORES`** en Sistemas.

---

## 3. Discriminación e Inmunidad a Mascotas (Pet-Safe AI)
- **Motor Cognitivo Multimodal**: Modelo de visión rápida (<800ms) que detecta y clasifica si el movimiento corresponde a un gato/mascota o a un ser humano.
- **Protección contra Falsas Alarmas**: Bloquea la Fase 2 / Fase 3 de alarma, sirenas por altavoces y avisos de emergencia por WhatsApp si solo se detecta una mascota (`is_safe_pet_only: true`).
- **Configuración Persistente**: `backend/config/pet_immunity.json`.
- **UI Integrada**: Tarjeta interactiva con switch, nivel de sensibilidad y botón de prueba en tiempo real en **Sistemas ➔ Seguridad**.

---

## 4. Módulo de Automatizaciones, Escenas y Sensores Multivariable
- **Componente**: `AutomationsAndSensorsPanel.jsx`.
- **Pestaña Automatizaciones y Escenas**:
  - Barra de Escenas Rápidas: Cine, Relax, Salir, Buenos Días.
  - Disparadores por Visión Artificial: Encendido de luces por detección humana con filtro de mascotas.
  - Automatizaciones horarias, solares y de ahorro energético.
- **Pestaña Sensores y Telemetría Multivariable**:
  - Presencia: Radar mmWave, PIR, Cámaras.
  - Consumo & Red Eléctrica: Tensión (230V), Potencia activa (W), Contador kWh.
  - Fugas de Agua: Lavadora, Baño (corte de emergencia y aviso sonoro).
  - Clima y Calidad del Aire: CO2 (ppm), Temperatura (°C), Humedad (%).
  - Contactos Magnéticos: Puerta entrada, Ventana terraza, Ventana Andrea.
  - Lux Solar y Humo/Gases.
  - Simulador de eventos para pruebas interactivas en vivo.

---

## 5. Guía de Ejecución
- **Arranque Completo en 1 Clic**: Doble clic en `F:\Habana 12\start_habana12.bat`.
- **Frontend Activo**: `https://localhost:5175/`
- **Backend Activo**: `http://localhost:8050/`
