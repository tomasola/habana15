"""
Búnker IA - Motor de Conocimiento y Topología Inteligente (Knowledge Engine)
Conecta la Bóveda de Obsidian (Segundo Cerebro) con el entorno de ejecución aislado del Búnker.
Permite a cualquier agente, modelo o widget consultar la verdad de hardware de Habana 14.
"""

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("BunkerKnowledge")

VAULT_DIR = Path("F:/Habana 14/vault")

ROOMS_TOPOLOGY = {
    "salon": {
        "name": "Salón Comedor",
        "icon": "🛋️",
        "lights": [
            "luz_techo_salon",
            "luz_comedor_salon",
            "luz_luz_del_comedor_d9b2",
            "luz_luz_principal_del_salon_53c1"
        ],
        "leds": [
            "led_sofa_salon",
            "led_tv_salon",
            "led_aparador_salon"
        ],
        "covers": ["cover.persiana_salon", "cover.persiana_salon_puerta"],
        "cameras": ["camara_cam720"]
    },
    "andrea": {
        "name": "Habitación Andrea",
        "icon": "🎀",
        "lights": [
            "luz_ventana_andrea",
            "luz_lazos_andrea"
        ],
        "leds": [
            "led_cama_andrea",
            "led_foso_andrea"
        ],
        "covers": ["cover.persiana_andrea"]
    },
    "principal": {
        "name": "Dormitorio Principal",
        "icon": "🛏️",
        "lights": [
            "luz_techo_principal",
            "luz_ventana_principal"
        ],
        "leds": [
            "led_dormitorio_principal"
        ],
        "covers": ["cover.persiana_principal"]
    },
    "cocina": {
        "name": "Cocina",
        "icon": "🍳",
        "lights": [
            "luz_techo_cocina",
            "luz_cocina_mesa_7f97",
            "luz_cocina_encimera_6ce2",
            "luz_estractor_7973"
        ],
        "leds": [],
        "covers": []
    },
    "bano": {
        "name": "Baño",
        "icon": "🛁",
        "lights": [
            "luz_techo_bano",
            "luz_luz_baño_principal_2e8f",
            "luz_estractor_baño_0584"
        ],
        "leds": ["led_espejo_bano"],
        "covers": []
    },
    "pasillo": {
        "name": "Pasillo Central",
        "icon": "🚪",
        "lights": [
            "luz_techo_pasillo",
            "luz_luz_pasillo_dormitorio_9c4b"
        ],
        "leds": ["led_pasillo_central"],
        "covers": [],
        "cameras": ["camara_pasillo"]
    },
    "entrada": {
        "name": "Recibidor / Entrada",
        "icon": "🔑",
        "lights": ["luz_recibidor_entrada"],
        "leds": [],
        "covers": []
    }
}

RADIO_STATIONS = [
    {"id": "los40", "name": "Los 40 Principales", "icon": "🎵", "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3"},
    {"id": "cadena_ser", "name": "Cadena SER", "icon": "📻", "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENASER.mp3"},
    {"id": "cadena_dial", "name": "Cadena Dial", "icon": "🎸", "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENADIAL.mp3"},
    {"id": "los40_classic", "name": "Los 40 Classic", "icon": "🎧", "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_CLASSIC.mp3"},
    {"id": "los40_urban", "name": "Los 40 Urban", "icon": "🎤", "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_URBAN.mp3"},
    {"id": "radiole", "name": "Radiolé", "icon": "💃", "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIOLE.mp3"},
    {"id": "virgin_radio", "name": "Virgin Radio", "icon": "🎸", "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO.mp3"}
]

SCENES = [
    {"id": "modo_cine", "name": "Modo Cine / Película", "icon": "🎬", "description": "Apaga luces de techo, fija tiras LED en azul tenue y baja persianas."},
    {"id": "modo_relax", "name": "Modo Relax", "icon": "🕯️", "description": "Luz tenue cálida al 20% en salón y dormitorio."},
    {"id": "scene_good_morning", "name": "Buenos Días", "icon": "🌅", "description": "Sube persianas del salón y enciende luz natural."},
    {"id": "scene_fuera_de_casa", "name": "Fuera de Casa (Todo Off)", "icon": "🔒", "description": "Apaga absolutamente todas las luces, radio y baja persianas."},
    {"id": "scene_salon_todo_off", "name": "Salón Todo Off", "icon": "🛋️", "description": "Apaga todas las luces y tiras LED del salón."}
]

