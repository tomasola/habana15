---
tipo: catalogo_hardware
sistema: HABANA Búnker IA
actualizado: 2026-11-02
tags:
  - bunker
  - hardware
  - entidades
  - catalogo
---

# 📖 Catálogo de Dispositivos y Entidades para el Búnker IA

Este documento reúne todas las identidades físicas, conmutadas y controladores nativos de **Habana 14** que la IA puede invocar de forma segura a través de los widgets del Búnker.

---

## 🛋️ 1. Salón Comedor
- **Interruptores y Luces de Techo**:
  - `luz_techo_salon`: Luz central de techo.
  - `luz_comedor_salon`: Luz sobre mesa de comedor.
  - `luz_luz_del_comedor_d9b2`: Conmutada comedor.
  - `luz_luz_principal_del_salon_53c1`: Conmutada principal salón.
- **Tiras LED**:
  - `led_sofa_salon`: Tira ambiental en respaldo sofá.
  - `led_tv_salon`: Tira de retroiluminación TV.
  - `led_aparador_salon`: Tira de mueble aparador.
- **Persiana**:
  - `cover.persiana_salon`: Persiana motorizada del balcón/salón (acciones: `open`, `close`, `stop`, `set_position`).
- **Cámara**:
  - `camara_cam720`: Cámara PTZ del salón (RTSP 192.168.1.132).

---

## 🎀 2. Habitación Andrea
- **Iluminación Principal**:
  - `luz_ventana_andrea`: Luz principal zona ventana.
  - `luz_lazos_andrea`: Luz decorativa zona lazos.
- **Tiras LED**:
  - `led_cama_andrea`: Iluminación perimetral cama.
  - `led_foso_andrea`: Iluminación foso falso techo.
- **Persiana**:
  - `cover.persiana_andrea`: Persiana motorizada dormitorio Andrea.

---

## 🛏️ 3. Dormitorio Principal
- **Iluminación**:
  - `luz_techo_principal`: Luz de techo conmutada.
  - `luz_ventana_principal`: Luz ambiente ventana.
- **Tiras LED**:
  - `led_dormitorio_principal`: Tira LED cabecero / moldura.
- **Persiana**:
  - `cover.persiana_principal`: Persiana motorizada dormitorio principal.

---

## 🍳 4. Cocina
- `luz_techo_cocina`: Foco empotrado general.
- `luz_cocina_mesa_7f97`: Iluminación zona mesa/desayunador.
- `luz_cocina_encimera_6ce2`: Iluminación de trabajo bajo muebles altos.
- `luz_estractor_7973`: Iluminación campana extractora.

---

## 🛁 5. Baño
- `luz_techo_bano`: Luz de techo principal.
- `luz_luz_baño_principal_2e8f`: Conmutada lavabo.
- `luz_estractor_baño_0584`: Extractor y luz secundaria.
- `led_espejo_bano`: Tira LED antivaho y contorno espejo.

---

## 🚪 6. Pasillo y Recibidor
- `luz_recibidor_entrada`: Iluminación bienvenida puerta principal.
- `luz_techo_pasillo`: Luces cenitales del pasillo.
- `luz_luz_pasillo_dormitorio_9c4b`: Conmutada zona dormitorios.
- `led_pasillo_central`: Tira guía nocturna en pasillo.
- `camara_pasillo`: Visión de seguridad pasillo (RTSP 192.168.1.129).

---

## 📻 7. Sistema de Audio y Radio
El Búnker controla tanto el streaming HTML5 del navegador como el receptor de audio local del PC y los altavoces Chromecast.

### Emisoras Registradas
| ID de Emisora | Nombre | Icono | Tipo |
|---|---|---|---|
| `los40` | Los 40 Principales | 🎵 | Éxitos Pop / Top 40 |
| `cadena_ser` | Cadena SER | 📻 | Noticias y Deportes |
| `cadena_dial` | Cadena Dial | 🎸 | Pop en Español |
| `los40_classic`| Los 40 Classic | 🎧 | Clásicos 80s/90s |
| `los40_urban`  | Los 40 Urban | 🎤 | Urbano / Latino |
| `radiole`      | Radiolé | 💃 | Música Española |
| `virgin_radio` | Virgin Radio | 🎸 | Rock Internacional |

### Dispositivos de Salida de Audio
- `tarjeta_sonido_pc`: Salida analógica estéreo directa en el mini PC de control.
- `todos`: Modo Multiroom síncrono para toda la vivienda vía Google Cast.

---

## ⚡ 8. Comandos Maestros y Agrupaciones Globales
El Gatekeeper del Búnker admite estas entidades maestras en sus acciones:
- `all_lights` + `turn_on_all`: Enciende simultáneamente todas las luces y tiras de la casa.
- `all_lights` + `turn_off_all`: Apagado general total en 1 solo clic.
- `all_covers` + `open` / `close` / `stop`: Abre o cierra todas las persianas a la vez.
- `radio_master` + `toggle`: Alterna reproducción / pausa de la radio en PC y navegador.
- Grupos por estancia: `salon`, `andrea`, `principal`, `cocina`, `bano`, `pasillo`.

Enlace al índice del Búnker: [[Bunker/00_INDICE_BUNKER]]
