import asyncio
import io
import json
import logging
import os
import subprocess
import time
import wave
from pathlib import Path
from typing import Set, Optional, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("RobotService")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FFMPEG_EXE = Path("F:/Habana 8/backend/bin/ffmpeg.exe")
CONFIG_PATH = BASE_DIR / "config" / "robot_config.json"

class RobotService:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.current_state = "stop" # "listen" | "think" | "start" | "stop"
        self.last_interaction: Optional[Dict[str, Any]] = None
        self.recent_logs = []
        self.volume: int = 20 # Por defecto 20% para sonido suave en el altavoz de 1W
        self.audio_output: str = "SalÃ³n"
        self.continuous_mode: bool = False # Salida preferida de voz (SalÃ³n, Cocina, Despacho, PC, o Esfera)
        self._processing_lock = asyncio.Lock()
        self._last_speech_end = 0.0
        self._load_config()

    def _load_config(self):
        try:
            if CONFIG_PATH.exists():
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    self.volume = int(cfg.get("volume", 20))
                    self.audio_output = str(cfg.get("audio_output", "SalÃ³n"))
                    self.continuous_mode = bool(cfg.get("continuous_mode", True))
        except Exception as e:
            logger.error(f"Error cargando config de robot: {e}")

    def _save_config(self):
        try:
            CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump({
                    "volume": self.volume,
                    "audio_output": self.audio_output,
                    "continuous_mode": self.continuous_mode
                }, f, indent=2)
        except Exception as e:
            logger.error(f"Error guardando config de robot: {e}")

    def set_volume(self, vol: int) -> int:
        self.volume = max(0, min(100, int(vol)))
        self._save_config()
        self.log(f"Volumen de la esfera ajustado al {self.volume}%")
        return self.volume

    def set_audio_output(self, target: str) -> str:
        self.audio_output = target.strip()
        self._save_config()
        self.log(f"Altavoz de respuesta configurado a: '{self.audio_output}'")
        return self.audio_output

    def log(self, msg: str):
        logger.info(f"ð® [Robot] {msg}")
        self.recent_logs.append({"timestamp": time.time(), "message": msg})
        if len(self.recent_logs) > 50:
            self.recent_logs.pop(0)

    async def register(self, websocket: WebSocket):
        self.active_connections.add(websocket)
        self._connected_at = time.time()
        self.log("Esfera Xiaozhi conectada por WebSocket")
        if self.continuous_mode:
            self.log("Activando micrÃ³fono de la esfera automÃ¡ticamente (Escucha Continua 'Cuba')...")
            await self.trigger_listen()
        else:
            await self.set_state("stop")

    def unregister(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        self.log("Esfera Xiaozhi desconectada")

    async def broadcast_json(self, payload: dict):
        text = json.dumps(payload)
        dead = []
        for ws in list(self.active_connections):
            try:
                await ws.send_text(text)
            except Exception as e:
                logger.error(f"Error enviando JSON al robot: {e}")
                dead.append(ws)
        for ws in dead:
            self.active_connections.discard(ws)

    async def broadcast_bytes(self, data: bytes):
        dead = []
        for ws in list(self.active_connections):
            try:
                await ws.send_bytes(data)
            except Exception as e:
                logger.error(f"Error enviando audio binario al robot: {e}")
                dead.append(ws)
        for ws in dead:
            self.active_connections.discard(ws)

    async def set_state(self, state: str):
        """
        Cambia el estado del reactor y LED de la esfera:
        - 'listen': Azul (Escuchando)
        - 'think': Naranja (Pensando)
        - 'start': Rojo (Hablando / altavoz activo)
        - 'stop': Verde (Listo / Reposo)
        """
        self.current_state = state
        await self.broadcast_json({"type": "speak", "state": state})

    async def set_continuous_mode(self, enabled: bool) -> dict:
        self.continuous_mode = bool(enabled)
        self._save_config()
        self.log(f"Modo escucha continua en la esfera: {self.continuous_mode}")
        if self.continuous_mode:
            await self.trigger_listen()
        else:
            await self.set_state("stop")
        return {"ok": True, "continuous_mode": self.continuous_mode, "state": self.current_state}

    async def trigger_listen(self):
        """Fuerza a la esfera a abrir micrÃ³fono y ponerse en modo escucha (Azul)."""
        self.log("Activando micrÃ³fono de la esfera...")
        await self.broadcast_json({"type": "start"})
        await self.set_state("listen")

    def _convert_mp3_to_pcm(self, mp3_path: str) -> bytes:
        """Convierte MP3 a PCM 16-bit 16kHz mono para el altavoz I2S con ganancia regulada y limitador anti-distorsiÃ³n."""
        if not FFMPEG_EXE.exists():
            logger.error(f"FFmpeg no encontrado en {FFMPEG_EXE}")
            return b""
        try:
            vol_factor = max(0.01, min(1.0, self.volume / 100.0))
            audio_filter = f"volume={vol_factor:.2f},alimiter=limit=0.85"
            cmd = [
                str(FFMPEG_EXE), "-y", "-i", mp3_path,
                "-af", audio_filter,
                "-f", "s16le", "-ar", "16000", "-ac", "1", "pipe:1"
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=True)
            return res.stdout
        except Exception as e:
            logger.error(f"Error convirtiendo MP3 a PCM: {e}")
            return b""

    async def speak_text(self, text: str, persona: str = "friday") -> bool:
        """Sintetiza texto y lo transmite en tiempo real por el altavoz de la esfera."""
        self.log(f"Sintetizando voz para esfera: '{text}'")
        try:
            from app.services.tts import tts_service
            # 1. Generar audio MP3 con TTS
            audio_url = tts_service.generate_audio(text, persona=persona)
            if not audio_url:
                return False

            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            filename = os.path.basename(audio_url)
            mp3_path = os.path.join(tts_service.audio_dir, filename)

            # 2. Convertir a PCM
            pcm_bytes = await asyncio.to_thread(self._convert_mp3_to_pcm, mp3_path)
            if not pcm_bytes:
                return False

            # 3. Encender altavoz de esfera (Estado ROJO / HABLANDO)
            await self.set_state("start")
            await asyncio.sleep(0.05)

            # 4. Transmitir paquetes de audio (chunks de 1024 bytes)
            chunk_size = 1024
            for i in range(0, len(pcm_bytes), chunk_size):
                chunk = pcm_bytes[i:i + chunk_size]
                await self.broadcast_bytes(chunk)
                # PequeÃ±o retardo proporcional a la tasa de muestreo (16000 samples/s * 2 bytes = 32000 B/s)
                # 1024 bytes = ~32 ms
                await asyncio.sleep(0.028)

            # 5. Volver a estado de escucha continua si estÃ¡ activo, o reposo
            await asyncio.sleep(0.2)
            if self.continuous_mode:
                await self.trigger_listen()
            else:
                await self.set_state("stop")
            self.log("Audio reproducido exitosamente en la esfera")
            return True

        except Exception as e:
            logger.error(f"Error en speak_text: {e}")
            await self.set_state("stop")
            return False

    async def dispatch_response(self, text: str, persona: str = "friday", target_override: Optional[str] = None) -> bool:
        """
        Emite la respuesta por el altavoz configurado (Google Cast, Tarjeta PC, o Esfera).
        Si la radio estaba sonando en dicho altavoz, la pausa/atenÃºa y la reanuda automÃ¡ticamente.
        """
        target = (target_override or self.audio_output or "SalÃ³n").strip()
        self.log(f"Despachando respuesta a destino '{target}': '{text}'")

        if target.lower() in ("esfera", "robot"):
            # Salida por el propio altavoz miniatura de la bola
            return await self.speak_text(text, persona)

        # Salida por altavoz exterior (Google Cast o Tarjeta de Sonido PC)
        try:
            from app.services.tts import tts_service
            from app.services.google_cast import cast_service
            from app.services.radio_service import radio_service

            # 1. Comprobar si la radio estÃ¡ sonando actualmente
            radio_st = radio_service.status()
            was_radio_playing = bool(radio_st.get("playing") and radio_st.get("station_id"))
            current_station_id = radio_st.get("station_id")

            # 2. Generar locuciÃ³n TTS en formato MP3
            audio_rel = tts_service.generate_audio(text, persona=persona)
            if not audio_rel:
                await self.set_state("stop")
                return False

            audio_url = f"http://192.168.1.139:8050{audio_rel}"

            # 3. Estimar duraciÃ³n del audio para esperar a que termine (~12 caracteres por segundo)
            duration_est = max(2.5, len(text) / 12.0)

            # 4. Sincronizar la esfera en modo HABLANDO (Rojo) visualmente
            await self.set_state("start")

            # 5. Emitir locuciÃ³n por el altavoz objetivo
            cast_service.play_url(target, audio_url)
            self.log(f"Emitiendo locuciÃ³n en altavoz '{target}' (duraciÃ³n est. {duration_est:.1f}s)...")

            # Esperar a que termine de hablar
            await asyncio.sleep(duration_est)
            self._last_speech_end = time.time()

            # 6. Reanudar la radio si estaba sonando antes
            if was_radio_playing and current_station_id:
                self.log(f"Reanudando emisiÃ³n de radio '{radio_st.get('station_name')}' en '{target}'...")
                radio_service.play(current_station_id)
                if radio_st.get("stream_url"):
                    cast_service.play_url(target, radio_st["stream_url"], "audio/mpeg")

            # 7. Regresar la esfera al modo escucha continua si estÃ¡ activo, o a reposo
            await asyncio.sleep(0.5)
            if self.continuous_mode:
                await self.trigger_listen()
            else:
                await self.set_state("stop")
            return True

        except Exception as e:
            logger.error(f"Error despachando respuesta a altavoz '{target}': {e}")
            await self.set_state("stop")
            return False

    async def process_pcm_buffer(self, pcm_data: bytes):
        """Procesa el buffer PCM capturado del micrÃ³fono de la esfera con protecciÃ³n anti-eco y concurrencia."""
        if len(pcm_data) < 8000: # Demasiado corto (<0.25 seg)
            return

        # 0. VENTANA DE ESTABILIZACIÃN I2S: Descartar los primeros 2.5s tras conectar para absorber el pico elÃ©ctrico / pop
        if time.time() - getattr(self, "_connected_at", 0.0) < 2.5:
            return

        # 1. ESCUDO ANTI-ECO: Si el altavoz de Habana estÃ¡ sonando o acaba de hablar (<0.8s), descartar audio de sala
        now = time.time()
        last_end = getattr(self, "_last_speech_end", 0.0)
        if self.current_state == "start" or (now - last_end < 0.8):
            return

        # 1b. FILTRO DE ENERGÃA MÃNIMA: Descartar ruidos de fondo, murmullos o TV lejana
        try:
            import audioop
            avg_rms = audioop.rms(pcm_data, 2)
            if avg_rms < 650:
                return
        except Exception:
            pass

        # 2. CONTROL DE CONCURRENCIA: Evitar que rÃ¡fagas de audio solapadas lancen peticiones concurrentes
        if not hasattr(self, "_processing_lock"):
            self._processing_lock = asyncio.Lock()

        if self._processing_lock.locked() or self.current_state == "think":
            self.log("Ignorando audio simultÃ¡neo de la esfera: procesamiento neural en curso.")
            return

        async with self._processing_lock:
            self.log(f"Procesando audio recibido ({len(pcm_data)} bytes)...")
            await self.set_state("think") # Naranja: Pensando

            try:
                # 1. Empaquetar PCM en formato WAV en memoria
                wav_io = io.BytesIO()
                with wave.open(wav_io, "wb") as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2) # 16-bit
                    wav_file.setframerate(16000)
                    wav_file.writeframes(pcm_data)
                wav_bytes = wav_io.getvalue()

                # 2. TranscripciÃ³n con Groq Whisper en ~250ms
                from app.core.config import settings
                import requests

                headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
                files = {"file": ("audio.wav", wav_bytes, "audio/wav")}
                data = {
                    "model": "whisper-large-v3-turbo",
                    "language": "es",
                    "temperature": "0",
                    "prompt": "Cuba, Hola Cuba, Oye Cuba, pon Telecinco, Antena 3, La 1, La 2, Cuatro, La Sexta, La 7, FDF, Energy, Neox, Nova, Mega, Clan, TVG, TRECE, pon la primera, pon la tele, apaga la tele, siguiente canal, canal anterior, sube el volumen, baja la tele, en la tele del salon, en la habitacion, en la cocina, enciende las luces, apaga las luces."
                }

                resp = await asyncio.to_thread(
                    requests.post,
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=8
                )

                if resp.status_code == 200:
                    user_text = resp.json().get("text", "").strip()
                    if not user_text:
                        self.log("TranscripciÃ³n vacÃ­a")
                        await self.set_state("listen" if self.continuous_mode else "stop")
                        return

                    self.log(f"Voz reconocida de la esfera: '{user_text}'")

                    # Descartar alucinaciones conocidas de Whisper en silencio/ruido
                    clean = user_text.strip()
                    clean_lower = clean.lower().strip('.! ?,')
                    if clean_lower in ("gracias", "muchas gracias", "oh", "ah", "subtÃ­tulos", "suscrÃ­bete", "that will do not", "amara.org"):
                        await self.set_state("listen" if self.continuous_mode else "stop")
                        return

                    # En modo escucha continua, comprobar si contiene la palabra clave 'Cuba'
                    import re
                    wake_match = re.search(r'\b(?:hola\s+cuba|oye\s+cuba|hey\s+cuba|cuba|kuba|curva|uva)\b[\s,.:;!?-]*(.*)', clean, re.IGNORECASE)

                    if self.continuous_mode:
                        if not wake_match:
                            self.log(f"Audio captado sin palabra clave 'Cuba' ('{clean}'). Ignorado.")
                            await self.set_state("listen")
                            return
                        
                        order = wake_match.group(1).strip()
                        # Comprobar si hay una orden real o solo saludos/nombres sin acciÃ³n
                        words = [w.strip('.! ?,').lower() for w in order.split()]
                        meaningful_words = [w for w in words if w not in ("habana", "tomas", "tomÃ¡s", "andrea", "hola", "oye", "hey", "cuba", "dime", "por", "favor", "a", "de", "la", "el", "los", "las")]
                        
                        if not order or len(order) < 2 or len(meaningful_words) == 0:
                            self.log(f"Palabra clave 'Cuba' detectada sin comando especÃ­fico ('{order}'). Respondiendo saludo...")
                            await self.dispatch_response("SÃ­, dime TomÃ¡s", persona="friday")
                            await self.set_state("listen")
                            return
                        user_text = order
                        self.log(f"Orden extraÃ­da tras 'Cuba': '{user_text}'")

                    # 3. Procesar con el Cerebro / Agente de HABANA
                    from app.services.agent import agent
                    response_text, _ = await asyncio.to_thread(agent.process_message, user_text, "robot")
                    self.log(f"Respuesta IA de HABANA: '{response_text}'")

                    self.last_interaction = {
                        "timestamp": time.time(),
                        "user_text": user_text,
                        "response_text": response_text
                    }

                    # 4. Responder con voz por el altavoz asociado a la estancia de la orden (o el configurado por defecto)
                    from app.services.tv_media_orchestrator import tv_manager
                    room_spk = tv_manager.detect_room_speaker_from_text(user_text)
                    await self.dispatch_response(response_text, target_override=room_spk)

                else:
                    logger.error(f"Error en Groq Whisper: {resp.text}")
                    await self.set_state("stop")

            except Exception as e:
                logger.error(f"Error procesando buffer PCM del robot: {e}")
                await self.set_state("stop")

robot_service = RobotService()
