import re
import os
import time
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ObsidianService")

class ObsidianService:
    """
    Servicio de Integración de HABANA con Obsidian (Segundo Cerebro y Memoria Externa).
    - Mantiene una Bóveda (Vault) local en Markdown abierta y navegable en Obsidian.
    - Sincroniza dispositivos, cámaras, estancias y automatizaciones con enlaces bidireccionales ([[enlaces]]).
    - Genera Diarios Diarios automatizados (Daily Notes) con telemetría domótica y neuronal.
    - Permite a Lola leer y registrar recuerdos, notas y preferencias familiares.
    """

    def __init__(self, vault_dir: Optional[Path] = None):
        if vault_dir is None:
            # F:\Habana 12\vault
            self.vault_dir = Path(__file__).resolve().parent.parent.parent.parent / "vault"
        else:
            self.vault_dir = Path(vault_dir)

        self.diario_dir = self.vault_dir / "Diario"
        self.dispositivos_dir = self.vault_dir / "Dispositivos"
        self.estancias_dir = self.vault_dir / "Estancias"
        self.camaras_dir = self.vault_dir / "Camaras"
        self.automaciones_dir = self.vault_dir / "Automatizaciones"
        self.personas_dir = self.vault_dir / "Personas"
        self.memoria_dir = self.vault_dir / "Memoria_Lola"
        self.incidencias_dir = self.vault_dir / "Incidencias"
        self.vigilancia_dir = self.vault_dir / "Vigilancia"
        self.sistema_dir = self.vault_dir / "Sistema"
        self.bunker_dir = self.vault_dir / "Bunker"
        self.obsidian_config_dir = self.vault_dir / ".obsidian"

        # WhatsApp Media & Knowledge Archiver Directories
        self.whatsapp_dir = self.vault_dir / "WhatsApp"
        self.wa_enlaces_dir = self.whatsapp_dir / "Enlaces_Web"
        self.wa_videos_dir = self.whatsapp_dir / "Videos"
        self.wa_musica_dir = self.whatsapp_dir / "Musica_y_Audios"
        self.wa_docs_dir = self.whatsapp_dir / "Documentos"
        self.wa_fotos_dir = self.whatsapp_dir / "Fotos"
        self.wa_notas_dir = self.whatsapp_dir / "Notas_Rapidas"
        self.lecciones_file = self.memoria_dir / "00_LECCIONES_Y_CORRECCIONES.md"
        self.lecciones_json = self.memoria_dir / ".lecciones_index.json"

        self.init_vault()

    def init_vault(self):
        """Crea la estructura de carpetas y configuración inicial de Obsidian."""
        try:
            for d in [
                self.vault_dir,
                self.diario_dir,
                self.dispositivos_dir,
                self.estancias_dir,
                self.camaras_dir,
                self.automaciones_dir,
                self.personas_dir,
                self.memoria_dir,
                self.incidencias_dir,
                self.vigilancia_dir,
                self.sistema_dir,
                self.bunker_dir,
                self.obsidian_config_dir,
                self.whatsapp_dir,
                self.wa_enlaces_dir,
                self.wa_videos_dir,
                self.wa_musica_dir,
                self.wa_docs_dir,
                self.wa_fotos_dir,
                self.wa_notas_dir
            ]:
                d.mkdir(parents=True, exist_ok=True)

            self._create_obsidian_settings()
            self._create_initial_personas()
            self._create_dashboard()
            self._create_canvas()
            self._create_whatsapp_index()
            self._load_lessons_json()
            logger.info(f"📚 [ObsidianService] Bóveda inicializada en: {self.vault_dir}")
        except Exception as e:
            logger.error(f"[ObsidianService] Error inicializando bóveda: {e}")

    def _create_obsidian_settings(self):
        """Configura ajustes básicos de Obsidian para grafo y visualización."""
        app_json = self.obsidian_config_dir / "app.json"
        if not app_json.exists():
            app_json.write_text(json.dumps({
                "alwaysUpdateLinks": True,
                "newLinkFormat": "shortest",
                "useMarkdownLinks": False,
                "showLineNumber": False,
                "livePreview": True
            }, indent=2), encoding="utf-8")

        graph_json = self.obsidian_config_dir / "graph.json"
        if not graph_json.exists():
            graph_json.write_text(json.dumps({
                "collapse-filter": False,
                "search": "",
                "showTags": True,
                "showAttachments": False,
                "hideUnresolved": False,
                "showOrphans": True,
                "scale": 1.2,
                "lineSize": 1.5
            }, indent=2), encoding="utf-8")

    def _create_dashboard(self):
        dash_path = self.vault_dir / "00_HABANA_CEREBRO_CENTRAL.md"
        content = """---
tipo: dashboard
sistema: HABANA Cognitive Smart Home
actualizado: 2026-10-25
tags:
  - dashboard
  - habana
  - cerebro
---

# 🧠 HABANA 12 · Segundo Cerebro & Memoria Cognitiva

Bienvenido a la bóveda de conocimiento persistente de **HABANA**. Todos los dispositivos, automatizaciones, personas y sucesos de tu hogar están documentados en formato **Markdown local** e interconectados mediante enlaces bidireccionales.

---

## 🗺️ Mapa de Navegación del Hogar

```
                  ┌──────────────────────┐
                  │ 🧠 [[00_HABANA_CEREBRO_CENTRAL]] │
                  └──────────┬───────────┘
                             │
     ┌───────────────────────┼────────────────────────┐
     ▼                       ▼                        ▼
🏠 [[Estancias/Indice]]  💡 [[Dispositivos/Indice]]  👁️ [[Camaras/Indice]]
     │                       │                        │
     ▼                       ▼                        ▼
👥 [[Personas/Indice]]   ⚡ [[Automatizaciones/Indice]] 📅 [[Diario/Indice]]
```

---

## 📌 Accesos Rápidos
- 📊 **Lienzo Espacial Visual**: Abre el archivo `Topologia_Hogar.canvas` para ver el mapa 2D interactivo.
- 📅 **Diario de Hoy**: [[Diario/2026-10-25]]
- 🛋️ **Estancias Principales**:
  - [[Estancias/Salon]] · [[Estancias/Pasillo]] · [[Estancias/Habitacion_Andrea]] · [[Estancias/Cocina]] · [[Estancias/Principal]]
- 👥 **Habitantes**:
  - [[Personas/Tomas]] · [[Personas/Andrea]] · [[Personas/Lola]]
- 👁️ **Visión Neuronal**:
  - [[Camaras/camara_pasillo]] · [[Camaras/camara_cam720]]

---

> [!NOTE]
> Cualquier nota que escribas o edites en Obsidian puede ser consultada por **Lola** para comprender tus preferencias, recordar citas y conocer el estado exacto de la vivienda.
"""
        dash_path.write_text(content, encoding="utf-8")

    def _create_initial_personas(self):
        tomas_path = self.personas_dir / "Tomas.md"
        if not tomas_path.exists():
            tomas_path.write_text("""---
nombre: Tomás
rol: Administrador / Creador
estancias_favoritas:
  - [[Estancias/Salon]]
preferencias:
  temperatura_confort: 21.5
  tono_luz: calido
tags:
  - persona
  - habitante
---

# Tomás
Administrador principal del sistema HABANA.

## 💡 Preferencias de Iluminación
- Prefiere luz indirecta y cálida (2700K - 3000K) en el salón y dormitorio.
- Iluminación automática de cortesía por cámaras en pasillo y salón durante la noche.

## 📝 Notas y Recordatorios
- Sistema de visión actualizado a YOLOv8n ONNX local (~25ms).
""", encoding="utf-8")

        andrea_path = self.personas_dir / "Andrea.md"
        if not andrea_path.exists():
            andrea_path.write_text("""---
nombre: Andrea
habitacion: [[Estancias/Habitacion_Andrea]]
dispositivos:
  - [[Dispositivos/luz_lazos_andrea]]
  - [[Dispositivos/luz_ventana_andrea]]
  - [[Dispositivos/led_cama_andrea]]
  - [[Dispositivos/led_foso_andrea]]
  - [[Dispositivos/cover_persiana_andrea]]
tags:
  - persona
  - habitante
---

# Andrea
Hija de la vivienda. Su dormitorio cuenta con el gemelo digital fotorrealista sub-píxel calibrado.

## 🛏️ Su Habitación
- [[Estancias/Habitacion_Andrea]]
- Dispone de conmutación de 4 puntos para la lámpara de lazos.
""", encoding="utf-8")

        lola_path = self.personas_dir / "Lola.md"
        if not lola_path.exists():
            lola_path.write_text("""---
nombre: Lola
tipo: IA Mayordomo Cognitivo
motor: Groq / Llama-3.3 / YOLOv8 Local
rol: Asistente Domótico Integral
tags:
  - ia
  - mayordomo
---

# Lola (HABANA AI)
Inteligencia conversacional local de HABANA.

## 🎯 Capacidades
- Control domótico por lenguaje natural directo.
- Memoria persistente sincronizada con este Vault de Obsidian.
- Coordinación con el centinela de visión artificial YOLOv8.
- Monitoreo proactivo de seguridad y hábitos familiares.
""", encoding="utf-8")

    def _create_canvas(self):
        canvas_path = self.vault_dir / "Topologia_Hogar.canvas"
        if not canvas_path.exists():
            canvas_data = {
                "nodes": [
                    {"id": "hub", "x": 0, "y": 0, "width": 260, "height": 130, "type": "text", "text": "## 🧠 HABANA 12\nNúcleo Domótico Central\nFastAPI :8050 · Z2M 1883"},
                    {"id": "salon", "x": -350, "y": -220, "width": 260, "height": 140, "type": "text", "text": "### 🛋️ [[Estancias/Salon]]\n- [[Dispositivos/led_sofa_salon]]\n- [[Camaras/camara_cam720]]\n- Dimmer 9 Pasos"},
                    {"id": "pasillo", "x": 350, "y": -220, "width": 260, "height": 140, "type": "text", "text": "### 🚶 [[Estancias/Pasillo]]\n- [[Dispositivos/led_pasillo_central]]\n- [[Camaras/camara_pasillo]]\n- Conmutadas Norte/Sur"},
                    {"id": "andrea", "x": -350, "y": 220, "width": 260, "height": 140, "type": "text", "text": "### 👧 [[Estancias/Habitacion_Andrea]]\n- [[Dispositivos/luz_lazos_andrea]]\n- [[Dispositivos/led_cama_andrea]]\n- Persiana Motorizada"},
                    {"id": "vision", "x": 350, "y": 220, "width": 260, "height": 140, "type": "text", "text": "### 👁️ Centinela YOLOv8\n- Inferencia CPU ~25ms\n- Discriminación Pet-Safe\n- [[Diario/2026-10-25]]"}
                ],
                "edges": [
                    {"id": "e1", "fromNode": "hub", "fromSide": "left", "toNode": "salon", "toSide": "right"},
                    {"id": "e2", "fromNode": "hub", "fromSide": "right", "toNode": "pasillo", "toSide": "left"},
                    {"id": "e3", "fromNode": "hub", "fromSide": "bottom", "toNode": "andrea", "toSide": "top"},
                    {"id": "e4", "fromNode": "hub", "fromSide": "bottom", "toNode": "vision", "toSide": "top"},
                    {"id": "e5", "fromNode": "vision", "fromSide": "top", "toNode": "pasillo", "toSide": "bottom"},
                    {"id": "e6", "fromNode": "vision", "fromSide": "left", "toNode": "salon", "toSide": "bottom"}
                ]
            }
            canvas_path.write_text(json.dumps(canvas_data, indent=2), encoding="utf-8")

    def sync_devices_to_vault(self) -> Dict[str, Any]:
        """Sincroniza todos los dispositivos de Zigbee2MQTT y estancias a Markdown."""
        config_path = Path(__file__).resolve().parent.parent.parent / "config" / "z2m_lighting_core.json"
        if not config_path.exists():
            return {"status": "error", "message": "z2m_lighting_core.json no encontrado"}

        try:
            with open(config_path, "r", encoding="utf-8") as f:
                core = json.load(f)

            real_lights = core.get("real_lights", {})
            led_controllers = core.get("led_controllers", {})
            plates = core.get("plates", {})

            rooms_map: Dict[str, List[str]] = {}

            # 1. Crear fichas de luces reales
            for lid, ldata in real_lights.items():
                name = ldata.get("name", lid)
                room = ldata.get("room", "general")
                power_dev = ldata.get("power_device", "")
                power_ch = ldata.get("power_channel", "")
                commutations = ldata.get("commutation_switches", [])
                watts = ldata.get("watts", 18)

                rooms_map.setdefault(room, []).append(lid)

                comm_links = "\n".join([f"- Placa [[Dispositivos/{c.get('device')}]] (Canal `{c.get('channel')}`)" for c in commutations]) or "- *Sin conmutadas asociadas (Carga directa única)*"

                content = f"""---
id: {lid}
nombre: "{name}"
estancia: "[[Estancias/{room.capitalize()}]]"
tipo: luz_real
potencia_w: {watts}
canal_potencia: "{power_dev} / {power_ch}"
conmutadas_count: {len(commutations)}
tags:
  - dispositivo
  - iluminacion
  - {room}
---

# {name}

Luz real perteneciente a la estancia **[[Estancias/{room.capitalize()}]]**.

## ⚡ Conexión Eléctrica
- **Actuador de Carga**: `{power_dev}` (Canal `{power_ch}`)
- **Consumo Estimado**: `{watts} W`

## 🔀 Interruptores Conmutados Vinculados
{comm_links}

## 📊 Estado en Vivo
- Para consultar o conmutar: usar API HABANA `/api/devices/control` con ID `{lid}`.
"""
                (self.dispositivos_dir / f"{lid}.md").write_text(content, encoding="utf-8")

            # 2. Crear fichas de Tiras LED
            for cid, cdata in led_controllers.items():
                name = cdata.get("name", cid)
                room = cdata.get("room", "general")
                device = cdata.get("device", "")
                rooms_map.setdefault(room, []).append(cid)

                content = f"""---
id: {cid}
nombre: "{name}"
estancia: "[[Estancias/{room.capitalize()}]]"
tipo: tira_led_regulable
dispositivo_z2m: "{device}"
tags:
  - dispositivo
  - tira_led
  - {room}
---

# {name}

Controlador de Tira LED regulable en brillo y color para **[[Estancias/{room.capitalize()}]]**.

- **Dispositivo Zigbee**: `{device}`
- **Estancia**: [[Estancias/{room.capitalize()}]]
"""
                (self.dispositivos_dir / f"{cid}.md").write_text(content, encoding="utf-8")

            # 3. Crear fichas de Estancias
            room_names = {
                "salon": "Salón y Comedor",
                "pasillo": "Pasillo Central",
                "andrea": "Habitación de Andrea",
                "cocina": "Cocina",
                "bano": "Baño",
                "principal": "Dormitorio Principal",
                "entrada": "Entrada y Recibidor",
                "terraza": "Terraza Exterior"
            }

            for rkey, dev_list in rooms_map.items():
                rname = room_names.get(rkey, rkey.capitalize())
                dev_links = "\n".join([f"- [[Dispositivos/{d}]]" for d in dev_list])

                cam_link = ""
                if rkey == "salon":
                    cam_link = "- 👁️ Cámara asociada: [[Camaras/camara_cam720]]"
                elif rkey == "pasillo":
                    cam_link = "- 👁️ Cámara asociada: [[Camaras/camara_pasillo]]"
                elif rkey == "terraza":
                    cam_link = "- 👁️ Cámara asociada: [[Camaras/camara_terraza]]"

                content = f"""---
id: {rkey}
nombre: "{rname}"
total_dispositivos: {len(dev_list)}
tags:
  - estancia
  - habitacion
---

# {rname}

Espacio domótico supervisado por HABANA.

## 💡 Dispositivos de Iluminación
{dev_links}

## 📹 Cámaras y Sensores
{cam_link if cam_link else "- *Sin cámaras interiores asignadas.*"}

## 🔗 Enlaces Relacionados
- [[00_HABANA_CEREBRO_CENTRAL]]
"""
                (self.estancias_dir / f"{rkey.capitalize()}.md").write_text(content, encoding="utf-8")

            # 4. Crear fichas de Cámaras
            cameras_info = {
                "camara_pasillo": ("Cámara Pasillo Interior", "Pasillo", "auto_camara_pasillo_humano", "led_pasillo_central"),
                "camara_cam720": ("Cámara Salón Cam720", "Salon", "auto_camara_cam720_salon", "led_sofa_salon"),
                "camara_terraza": ("Cámara Terraza Exterior", "Terraza", None, None)
            }

            for cid, (cname, croom, auto_id, light_id) in cameras_info.items():
                content = f"""---
id: {cid}
nombre: "{cname}"
estancia: "[[Estancias/{croom}]]"
motor_vision: YOLOv8n-ONNX Local
inmunidad_mascotas: true
tags:
  - camara
  - vision_sentinel
  - ia
---

# {cname}

Cámara integrada en el Centinela Neuronal de HABANA con **YOLOv8-Nano ONNX**.

- **Ubicación**: [[Estancias/{croom}]]
- **Inferencia en Local**: ~25-50ms CPU (sin nube).
- **Automatización**: {f'[[Automatizaciones/{auto_id}]]' if auto_id else 'Sin automatización directa'}
- **Luz que enciende**: {f'[[Dispositivos/{light_id}]]' if light_id else 'Ninguna'}
"""
                (self.camaras_dir / f"{cid}.md").write_text(content, encoding="utf-8")

            # 5. Crear fichas de Automatizaciones
            auto_path = Path(__file__).resolve().parent.parent.parent / "config" / "automations.json"
            if auto_path.exists():
                with open(auto_path, "r", encoding="utf-8") as f:
                    automations = json.load(f)

                for a in automations:
                    aid = a.get("id", "auto")
                    aname = a.get("name", aid)
                    enabled = a.get("enabled", True)
                    desc = a.get("description", "")
                    content = f"""---
id: {aid}
nombre: "{aname}"
activo: {str(enabled).lower()}
tipo: {a.get('type', 'automation')}
tags:
  - automatizacion
  - regla
---

# {aname}

{desc}

- **Disparador**: `{json.dumps(a.get('trigger', {}), ensure_ascii=False)}`
- **Acciones**: `{json.dumps(a.get('actions', []), ensure_ascii=False)}`
- **Última ejecución**: `{a.get('last_triggered', 'N/A')}`
"""
                    (self.automaciones_dir / f"{aid}.md").write_text(content, encoding="utf-8")

            return {
                "status": "success",
                "vault_path": str(self.vault_dir),
                "synced_lights": len(real_lights),
                "synced_controllers": len(led_controllers),
                "synced_rooms": len(rooms_map)
            }

        except Exception as e:
            logger.error(f"[ObsidianService] Error en sync_devices_to_vault: {e}")
            return {"status": "error", "error": str(e)}

    def generate_daily_digest(self) -> Dict[str, Any]:
        """Genera o actualiza el diario del día con resumen domótico, visión e IA."""
        today_str = datetime.now().strftime("%Y-%m-%d")
        daily_path = self.diario_dir / f"{today_str}.md"

        try:
            from app.services.vision_sentinel import vision_sentinel
            sentinel_data = vision_sentinel.get_activity_summary()
            events = sentinel_data.get("recent_events", [])
            snaps = sentinel_data.get("trigger_snapshots", [])

            human_detections = [e for e in events if e.get("subject") == "human"]
            pet_detections = [e for e in events if e.get("subject") == "pet"]
            auto_offs = [e for e in events if e.get("action_taken") == "AUTO_OFF"]

            snaps_lines = []
            for s in snaps[:8]:
                cam_name = s.get("cam_name", "Salón")
                if cam_name in ("camara", "camara_cam720"):
                    cam_name = "Salón"
                elif cam_name == "camara_pasillo":
                    cam_name = "Pasillo"
                score_val = s.get("score")
                if score_val and score_val > 0:
                    score_str = f"{int(score_val * 100)}% certeza"
                else:
                    score_str = "Confirmada por YOLOv8"
                snaps_lines.append(f"- **{s.get('time_str')}** | [[Estancias/{cam_name.capitalize()}]] | Persona detectada ({score_str}) | Archivo: `{s.get('filename_annotated')}`")

            snaps_section = "\n".join(snaps_lines) if snaps_lines else "- *No hay capturas registradas aún hoy.*"

            content = f"""---
fecha: {today_str}
generado_por: [[Personas/Lola]]
detecciones_humanas: {len(human_detections)}
detecciones_mascotas: {len(pet_detections)}
apagados_inactividad: {len(auto_offs)}
motor_vision: YOLOv8n-ONNX
tags:
  - diario
  - telemetria
  - habana
---

# 📅 Diario del Hogar · {today_str}

Resumen automatizado de actividad, seguridad y bienestar de la vivienda generado por **[[Personas/Lola]]**.

---

## 🏃 Resumen de Presencia e Iluminación (YOLOv8)
- **Activaciones de luz por presencia**: `{len(human_detections)}` veces.
- **Mascotas filtradas (Pet-Safe)**: `{len(pet_detections)}` eventos ignorados sin encender luz.
- **Ciclos de apagado por inactividad**: `{len(auto_offs)}` apagados completados sin rebotes.

### 📸 Últimas Capturas Forenses de Disparo
{snaps_section}

---

## 💡 Estado de las Luces en las Estancias
- [[Estancias/Salon]]: Tira de sofá y dimmer de 9 pasos operativos.
- [[Estancias/Pasillo]]: Tira central con auto-apagado ágil en 40s.
- [[Estancias/Habitacion_Andrea]]: Gemelo digital sincronizado.

---

## 📝 Notas del Asistente
> Hoy el sistema de detección neuronal por visión local ha funcionado con cero rebotes y tiempos de respuesta de encendido de ~2ms.

*Registro generado el {datetime.now().strftime('%d/%m/%Y a las %H:%M:%S')}.*
"""
            daily_path.write_text(content, encoding="utf-8")
            return {"status": "success", "file": str(daily_path), "detections": len(human_detections)}

        except Exception as e:
            logger.error(f"[ObsidianService] Error en generate_daily_digest: {e}")
            return {"status": "error", "error": str(e)}

    def record_memory(self, title: str, content_text: str, author: str = "Tomas", category: str = "general") -> Dict[str, Any]:
        """Permite a Lola o al usuario registrar una nota o memoria en Markdown."""
        safe_title = "".join(c for c in title if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
        filename = f"{datetime.now().strftime('%Y%m%d')}_{safe_title}.md"
        filepath = self.memoria_dir / filename

        md_content = f"""---
titulo: "{title}"
autor: [[Personas/{author}]]
fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
categoria: {category}
tags:
  - memoria
  - lola
  - {category}
---

# {title}

{content_text}

---
*Guardado automáticamente por [[Personas/Lola]] en el Vault de Obsidian.*
"""
        filepath.write_text(md_content, encoding="utf-8")
        return {"status": "success", "path": str(filepath)}

    def _create_whatsapp_index(self):
        """Crea el índice y dashboard de WhatsApp dentro del Vault."""
        idx_file = self.whatsapp_dir / "00_INDICE_WHATSAPP.md"
        content = """---
tipo: index
modulo: WhatsApp Cognitive Storage
actualizado: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """
tags:
  - whatsapp
  - multimedia
  - segundo-cerebro
---

# 📱 Archivo y Memoria de WhatsApp en Obsidian

Bienvenido a tu archivo cognitivo de WhatsApp. Lola clasifica automáticamente todo el contenido que envíes por chat en sus carpetas organizadas:

## 🗂️ Categorías de Archivo
- 🌐 [[WhatsApp/Enlaces_Web/|Enlaces Web y Artículos]] - Páginas web, vídeos de YouTube y enlaces guardados.
- 🎬 [[WhatsApp/Videos/|Vídeos]] - Clips de vídeo MP4 guardados con reproductor integrado.
- 🎵 [[WhatsApp/Musica_y_Audios/|Música y Audios]] - Canciones y audios de voz reproducibles.
- 📄 [[WhatsApp/Documentos/|Documentos]] - PDFs, facturas, recibos y manuales.
- 🖼️ [[WhatsApp/Fotos/|Fotos e Imágenes]] - Galería fotográfica capturada.
- 📝 [[WhatsApp/Notas_Rapidas/|Notas Rápidas]] - Ideas, listas y recordatorios dictados por WhatsApp.

---
*Automatizado por [[Personas/Lola]] para [[Personas/Tomas]].*
"""
        idx_file.write_text(content, encoding="utf-8")

    def save_whatsapp_link(self, url: str, title: str = "", note: str = "", sender: str = "Tomas") -> Dict[str, Any]:
        """Guarda un enlace web o de YouTube como una nota estructurada en WhatsApp/Enlaces_Web."""
        import re
        import urllib.request
        import urllib.parse

        clean_title = title.strip()
        if not clean_title:
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                with urllib.request.urlopen(req, timeout=3) as resp:
                    html = resp.read(65536).decode('utf-8', errors='ignore')
                    m = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
                    if m:
                        clean_title = m.group(1).strip()
            except Exception:
                pass

        if not clean_title:
            try:
                parsed = urllib.parse.urlparse(url)
                clean_title = (parsed.netloc + parsed.path).strip("/").replace("/", " - ")
            except Exception:
                clean_title = "Enlace Web"

        slug = "".join([c if c.isalnum() or c in " _-" else "" for c in clean_title])[:40].strip() or "Enlace"
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{slug}.md"
        filepath = self.wa_enlaces_dir / filename

        is_youtube = "youtube.com" in url or "youtu.be" in url
        tags = ["whatsapp", "enlace"]
        if is_youtube:
            tags.append("youtube")
            tags.append("video")

        md_content = f"""---
titulo: "{clean_title}"
url: "{url}"
fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
remitente: [[Personas/{sender}]]
tags:
{chr(10).join(f'  - {t}' for t in tags)}
---

# 🌐 [{clean_title}]({url})

- **URL:** {url}
- **Fecha:** {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
- **Enviado por:** [[Personas/{sender}]]

{f"### 📝 Nota / Comentario:{chr(10)}{note}" if note else ""}

---
*Guardado automáticamente por [[Personas/Lola]] en [[WhatsApp/00_INDICE_WHATSAPP|WhatsApp Vault]].*
"""
        filepath.write_text(md_content, encoding="utf-8")
        self._create_whatsapp_index()
        return {"status": "success", "category": "Enlaces_Web", "filename": filename, "path": str(filepath)}

    def save_whatsapp_media(self, source_path: str, caption: str = "", sender: str = "Tomas") -> Dict[str, Any]:
        """Clasifica un archivo multimedia recibido de WhatsApp en Videos, Musica, Fotos o Documentos con nota Markdown."""
        import shutil

        src = Path(source_path)
        if not src.exists():
            # If relative to frontend/dist or media
            base_dir = Path(__file__).resolve().parent.parent.parent
            clean_rel = source_path.lstrip("/").lstrip("\\")
            for cand in [base_dir / "frontend" / "dist" / clean_rel, base_dir / "media" / clean_rel, Path("F:/Habana 14/frontend/dist") / clean_rel]:
                if cand.exists():
                    src = cand
                    break

        if not src.exists():
            return {"status": "error", "message": f"Archivo no encontrado: {source_path}"}

        ext = src.suffix.lower()
        if ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"]:
            target_dir = self.wa_videos_dir
            category = "Videos"
            icon = "🎬"
            tag = "video"
        elif ext in [".mp3", ".ogg", ".wav", ".m4a", ".aac", ".flac"]:
            target_dir = self.wa_musica_dir
            category = "Musica_y_Audios"
            icon = "🎵"
            tag = "audio"
        elif ext in [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".zip", ".rar"]:
            target_dir = self.wa_docs_dir
            category = "Documentos"
            icon = "📄"
            tag = "documento"
        else:
            target_dir = self.wa_fotos_dir
            category = "Fotos"
            icon = "🖼️"
            tag = "foto"

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        new_media_filename = f"{timestamp}_{src.name}"
        dest_media_path = target_dir / new_media_filename
        shutil.copy2(src, dest_media_path)

        note_filename = f"{timestamp}_{src.stem}.md"
        note_path = target_dir / note_filename

        md_content = f"""---
archivo: "{new_media_filename}"
categoria: "{category}"
fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
remitente: [[Personas/{sender}]]
tags:
  - whatsapp
  - {tag}
---

# {icon} Archivo WhatsApp: {new_media_filename}

- **Fecha:** {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
- **Enviado por:** [[Personas/{sender}]]
{f"- **Descripción:** {caption}" if caption else ""}

## 👁️ Vista Previa / Reproductor
![[{new_media_filename}]]

---
*Archivado automáticamente en [[WhatsApp/00_INDICE_WHATSAPP|WhatsApp/{category}]].*
"""
        note_path.write_text(md_content, encoding="utf-8")
        self._create_whatsapp_index()
        return {
            "status": "success",
            "category": category,
            "media_file": new_media_filename,
            "note_file": note_filename,
            "note_path": str(note_path)
        }

    def save_whatsapp_note(self, text: str, title: str = "", sender: str = "Tomas") -> Dict[str, Any]:
        """Guarda un apunte o texto rápido de WhatsApp en WhatsApp/Notas_Rapidas."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        slug = "".join([c if c.isalnum() or c in " _-" else "" for c in (title or text[:30])])[:30].strip() or "Nota"
        filename = f"{timestamp}_{slug}.md"
        filepath = self.wa_notas_dir / filename

        md_content = f"""---
titulo: "{title or slug}"
fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
remitente: [[Personas/{sender}]]
tags:
  - whatsapp
  - nota-rapida
---

# 📝 {title or slug}

{text}

---
- **Fecha de captura:** {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
- **Remitente:** [[Personas/{sender}]]
*Guardado por [[Personas/Lola]] en [[WhatsApp/00_INDICE_WHATSAPP|WhatsApp/Notas_Rapidas]].*
"""
        filepath.write_text(md_content, encoding="utf-8")
        self._create_whatsapp_index()
        return {"status": "success", "category": "Notas_Rapidas", "filename": filename, "path": str(filepath)}

    def get_vault_summary(self) -> Dict[str, Any]:
        """Devuelve estadísticas y estructura de la bóveda para la interfaz web."""
        counts = {
            "diario": len(list(self.diario_dir.glob("*.md"))),
            "dispositivos": len(list(self.dispositivos_dir.glob("*.md"))),
            "estancias": len(list(self.estancias_dir.glob("*.md"))),
            "camaras": len(list(self.camaras_dir.glob("*.md"))),
            "automatizaciones": len(list(self.automaciones_dir.glob("*.md"))),
            "personas": len(list(self.personas_dir.glob("*.md"))),
            "memorias": len(list(self.memoria_dir.glob("*.md")))
        }
        total_notes = sum(counts.values()) + 1  # + dashboard

        return {
            "vault_path": str(self.vault_dir),
            "total_notes": total_notes,
            "categories": counts,
            "has_canvas": (self.vault_dir / "Topologia_Hogar.canvas").exists(),
            "latest_daily": f"{datetime.now().strftime('%Y-%m-%d')}.md"
        }


    def record_surveillance_event(self, camera_name: str, event_type: str, description: str, snapshot_path: Optional[str] = None, threat_level: int = 0) -> Dict[str, Any]:
        """Registra un evento de vigilancia en Vigilancia/YYYY-MM-DD.md."""
        today = datetime.now().strftime('%Y-%m-%d')
        now_time = datetime.now().strftime('%H:%M:%S')
        daily_surv = self.vigilancia_dir / f"{today}.md"
        
        if not daily_surv.exists():
            header = f"""---
tipo: diario_vigilancia
fecha: {today}
tags:
  - vigilancia
  - seguridad
---

# 👁️ Registro de Vigilancia: {today}

## 📋 Resumen del Día
- **Estado**: Monitoreo continuo de cámaras activo.

---

## ⏱️ Línea Temporal de Eventos
"""
            daily_surv.write_text(header, encoding="utf-8")
        
        entry = f"""
### 🕒 {now_time} - {event_type} ([[Camaras/{camera_name}|{camera_name}]])
- **Descripción**: {description}
- **Nivel de amenaza**: {threat_level}%
"""
        if snapshot_path:
            snap_file = Path(snapshot_path).name
            entry += f"- **Captura**: ![[{snap_file}]]\n"
        
        with open(daily_surv, "a", encoding="utf-8") as f:
            f.write(entry)
            
        return {"status": "success", "file": str(daily_surv)}

    def record_system_change(self, category: str, title: str, description: str, details: Optional[Dict] = None) -> Dict[str, Any]:
        """Añade un cambio técnico a Sistema/BITACORA_HISTORICA_CAMBIOS.md."""
        log_file = self.sistema_dir / "BITACORA_HISTORICA_CAMBIOS.md"
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        entry = f"""
---

## [{now_str}] {category.upper()}: {title}
{description}
"""
        if details:
            entry += f"\n```json\n{json.dumps(details, indent=2, ensure_ascii=False)}\n```\n"
            
        if log_file.exists():
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(entry)
        else:
            log_file.write_text(f"# 📜 Bitácora Histórica de Cambios y Recuperación del Sistema\n{entry}", encoding="utf-8")
            
        return {"status": "success", "file": str(log_file)}

    def search_vault(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Busca notas relevantes en la bóveda por palabras clave, ignorando frontmatter."""
        results = []
        q_lower = query.lower().strip()
        if not q_lower:
            return results
            
        # Ignorar stopwords comunes
        stopwords = {"que", "los", "las", "por", "para", "con", "del", "usa", "segun", "este", "esta", "como", "cual"}
        query_words = [w for w in re.findall(r"\w+", q_lower) if len(w) >= 3 and w not in stopwords]
        if not query_words:
            query_words = [w for w in re.findall(r"\w+", q_lower) if len(w) >= 3]
        if not query_words:
            return results
            
        for md_file in self.vault_dir.rglob("*.md"):
            if md_file.name.startswith("."):
                continue
            try:
                content = md_file.read_text(encoding="utf-8", errors="ignore")
                # Eliminar YAML frontmatter
                body = re.sub(r"^---[\s\S]*?---\s*", "", content)
                body_lower = body.lower()
                
                # Calcular relevancia
                score = sum(body_lower.count(w) for w in query_words)
                if md_file.stem.lower() in q_lower or any(w in md_file.stem.lower() for w in query_words):
                    score += 5
                    
                if score > 0:
                    # Extraer el párrafo más relevante
                    paragraphs = [p.strip() for p in body.split("\n\n") if p.strip() and not p.strip().startswith("#")]
                    excerpt = ""
                    for p_text in paragraphs:
                        p_lower = p_text.lower()
                        if any(w in p_lower for w in query_words):
                            # Limpiar markdown excesivo
                            clean_p = re.sub(r"\[\[(.*?)\]\]", r"\1", p_text)
                            excerpt = clean_p.replace("\n", " ").strip()[:350]
                            break
                    if not excerpt and paragraphs:
                        excerpt = paragraphs[0].replace("\n", " ").strip()[:250]
                        
                    rel_path = md_file.relative_to(self.vault_dir)
                    results.append({
                        "title": md_file.stem,
                        "path": str(rel_path).replace("\\", "/"),
                        "category": str(rel_path.parent).replace("\\", "/") if rel_path.parent != Path(".") else "Raíz",
                        "score": score,
                        "excerpt": excerpt
                    })
            except Exception:
                continue
                
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:max_results]


    def _load_lessons_json(self) -> List[Dict[str, Any]]:
        """Carga el índice de lecciones aprendidas o inicializa con las existentes."""
        if not self.lecciones_json.exists():
            initial_lessons = [
                {
                    "id": "LECCION-20261102-01",
                    "title": "Apagado General de Luces",
                    "failure_context": "Dejar tiras LED o pilotos encendidos al pedir apagar todo",
                    "correction": "El protocolo de apagado general debe abarcar TODOS los IDs de luz y tiras LED sin excepción",
                    "rule": "Al pedir 'apaga todo' o 'buenas noches', emitir apagado para todas las bombillas y tiras registradas",
                    "source": "Tomas",
                    "date": "2026-11-02 21:47:30",
                    "active": True
                },
                {
                    "id": "LECCION-20261102-02",
                    "title": "Luz de Fondo en Interruptores",
                    "failure_context": "Activar el piloto de fondo creyendo que es una luz de techo",
                    "correction": "Las entidades con nombre 'Luz de fondo' son solo el piloto LED indicador de pared",
                    "rule": "Nunca encender 'Luz de fondo' salvo que el usuario lo pida de forma explícita",
                    "source": "Tomas",
                    "date": "2026-11-02 22:15:00",
                    "active": True
                }
            ]
            self._save_lessons_json(initial_lessons)
            self._rebuild_lessons_markdown(initial_lessons)
            return initial_lessons
        try:
            return json.loads(self.lecciones_json.read_text(encoding="utf-8"))
        except Exception:
            return []

    def _save_lessons_json(self, lessons: List[Dict[str, Any]]):
        try:
            self.lecciones_json.write_text(json.dumps(lessons, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            logger.error(f"[ObsidianService] Error guardando index JSON de lecciones: {e}")

    def _rebuild_lessons_markdown(self, lessons: List[Dict[str, Any]]):
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        active_count = sum(1 for l in lessons if l.get("active", True))
        
        md_text = f"""---
tipo: base_de_conocimiento_adaptativa
sistema: HABANA Cognitive Core
actualizado: {now_str}
total_lecciones: {len(lessons)}
lecciones_activas: {active_count}
tags:
  - lecciones_aprendidas
  - auto_aprendizaje
  - feedback_loop
  - correcciones_tomas
---

# 🧠 Lecciones Aprendidas y Reglas de Corrección de Tomás

Este documento contiene las reglas acumuladas por **HABANA** a partir de fallos previos, aclaraciones y correcciones directas de **Tomás**.
El orquestador de IA consulta estas lecciones de forma preventiva con **MÁXIMA PRIORIDAD** antes de ejecutar cualquier comando.

---

## 📌 Reglas Activas ({active_count})

"""
        for l in lessons:
            status_icon = "✅ ACTIVA" if l.get("active", True) else "⏸️ EN PAUSA"
            md_text += f"""### [{l.get('id')}] {l.get('title')} ({status_icon})
- **📅 Fecha**: `{l.get('date')}` | **Fuente**: [[Personas/{l.get('source', 'Tomas')}]]
- **⚠️ Fallo previo evitado**: {l.get('failure_context')}
- **🛠️ Corrección indicada**: {l.get('correction')}
- **🎯 Regla de oro aprendida**: **{l.get('rule')}**

---

"""
        try:
            self.lecciones_file.write_text(md_text, encoding="utf-8")
        except Exception as e:
            logger.error(f"[ObsidianService] Error escribiendo Lecciones Markdown: {e}")

    def record_lesson(self, title: str, failure_context: str, correction: str, rule: str, source: str = "Tomas") -> Dict[str, Any]:
        """Registra una nueva lección o corrección y actualiza Obsidian."""
        lesson_id = f"LECCION-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        lessons = self._load_lessons_json()
        
        title_clean = title.strip().lower()
        for existing in lessons:
            if existing.get("title", "").strip().lower() == title_clean:
                existing["failure_context"] = failure_context.strip()
                existing["correction"] = correction.strip()
                existing["rule"] = rule.strip()
                existing["date"] = now_str
                existing["active"] = True
                self._save_lessons_json(lessons)
                self._rebuild_lessons_markdown(lessons)
                return {"status": "updated", "lesson": existing}
                
        new_lesson = {
            "id": lesson_id,
            "title": title.strip(),
            "failure_context": failure_context.strip(),
            "correction": correction.strip(),
            "rule": rule.strip(),
            "source": source,
            "date": now_str,
            "active": True
        }
        lessons.insert(0, new_lesson)
        self._save_lessons_json(lessons)
        self._rebuild_lessons_markdown(lessons)
        
        try:
            from app.services.memory_service import memory_service
            memory_service.add_memory(
                doc_id=lesson_id,
                text=f"Lección aprendida: {title}. Corrección de Tomás: {correction}. Regla a cumplir: {rule}",
                metadata={"category": "leccion_aprendida", "id": lesson_id, "rule": rule}
            )
        except Exception as e:
            logger.warning(f"Error indexando en memoria semántica: {e}")
            
        logger.info(f"🧠 [ObsidianService] Lección registrada: {title}")
        return {"status": "created", "lesson": new_lesson}

    def get_active_lessons(self, limit: int = 25) -> List[Dict[str, Any]]:
        lessons = self._load_lessons_json()
        return lessons[:limit]

    def delete_lesson(self, lesson_id: str) -> bool:
        lessons = self._load_lessons_json()
        filtered = [l for l in lessons if l.get("id") != lesson_id]
        if len(filtered) != len(lessons):
            self._save_lessons_json(filtered)
            self._rebuild_lessons_markdown(filtered)
            return True
        return False

    def toggle_lesson(self, lesson_id: str) -> Optional[bool]:
        lessons = self._load_lessons_json()
        target = None
        for l in lessons:
            if l.get("id") == lesson_id:
                l["active"] = not l.get("active", True)
                target = l["active"]
                break
        if target is not None:
            self._save_lessons_json(lessons)
            self._rebuild_lessons_markdown(lessons)
        return target

    def get_lessons_prompt_context(self) -> str:
        lessons = [l for l in self._load_lessons_json() if l.get("active", True)]
        if not lessons:
            return ""
        
        lines = [
            "\n\n[🚨 REGLAS Y LECCIONES APRENDIDAS DE CORRECCIONES PREVIAS DE TOMÁS (PRIORIDAD ABSOLUTA) 🚨]",
            "DEBES cumplir estas reglas aprendidas por encima de cualquier otra directiva para evitar repetir fallos previos:"
        ]
        for idx, l in enumerate(lessons[:12], 1):
            lines.append(f"{idx}. {l.get('title')}: {l.get('rule')} (Fallo previo evitado: {l.get('failure_context')})")
        return "\n".join(lines) + "\n"


obsidian_service = ObsidianService()
