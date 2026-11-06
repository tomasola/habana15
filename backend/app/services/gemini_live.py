import os
import asyncio
import json
import logging
import io
import time
from app.core.config import settings
from app.services.google_cast import cast_service
from app.services.home_assistant import home_assistant_service
from app.services.tts import tts_service

logger = logging.getLogger("GeminiLive")

class GeminiLiveManager:
    def __init__(self, agent):
        self.agent = agent
        self.gemini_client = None
        self._init_gemini_client()

    def _init_gemini_client(self):
        api_key = settings.GEMINI_API_KEY
        if api_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning(f"No se pudo inicializar Google GenAI Client: {e}")

    async def handle_live_stream(self, websocket):
        logger.info("Iniciando sesión de audio bidireccional en tiempo real...")
        
        # Si disponemos de Gemini API Key y SDK configurado, intentamos sesión nativa
        if self.gemini_client:
            try:
                await self._run_native_gemini_live(websocket)
                return
            except Exception as e:
                logger.warning(f"Fallo en Gemini Live nativo ({e}). Conmutando a Fast-Duplex Groq Engine...")

        # Motor de streaming de ultrabaja latencia (Full Duplex con Groq Whisper + LLaMA3 + TTS)
        await self._run_fast_duplex_engine(websocket)

    async def _run_native_gemini_live(self, websocket):
        from google.genai import types
        tools = [
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name="play_media",
                        description="Reproduce una radio o stream en los altavoces de la casa (Google Cast).",
                        parameters=types.Schema(
                            type=types.Type.OBJECT,
                            properties={
                                "url": types.Schema(type=types.Type.STRING, description="URL o keyword de radio."),
                                "target": types.Schema(type=types.Type.STRING, description="Altavoz destino.")
                            },
                            required=["url", "target"]
                        )
                    ),
                    types.FunctionDeclaration(
                        name="stop_media",
                        description="Detiene la música en los altavoces de la casa.",
                        parameters=types.Schema(
                            type=types.Type.OBJECT,
                            properties={"target": types.Schema(type=types.Type.STRING, description="Altavoz.")},
                            required=["target"]
                        )
                    ),
                    types.FunctionDeclaration(
                        name="control_device",
                        description="Controla luces y persianas en Home Assistant.",
                        parameters=types.Schema(
                            type=types.Type.OBJECT,
                            properties={
                                "entity_id": types.Schema(type=types.Type.STRING, description="ID entidad HA."),
                                "action": types.Schema(type=types.Type.STRING, description="turn_on, turn_off, open_cover, close_cover")
                            },
                            required=["entity_id", "action"]
                        )
                    ),
                    types.FunctionDeclaration(
                        name="control_tv",
                        description="Cambia de canal, enciende, apaga o ajusta volumen de las televisiones de la casa (Salón, Habitación Principal, Cocina o todas).",
                        parameters=types.Schema(
                            type=types.Type.OBJECT,
                            properties={
                                "tv_target": types.Schema(type=types.Type.STRING, description="Estancia destino: salon, habitacion, cocina o todas."),
                                "channel_or_action": types.Schema(type=types.Type.STRING, description="Canal (la1, la2, antena3, cuatro, telecinco, lasexta, la7, fdf, energy, neox, nova, mega, trece, clan, tvg, etc.) o acción (on, off, up, down, mute).")
                            },
                            required=["tv_target", "channel_or_action"]
                        )
                    )
                ]
            )
        ]

        live_prompt = self.agent.get_system_prompt()
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(parts=[types.Part.from_text(text=live_prompt)]),
            tools=tools
        )

        async with self.gemini_client.aio.live.connect(model="gemini-2.0-flash-exp", config=config) as session:
            logger.info("Conexión nativa con Gemini Live establecida.")
            await websocket.send_text(json.dumps({"type": "info", "message": "Canal Live conectado nativamente."}))

            async def receive_from_client():
                while True:
                    message = await websocket.receive()
                    if "bytes" in message and message["bytes"]:
                        await session.send(input={"data": message["bytes"], "mime_type": "audio/pcm;rate=16000"}, end_of_turn=False)
                    elif "text" in message and message["text"]:
                        data = json.loads(message["text"])
                        if data.get("type") == "text_input":
                            await session.send(input=data.get("text"), end_of_turn=True)

            async def send_to_client():
                async for response in session.receive():
                    server_content = response.server_content
                    if server_content and server_content.model_turn:
                        for part in server_content.model_turn.parts:
                            if part.inline_data:
                                await websocket.send_bytes(part.inline_data.data)

                    tool_call = response.tool_call
                    if tool_call:
                        for call in tool_call.function_calls:
                            res = self._execute_tool(call.name, call.args)
                            await session.send(input=types.LiveClientContent(
                                turns=[types.Content(role="tool", parts=[types.Part.from_function_response(name=call.name, response=res)])]
                            ))

            await asyncio.gather(receive_from_client(), send_to_client())

    async def _run_fast_duplex_engine(self, websocket):
        """
        Motor alternativo de diálogo full-duplex de muy baja latencia:
        - Soporta interrupción instantánea de voz (Barge-in).
        - Procesa audio/texto vía Groq y devuelve audio sintetizado y texto en streaming.
        """
        logger.info("⚡ Iniciando Motor Fast-Duplex con soporte de Interrupción (Barge-in)...")
        await websocket.send_text(json.dumps({
            "type": "ready",
            "mode": "fast_duplex",
            "message": "Canal bidireccional listo con baja latencia."
        }))

        current_audio_task = None
        pcm_buffer = bytearray()

        try:
            while True:
                message = await websocket.receive()

                # Cancelación inmediata si el usuario interrumpe mientras la IA habla
                if current_audio_task and not current_audio_task.done():
                    current_audio_task.cancel()
                    await websocket.send_text(json.dumps({"type": "interrupted"}))

                if "bytes" in message and message["bytes"]:
                    pcm_buffer.extend(message["bytes"])
                    # Cuando tenemos ~1.5s de audio acumulado (48KB a 16kHz mono 16bit)
                    if len(pcm_buffer) >= 48000:
                        chunk_to_process = bytes(pcm_buffer)
                        pcm_buffer.clear()
                        current_audio_task = asyncio.create_task(
                            self._process_voice_chunk(chunk_to_process, websocket)
                        )

                elif "text" in message and message["text"]:
                    data = json.loads(message["text"])
                    msg_type = data.get("type")

                    if msg_type == "text_input":
                        user_text = data.get("text", "")
                        logger.info(f"FastDuplex prompt recibido: {user_text}")
                        current_audio_task = asyncio.create_task(
                            self._process_text_prompt(user_text, websocket)
                        )
                    elif msg_type == "interrupt":
                        if current_audio_task and not current_audio_task.done():
                            current_audio_task.cancel()
                            logger.info("Interrupción solicitada por el usuario.")

        except Exception as e:
            logger.info(f"Sesión Fast-Duplex cerrada: {e}")
        finally:
            if current_audio_task and not current_audio_task.done():
                current_audio_task.cancel()

    async def _process_voice_chunk(self, pcm_bytes: bytes, websocket):
        try:
            import wave
            wav_io = io.BytesIO()
            with wave.open(wav_io, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(16000)
                wf.writeframes(pcm_bytes)
            wav_bytes = wav_io.getvalue()

            # Transcripción rápida con Groq Whisper
            groq_key = settings.GROQ_API_KEY
            if groq_key:
                from groq import Groq
                client = Groq(api_key=groq_key)
                transcription = await asyncio.to_thread(
                    client.audio.transcriptions.create,
                    file=("audio.wav", wav_bytes),
                    model="whisper-large-v3-turbo",
                    language="es",
                    prompt="Cuba, pon Telecinco, Antena 3, La 1, La 2, Cuatro, La Sexta, La 7, FDF, Energy, Neox, Nova, Mega, Clan, TVG, TRECE, en la tele del salón, en la habitación, en la cocina.",
                    response_format="text"
                )
                text = str(transcription).strip()
                if text and len(text) > 2:
                    logger.info(f"Transcripción de voz: '{text}'")
                    await websocket.send_text(json.dumps({"type": "transcription", "text": text}))
                    await self._process_text_prompt(text, websocket)
        except Exception as e:
            logger.error(f"Error procesando audio en FastDuplex: {e}")

    async def _process_text_prompt(self, text: str, websocket):
        try:
            await websocket.send_text(json.dumps({"type": "thinking"}))
            
            # Ejecutar el agente para responder y controlar dispositivos
            response_text, audio_url = await asyncio.to_thread(
                self.agent.process_message, text, "fast_duplex"
            )

            # Notificar texto de respuesta
            await websocket.send_text(json.dumps({
                "type": "response_text",
                "text": response_text,
                "audio_url": audio_url
            }))

            # Si se generó audio, leerlo y enviarlo como bytes + emitir en altavoz asociado a la estancia
            if audio_url:
                try:
                    from app.services.tv_media_orchestrator import tv_manager
                    room_spk = tv_manager.detect_room_speaker_from_text(text)
                    if room_spk:
                        local_ip = tv_manager._get_local_ip()
                        cast_url = f"http://{local_ip}:8050{audio_url}"
                        cast_service.play_url(room_spk, cast_url)
                except Exception as e_cast:
                    logger.warning(f"Error enviando voz a altavoz de estancia en FastDuplex: {e_cast}")

                audio_file = audio_url.replace("/audio/", "")
                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                full_path = os.path.join(base_dir, "audio", audio_file)
                if os.path.exists(full_path):
                    with open(full_path, "rb") as af:
                        audio_data = af.read()
                        await websocket.send_bytes(audio_data)

            await websocket.send_text(json.dumps({"type": "done"}))
        except asyncio.CancelledError:
            logger.info("Generación de respuesta cancelada por interrupción del usuario.")
        except Exception as e:
            logger.error(f"Error en respuesta FastDuplex: {e}")
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))

    def _execute_tool(self, name: str, args: dict) -> dict:
        logger.info(f"Ejecutando herramienta {name} con {args}")
        try:
            if name == "control_device":
                entity_id = args.get("entity_id")
                action = args.get("action", "turn_on")
                home_assistant_service.control_device(entity_id, action)
                return {"status": "ok", "message": f"{entity_id} ejecutado con {action}"}
            elif name == "play_media":
                target = args.get("target", "todos")
                url = args.get("url")
                cast_service.play_url(target, url)
                return {"status": "ok"}
            elif name == "stop_media":
                cast_service.stop(args.get("target", "todos"))
                return {"status": "ok"}
            elif name == "control_tv":
                from app.services.tv_media_orchestrator import tv_manager
                tv_raw = args.get("tv_target", "salon")
                ch_raw = args.get("channel_or_action", "")
                tv_id = tv_manager.resolve_tv_target(tv_raw, default_tv="salon")
                ch_key = tv_manager.resolve_channel_by_voice(ch_raw) or ch_raw.lower()
                if ch_key in tv_manager.channels:
                    tv_manager._wake_and_play_bg(tv_id, ch_key)
                    return {"status": "ok", "message": f"Sintonizando {tv_manager.channels[ch_key]['name']} en {tv_id}"}
                elif ch_key in ("on", "encender"):
                    targets = ["salon", "habitacion", "cocina"] if tv_id == "todas" else [tv_id]
                    for tid in targets:
                        tv_manager.wake_tv(tid)
                    return {"status": "ok", "message": f"Encendiendo {tv_id}"}
                elif ch_key in ("off", "stop", "apagar"):
                    targets = ["salon", "habitacion", "cocina"] if tv_id == "todas" else [tv_id]
                    for tid in targets:
                        tv_manager.power_off(tid)
                    return {"status": "ok", "message": f"Apagando {tv_id}"}
                elif ch_key in ("up", "down", "mute"):
                    targets = ["salon", "habitacion", "cocina"] if tv_id == "todas" else [tv_id]
                    for tid in targets:
                        tv_manager.volume_control(tid, ch_key)
                    return {"status": "ok", "message": f"Volumen {ch_key} en {tv_id}"}
                return {"status": "error", "message": f"Canal o acción desconocida: {ch_raw}"}
            return {"status": "unknown_tool"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
