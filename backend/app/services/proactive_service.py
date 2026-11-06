import time
from datetime import datetime
import threading
import logging

logger = logging.getLogger(__name__)

class ProactiveEngine:
    """
    Decide cuándo HABANA debe hablar de forma proactiva y construye un contexto rico.
    """
    def __init__(self, min_silence_secs: int = 900, check_cooldown: int = 1200):
        self.min_silence_secs = min_silence_secs
        self.check_cooldown = check_cooldown
        self._last_triggered = 0.0
        self._rotation = 0
        self._last_user_speech = time.monotonic()
        self._running = False
        self._thread = None

    def update_last_activity(self):
        """Llamado cada vez que el usuario interactúa (por voz o web)."""
        self._last_user_speech = time.monotonic()

    def should_trigger(self) -> bool:
        now = time.monotonic()
        return (
            (now - self._last_user_speech) >= self.min_silence_secs
            and (now - self._last_triggered) >= self.check_cooldown
        )

    def mark_triggered(self):
        self._last_triggered = time.monotonic()
        self._rotation += 1
        self.update_last_activity()

    def build_prompt(self) -> str:
        """Construye un contexto temporal enriquecido con hábitos aprendidos para enviar al agente."""
        from app.services.habit_service import habit_service
        now = datetime.now()
        hour = now.hour
        
        # 1. Comprobar si hay un hábito inminente que sugerir
        impending = habit_service.get_impending_suggestions()
        if impending:
            habit = impending[0]
            habit_service.mark_suggested(habit["id"])
            return (
                f"Son las {now.strftime('%H:%M')}. Has detectado un patrón de comportamiento habitual en Tomás: '{habit['description']}' "
                f"(Entidad: {habit['entity_id']}, Acción: {habit['action']}). "
                f"Hazle una sugerencia proactiva, natural, servicial y breve: pregúntale amablemente si desea que ejecutes esa acción ahora. "
                "Sé educada y tecnológica, como HABANA."
            )

        if 6 <= hour < 12:
            period = "mañana"
        elif 12 <= hour < 18:
            period = "tarde"
        elif 18 <= hour < 23:
            period = "noche"
        else:
            period = "madrugada"

        focus_index = self._rotation % 3
        if focus_index == 0:
            focus = "Pregunta cómo va el día o si necesita ayuda con la domótica o la casa."
        elif focus_index == 1:
            focus = f"Es por la {period}. Haz un check-in cálido o menciona el clima."
        else:
            focus = "Menciona un dato curioso o interesante sobre IA, tecnología o la hora actual."

        return (
            f"El usuario lleva un tiempo en silencio y es de {period} ({now.strftime('%H:%M')}). "
            f"Inicia una conversación proactiva muy natural y corta. {focus} "
            "No parezcas un robot, actúa como HABANA, una mente colmena avanzada."
        )

    def _loop(self, trigger_callback):
        logger.info("Motor Proactivo iniciado.")
        while self._running:
            try:
                if self.should_trigger():
                    prompt = self.build_prompt()
                    logger.info(f"Disparando evento proactivo: {prompt}")
                    self.mark_triggered()
                    trigger_callback(prompt)
            except Exception as e:
                logger.error(f"Error en ProactiveEngine: {e}")
            time.sleep(60)  # Chequea cada minuto

    def start(self, trigger_callback):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, args=(trigger_callback,), daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)

# Instancia global
proactive_engine = ProactiveEngine(min_silence_secs=3600, check_cooldown=7200) # 1 hora de silencio, 2 horas de cooldown
