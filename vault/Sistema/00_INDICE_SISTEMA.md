---
tipo: indice_sistema
sistema: HABANA 12
actualizado: 2026-10-26
tags:
  - sistema
  - arquitectura
  - proxmox
  - habana12
---

# 🖥️ Centro de Documentación Técnica de HABANA 12

Este espacio almacena la **memoria técnica y arquitectónica permanente** de HABANA. Tanto tú como las IAs locales (Lola, Ollama, agentes de mantenimiento) consultan estas notas para conocer la configuración del hardware, la red, el software y la evolución del proyecto.

---

## 📑 Documentos Maestros del Sistema

1. **[[Sistema/ARQUITECTURA_Y_PUERTOS|🔌 Arquitectura de Red y Puertos]]**  
   Mapa completo de servicios en vivo: FastAPI (8050), Vite (5175), Broker MQTT (1883), Zigbee2MQTT (COM9 / 8090) y WhatsApp Bridge (3000).

2. **[[Sistema/PLAN_MIGRACION_PROXMOX_N100|🚀 Plan Maestro de Migración a Proxmox (Intel N100)]]**  
   Guía paso a paso para desplegar HABANA y la IA local en el nuevo Mini PC con 12 GB RAM, configuración de contenedores LXC, passthrough USB y carpetas compartidas.

3. **[[Sistema/BITACORA_HISTORICA_CAMBIOS|📜 Bitácora Histórica de Cambios y Recuperación]]**  
   Registro cronológico de todas las versiones, resoluciones de incidencias (corte de luz, arranque ordenado, parche de Zigbee2MQTT, calibración de pantalla táctil ESP32-S3) y compilación de la APK de la tablet.

4. **[[Dispositivos/pantalla_tactil_esp32_jc3248w535|🖥️ Pantalla Táctil 3.5" Guition JC3248W535 (ESP32-S3)]]**  
   Ficha técnica de hardware, mapa de pines Quad-SPI/I2C, calibración táctil 1:1, endpoints HTTP y páginas interactivas (Luces, Alarma, Radar BLE y Sensores).

5. **[[Sistema/GUIA_IA_LOCAL_Y_OBSIDIAN|🧠 Guía de la IA Local (Ollama LLaMA 3.2, YOLOv8) y Proxmox N100]]**  
   Ficha técnica completa del modelo local activo (`llama3.2:latest`, 1.88 GB), visión YOLOv8n ONNX, cálculo de RAM para el Mini PC N100 (12 GB) y memoria cognitiva en Obsidian.

6. **[[Sistema/TEMA_APEX_VISUAL|🎯 Tema Táctico APEX VISUAL (Motor Chameleon UI)]]**  
   Especificación técnica del aspecto inspirado en Apex Legends: biseles a 45°, paleta carbón/naranja `#FF4612`/cian `#00F3FF`, hazard stripes y HUD de combate.

---

> [!TIP]
> Cualquier ajuste que se realice en el código o en la domótica quedará registrado en esta carpeta para que nunca se pierda el contexto entre sesiones.
