import os
import re
import json
import logging
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("BunkerLolaEngine")

MASTER_VOICE_BASE = """[Voice Profile: Lola AI]
Gender: Female
Age: 28-30 years old
Language & Accent: European Spanish (Spain), neutral, clean modern diction, no regional exaggerations.
Timbre: Medium-low velvety texture, clear studio resonance, avoiding sharp high-pitch tones or metallic artifacts.
Cadence & Breath: Natural conversational rhythm (approx. 140 wpm), smooth breath control, slight natural micropause after greetings and before questions, warm descending pitch at sentence ends.
Audio Quality: High-definition studio podcast quality, dry acoustics, no synthetic buzz or metallic robotic filtering."""

PREDEFINED_HABANA_PHRASES = [
    # 1. ILUMINACIÓN ESPECÍFICA
    {
        "id": "luz_salon_on",
        "category": "Iluminación",
        "action": "Encender luz principal del salón",
        "trigger": "enciende la luz del salon",
        "aliases": ["luz salon", "enciende el salon", "pon la luz del salon"],
        "response": "Encendiendo la luz principal del salón.",
        "voice_emotion": "Warm and efficient, pleasant compliance.",
        "veo_prompt": "Female cybernetic AI assistant in modern high-tech living room, nodding gently as ambient ceiling light brightens smoothly: 'Encendiendo la luz principal del salón'. 4k photorealistic Google Veo 3.1.",
        "entity_id": "luz_luz_principal_del_salon_53c1"
    },
    {
        "id": "luz_salon_off",
        "category": "Iluminación",
        "action": "Apagar luz del salón",
        "trigger": "apaga la luz del salon",
        "aliases": ["apaga el salon", "quita la luz del salon"],
        "response": "Apagando la luz del salón. Listo.",
        "voice_emotion": "Soft, relaxing, gentle closure.",
        "veo_prompt": "Female AI avatar lowering her hand gracefully as salon lighting turns off, leaving a subtle cozy glow: 'Apagando la luz del salón. Listo'. Cinematic depth of field.",
        "entity_id": "luz_luz_principal_del_salon_53c1"
    },
    {
        "id": "luz_comedor_toggle",
        "category": "Iluminación",
        "action": "Luz del comedor",
        "trigger": "luz del comedor",
        "aliases": ["enciende comedor", "apaga comedor", "pon luz en el comedor"],
        "response": "Cambiando el estado de la luz del comedor.",
        "voice_emotion": "Quick, attentive and clear.",
        "veo_prompt": "Sleek female AI looking towards the dining area with a subtle approving smile: 'Cambiando el estado de la luz del comedor'.",
        "entity_id": "luz_luz_del_comedor_d9b2"
    },
    {
        "id": "luz_cocina_on",
        "category": "Iluminación",
        "action": "Encender cocina",
        "trigger": "enciende la cocina",
        "aliases": ["luz cocina", "pon la luz de la cocina"],
        "response": "Luz de la cocina encendida. ¿Necesitas también la galería?",
        "voice_emotion": "Brisk, practical, helpful assistant tone.",
        "veo_prompt": "Female AI avatar with luminous blue eyes gesturing toward the kitchen area: 'Luz de la cocina encendida'. Clean studio lighting.",
        "entity_id": "luz_cocina"
    },
    {
        "id": "luz_andrea_on",
        "category": "Iluminación",
        "action": "Luz habitación de Andrea",
        "trigger": "luz de andrea",
        "aliases": ["enciende habitacion de andrea", "luz habitacion andrea"],
        "response": "Iluminando la habitación de Andrea.",
        "voice_emotion": "Sweet, warm, affectionate family tone.",
        "veo_prompt": "Friendly female AI with gentle warm smile speaking softly: 'Iluminando la habitación de Andrea'. Soft pastel room reflection.",
        "entity_id": "luz_ventana_andrea"
    },
    {
        "id": "apagar_todas_luces",
        "category": "Iluminación",
        "action": "Apagar todas las luces de la casa",
        "trigger": "apaga todo",
        "aliases": ["apaga todas las luces", "apagar casa", "modo apagado"],
        "response": "Apagando todas las luces de la casa. Sistemas en reposo.",
        "voice_emotion": "Quiet, serene, peaceful whisper-like authority.",
        "veo_prompt": "Female AI avatar calmly crossing hands as all background illumination smoothly transitions to black: 'Apagando todas las luces de la casa'.",
        "entity_id": "all_lights"
    },

    # 2. TIRAS LED Y AMBIENTACIÓN
    {
        "id": "led_sofa_on",
        "category": "Tiras LED",
        "action": "LED del sofá",
        "trigger": "led del sofa",
        "aliases": ["pon el led del sofa", "enciende led sofa", "luz ambiente sofa"],
        "response": "LED del sofá activado con luz cálida indirecta.",
        "voice_emotion": "Relaxed, cozy, velvety resonance.",
        "veo_prompt": "Female AI avatar bathed in soft golden backlight beneath furniture: 'LED del sofá activado con luz cálida indirecta'. Photorealistic.",
        "entity_id": "led_sofa_salon"
    },
    {
        "id": "led_tv_on",
        "category": "Tiras LED",
        "action": "LED detrás de la TV",
        "trigger": "led de la tele",
        "aliases": ["led tv", "enciende led television", "luz de la tele"],
        "response": "Activando el LED posterior de la televisión.",
        "voice_emotion": "Cinematic, smooth, modern.",
        "veo_prompt": "Female cyborg with subtle glowing cyber-accents smiling at camera as television backglow turns cyan: 'Activando el LED posterior de la televisión'.",
        "entity_id": "led_tv_salon"
    },
    {
        "id": "led_andrea_cama",
        "category": "Tiras LED",
        "action": "LED cama y foso Andrea",
        "trigger": "leds de andrea",
        "aliases": ["pon los leds de andrea", "tiras led andrea"],
        "response": "Encendiendo las tiras LED decorativas de Andrea.",
        "voice_emotion": "Playful, bright and cheerful.",
        "veo_prompt": "Female AI avatar with a playful wink and sweet smile: 'Encendiendo las tiras LED decorativas de Andrea'. Vibrant soft light reflections.",
        "entity_id": "led_cama_andrea"
    },

    # 3. MODOS Y ESCENAS
    {
        "id": "modo_cine_scene",
        "category": "Ambientes",
        "action": "Activar Modo Cine",
        "trigger": "modo cine",
        "aliases": ["vamos a ver una pelicula", "iniciar cine", "pon el cine"],
        "response": "Modo cine en marcha. Atenuando luces principales y encendiendo LEDs ambientales. Que disfrutes de la película.",
        "voice_emotion": "Cinematic theater narrator, captivating, hushed and elegant.",
        "veo_prompt": "High-tech female AI gesturing smoothly as room dims into deep cinematic theater lighting with glowing amber accents: 'Modo cine en marcha'. 4k resolution.",
        "entity_id": "modo_cine"
    },
    {
        "id": "modo_relax_scene",
        "category": "Ambientes",
        "action": "Activar Modo Relax",
        "trigger": "modo relax",
        "aliases": ["quiero relajarme", "modo descanso", "ambiente tranquilo"],
        "response": "Modo relax activado. He ajustado los LEDs a una temperatura cálida y suave para desconectar.",
        "voice_emotion": "Extremely soothing, serene, calm breathing, spa-like.",
        "veo_prompt": "Female AI breathing slowly, shoulders relaxed, peaceful serene expression with warm candlelight-like LED glow: 'Modo relax activado'.",
        "entity_id": "modo_relax"
    },
    {
        "id": "buenas_noches_routine",
        "category": "Rutinas",
        "action": "Rutina Buenas Noches",
        "trigger": "buenas noches lola",
        "aliases": ["me voy a dormir", "hora de dormir", "hasta mañana lola"],
        "response": "Buenas noches, Tomás. Puertas aseguradas, luces apagadas y sensores de vigilancia nocturna activados. Que descanses.",
        "voice_emotion": "Gentle bedtime lullaby tone, deeply comforting, protective.",
        "veo_prompt": "Female AI avatar softly tilting her head with an affectionate goodnight smile, lights fading out gently: 'Buenas noches, Tomás. Que descanses'.",
        "entity_id": "buenas_noches"
    },
    {
        "id": "buenos_dias_briefing",
        "category": "Rutinas",
        "action": "Briefing Matinal Completo",
        "trigger": "buenos dias lola",
        "aliases": ["informe matinal", "que tiempo hace", "dame las noticias de hoy"],
        "response": "Buenos días, Tomás. Sistemas de Habana operativos. He recopilado el tiempo de Ourense, los titulares de hoy y el último análisis de Marc Vidal. ¿Quieres que te lo lea?",
        "voice_emotion": "Energetic, clear, positive morning enthusiasm, crisp studio diction.",
        "veo_prompt": "Bright morning sun rays illuminating female AI smiling warmly looking directly forward: 'Buenos días Tomás, sistemas operativos'. Photorealistic 4k.",
        "entity_id": "briefing_matinal"
    },

    # 4. SEGURIDAD Y VIGILANCIA
    {
        "id": "seguridad_camaras",
        "category": "Seguridad",
        "action": "Estado de Cámaras de Vigilancia",
        "trigger": "revisa las camaras",
        "aliases": ["estado de seguridad", "hay alguien fuera", "camaras de vigilancia"],
        "response": "Todas las cámaras perimetrales están en línea y sin detecciones anómalas. El hogar está seguro.",
        "voice_emotion": "Authoritative, confident, vigilant, firm and clear.",
        "veo_prompt": "Female AI with holographic tactical feed floating beside her eyes, scanning intently then nodding confidently: 'El hogar está seguro'.",
        "entity_id": "camaras"
    },
    {
        "id": "alerta_alarma",
        "category": "Seguridad",
        "action": "Aviso de Alarma Disparada",
        "trigger": "alarma disparada",
        "aliases": ["intruso detectado", "alerta de seguridad"],
        "response": "Atención: Se ha detectado una presencia imprevista. Por favor, identifíquese inmediatamente o se notificará a las autoridades.",
        "voice_emotion": "Stern, commanding, sharp, intense and unyielding.",
        "veo_prompt": "Female AI in red emergency strobe lighting, sharp piercing gaze, posture straight and defensive: 'Atención: Por favor, identifíquese inmediatamente'.",
        "entity_id": "alarma"
    },

    # 5. PERSONAS Y FAMILIA
    {
        "id": "bienvenida_andrea",
        "category": "Personas",
        "action": "Bienvenida a Andrea",
        "trigger": "llega andrea",
        "aliases": ["hola andrea", "andrea esta en casa"],
        "response": "Hola Andrea, bienvenida a casa. ¿Qué tal el día?",
        "voice_emotion": "Affectionate, bright, joyful smile, welcoming.",
        "veo_prompt": "Female AI smiling with radiant warmth, waving softly: 'Hola Andrea, bienvenida a casa'. Cozy home ambience.",
        "entity_id": "persona_andrea"
    },
    {
        "id": "bienvenida_lupe",
        "category": "Personas",
        "action": "Bienvenida a Lupe",
        "trigger": "llega lupe",
        "aliases": ["hola lupe", "bienvenida lupe"],
        "response": "Hola Lupe, encantada de verte. La casa está a tu temperatura ideal.",
        "voice_emotion": "Polite, warm, hospitable, respectful.",
        "veo_prompt": "Female AI bowing her head gently with a gracious smile: 'Hola Lupe, encantada de verte'. Elegant lighting.",
        "entity_id": "persona_lupe"
    }
]

