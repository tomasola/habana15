---
tipo: bitacora_historica
sistema: HABANA 12
actualizado: 2026-10-26
tags:
  - bitacora
  - historial
  - cambios
  - recuperacion
---

# 📜 Bitácora Histórica de Cambios y Recuperación del Sistema

Este documento mantiene un registro inmutable de todas las decisiones, hitos, parches y soluciones aplicadas en el proyecto.

---

## [2026-11-01] Puesta en Marcha, Calibración y Auditoría QA de Pantalla Táctil ESP32-S3 3.5" (Guition JC3248W535)

### Requerimiento
1. Conectar y reconocer la nueva pantalla táctil capacitiva de 3.5 pulgadas con ESP32-S3 (`JC3248W535`, resolución apaisada 480x320, 8MB PSRAM, 16MB Flash).
2. Desarrollar una interfaz de control rápido con 4 botones:
   - Apagar todas las luces del hogar.
   - Activar / desactivar alarma de seguridad.
   - Radar de presencia por Bluetooth Low Energy (BLE).
   - Consulta visual de datos de sensores ambientales.
3. Subsanar el comportamiento errático del panel táctil (pulsaciones involuntarias de la alarma y falta de respuesta en botones inferiores).
4. Crear un agente autónomo de pruebas QA para certificar el funcionamiento de los 4 botones.

### Solución Implementada
1. **Diagnóstico y Calibración Táctil Sub-Píxel**:
   - Identificado fallo de normalización en el driver `AXS15231` de ESPHome: al habilitar `swap_xy: true` sin bloque `calibration` explícito, el sistema aplicaba los límites originales de retrato (320x480), truncando el eje vertical en 213 píxeles y desviando los toques de los botones inferiores (Radar y Sensores) hacia el botón superior derecho (Alarma).
   - Se estableció la calibración exacta `x_min: 0, x_max: 480, y_min: 0, y_max: 320`.
   - Se corrigió la orientación de los ejes: `mirror_x: false` y `mirror_y: true` para sincronizar 1:1 las coordenadas físicas de contacto con los gráficos renderizados.
   - Se incorporó filtro anti-rebote `delayed_on: 15ms` y refresco visual forzado (`component.update: main_display`) de 0 ms.
2. **Arquitectura Directa HTTP REST (Cero Latencia)**:
   - Se eliminaron dependencias de puertos MQTT bloqueados en el ESP32, reemplazando las acciones por peticiones HTTP POST directas hacia la API de FastAPI (`192.168.1.139:8050`):
     - `/api/z2m-hub/all-off`: apaga 28 luminarias Zigbee en 13.6 ms.
     - `/api/security/alarm/toggle`: conmuta estado de alarma en 2.9 ms.
3. **Agente de Pruebas QA (`screen_buttons_tester`)**:
   - Se programó `test_screen_buttons_agent.py` y se invocó el subagente para auditar los 4 botones:
     - 100% de éxito en ejecución con latencias inferiores a 26 ms.
4. **Flasheo Físico y OTA**:
   - Flasheo inicial por `esptool.py` en `COM5` (1.029.168 bytes escritos en offset `0x00000000`).
   - Actualización posterior inalámbrica por ESPHome OTA en 4.19 segundos.
   - Documentación técnica vinculada: [[Dispositivos/pantalla_tactil_esp32_jc3248w535]].

---

## [2026-10-26] Integración y Documentación de la IA Local en Obsidian & N100 Proxmox

### Requerimiento
Documentar en la bóveda de Obsidian (`OBSIDIAN · MEMORIA COGNITIVA PERSISTENTE`) qué IA local está conectada a HABANA, su ubicación física, su arquitectura de memoria y su idoneidad para la migración al Mini PC Intel N100 (12 GB RAM) con Proxmox VE.

