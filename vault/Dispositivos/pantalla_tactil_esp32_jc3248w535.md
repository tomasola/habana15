---
id: pantalla_tactil_esp32_jc3248w535
nombre: "Pantalla Táctil 3.5\" Guition JC3248W535"
estancia: "[[Estancias/Salon]]"
tipo: panel_control_tactil
fabricante: Guition
modelo: JC3248W535
microcontrolador: ESP32-S3 (Dual-Core 240MHz, 8MB PSRAM, 16MB Flash)
controlador_pantalla: AXS15231 (Quad-SPI)
controlador_tactil: AXS15231 (Capacitivo I2C)
resolucion: 480x320 (Landscape)
ip_red: 192.168.1.247
puerto_usb: COM5 (USB-Serial/JTAG nativo)
mac_address: "dc:b4:d9:04:22:ac"
tags:
  - dispositivo
  - pantalla
  - esp32
  - interfaz
  - domotica
  - control
---

# 🖥️ Pantalla Táctil 3.5" Guition JC3248W535

Dispositivo de control físico y visualización rápida para el hogar HABANA. Ofrece control instantáneo de iluminación, alarma de seguridad, radar de presencia BLE y telemetría de sensores ambientales en tiempo real.

---

## ⚡ Especificaciones Técnicas del Hardware
- **Módulo**: Guition JC3248W535
- **SoC**: ESP32-S3 (QFN56 revision v0.2), Dual Core Xtensa LX7 @ 240 MHz.
- **Memoria**: 8 MB Octal PSRAM + 16 MB Flash Quad SPI.
- **Display**: Panel LCD IPS de 3.5 pulgadas con resolución nativa de 320x480 (operando en horizontal a 480x320 píxeles).
- **Bus Gráfico (Quad-SPI)**:
  - CLK: `GPIO 47`
  - DATA: `[GPIO 21, GPIO 48, GPIO 40, GPIO 39]`
  - Backlight PWM: `GPIO 1`
- **Bus Táctil (I2C)**:
  - SDA: `GPIO 4`
  - SCL: `GPIO 8`
- **Dirección MAC Wi-Fi**: `dc:b4:d9:04:22:ac`
- **Dirección IP en Red**: `192.168.1.247`
- **Conexión Serie/JTAG**: `COM5` (driver nativo USB CDC).

---

## 📐 Calibración y Matriz de Transformación Táctil
Tras el diagnóstico del controlador capacitivo `AXS15231` (que por defecto normalizaba los ejes en modo retrato 320x480 provocando truncamiento del eje vertical en 213 px y falso toque en la alarma), se definió la calibración física 1:1 exacta:

```yaml
touchscreen:
  - platform: axs15231
    id: touch_screen
    i2c_id: touch_i2c
    display: main_display
    calibration:
      x_min: 0
      x_max: 480
      y_min: 0
      y_max: 320
    transform:
      swap_xy: true
      mirror_x: false
      mirror_y: true
    filters:
      - delayed_on: 15ms
```

* **`swap_xy: true`**: Intercambia los ejes X e Y para adaptar el sensor táctil a la orientación apaisada (`rotation: 90`).
* **`mirror_x: false`**: Orienta correctamente el eje horizontal (izquierda = 0, derecha = 480).
* **`mirror_y: true`**: Invierte el eje vertical para corregir la inversión nativa (arriba = 0, abajo = 320).
* **`delayed_on: 15ms`**: Filtro anti-rebote capacitivo para eliminar pulsaciones fantasma o dobles toques accidentales.

---

## 🎛️ Distribución de la Interfaz y Acciones

### Página Principal (`page_main` - 4 Botones en Rejilla 2x2)

```
┌─────────────────────────────────┬─────────────────────────────────┐
│        [ APAGAR LUCES ]         │       [ ACTIVAR ALARMA ]        │
│   (x: 5..238, y: 40..175)       │   (x: 242..475, y: 40..175)     │
│   HTTP: /api/z2m-hub/all-off    │   HTTP: /api/security/...       │
├─────────────────────────────────┼─────────────────────────────────┤
│       [ RADAR PRESENCIA ]       │       [ DATOS SENSORES ]        │
│   (x: 5..238, y: 180..315)      │   (x: 242..475, y: 180..315)    │
│   Abre: page_radar              │   Abre: page_sensors            │
└─────────────────────────────────┴─────────────────────────────────┘
```

1. **Botón 1: Apagar Luces** *(Cuadrante Superior Izquierdo)*:
   - Envía petición HTTP POST asíncrona a `http://192.168.1.139:8050/api/z2m-hub/all-off`.
   - Apaga todas las 28 luces Zigbee coordinadas en <15 ms sin saturar el bus MQTT.
2. **Botón 2: Activar / Desactivar Alarma** *(Cuadrante Superior Derecho)*:
   - Envía petición HTTP POST a `http://192.168.1.139:8050/api/security/alarm/toggle`.
   - Alterna entre armado y desarmado; el botón cambia de color visualmente (Rojo = Armada, Azul = Desarmada).
3. **Botón 3: Radar de Presencia** *(Cuadrante Inferior Izquierdo)*:
   - Cambia a la pantalla `page_radar`.
   - Muestra la matriz de presencia Bluetooth Low Energy (BLE) y ocupación de Tomás, Andrea y Lola.
4. **Botón 4: Datos de Sensores** *(Cuadrante Inferior Derecho)*:
   - Cambia a la pantalla `page_sensors`.
   - Muestra tarjetas de temperatura y humedad (Salón y Cocina) y humedad de sustrato (Limonero y Frutal).

### Subpáginas de Navegación
* **Botón [< VOLVER]** *(x: 320..478, y: 0..45)*:
  - Presente en la esquina superior derecha de las subpáginas `page_radar` y `page_sensors`.
  - Retorna de inmediato a la pantalla principal sin latencia.

---

## 🚀 Flasheo y Actualizaciones
- **Flasheo Serial Inicial**: Puerto `COM5` a través de `esptool.py` (offset `0x00000000`, `firmware.factory.bin`).
- **Actualización Inalámbrica (OTA)**: Puerto `3232` mediante ESPHome OTA.
  ```powershell
  & "F:\HABANA_robot_esp32\venv\Scripts\esphome.exe" run "F:\HABANA_robot_esp32\pantalla_jc3248w535.yaml" --device 192.168.1.247
  ```
- **Código Fuente ESPHome**: [`F:\HABANA_robot_esp32\pantalla_jc3248w535.yaml`](file:///F:/HABANA_robot_esp32/pantalla_jc3248w535.yaml).