class BunkerLolaEngine:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent.parent.parent
        self.vault_avatar_dir = self.base_dir / "vault" / "Avatar"
        self.media_videos_dir = self.base_dir / "media" / "videos"
        self.vault_avatar_dir.mkdir(parents=True, exist_ok=True)
        self.media_videos_dir.mkdir(parents=True, exist_ok=True)

    def get_catalog(self) -> List[Dict[str, Any]]:
        """Retorna el catálogo maestro de frases enriquecidas con sus prompts de Flow y Veo."""
        results = []
        for item in PREDEFINED_HABANA_PHRASES:
            flow_prompt = self._build_flow_prompt(item["response"], item["voice_emotion"])
            results.append({
                **item,
                "flow_voice_prompt": flow_prompt,
                "flow_text": item["response"]
            })
        return results

    def _build_flow_prompt(self, spoken_text: str, emotion_desc: str) -> str:
        """Construye el bloque de instrucciones exacto para Flow."""
        return f"""{MASTER_VOICE_BASE}

[Specific Phrase Context]
Spoken Text: "{spoken_text}"
Emotional Delivery: {emotion_desc}
Performance Notes: Natural inflection, gentle breathing, flawless modern Spanish pronunciation."""

    def generate_custom_prompt(self, action_or_text: str) -> Dict[str, Any]:
        """
        Genera al vuelo una frase, prompt de Flow y prompt de Veo a partir de una descripción.
        Usa IA o lógica experta de síntesis.
        """
        clean_input = action_or_text.strip()
        
        # Generar respuesta hablada natural
        spoken_response = f"Entendido, procediendo con: {clean_input}. Todo en orden."
        if "luz" in clean_input.lower() or "luces" in clean_input.lower():
            spoken_response = f"Ajustando la iluminación según tus indicaciones. Listo."
        elif "musica" in clean_input.lower() or "cancion" in clean_input.lower():
            spoken_response = f"Iniciando la reproducción de música. Disfruta del sonido."
        elif "temperatura" in clean_input.lower() or "clima" in clean_input.lower():
            spoken_response = f"Comprobando el sistema de climatización y ajustando la temperatura ideal."

        safe_trigger = clean_input.lower()[:40]
        flow_prompt = self._build_flow_prompt(spoken_response, "Attentive, modern, confident and warm home assistant.")
        veo_prompt = f"Hyper-realistic female AI avatar with subtle holographic accents, speaking naturally with perfect lipsync: '{spoken_response}'. Cinematic lighting, photorealistic 4k Google Veo 3.1."

        return {
            "action": clean_input,
            "trigger": safe_trigger,
            "response": spoken_response,
            "voice_emotion": "Attentive, modern, confident and warm.",
            "flow_voice_prompt": flow_prompt,
            "veo_prompt": veo_prompt
        }

    def save_phrase_to_obsidian(self, phrase_data: Dict[str, Any]) -> str:
        """Guarda la ficha técnica en vault/Avatar/ con enlaces y metadatos."""
        trigger = phrase_data.get("trigger", "nueva_frase_lola")
        norm = unicodedata.normalize('NFD', trigger)
        clean = ''.join(c for c in norm if unicodedata.category(c) != 'Mn')
        safe_fname = re.sub(r'[^a-zA-Z0-9_\-\s]', '', clean).strip().replace(" ", "_")[:45]
        
        filepath = self.vault_avatar_dir / f"{safe_fname}.md"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        content = f"""---
trigger_phrase: "{trigger}"
category: "{phrase_data.get('category', 'Personalizada')}"
action: "{phrase_data.get('action', '')}"
response_text: "{phrase_data.get('response', '')}"
video_filename: "{phrase_data.get('video_filename', '')}"
creado: "{now_str}"
tags:
  - avatar
  - lola
  - prompts_flow
  - veo_prompts
  - bunker
---

# 🎙️ Guion & Prompts de Lola: "{trigger}"

> [!INFO] **Ficha Técnica para Generación en Flow & Veo**
> - **Frase de Activación (Trigger)**: `{trigger}`
> - **Acción Habana**: `{phrase_data.get('action', 'Acción domótica')}`
> - **Categoría**: `{phrase_data.get('category', 'General')}`
> - **Fecha de Creación**: `{now_str}`

---

## 🗣️ Texto Hablado que dirá Lola
> *"{phrase_data.get('response', '')}"*

---

## 🎙️ Prompt de Voz para Flow (Voice Design / Voice Prompt)
```text
{phrase_data.get('flow_voice_prompt', '')}
```

---

## 🎥 Prompt para Vídeo del Avatar (Google Veo 3.1 / LivePortrait)
```text
{phrase_data.get('veo_prompt', '')}
```

---
*Ficha generada desde el Estudio Lola en el Búnker IA de HABANA.*
"""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        logger.info(f"Ficha de Lola guardada en Obsidian: {filepath}")
        return str(filepath)

bunker_lola_engine = BunkerLolaEngine()