class BunkerKnowledge:
    def __init__(self, vault_path: Optional[Path] = None):
        self.vault_path = vault_path or VAULT_DIR
        self._cached_knowledge: Optional[Dict[str, Any]] = None

    def read_obsidian_notes(self) -> Dict[str, Any]:
        """Lee y sintetiza el contenido relevante de Obsidian."""
        notes = {
            "estancias": [],
            "dispositivos": [],
            "automatizaciones": [],
            "camaras": [],
            "personas": []
        }
        if not self.vault_path.exists():
            return notes

        try:
            # Estancias
            estancias_dir = self.vault_path / "Estancias"
            if estancias_dir.exists():
                for f in estancias_dir.glob("*.md"):
                    content = f.read_text(encoding="utf-8", errors="ignore")
                    notes["estancias"].append({
                        "file": f.name,
                        "title": f.stem,
                        "snippet": content[:300]
                    })

            # Dispositivos
            disp_dir = self.vault_path / "Dispositivos"
            if disp_dir.exists():
                for f in disp_dir.glob("*.md"):
                    notes["dispositivos"].append({
                        "id": f.stem,
                        "file": f.name
                    })

            # Automatizaciones
            auto_dir = self.vault_path / "Automatizaciones"
            if auto_dir.exists():
                for f in auto_dir.glob("*.md"):
                    notes["automatizaciones"].append({
                        "id": f.stem,
                        "file": f.name
                    })

            # Cámaras
            cam_dir = self.vault_path / "Camaras"
            if cam_dir.exists():
                for f in cam_dir.glob("*.md"):
                    notes["camaras"].append({
                        "id": f.stem,
                        "file": f.name
                    })

            # Personas
            pers_dir = self.vault_path / "Personas"
            if pers_dir.exists():
                for f in pers_dir.glob("*.md"):
                    notes["personas"].append({
                        "id": f.stem,
                        "file": f.name
                    })

        except Exception as e:
            logger.error(f"[BunkerKnowledge] Error leyendo Obsidian: {e}")

        return notes

    def get_full_topology(self) -> Dict[str, Any]:
        """Genera el diccionario completo de conocimiento para el Búnker y los Agentes."""
        obsidian_data = self.read_obsidian_notes()

        all_lights = []
        for r in ROOMS_TOPOLOGY.values():
            all_lights.extend(r["lights"])
            all_lights.extend(r["leds"])
        all_lights = sorted(list(set(all_lights)))

        all_covers = ["cover.persiana_salon", "cover.persiana_andrea", "cover.persiana_principal"]

        return {
            "version": "1.0-bunker-kbase",
            "vault_dir": str(self.vault_path),
            "rooms": ROOMS_TOPOLOGY,
            "all_lights_count": len(all_lights),
            "all_lights": all_lights,
            "all_covers": all_covers,
            "radio_stations": RADIO_STATIONS,
            "scenes": SCENES,
            "audio_targets": [
                {"id": "todos", "name": "Multiroom (Todos los altavoces)"},
                {"id": "tarjeta_sonido_pc", "name": "Tarjeta de Sonido PC (Estéreo Local)"}
            ],
            "obsidian_sync": {
                "estancias_notes": len(obsidian_data["estancias"]),
                "dispositivos_notes": len(obsidian_data["dispositivos"]),
                "automatizaciones_notes": len(obsidian_data["automatizaciones"]),
                "camaras_notes": len(obsidian_data["camaras"]),
                "personas_notes": len(obsidian_data["personas"])
            },
            "gatekeeper_rules": {
                "max_actions_per_widget": 15,
                "max_frequency_seconds": 2,
                "allowed_services": ["light", "cover", "radio", "scene", "tts"],
                "protected_zones": ["zigbee_broker_admin", "os_reboot", "db_drop"]
            }
        }

    def generate_widget_from_prompt(self, prompt: str) -> Dict[str, Any]:
        """
        Interpreta un requerimiento del usuario en lenguaje natural
        (por ejemplo, proveniente de la bola de IA o chat)
        y devuelve una estructura de widget segura y validada para el Búnker.
        """
        p_lower = prompt.lower()
        actions = []
        title = "Macro Personalizada"
        icon = "⚡"
        color = "#00f3ff"
        category = "macro"

        # 1. Luces generales o por estancia
        if any(w in p_lower for w in ["encend", "prend", "activa", "on"]) and any(w in p_lower for w in ["luz", "luces", "todo", "todas"]):
            if "salon" in p_lower or "salón" in p_lower:
                actions.append({
                    "label": "💡 Luces Salón On",
                    "service": "light",
                    "entity_id": "salon",
                    "action": "turn_on_all",
                    "style": "success"
                })
            elif "andrea" in p_lower:
                actions.append({
                    "label": "🎀 Luces Andrea On",
                    "service": "light",
                    "entity_id": "andrea",
                    "action": "turn_on_all",
                    "style": "success"
                })
            else:
                actions.append({
                    "label": "💡 Encender Luces",
                    "service": "light",
                    "entity_id": "all_lights",
                    "action": "turn_on_all",
                    "style": "success"
                })

        if any(w in p_lower for w in ["apag", "desactiva", "off"]) and any(w in p_lower for w in ["luz", "luces", "todo", "todas"]):
            if "salon" in p_lower or "salón" in p_lower:
                actions.append({
                    "label": "🌑 Luces Salón Off",
                    "service": "light",
                    "entity_id": "salon",
                    "action": "turn_off_all",
                    "style": "danger"
                })
            elif "andrea" in p_lower:
                actions.append({
                    "label": "🌑 Luces Andrea Off",
                    "service": "light",
                    "entity_id": "andrea",
                    "action": "turn_off_all",
                    "style": "danger"
                })
            else:
                actions.append({
                    "label": "🌑 Apagar Luces",
                    "service": "light",
                    "entity_id": "all_lights",
                    "action": "turn_off_all",
                    "style": "danger"
                })

        # 2. Radio y Streaming
        if any(w in p_lower for w in ["radio", "musica", "música", "cancion", "canción", "emisora", "audio"]):
            actions.append({
                "label": "📻 Radio On / Off",
                "service": "radio",
                "entity_id": "radio_master",
                "action": "toggle",
                "style": "info"
            })

        # 3. Persianas
        if any(w in p_lower for w in ["sub", "abrir", "abre", "arriba"]) and "persiana" in p_lower:
            actions.append({
                "label": "🪟 Subir Persianas",
                "service": "cover",
                "entity_id": "all_covers",
                "action": "open",
                "style": "warning"
            })
        if any(w in p_lower for w in ["baj", "cerrar", "cierra", "abajo"]) and "persiana" in p_lower:
            actions.append({
                "label": "🪟 Bajar Persianas",
                "service": "cover",
                "entity_id": "all_covers",
                "action": "close",
                "style": "primary"
            })

        # 4. Escenas
        if any(w in p_lower for w in ["cine", "pelicula", "película", "netflix"]):
            actions.append({
                "label": "🎬 Modo Cine",
                "service": "scene",
                "entity_id": "modo_cine",
                "action": "activate",
                "style": "secondary"
            })
            icon = "🎬"
            color = "#a855f7"

        if any(w in p_lower for w in ["relax", "descanso", "zen", "tranquil"]):
            actions.append({
                "label": "🕯️ Modo Relax",
                "service": "scene",
                "entity_id": "modo_relax",
                "action": "activate",
                "style": "secondary"
            })
            icon = "🕯️"
            color = "#f59e0b"

        # Fallback si no hubo coincidencias directas
        if not actions:
            title = "Panel de Control Rápido"
            icon = "🎛️"
            actions = [
                {"label": "💡 Encender Todo", "service": "light", "entity_id": "all_lights", "action": "turn_on_all", "style": "success"},
                {"label": "🌑 Apagar Todo", "service": "light", "entity_id": "all_lights", "action": "turn_off_all", "style": "danger"},
                {"label": "📻 Radio On / Off", "service": "radio", "entity_id": "radio_master", "action": "toggle", "style": "info"}
            ]
        elif len(actions) == 3 and any(a["action"] == "toggle" for a in actions):
            title = "Panel Maestro Tomás"
            icon = "👑"
            color = "#00f3ff"
        elif any("persiana" in a.get("label", "").lower() for a in actions):
            title = "Control de Persianas & Clima"
            icon = "🪟"
            color = "#0ea5e9"

        widget_data = {
            "title": title,
            "icon": icon,
            "category": category,
            "author": "Búnker AI Engine",
            "description": f"Generado dinámicamente a partir de: '{prompt}'",
            "color": color,
            "actions": actions
        }
        return widget_data

bunker_knowledge = BunkerKnowledge()
