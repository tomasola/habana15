---
id: camara_pasillo
nombre: "Cámara Pasillo Interior"
estancia: "[[Estancias/Pasillo]]"
motor_vision: YOLOv8n-ONNX Local
inmunidad_mascotas: true
tags:
  - camara
  - vision_sentinel
  - ia
---

# Cámara Pasillo Interior

Cámara integrada en el Centinela Neuronal de HABANA con **YOLOv8-Nano ONNX**.

- **Ubicación**: [[Estancias/Pasillo]]
- **Inferencia en Local**: ~25-50ms CPU (sin nube).
- **Automatización**: [[Automatizaciones/auto_camara_pasillo_humano]]
- **Luz que enciende**: [[Dispositivos/led_pasillo_central]]
