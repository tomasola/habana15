import subprocess
import os
import time
import logging

logger = logging.getLogger("TTS")

VOICES = {
    ("friday", "female"): "es-ES-ElviraNeural",
    ("friday", "male"): "es-ES-AlvaroNeural",
    ("ghost", "female"): "es-ES-ElviraNeural",
    ("ghost", "male"): "es-ES-AlvaroNeural"
}

class TTSService:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        self.audio_dir = os.path.join(base_dir, "audio")
        os.makedirs(self.audio_dir, exist_ok=True)

    def generate_audio(self, text: str, persona: str = "friday") -> str:
        from app.core.state import state_manager
        gender = state_manager.get_state().voice_gender
        """
        Genera un archivo MP3 con el texto dado y retorna la URL relativa.
        Limita la retención a los últimos 5 archivos para no llenar el disco.
        """
        # Limpiar texto de emojis y caracteres markdown para el audio
        import re
        text = re.sub(r'[^\w\s\.,!?;:\-\'\"]', '', text)
        text = text.replace('_', ' ')
        text = re.sub(r'\s+', ' ', text).strip()

        # Garantizar que la carpeta de destino existe
        os.makedirs(self.audio_dir, exist_ok=True)
        
        voice = VOICES.get((persona, gender), "es-ES-ElviraNeural")
        timestamp = int(time.time() * 1000)
        filename = f"tts_{timestamp}.mp3"
        filepath = os.path.join(self.audio_dir, filename)

        # Cleanup old files
        try:
            files = sorted([f for f in os.listdir(self.audio_dir) if f.startswith("tts_")])
            if len(files) > 5:
                for f in files[:-5]:
                    os.remove(os.path.join(self.audio_dir, f))
        except Exception as e:
            logger.warning(f"Failed to cleanup old TTS files: {e}")

        try:
            logger.info(f"Generando TTS ultrarrápido para {persona}: {text}")
            import asyncio
            import concurrent.futures
            
            async def _save_native():
                import edge_tts
                comm = edge_tts.Communicate(text, voice)
                await comm.save(filepath)

            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    pool.submit(lambda: asyncio.run(_save_native())).result(timeout=6.0)
            except Exception as e_nat:
                logger.debug(f"Fallback a edge-tts subprocess: {e_nat}")
                cmd = ["edge-tts", "--voice", voice, "--text", text, "--write-media", filepath]
                subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=8)

            return f"/audio/{filename}"
        except Exception as e:
            logger.error(f"Error en TTS: {e}")
            return ""

tts_service = TTSService()