### Solución Implementada
1. **Documento Técnico Maestro**:
   - Creado [`vault/Sistema/GUIA_IA_LOCAL_Y_OBSIDIAN.md`](file:///F:/Habana%2012/vault/Sistema/GUIA_IA_LOCAL_Y_OBSIDIAN.md) detallando:
     - Motor LLM Ollama con `llama3.2:latest` (3B Q4, 1.88 GB).
     - Visión neuronal local con `yolov8n.onnx` (<80 ms) y biometría SQLite.
     - Dimensionamiento de RAM en Proxmox: ~6.0 GB en uso vs ~6.0 GB libres de colchón.
     - Rendimiento de 15-20 tokens/segundo en núcleos Gracemont.
2. **Índices y Enlaces Bidireccionales**:
   - Actualizado `00_HABANA_CEREBRO_CENTRAL.md` y `vault/Sistema/00_INDICE_SISTEMA.md`.
3. **Frontend (`ObsidianVaultPanel.jsx`)**:
   - Tarjeta HUD interactiva con telemetría de IA Local (Llama 3.2 3B & YOLOv8n) y botón de acceso directo a la ficha técnica en Obsidian.
   - Compilación verificada con Vite (`npm run build`).

---

## [2026-10-26] Exportación y Pipeline Bidireccional de Avatar a Obsidian Vault

### Requerimiento
Exportar las 45 respuestas, frases y prompts de Google Veo 3.1 a notas Markdown individuales en Obsidian y crear un método automatizado para subir y guardar nuevos clips y respuestas sin intervención manual.

### Solución Implementada
1. **Directorio y Catálogo Maestro**:
   - Se creó `vault/Avatar/00_INDICE_AVATAR_Y_PROMPTS_VEO.md` con tabla navegable mediante enlaces wiki (`[[...]]`), respuesta TTS, nombre de archivo MP4 y prompt abreviado.
   - Se exportaron los 45 clips preexistentes como notas individuales enriquecidas con frontmatter YAML (`id`, `trigger_phrase`, `video_filename`, `response_text`, `generation_prompt`, `creado`, `tags`).
2. **Pipeline Backend (`avatar_service.py` & `router.py`)**:
   - `_write_obsidian_avatar_note()`: Escribe/actualiza la ficha en Obsidian al crear o modificar una respuesta.
   - `_delete_obsidian_avatar_note()`: Elimina la nota sincronizada al borrar la respuesta en la base de datos.
   - `_update_obsidian_avatar_index()`: Regenera dinámicamente el catálogo maestro.
   - `sync_from_obsidian()`: Escanea `vault/Avatar/*.md`, lee los frontmatters YAML e importa automáticamente a SQLite cualquier ficha creada o editada externamente desde Obsidian.
   - `upload_video_file()` / `POST /api/avatar/upload`: Endpoint `multipart/form-data` para recibir vídeos `.mp4` físicos desde la interfaz, guardarlos en `media/videos/`, replicarlos en frontend/public y frontend/dist, registrarlos en base de datos y crear la nota en Obsidian en una única operación atómica.
3. **Frontend (`AvatarConfigPanel.jsx`)**:
   - Selector de archivo nativo `📁 Subir vídeo MP4` con previsualización del tamaño en MB y nombre de archivo.
   - Botón `🟣 Sincronizar con Obsidian` (`POST /api/avatar/sync-obsidian`).
   - Envío dual automático (JSON si es vídeo existente o FormData binario si se sube un nuevo archivo MP4).
   - Compilación limpia de producción (`npm run build`).

---

## [2026-10-26] Reparación Post-Corte de Luz y Lanzador Robusto

### Incidencia
Tras un corte de suministro eléctrico y reinicio del PC, `start_habana12.bat` no levantó la domótica ni la mensajería.
- **Causa 1**: El script intentaba ejecutar `mosquitto -v -p 1883`, pero no existía en el `PATH` de Windows.
- **Causa 2**: `start_habana12.bat` omitía el arranque de `Zigbee2MQTT` y de `WhatsApp Bridge`.
- **Causa 3**: `Zigbee2MQTT/index.js` detectó un cambio en el hash Git e intentó recompilarse mediante `pnpm` (no instalado), fallando al arrancar.

### Solución Aplicada
1. Se parcheó `F:\Habana 12\services\zigbee2mqtt\index.js` para omitir la recompilación redundante y utilizar el `dist/` precompilado directamente.
2. Se copió y ejecutó el broker Python `run_mqtt_broker.py` en el puerto `1883`.
3. Se inició el daemon Zigbee2MQTT conectándose con éxito al dongle Sonoff en `COM9` (25 dispositivos en línea).
4. Se inició el puente de WhatsApp en el puerto `3000`.
5. Se reescribió `F:\Habana 12\start_habana12.bat` con validación por `netstat` en los 5 puertos esenciales.
6. Se inició el túnel Cloudflare para la app de la tablet (`operation-copyrights-scanning-shape.trycloudflare.com`).

---

## [2026-10-25] Creación de APK Nativa para Tablet y Conexión Remota

- Se creó el proyecto independiente en `F:\Habana Tablet APK\` sin tocar el código fuente de Habana 12.
- Aplicación nativa Android ultra-ligera (~373 KB) en Java/Android SDK 34.
- Incluye modo Kiosco pantalla completa inmersiva, pantalla siempre encendida (`FLAG_KEEP_SCREEN_ON`), bypass de certificados autofirmados SSL y auto-failover (intenta LAN local y si falla salta a Cloudflare).
- Se implementó la vista especializada `?tablet=true` con solo 2 pestañas (Principal y Cámaras) y 3 accesos rápidos táctiles.

---

## [2026-10-24] Migración a Motor Nativo Zigbee2MQTT Puro

- Se desvincularon definitivamente los nombres de entidades antiguos de Home Assistant y Tuya (`switch.hab_andrea_*`, `light.smartlight`).
- Se adoptó el esquema de IDs limpios (`luz_lazos_andrea`, `luz_ventana_andrea`, `led_cama_andrea`, `led_foso_andrea`).
- Se implementó `z2m_lighting_engine.py` para control directo por MQTT con sincronización atómica de conmutadas.

---

## [2026-10-26] Rediseño Visual Completo Tablet/Móvil (Opción 1: Dual 50/50 y Dock Unificado)

### Incidencia
En móviles y tablets en modo horizontal (landscape):
- Los elementos de la interfaz se montaban y colapsaban debido a columnas fijas de 1200px.
- La barra de navegación lateral izquierda consumía 100px por regla @media (min-width: 769px).
- Se acumulaban 3 niveles de cabeceras redundantes (header general + selector de tablet + botón volver).
- Los docks de controles en la foto de Andrea tapaban el 50% de la estancia.

### Solución Integral Aplicada (Opción 1):
1. **Lola Avatar (AvatarPanel.jsx)**:
   - Layout Dual 50/50 limpio en horizontal (Izquierda: Lola 3D/Vídeo sin botones superpuestos; Derecha: Diálogo + Píldoras rápidas + Barra compacta de voz/micrófono).
2. **Dock Superior Unificado (App.jsx)**:
   - Se eliminaron las 3 barras redundantes.
   - En Modo Tablet, el header se reduce a 44px de altura con 4 píldoras directas: 👤 LOLA, 🏛️ GEMELO 3D, 📹 CÁMARAS, 📻 AUDIO.
   - Se ocultó .bottom-nav y se eliminó el padding-bottom: 75px de ody.
3. **Plano 3D (DigitalTwin3D.jsx)**:
   - Canvas al 100% de la pantalla sin márgenes muertos (minHeight: 0).
   - Barra flotante de automatizaciones ultra-compacta.
4. **Visor Fotorrealista (AndreaPhotoTourViewer.jsx)**:
   - Dock de escenas y luces plegable ([ 💡 Controles Andrea ▴/▾ ]) para liberar el 100% de la foto.
   - Posición inferior a 10px en vez de 48px.
5. **CCTV (LiveCamerasPanel.jsx)**:
   - Grid auto-fit adaptativo (minmax(min(100%, 300px), 1fr)) que no desborda en pantallas estrechas.

---

## [2026-10-26] Visores Fotorrealistas: Separación 100% Limpia (Foto a la Izquierda, Mandos a la Derecha)

### Petición del Usuario
> "en las estancias, ejemplo habitacion de andrea podemos dejar los botones a la derecha y a la izquierda la imagen limpia"

### Implementación Realizada
1. **Zona Izquierda (Foto Limpia 100%)**:
   - Se eliminó completamente la consola flotante inferior que tapaba la cama y el suelo de la estancia.
   - La fotografía real y las capas ópticas sub-píxel de luz (`mixBlendMode: 'screen'`) se muestran nítidas de suelo a techo con `objectFit: 'contain'`.
   - Se mantiene arriba una barra flotante ultra-compacta con telemetría en vatios, cambio de ángulo (`Ventanal` / `Cómoda`) y salida al Plano 3D.
2. **Zona Derecha (Panel de Mandos Vertical de 320px)**:
   - **Escenas**: Estudio/Lectura, Cine/Relax, Noche Suave, Todo ON y Todo OFF.
   - **Interruptores Individuales**: Lámpara de Lazos Techo, Luz Viga Escritorio, LED Cabecero y LED Entrada en tarjetas táctiles independientes.
   - **Persiana**: Barra de recorrido porcentual con botones de acción directa (Subir, Parar, Bajar) y ajuste fino.
   - **Colapso Rápido**: Botón para plegar el panel lateral y contemplar la foto a pantalla completa si se desea.

---

## [2026-10-26] Corrección de IPs y Topología del Muro CCTV

### Incidencia
El usuario reportó que la cámara del Salón se veía bien, pero la del Pasillo no se visualizaba y en su lugar aparecía la imagen de la Terraza exterior.

### Causa Raíz
Tras el corte de luz y renovación de concesiones DHCP del router:
- La cámara física de la **Terraza Exterior** tomó la IP `192.168.1.128` (pero en `cameras.json` estaba asignada a `camara_pasillo`).
- La cámara física del **Pasillo Interior** tomó la IP `192.168.1.129`.
- La IP antigua de la terraza (`192.168.1.133`) estaba desconectada/caída.

### Solución Aplicada
1. Se mapearon los puertos RTSP (5543) y ONVIF (8000) de la subred local mediante escaneo de sockets.
2. Se validaron los streams en vivo mediante captura de fotogramas con OpenCV:
   - `192.168.1.129`: Identificado fehacientemente como **Pasillo / Recibidor Interior** (puerta blindada, suelo de tarima, robot aspirador).
   - `192.168.1.128`: Identificado fehacientemente como **Terraza Exterior** (patio, macetas, compresores de A/A, reloj de pared).
   - `192.168.1.132`: Confirmado como **Salón Principal**.
3. Se actualizó `F:\Habana 12\backend\config\cameras.json` y se recargaron los workers en caliente vía `/api/cameras/{id}/config`.
4. Los 3 flujos RTSP y snapshots MJPG funcionan con 0 errores y latencia mínima.


## [2026-10-26] Compilación y Entrega de la APK Habana Tablet por WhatsApp

### Objetivo
Generar la aplicación Android nativa (`habana-tablet.apk`) con conectividad dual (LAN `192.168.1.139:5175` y Cloudflare Tunnel exterior) y enviarla directamente por WhatsApp al móvil/tablet del usuario.

### Acciones Realizadas
1. **Compilación Nativa**:
   - Se configuró el entorno con el JBR de Android Studio (`C:\Program Files\Android\Android Studio\jbr`).
   - Se ejecutó `gradlew.bat assembleRelease` en `F:\Habana Tablet APK\`.
   - Se generó la versión firmada `app-release.apk` (374.5 KB).
2. **Distribución en Servidor Web**:
   - Copiado a `F:\Habana Tablet APK\habana-tablet.apk`, `F:\Habana 12\frontend\public\habana-tablet.apk` y `dist\`.
   - Disponible inmediatamente por HTTPS en `https://operation-copyrights-scanning-shape.trycloudflare.com/habana-tablet.apk` (HTTP 200 OK verificado).
3. **Integración y Envío por WhatsApp**:
   - Se añadió el endpoint `/send-document` en `F:\Habana 8\backend\wa_index_current.js` para envío directo de archivos `.apk` vía Baileys.
   - Se actualizó `F:\Habana 12\backend\app\services\whatsapp.py`.
   - Se envió el archivo `habana-tablet.apk` al número del usuario (+34 647 79 75 75) con confirmación de entrega exitosa en los logs de Baileys.


## [2026-10-26 19:10] Punto de Restauración y Copia de Seguridad Completa

### Acciones Realizadas
- Se creó el script de respaldo automatizado `create_backup_habana12.py`.
- Se generó el punto de control estructurado:
  - Carpeta: `F:\Habana 12\backups\backup_habana12_checkpoint_20261026_190952/`
  - Archivo comprimido: `F:\Habana12_Backup_20261026_190952.zip` (26.07 MB).
  - Incluye: Backend completo, configuraciones, frontend, bveda de Obsidian, datos Zigbee2MQTT y proyecto APK Android nativo.
- Se generó el script de recuperación inmediata `restore_last_checkpoint.py` para restaurar todo el estado en un solo clic.
- Se aseguraron los cambios en el control de versiones Git.


## [2026-10-26 19:17] Soporte para Hora de Fin en Automatizaciones

### Funcionalidad Añadida
- **Editor de Automatizaciones (`AutomationEditModal.jsx`)**:
  - Al seleccionar disparador por horario (`type: 'time'`), ahora se muestra en dos columnas:
    - ⏰ **Hora de Disparo / Inicio (HH:MM)** (`trigger.time`)
    - ⏹️ **Hora de Fin (HH:MM) [Opcional]** (`trigger.end_time`) con botón rápido para limpiar/quitar el fin.
  - Indicador dinámico que explica la acción programada: a la hora de inicio se activan los dispositivos y a la hora de fin se apagan/revierten automáticamente.
- **Visualizador de Automatizaciones (`AutomationsAndSensorsPanel.jsx`)**:
  - Las tarjetas de automatización reflejan el intervalo horario completo: `⏰ De HH:MM a HH:MM` (o `⏰ A las HH:MM` si no tiene fin).
- **Planificador en Backend (`automation_service.py`)**:
  - `check_time_triggers()` ahora vigila tanto `time` (disparando `execute_automation`) como `end_time` (disparando `turn_off_automation` para apagar luces y cerrar persianas automáticamente al cumplirse la hora de fin).


## [2026-10-26 19:27] Habilitación de Automatizaciones en Modo Tablet / Móvil

### Incidencia Reportada
En la app del móvil o en modo tablet (`?tablet=true`) no aparecía la pestaña ni botón para acceder a las Automatizaciones.

### Causa Raíz
1. En modo tablet (`isTabletMode`), la barra inferior clásica se oculta y la barra superior solo tenía 4 accesos directos: `👤 LOLA`, `🏛️ GEMELO 3D`, `📹 CÁMARAS` y `📻 AUDIO`. Faltaba el acceso a Automatizaciones.
2. La vista interna `principalView === 'automations'` cargaba el componente antiguo `DomoticaAutomationsPanel`, en lugar del nuevo centro de control integral `AutomationsAndSensorsPanel`.

### Solución Aplicada
1. Se añadió el botón directo **`⚡ AUTO`** en la cabecera del Modo Tablet con indicador luminoso ámbar y transición activa.
2. Se enlazó la vista `principalView === 'automations'` directamente a `<AutomationsAndSensorsPanel API_BASE={API_BASE} />`.
3. Se actualizó también la vista de automatizaciones dentro de Domótica para unificar el nuevo panel con el editor de horas de inicio y fin.


## [2026-10-26 19:33] Optimización de Espacio: Botón Volver a Principal Reubicado

### Cambio Visual y UX
- Se eliminó el botón grande tipo bloque "VOLVER A PRINCIPAL" que ocupaba una fila completa dentro de las vistas (`Gemelo 3D`, `Automatizaciones`, `Radio`, etc.) en modo tablet.
- Se reubicó en la **barra superior derecha de la cabecera del modo tablet**, justo al lado del indicador `📱 TABLET`:
  - Se muestra de forma compacta y dinámica: `⬅️ Volver a Principal` únicamente cuando el usuario está dentro de una subvista (Gemelo 3D, Automatizaciones, Cámaras, Audio).
  - Al pulsarlo, regresa de inmediato a la pantalla principal (Lola/Dashboard).
  - Se libera todo el alto y ancho útil de la pantalla para los elementos interactivos en móviles y tablets.


## [2026-10-26 19:38] Purga Visual: Fotografía 100% Despejada en Visor de Andrea

### Acciones Realizadas
- Se eliminaron todos los elementos flotantes, rótulos de texto, badges de vatios y botones que estaban superpuestos sobre la fotografía de la estancia.
- La imagen arquitectónica y sus capas de irradiancia lumínica quedan completamente limpias y despejadas al 100%.
- Todos los controles han sido centralizados en el panel lateral derecho:
  - **Cabecera**: Título de la estancia, estado de luces encendidas y vatios, junto al botón de cierre `✖ Plano 3D`.
  - **Selector de Perspectiva**: `🪟 Ventanal` y `🚪 Cómoda` integrados en la parte superior del panel lateral.
  - **Controles de Iluminación y Persianas**: Escenas lumínicas, interruptores individuales con sliders y motor de persiana.

### [26 Octubre 2026] Optimizaciones Forenses, Matriz de Audio Google Mini y Scroll CCTV Tablet
- **Capturas Forenses YOLOv8**: Límite estricto de retención de las últimas 10 capturas tanto en disco como en memoria. Las más antiguas se purgan automáticamente de forma continua.
- **Matriz de Audio y Altavoces Google Home Mini**:
  - Descubrimiento e integración directa de los 4 altavoces físicos en red LAN: Salón (192.168.1.132), Cocina (192.168.1.131), Despacho (192.168.1.133) y Dormitorio (192.168.1.134), más Tarjeta de Sonido PC.
  - Disponibles en el panel con control individual y unificado de volumen, conmutadores de activación y estado en tiempo real.
- **Muro CCTV & Vigilancia Cognitiva en Móvil / Modo Tablet**:
  - Corrección del bloqueo de scroll: sustituido overflow: hidden por overflow-y: auto !important con -webkit-overflow-scrolling: touch.
  - Rejilla adaptativa y envoltura con scroll suave para visualización fluida de todas las cámaras en teléfonos.
