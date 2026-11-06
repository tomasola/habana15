import logging
import json
import os
import threading
import time
import unicodedata
from pathlib import Path

logger = logging.getLogger("GoogleCast")

CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
CACHE_FILE = str(CONFIG_DIR / "cast_cache.json")
CONFIG_FILE = str(CONFIG_DIR / "cast_speakers_config.json")

DEFAULT_KNOWN_CASTS = {
    "Salón": "192.168.1.128",
    "Cocina": "192.168.1.134",
    "Despacho": "192.168.1.133",
    "Dormitorio": "192.168.1.131",
    "Habana Hilo Musical": "192.168.1.131:32071"
}

def _clean_str(s: str) -> str:
    if not s:
        return ""
    norm = unicodedata.normalize('NFD', s.lower().strip())
    return ''.join(c for c in norm if unicodedata.category(c) != 'Mn')

class GoogleCastService:
    def __init__(self):
        self.known_casts = self._load_cache()
        self.speakers_config = self._load_speakers_config()
        self.casts = {}
        self.group_cast = None
        self.browser = None
        # Conectar a altavoces y grupos en segundo plano tras 1.5s
        t = threading.Timer(1.5, self._init_casts)
        t.daemon = True
        t.start()
        logger.info("GoogleCastService inicializado con soporte de Grupo Unísono. Escaneo programado.")

    def _load_speakers_config(self):
        defaults = {
            "Salón": {"enabled": True},
            "Cocina": {"enabled": True},
            "Despacho": {"enabled": True},
            "Dormitorio": {"enabled": True},
            "Tarjeta de Sonido PC": {"enabled": True, "delay_ms": 1850}
        }
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    if isinstance(cfg, dict):
                        for k, v in defaults.items():
                            if k not in cfg:
                                cfg[k] = v
                        return cfg
            except Exception as e:
                logger.error(f"Error loading speakers config: {e}")
        return defaults

    def _save_speakers_config(self):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(self.speakers_config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving speakers config: {e}")

    def is_local_speaker(self, name: str) -> bool:
        if not name:
            return False
        n = name.lower().strip()
        return any(k in n for k in ("tarjeta", "sonido pc", "jack", "salida pc", "soundcard"))

    def is_speaker_enabled(self, name: str) -> bool:
        if not hasattr(self, "speakers_config"):
            self.speakers_config = self._load_speakers_config()
        if self.is_local_speaker(name):
            return bool(self.speakers_config.get("Tarjeta de Sonido PC", {}).get("enabled", True))
        target_clean = _clean_str(name)
        for k, v in self.speakers_config.items():
            if _clean_str(k) == target_clean:
                return bool(v.get("enabled", True))
        return True

    def set_speaker_enabled(self, name: str, enabled: bool):
        if not hasattr(self, "speakers_config"):
            self.speakers_config = self._load_speakers_config()
        if self.is_local_speaker(name):
            target_key = "Tarjeta de Sonido PC"
        else:
            target_key = name.strip()
            for k in list(self.speakers_config.keys()):
                if _clean_str(k) == _clean_str(target_key):
                    target_key = k
                    break
        if target_key not in self.speakers_config:
            self.speakers_config[target_key] = {}
        self.speakers_config[target_key]["enabled"] = enabled
        self._save_speakers_config()
        logger.info(f"Altavoz '{target_key}' configurado a enabled={enabled}")

        # Si el altavoz físico está en el grupo mientras suena música, ajustar mute
        cast = self._find_cast(target_key)
        if cast and hasattr(cast, "set_volume_muted"):
            try:
                cast.set_volume_muted(not enabled)
            except Exception as e:
                logger.warning(f"Error muting/unmuting {target_key}: {e}")

        if not enabled:
            if not self.is_local_speaker(target_key):
                self.stop(name)
        else:
            try:
                from app.services.radio_service import radio_service
                r_status = radio_service.status()
                if r_status.get("playing") and r_status.get("stream_url"):
                    # Si la radio está sonando, asegurar que suena
                    if self.is_local_speaker(target_key):
                        from app.services.local_audio_player import local_audio_player
                        local_audio_player.play(r_status["stream_url"], apply_delay=True)
                    else:
                        if cast and hasattr(cast, "set_volume_muted"):
                            cast.set_volume_muted(False)
            except Exception as e:
                logger.error(f"Error sincronizando altavoz a radio activa: {e}")
        return enabled

    def _load_cache(self):
        cache = dict(DEFAULT_KNOWN_CASTS)
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    if isinstance(loaded, dict) and loaded:
                        for k, v in loaded.items():
                            cache[k] = v
            except Exception as e:
                logger.error(f"Error loading cast cache: {e}")
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(cache, f, indent=2, ensure_ascii=False)
        except Exception:
            pass
        return cache

    def _save_cache(self):
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(self.known_casts, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving cast cache: {e}")

    def _find_cast(self, target: str):
        """Encuentra un dispositivo Chromecast tolerando acentos, mayúsculas, alias de estancia o IPs."""
        if not target:
            return None
        target_clean = _clean_str(target)

        # Alias semánticos de estancias para asociar TV/Habitación con su altavoz físico
        room_aliases = {
            "habitacion": "dormitorio",
            "habitacion principal": "dormitorio",
            "dormitorio principal": "dormitorio",
            "cuarto": "dormitorio",
            "cama": "dormitorio",
            "comedor": "salon",
            "sala": "salon",
            "salon y comedor": "salon"
        }
        if target_clean in room_aliases:
            target_clean = room_aliases[target_clean]

        if self.casts:
            # 1. Búsqueda exacta por nombre limpio
            for k, cast in self.casts.items():
                if _clean_str(k) == target_clean or _clean_str(getattr(cast, "name", "")) == target_clean:
                    return cast

            # 2. Búsqueda por subcadena
            for k, cast in self.casts.items():
                k_clean = _clean_str(k)
                c_name_clean = _clean_str(getattr(cast, "name", ""))
                if (target_clean in k_clean or k_clean in target_clean or
                    target_clean in c_name_clean or c_name_clean in target_clean):
                    return cast

            # 3. Búsqueda por IP en los casts ya conectados
            for name, ip in self.known_casts.items():
                clean_ip = ip.split(":")[0]
                if clean_ip == target or ip == target:
                    for cast in self.casts.values():
                        cast_host = getattr(getattr(cast, "socket_client", None), "host", None)
                        if cast_host == clean_ip:
                            return cast

        # 4. Conexión bajo demanda si el altavoz está en known_casts pero aún no en self.casts
        for name, ip in self.known_casts.items():
            name_clean = _clean_str(name)
            clean_ip = ip.split(":")[0]
            if (name_clean == target_clean or target_clean in name_clean or
                clean_ip == target or ip == target):
                try:
                    import pychromecast
                    casts, _ = pychromecast.get_chromecasts(known_hosts=[clean_ip], timeout=2.5)
                    for c in casts:
                        if c.cast_type != "group":
                            c.wait(1.5)
                            self.casts[(c.name or name).lower()] = c
                            logger.info(f"🟢 [GoogleCast] Altavoz '{name}' ({clean_ip}) conectado bajo demanda.")
                            return c
                except Exception as e:
                    logger.warning(f"No se pudo conectar bajo demanda al altavoz '{name}' ({clean_ip}): {e}")

        return None

    def get_group_cast(self):
        """Retorna el grupo de Google Cast (Habana Hilo Musical) para sincronía hardware en unísono."""
        if self.group_cast:
            sc = getattr(self.group_cast, "socket_client", None)
            if sc and getattr(sc, "is_connected", False):
                return self.group_cast
            try:
                self.group_cast.wait(1.5)
                if sc and getattr(sc, "is_connected", False):
                    return self.group_cast
            except Exception:
                pass

        # Buscar en self.casts
        for name_lower, cast in self.casts.items():
            if any(k in name_lower for k in ("hilo musical", "habana hilo", "grupo")):
                self.group_cast = cast
                return cast
            if getattr(cast, "cast_type", None) == "group" or getattr(cast, "model_name", None) == "Google Cast Group":
                self.group_cast = cast
                return cast

        # Búsqueda bajo demanda si aún no está conectado
        try:
            import pychromecast
            raw_ips = list(set([v.split(":")[0] for v in self.known_casts.values() if v]))
            casts, _ = pychromecast.get_chromecasts(known_hosts=raw_ips, timeout=2.5)
            for c in casts:
                if c.cast_type == "group" or "hilo musical" in c.name.lower():
                    c.wait(1.5)
                    self.group_cast = c
                    self.casts["habana hilo musical"] = c
                    logger.info(f"🟢 [GoogleCast] Grupo 'Habana Hilo Musical' conectado bajo demanda: {c}")
                    return c
        except Exception as e:
            logger.warning(f"Error localizando grupo Google Cast: {e}")

        return None

    def _init_casts(self):
        """Inicializa conexiones directas a los altavoces físicos y al grupo Google Cast."""
        try:
            import pychromecast
            raw_ips = list(set([v.split(":")[0] for v in self.known_casts.values() if v]))
            logger.info(f"Conectando a altavoces y grupos Google Cast en LAN: {raw_ips}")
            casts, browser = pychromecast.get_chromecasts(known_hosts=raw_ips, timeout=4.0)
            self.browser = browser

            for cast in casts:
                try:
                    cast.wait(1.5)
                    name = cast.name or "Google Cast"
                    if any(x in name.lower() for x in ("tv", "tele")):
                        continue

                    # Detección de Grupo Google Cast (Unísono)
                    if cast.cast_type == "group" or any(x in name.lower() for x in ("grupo", "hilo musical")):
                        self.group_cast = cast
                        self.casts["habana hilo musical"] = cast
                        host = getattr(getattr(cast, "socket_client", None), "host", None)
                        port = getattr(getattr(cast, "socket_client", None), "port", None)
                        if host and port:
                            self.known_casts["Habana Hilo Musical"] = f"{host}:{port}"
                        logger.info(f"🟢 [GoogleCast] Grupo de sincronización unísono conectado: '{name}' ({cast.model_name}) en {host}:{port}")
                        continue

                    self.casts[name.lower()] = cast
                    host = getattr(getattr(cast, "socket_client", None), "host", None)
                    if host:
                        self.known_casts[name] = host
                    logger.info(f"🟢 [GoogleCast] Altavoz individual conectado: '{name}' en {host}")
                except Exception as e:
                    logger.warning(f"Error inicializando altavoz {cast}: {e}")

            self._save_cache()
        except Exception as e:
            logger.error(f"Error en _init_casts: {e}")

    def play_url(self, target: str, url: str, content_type: str = "audio/mp3"):
        target_key = target.lower().strip()

        # Si el destino es la tarjeta de sonido física del PC
        if self.is_local_speaker(target_key):
            try:
                from app.services.local_audio_player import local_audio_player
                local_audio_player.play(url, apply_delay=False)
            except Exception as e:
                logger.error(f"Error reproduciendo en tarjeta de sonido PC: {e}")
            return

        # DESTINO GLOBAL (TODOS LOS ALTAVOCES / MULTIROOM)
        if target_key in ("todos", "todos los altavoces", "all", "altavoces jarvis", ""):
            # 1. Reproducir en la tarjeta de sonido física de forma sincronizada (con retardo calibrado)
            if self.is_speaker_enabled("Tarjeta de Sonido PC"):
                try:
                    from app.services.local_audio_player import local_audio_player
                    local_audio_player.play(url, apply_delay=True)
                except Exception as e:
                    logger.error(f"Error reproduciendo en tarjeta de sonido PC: {e}")

            # 2. Identificar altavoces físicos habilitados
            physical_speakers = [
                name for name in self.known_casts.keys()
                if not any(k in name.lower() for k in ("grupo", "hilo musical", "habana hilo", "tv"))
            ]
            enabled_speakers = [name for name in physical_speakers if self.is_speaker_enabled(name)]

            # 3. REPRODUCCIÓN AL UNÍSONO: Si hay 2 o más altavoces habilitados, usar el Grupo nativo de Google Cast
            group_cast = self.get_group_cast()
            if group_cast and (len(enabled_speakers) >= 2 or len(enabled_speakers) == len(physical_speakers)):
                logger.info(f"🟢 [GoogleCast] Reproduciendo al UNÍSONO PERFECTO con Google Cast Group: '{group_cast.name}'")
                # Asegurar muteo en altavoces que el usuario haya apagado en la interfaz
                for spk_name in physical_speakers:
                    cast = self._find_cast(spk_name)
                    if cast and hasattr(cast, "set_volume_muted"):
                        try:
                            is_enabled = self.is_speaker_enabled(spk_name)
                            cast.set_volume_muted(not is_enabled)
                        except Exception:
                            pass
                self._play_on_cast(group_cast, url, content_type)
                return

            # Si solo 1 altavoz físico está habilitado
            if len(enabled_speakers) == 1:
                single_name = enabled_speakers[0]
                cast = self._find_cast(single_name)
                if cast:
                    logger.info(f"Reproduciendo únicamente en altavoz individual activo: '{single_name}'")
                    self._play_on_cast(cast, url, content_type)
                    return

            # Fallback en caso de que el grupo no esté accesible
            logger.warning(f"Grupo Cast no disponible. Fallback a altavoces individuales ({len(enabled_speakers)}): {enabled_speakers}")
            for spk_name in enabled_speakers:
                cast = self._find_cast(spk_name)
                if cast:
                    t = threading.Thread(target=self._play_on_cast, args=(cast, url, content_type), daemon=True)
                    t.start()
            return

        # DESTINO INDIVIDUAL ESPECÍFICO
        cast = self._find_cast(target)
        if cast:
            logger.info(f"Reproduciendo individualmente en '{cast.name}'")
            t = threading.Thread(target=self._play_on_cast, args=(cast, url, content_type), daemon=True)
            t.start()
            return

        logger.error(f"Destino Cast '{target}' no encontrado. Altavoces disponibles: {list(self.casts.keys())}")

    def _play_on_cast(self, cast, url, content_type):
        try:
            sc = getattr(cast, "socket_client", None)
            if not (sc and getattr(sc, "is_connected", False)):
                cast.wait(2.0)
            mc = cast.media_controller
            is_live = any(x in url.lower() for x in (".mp3", "stream", "live", "icecast", ":8001"))
            stream_type = "LIVE" if is_live else "BUFFERED"
            mc.play_media(url, content_type, stream_type=stream_type)
            logger.info(f"▶️ [GoogleCast] Stream enviado con éxito a '{getattr(cast, 'name', '')}' (stream_type={stream_type})")
        except Exception as e:
            logger.error(f"Error en _play_on_cast para '{getattr(cast, 'name', '')}': {e}")

    def stop_all(self):
        try:
            from app.services.local_audio_player import local_audio_player
            local_audio_player.stop()
        except Exception as e:
            logger.error(f"Error deteniendo tarjeta de sonido local: {e}")

        # Detener grupo de Google Cast
        if hasattr(self, "group_cast") and self.group_cast:
            try:
                self.group_cast.media_controller.stop()
                logger.info("⏹️ Grupo Google Cast detenido.")
            except Exception as e:
                logger.error(f"Error deteniendo grupo cast: {e}")

        # Detener todos los dispositivos individuales
        for name, cast in self.casts.items():
            try:
                cast.media_controller.stop()
            except Exception as e:
                logger.error(f"Error stopping {name}: {e}")

    def stop(self, target: str):
        target_key = target.lower().strip()
        if self.is_local_speaker(target_key):
            try:
                from app.services.local_audio_player import local_audio_player
                local_audio_player.stop()
            except Exception as e:
                logger.error(f"Error deteniendo tarjeta de sonido local: {e}")
            return

        if target_key in ("todos", "altavoces jarvis", "all", ""):
            self.stop_all()
        else:
            cast = self._find_cast(target)
            if cast:
                try:
                    cast.media_controller.stop()
                except Exception as e:
                    logger.error(f"Error stopping {target}: {e}")

    def set_volume(self, volume: float, target: str):
        target_key = target.lower().strip()
        if self.is_local_speaker(target_key):
            try:
                from app.services.local_audio_player import local_audio_player
                local_audio_player.set_volume(volume)
            except Exception as e:
                logger.error(f"Error ajustando volumen en tarjeta de sonido: {e}")
            return

        if target_key in ("todos", "altavoces jarvis", "all", ""):
            try:
                from app.services.local_audio_player import local_audio_player
                local_audio_player.set_volume(volume)
            except Exception:
                pass

            if hasattr(self, "group_cast") and self.group_cast:
                try:
                    self.group_cast.set_volume(volume)
                except Exception as e:
                    logger.error(f"Error setting volume on group cast: {e}")

            for name, cast in self.casts.items():
                if any(k in name.lower() for k in ("tv", "tele")):
                    continue
                try:
                    cast.set_volume(volume)
                except Exception as e:
                    logger.error(f"Error setting volume on {name}: {e}")
        else:
            cast = self._find_cast(target)
            if cast:
                try:
                    cast.set_volume(volume)
                except Exception as e:
                    logger.error(f"Error setting volume on {target}: {e}")

    def play_welcome_message(self, name: str):
        """Genera y reproduce mensaje de bienvenida para un usuario reconocido."""
        try:
            from app.services.tts import tts_service
            message = f"Bienvenido a casa, {name}."
            logger.info(f"Reproduciendo mensaje de bienvenida para {name}")
            audio_rel = tts_service.generate_audio(message, persona="friday")
            if audio_rel:
                audio_url = f"http://192.168.1.139{audio_rel}"
                self.play_url("todos", audio_url)
        except Exception as e:
            logger.error(f"Error playing welcome message: {e}")

    def get_status(self):
        status_list = []
        for name, ip in self.known_casts.items():
            if any(k in name.lower() for k in ("grupo", "hilo musical", "habana hilo", "tv")):
                continue
            enabled = self.is_speaker_enabled(name)
            cast = self._find_cast(name)
            sc = getattr(cast, "socket_client", None) if cast else None
            is_connected = bool(sc and getattr(sc, "is_connected", False))

            vol = 0.5
            if cast and hasattr(cast, "status") and cast.status and getattr(cast.status, "volume_level", None) is not None:
                vol = cast.status.volume_level

            status_list.append({
                "name": name,
                "ip": ip,
                "connected": is_connected,
                "volume": vol,
                "enabled": enabled,
                "device_type": "google_cast"
            })

        # Añadir la Tarjeta de Sonido física del PC
        try:
            from app.services.local_audio_player import local_audio_player
            local_status = local_audio_player.get_status(is_enabled=self.is_speaker_enabled("Tarjeta de Sonido PC"))
            status_list.append(local_status)
        except Exception as e:
            logger.error(f"Error obteniendo estado de tarjeta de sonido local: {e}")

        return status_list

cast_service = GoogleCastService()
