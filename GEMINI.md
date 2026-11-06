# 🏛️ HABANA 15 - Manual Maestro de Arquitectura Concentrada

> [!IMPORTANT]
> **HABANA 15 (EDICIÓN MAESTRA CONCENTRADA Y SOBERANA)**:
> Esta carpeta (`F:\Habana 15`) consolida en un único paquete autocontenido todo el salto evolutivo desarrollado durante el ciclo intensivo de pruebas y simulación (Habana 14.0 ➔ 14.9):
> - **100% Autocontenida**: Cero enlaces simbólicos (`mklink`). Los 63 vídeos de alta fidelidad de Lola en `media/videos/`, los módulos de `frontend/node_modules/` y la memoria cognitiva de Obsidian en `vault/` residen físicamente en esta carpeta.
> - **Núcleo Apex Master Kernel (`apex_master_kernel.py`)**: Coordina los 8 subsistemas en tiempo real con latencia media de conmutación de 0.025 ms (25 microsegundos).
> - **Inmunidad a Fallo del PC (`zigbee_direct_binding.py`)**: Los interruptores y relés conmutados se comunican por clústeres hardware (0x0006/0x0008), funcionando incluso si el ordenador se apaga o reinicia.
> - **Voz "Cuba" & Avatar Optimizado**: Reconocimiento continuo VAD/Whisper y reproducción inmediata de respuestas de vídeo y TTS.
> - **Listo para Portabilidad Proxmox / Mini PC Intel N100**: Al no tener dependencias cruzadas con otras carpetas, se puede empaquetar o clonar directamente al contenedor LXC de Proxmox en cualquier momento.

---

## 1. Mapa de Motores Locales Integrados
1. **Fusión Sensorial Bayesiana** (`backend/app/services/bayesian_presence_fusion.py`): Elimina el falso apagado en sofá o cama ($P=0.99$).
2. **Motor Circadiano Solar Dinámico** (`backend/app/services/circadian_lighting_engine.py`): Ajuste de color y brillo biodinámico según elevación cenital del sol.
3. **Priority QoS Event Bus** (`backend/app/services/priority_event_bus.py`): Cola tri-nivel P0/P1/P2 con latencia ultra-baja garantizada.
4. **Enlace Directo Zigbee P2P** (`backend/app/services/zigbee_direct_binding.py`): Enlace hardware autónomo fuera de banda.
5. **Sincronización Multi-Room Audio** (`backend/app/services/multiroom_audio_sync.py`): Audio sincronizado entre estancias con deriva $<1\text{ ms}$.
6. **Hardening Shield & Watchdog** (`backend/app/services/hardening_shield.py`): Firewall local contra saturaciones y pulso constante con ESP32.
7. **Anticipación de Hábitos Markov** (`backend/app/services/markov_habit_engine.py`): Aprendizaje de rutas cotidianas para pre-acondicionar estancias.
8. **Optimizador Energético AI** (`backend/app/services/energy_ai_optimizer.py`): Deslastre automático (*Peak-shaving*) al 92% de potencia contratada e inyección de excedentes solares.

---

## 2. Puertos y Servicios
| Servicio | Puerto Oficial | Puerto Paralelo | Tecnología |
|---|---|---|---|
| **Frontend UI** | `5175` | `5180` | React 18 + Vite |
| **Backend Core** | `8050` | `8055` | FastAPI + Uvicorn |
| **Broker MQTT** | `1883` | `1883` | Local Broker / Mosquitto |
| **Endpoints Apex** | `/api/apex/*` | `/api/apex/*` | REST API |

---

## 3. Instrucciones de Arranque
Para arrancar Habana 15, simplemente ejecuta:
[`F:\Habana 15\start_habana15.bat`](file:///F:/Habana%2015/start_habana15.bat)

El script detectará si Habana 14 está corriendo y te dará la opción de:
* **[1] MODO OFICIAL**: Detiene Habana 14 y arranca Habana 15 en los puertos estándar (`8050` / `5175`).
* **[2] MODO PARALELO**: Arranca Habana 15 en puertos dedicados (`8055` / `5180`) para que conviva con la versión previa.
