import logging
import os
import json
import subprocess
import threading
import time
import numpy as np

logger = logging.getLogger("LocalAudioPlayer")

class LocalAudioPlayer:
    """
    Reproductor de audio local para la tarjeta de sonido física del PC.
    Permite transmitir la radio en directo o emitir alertas/TTS por la salida
    analógica (jack de 3.5mm), USB DAC o altavoces integrados del PC sobremesa.
    Incluye buffer FIFO dinámico de retardo acústico (delay_ms) para calibrar
    y sincronizar el sonido en perfecto unísono con el buffer de red de Google Cast.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._proc = None
        self._thread = None
        self._stop_event = threading.Event()
        self.volume = 0.7
        self.is_playing = False
        self.current_url = None
        self._ffmpeg_exe = None
        self.apply_delay = True
        
        # Archivo de configuración para persistir retardo y preferencias
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        cfg_in_config = os.path.join(base_dir, "config", "cast_speakers_config.json")
        self.config_file = cfg_in_config if os.path.exists(cfg_in_config) else os.path.join(base_dir, "cast_speakers_config.json")
        self.delay_ms = self._load_delay()
        
        self._init_ffmpeg()

    def _init_ffmpeg(self):
        try:
            import static_ffmpeg
            exe, _ = static_ffmpeg.run.get_or_fetch_platform_executables_else_raise()
            self._ffmpeg_exe = exe
        except Exception as e:
            logger.warning(f"static_ffmpeg no disponible, buscando ffmpeg en PATH: {e}")
            self._ffmpeg_exe = "ffmpeg"

    def _load_delay(self) -> int:
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    pc_conf = data.get("Tarjeta de Sonido PC", {})
                    if "delay_ms" in pc_conf:
                        return int(pc_conf["delay_ms"])
            except Exception as e:
                logger.error(f"Error leyendo delay_ms de {self.config_file}: {e}")
        return 1850  # Retardo óptimo típico para absorber el buffer de Google Cast

    def set_delay(self, delay_ms: int):
        self.delay_ms = max(0, min(10000, int(delay_ms)))
        logger.info(f"Retardo de sincronización Tarjeta de Sonido PC ajustado a {self.delay_ms} ms")
        for path in [self.config_file, os.path.join(os.path.dirname(self.config_file), "..", "cast_speakers_config.json")]:
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if "Tarjeta de Sonido PC" not in data:
                        data["Tarjeta de Sonido PC"] = {}
                    data["Tarjeta de Sonido PC"]["delay_ms"] = self.delay_ms
                    with open(path, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                except Exception as e:
                    logger.error(f"Error guardando delay_ms en {path}: {e}")

    def get_output_device_name(self) -> str:
        try:
            import sounddevice as sd
            devs = sd.query_devices()
            default_out = sd.default.device[1]
            if 0 <= default_out < len(devs):
                name = devs[default_out].get("name", "Altavoces PC")
                return name
            for d in devs:
                if d.get("max_output_channels", 0) > 0:
                    return d.get("name", "Altavoces PC")
        except Exception as e:
            logger.warning(f"Error consultando dispositivos de sonido: {e}")
        return "Altavoces (Realtek Audio)"

    def is_available(self) -> bool:
        try:
            import sounddevice as sd
            devs = sd.query_devices()
            return any(d.get("max_output_channels", 0) > 0 for d in devs)
        except Exception:
            return False

    def play(self, url: str, apply_delay: bool = True):
        """Inicia la reproducción de una URL en la tarjeta de sonido con retardo calibrado opcional."""
        if not url:
            return
        self.stop()
        with self._lock:
            self.current_url = url
            self.apply_delay = apply_delay
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._playback_loop, args=(url,), daemon=True)
            self._thread.start()
            logger.info(f"Iniciando reproducción local (delay={self.delay_ms}ms, apply={apply_delay}): {url}")

    def _playback_loop(self, url: str):
        try:
            import sounddevice as sd
        except Exception as e:
            logger.warning(f"sounddevice no disponible para reproducción local: {e}")
            return
        proc = None
        stream = None
        try:
            cmd = [
                self._ffmpeg_exe,
                "-loglevel", "quiet",
                "-i", url,
                "-f", "s16le",
                "-ar", "44100",
                "-ac", "2",
                "-"
            ]
            
            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE

            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                startupinfo=startupinfo
            )
            with self._lock:
                self._proc = proc

            stream = sd.RawOutputStream(
                samplerate=44100,
                channels=2,
                dtype="int16",
                blocksize=2048
            )
            stream.start()
            self.is_playing = True

            chunk_size = 4096
            bytes_per_ms = 176.4  # 44100 * 2 canales * 2 bytes por muestra / 1000 ms
            delay_buffer = bytearray()

            while not self._stop_event.is_set():
                raw = proc.stdout.read(chunk_size)
                if not raw:
                    break
                
                vol = self.volume
                if vol < 0.99:
                    arr = np.frombuffer(raw, dtype=np.int16)
                    arr = (arr * vol).astype(np.int16)
                    processed = arr.tobytes()
                else:
                    processed = raw

                # Si el retardo está activo (para hilo musical multiroom sincronizado con Google Cast)
                if self.apply_delay and self.delay_ms > 0:
                    target_bytes = int(self.delay_ms * bytes_per_ms)
                    delay_buffer.extend(processed)

                    # Si el usuario reduce el retardo dinámicamente en caliente, recortar el exceso
                    if len(delay_buffer) > target_bytes + chunk_size * 2:
                        excess = len(delay_buffer) - (target_bytes + chunk_size)
                        del delay_buffer[:excess]

                    # Emitir a PortAudio solo cuando se alcanza el retardo calibrado
                    if len(delay_buffer) >= target_bytes + chunk_size:
                        to_write = delay_buffer[:chunk_size]
                        del delay_buffer[:chunk_size]
                        stream.write(to_write)
                else:
                    stream.write(processed)

        except Exception as e:
            if not self._stop_event.is_set():
                logger.error(f"Error en reproducción de audio local: {e}")
        finally:
            self.is_playing = False
            if stream:
                try:
                    stream.stop()
                    stream.close()
                except Exception:
                    pass
            if proc:
                try:
                    proc.terminate()
                except Exception:
                    pass
            with self._lock:
                self._proc = None

    def stop(self):
        """Detiene la reproducción local de forma segura esperando al hilo de sonido."""
        self._stop_event.set()
        with self._lock:
            p = self._proc
        if p:
            try:
                p.terminate()
            except Exception:
                pass
        t = self._thread
        if t and t.is_alive() and threading.current_thread() != t:
            t.join(timeout=1.5)
        self.is_playing = False
        self.current_url = None
        logger.info("Reproducción local en tarjeta de sonido detenida.")

    def set_volume(self, level: float):
        """Ajusta el volumen de 0.0 a 1.0 en tiempo real."""
        self.volume = max(0.0, min(1.0, float(level)))
        logger.info(f"Volumen de Tarjeta de Sonido PC ajustado a {int(self.volume * 100)}%")

    def get_status(self, is_enabled: bool = True) -> dict:
        dev_name = self.get_output_device_name()
        available = self.is_available()
        return {
            "name": "Tarjeta de Sonido PC",
            "ip": f"Salida Jack / {dev_name}",
            "connected": available,
            "volume": round(self.volume, 2),
            "enabled": is_enabled,
            "is_playing": self.is_playing,
            "delay_ms": self.delay_ms,
            "device_type": "local_soundcard"
        }

local_audio_player = LocalAudioPlayer()
