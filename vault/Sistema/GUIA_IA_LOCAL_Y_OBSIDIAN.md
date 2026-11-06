---
tipo: guia_ia_local
sistema: HABANA 12
modelo_llm: Llama 3.2 3B (llama3.2:latest)
tamano_modelo_ram: 1.88 GB (Q4_K_M)
motor_llm: Ollama (localhost:11434)
vision_local: YOLOv8n ONNX (onnxruntime)
reconocimiento_facial: Dlib / NumPy (SQLite local)
target_hardware: Mini PC Intel N100 (4C/4T) / 12 GB RAM / Proxmox VE 8
actualizado: 2026-10-26
tags:
  - ia_local
  - ollama
  - llama32
  - n100
  - proxmox
  - memoria_cognitiva
  - obsidian
  - yolov8
---

# 🧠 Arquitectura de la IA Local en HABANA 12 & Memoria Cognitiva (Obsidian)

Este documento detalla la configuración técnica, ubicación física en disco y dimensionamiento de la **Inteligencia Artificial 100% Local** de HABANA, diseñada para operar sin conexión a internet y optimizada para su próxima migración al **Mini PC Intel N100 con 12 GB de RAM bajo Proxmox VE**.

---

## 📌 1. ¿Cuál es la IA Local conectada a HABANA?

### A. Motor de Lenguaje y Razonamiento (LLM)
* **Modelo Conectado Principal**: **`llama3.2:latest`** (Meta LLaMA 3.2 de 3 mil millones de parámetros cuantizado en Q4_K_M).
* **Tamaño en Disco / RAM**: **1.88 GB**.
* **Motor Local**: **Ollama** (`http://127.0.0.1:11434`).
* **Ubicación del ejecutable**: `C:\Users\tomas\AppData\Local\Programs\Ollama\ollama.exe`.
* **Ubicación de los modelos en disco**: `C:\Users\tomas\.ollama\models`.
* **Respaldo Secundario Local**: `llama3.1:latest` (8B / 4.58 GB).

### B. Enrutamiento en el Backend de HABANA (`agent.py`)
En el archivo [`backend/app/services/agent.py`](file:///F:/Habana%2012/backend/app/services/agent.py), la IA local participa de dos formas:
1. **Modo Directo Local**: Cuando en **Sistemas ➔ Motor de Texto IA** se selecciona `Ollama`, todas las peticiones del asistente se derivan directamente a `http://localhost:11434/api/chat` usando el modelo `llama3.2:latest`.
2. **Fallback Automático**: Si el sistema está configurado en `Groq` o `Gemini` (nube) y se detecta una pérdida de conexión a internet o timeout (>8s), HABANA conmuta automáticamente a `llama3.2:latest` en local para que la casa nunca quede incomunicada.

---

## 👁️ 2. Visión Neuronal y Biometría Local (Cero Nube)

Además del LLM de texto, HABANA ejecuta en local:

1. **Detección de Personas y Mascotas (YOLOv8n ONNX)**:
   - Archivo del modelo: [`backend/models/yolov8n.onnx`](file:///F:/Habana%2012/backend/models/yolov8n.onnx) (12.8 MB).
   - Motor de inferencia: `onnxruntime` sobre CPU.
   - Latencia: **< 80 ms** por fotograma.
   - Función: Analiza las cámaras RTSP (Salón y Pasillo), enciende luces al detectar siluetas humanas y aplica discriminación animal (*Pet-Safe*) sin enviar fotos a servidores externos.
2. **Reconocimiento Facial Biométrico**:
   - Servicio: [`backend/app/services/security_service.py`](file:///F:/Habana%2012/backend/app/services/security_service.py).
   - Base de datos: Vectores biométricos de 128 dimensiones guardados en SQLite (`habana.db`), verificados en microsegundos con NumPy.

---

## 🚀 3. Idoneidad para la Migración al Mini PC Intel N100 (12 GB RAM) en Proxmox

La elección de **`llama3.2:latest`** frente a modelos más grandes (como `qwen3.8:27b` de 16.5 GB que también tienes descargado en el PC) obedece a un cálculo estricto de ingeniería para el Mini PC Intel N100:

### Reparto Estimado de Memoria RAM (12 GB Totales)

| Subsistema | Tecnología | Asignación RAM | Estado / Función |
| :--- | :--- | :--- | :--- |
| **Host Proxmox VE 8** | Debian 12 Kernel | ~1.2 GB | Hipervisor, ZFS/Ext4 y red |
| **CT 100: habana-core** | LXC Debian 12 | ~2.3 GB | FastAPI, Zigbee2MQTT, Mosquitto, Baileys WA, ONNX YOLO |
| **CT 200: habana-ai** | LXC Debian (Ollama) | ~2.5 GB | Ollama ejecutando `llama3.2:latest` (1.88 GB) |
| **Colchón Libre / Caché** | Sistema | **~6.0 GB** | **RAM Libre para buffers de I/O y evitar swap** |

> [!IMPORTANT]
> Un modelo de 27B como Qwen no cabe en 12 GB y colapsaría el equipo. LLaMA 3.2 3B deja libre más del **50% de la RAM del Mini PC**, garantizando que Proxmox nunca mate procesos por falta de memoria (*Out of Memory*).

### Rendimiento de Inferencia en la CPU del Intel N100
* El procesador Intel N100 posee **4 núcleos Gracemont de alta eficiencia** con soporte para instrucciones vectoriales AVX2.
* Con `llama3.2:latest` (3B Q4), el N100 procesa a una velocidad de **14 a 20 tokens por segundo**.
* Una respuesta típica del asistente (*"Entendido, he activado el modo cine y bajado la persiana al 30%"*, ~20 palabras) se genera en **1.0 a 1.4 segundos**, ofreciendo una experiencia fluida e interactiva.

---

## 🟣 4. Integración con Obsidian: Memoria Cognitiva Persistente

La IA local no opera en el vacío; está conectada a la bóveda de Obsidian (`F:\Habana 12\vault`):

1. **Lectura de Contexto**: La IA lee fichas de dispositivos (`vault/Dispositivos/`), estancias (`vault/Estancias/`) y hábitos de los habitantes (`vault/Personas/Tomas.md`).
2. **Registro de Memorias (`vault/Memoria_Lola/`)**: Guarda recordatorios y notas rápidas enviadas por el usuario.
3. **Archivo Autónomo de WhatsApp (`vault/WhatsApp/`)**: Cuando envías enlaces, vídeos o fotos a Lola por WhatsApp, se transcriben y archivan automáticamente con tags de Obsidian.
4. **Diario de la Vivienda (`vault/Diario/`)**: Genera el resumen diario de incidencias, disparos de presencia y consumo energético.

---

## 🛠️ Comandos de Diagnóstico Rápido

Para comprobar el estado de la IA local desde la consola de Windows o Proxmox:

```powershell
# 1. Comprobar que Ollama responde en local
Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags"

# 2. Probar una inferencia directa por terminal
& "C:\Users\tomas\AppData\Local\Programs\Ollama\ollama.exe" run llama3.2:latest "Hola Lola, confirma que estás activa en local."
```
