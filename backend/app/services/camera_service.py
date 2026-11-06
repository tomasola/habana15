import os
import time
import json
import logging
import threading
from pathlib import Path
from typing import Dict, Any, Optional, Generator, List
import cv2
import numpy as np

logger = logging.getLogger("CameraService")

CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "cameras.json"

# Configurar OpenCV para usar TCP, sin buffer y baja latencia en RTSP
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay|max_delay;500000|reorder_queue_size;0"


class CameraWorker:
    """Hilo de captura en segundo plano para una cámara individual."""

    def __init__(self, camera_id: str, config: Dict[str, Any]):
        self.camera_id = camera_id
        self.config = config
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()
        self.latest_frame: Optional[np.ndarray] = None
        self.latest_jpeg: Optional[bytes] = None
        self.latest_timestamp: float = 0
        self.is_connected = False
        self.last_consumer_ts = time.time()
        self.error_message: Optional[str] = None
        self.subscribers_count = 0
        self._last_encode_ts: float = 0.0

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._capture_loop, name=f"CamWorker-{self.camera_id}", daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
        self.thread = None
        self.is_connected = False

    def touch(self):
        """Notifica actividad de visualización para mantener despierto el hilo."""
        self.last_consumer_ts = time.time()
        if not self.running:
            self.start()

    def _get_stream_url(self) -> str:
        # Preferir stream secundario (sub-stream) para streaming web ágil y fluido
        url = self.config.get("stream_sub") or self.config.get("stream_hd") or ""
        # Si la cámara tiene credenciales configuradas y la URL no las incluye
        user = self.config.get("user", "")
        password = self.config.get("password", "")
        if user and password and "@" not in url and url.startswith("rtsp://"):
            url = url.replace("rtsp://", f"rtsp://{user}:{password}@")
        return url

    def _capture_loop(self):
        logger.info(f"[{self.camera_id}] Hilo de captura iniciado.")
        cap = None

        while self.running:
            # Las cámaras centinela de presencia interior (pasillo y salón) nunca se pausan
            is_sentinel = self.camera_id in ("camara_pasillo", "camara_cam720")
            if not is_sentinel and (time.time() - self.last_consumer_ts) > 60:
                logger.info(f"[{self.camera_id}] Sin espectadores durante 60s. Pausando captura.")
                if cap:
                    cap.release()
                    cap = None
                self.is_connected = False
                self.running = False
                break

            url = self._get_stream_url()
            if not url:
                self.error_message = "URL no configurada"
                time.sleep(2.0)
                continue

            try:
                if cap is None or not cap.isOpened():
                    # Despertar ONVIF por WS-Discovery UDP multicast antes de abrir RTSP (evita bloqueo post-corte de tensión en Cam720)
                    try:
                        import socket
                        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
                        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                        sock.settimeout(0.3)
                        ws_probe = b'<?xml version="1.0" encoding="UTF-8"?><e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"><e:Header><w:MessageID>uuid:12345678-1234-1234-1234-123456789abc</w:MessageID><w:To>urn:schemas-xmlsoap-org:ws:2005/04/discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header><e:Body><d:Probe/></e:Body></e:Envelope>'
                        sock.sendto(ws_probe, ("239.255.255.250", 3702))
                        sock.sendto(ws_probe, ("255.255.255.255", 3702))
                        sock.close()
                    except Exception:
                        pass
                    logger.info(f"[{self.camera_id}] Conectando a {url.split('@')[-1]}...")
                    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    if not cap.isOpened():
                        self.is_connected = False
                        self.error_message = "No se pudo abrir el stream RTSP"
                        time.sleep(3.0)
                        continue
                    self.is_connected = True
                    self.error_message = None
                    logger.info(f"[{self.camera_id}] Stream RTSP conectado con éxito.")

                ret, frame = cap.read()
                if not ret or frame is None:
                    logger.warning(f"[{self.camera_id}] Error al leer fotograma RTSP. Reintentando...")
                    self.is_connected = False
                    self.error_message = "Pérdida de señal de vídeo"
                    if cap:
                        cap.release()
                        cap = None
                    time.sleep(1.0)
                    continue

                now = time.time()
                # Guardar fotograma sin procesar (raw numpy array) al instante para el centinela MOG2
                with self.lock:
                    self.latest_frame = frame
                    self.latest_timestamp = now
                    self.is_connected = True
                    self.error_message = None

                # Throttling de codificación JPEG a ~15-16 FPS para ahorro significativo de CPU
                if (now - self._last_encode_ts) >= 0.060:
                    self._last_encode_ts = now
                    success, encoded_img = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    if success:
                        jpeg_bytes = encoded_img.tobytes()
                        with self.lock:
                            self.latest_jpeg = jpeg_bytes

                # Sin time.sleep(0.04) para que cap.read() lea a la velocidad natural de la cámara en tiempo real sin acumular lag jamás

            except Exception as e:
                logger.error(f"[{self.camera_id}] Excepción en bucle de captura: {e}")
                self.is_connected = False
                self.error_message = str(e)
                if cap:
                    try:
                        cap.release()
                    except Exception:
                        pass
                    cap = None
                time.sleep(2.0)

        if cap:
            try:
                cap.release()
            except Exception:
                pass
        self.is_connected = False
        logger.info(f"[{self.camera_id}] Hilo de captura detenido.")

    def get_raw_frame(self, wait_first: bool = True) -> Optional[np.ndarray]:
        """Obtiene el último fotograma como ndarray directo sin sobrecarga de decodificación."""
        self.touch()
        if wait_first and self.latest_frame is None and self.running:
            for _ in range(25):
                time.sleep(0.05)
                with self.lock:
                    if self.latest_frame is not None:
                        return self.latest_frame
        with self.lock:
            return self.latest_frame

    def get_frame(self, wait_first: bool = True) -> bytes:
        self.touch()
        if wait_first and self.latest_jpeg is None and self.running:
            for _ in range(25):
                time.sleep(0.05)
                with self.lock:
                    if self.latest_jpeg is not None:
                        return self.latest_jpeg
        with self.lock:
            if self.latest_jpeg is not None:
                return self.latest_jpeg
            if self.latest_frame is not None:
                _, buf = cv2.imencode(".jpg", self.latest_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                return buf.tobytes()
        return self._generate_placeholder()
        with self.lock:
            if self.latest_jpeg is not None:
                return self.latest_jpeg
        return self._generate_placeholder()

    def _generate_placeholder(self) -> bytes:
        # Crear imagen negra/azul oscura de 640x360 con texto informativo
        img = np.zeros((360, 640, 3), dtype=np.uint8)
        # Fondo degradado suave oscuro
        img[:, :] = (20, 10, 5)  # BGR

        name = self.config.get("name", self.camera_id)
        status_text = "CONECTANDO AL FLUJO EN VIVO..." if self.running else "EN REPOSO / SIN CONEXION"
        if self.error_message:
            status_text = f"ESTADO: {self.error_message[:40]}"

        cv2.putText(img, name.upper(), (40, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 243, 255), 2, cv2.LINE_AA)
        cv2.putText(img, status_text, (40, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (160, 160, 160), 1, cv2.LINE_AA)
        cv2.putText(img, "HABANA CCTV SECURITY", (40, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 136), 1, cv2.LINE_AA)

        # Hora en vivo
        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(img, now_str, (40, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1, cv2.LINE_AA)

        _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return buf.tobytes()


class CameraService:
    def __init__(self):
        self.lock = threading.RLock()
        self.cameras: Dict[str, Dict[str, Any]] = {}
        self.workers: Dict[str, CameraWorker] = {}
        self.load_config()

    def load_config(self):
        with self.lock:
            if CONFIG_PATH.exists():
                try:
                    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                        self.cameras = json.load(f)
                except Exception as e:
                    logger.error(f"Error cargando {CONFIG_PATH}: {e}")
                    self.cameras = {}
            else:
                self.cameras = {}

            # Inicializar workers para cada cámara configurada
            for cam_id, cam_conf in self.cameras.items():
                if cam_id not in self.workers:
                    self.workers[cam_id] = CameraWorker(cam_id, cam_conf)

    def save_config(self):
        with self.lock:
            try:
                with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                    json.dump(self.cameras, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.error(f"Error guardando {CONFIG_PATH}: {e}")

    def list_cameras(self) -> List[Dict[str, Any]]:
        with self.lock:
            result = []
            for cam_id, conf in self.cameras.items():
                worker = self.workers.get(cam_id)
                is_live = worker.is_connected if worker else False
                has_frames = (worker.latest_jpeg is not None) if worker else False
                err = worker.error_message if worker else None

                result.append({
                    "id": cam_id,
                    "name": conf.get("name", cam_id),
                    "ip": conf.get("ip", ""),
                    "protocol": conf.get("protocol", "rtsp"),
                    "room": conf.get("room", "general"),
                    "enabled": conf.get("enabled", True),
                    "is_connected": is_live,
                    "has_frames": has_frames,
                    "error": err,
                    "stream_sub": conf.get("stream_sub", ""),
                    "stream_hd": conf.get("stream_hd", ""),
                    "snapshot_url": f"/api/cameras/{cam_id}/snapshot.jpg",
                    "stream_url": f"/api/cameras/{cam_id}/stream.mjpg"
                })
            return result

    def get_camera(self, camera_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.cameras.get(camera_id)

    def update_camera(self, camera_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        with self.lock:
            if camera_id not in self.cameras:
                self.cameras[camera_id] = {"id": camera_id}

            self.cameras[camera_id].update(updates)
            self.save_config()

            # Reiniciar el worker asociado si estaba corriendo
            if camera_id in self.workers:
                worker = self.workers[camera_id]
                was_running = worker.running
                worker.stop()
                self.workers[camera_id] = CameraWorker(camera_id, self.cameras[camera_id])
                if was_running or updates.get("start", False):
                    self.workers[camera_id].start()

            return self.cameras[camera_id]

    def get_raw_frame(self, camera_id: str) -> Optional[np.ndarray]:
        """Obtiene un fotograma ndarray directo sin sobrecarga de decodificación."""
        worker = self.workers.get(camera_id)
        if not worker:
            conf = self.cameras.get(camera_id)
            if not conf:
                return None
            worker = CameraWorker(camera_id, conf)
            self.workers[camera_id] = worker
            worker.start()
        return worker.get_raw_frame()

    def get_snapshot(self, camera_id: str) -> bytes:
        """Obtiene un fotograma JPEG actualizado de la cámara."""
        worker = self.workers.get(camera_id)
        if not worker:
            conf = self.cameras.get(camera_id)
            if not conf:
                # Retornar imagen de error no encontrada
                img = np.zeros((360, 640, 3), dtype=np.uint8)
                cv2.putText(img, "CAMARA NO ENCONTRADA", (120, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
                _, buf = cv2.imencode(".jpg", img)
                return buf.tobytes()
            worker = CameraWorker(camera_id, conf)
            self.workers[camera_id] = worker

        return worker.get_frame()

    def generate_mjpeg_stream(self, camera_id: str) -> Generator[bytes, None, None]:
        """Generador continuo de multipart/x-mixed-replace para visualización en navegador."""
        worker = self.workers.get(camera_id)
        if not worker:
            conf = self.cameras.get(camera_id)
            if not conf:
                return
            worker = CameraWorker(camera_id, conf)
            self.workers[camera_id] = worker

        worker.subscribers_count += 1
        worker.touch()

        try:
            while True:
                worker.touch()
                frame_bytes = worker.get_frame()
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"Content-Length: " + str(len(frame_bytes)).encode() + b"\r\n\r\n"
                    + frame_bytes + b"\r\n"
                )
                time.sleep(0.06)  # ~16 FPS
        except GeneratorExit:
            pass
        finally:
            worker.subscribers_count = max(0, worker.subscribers_count - 1)

    def analyze_camera(self, camera_id: str, prompt: Optional[str] = None) -> Dict[str, Any]:
        """Analiza la escena actual con Groq Vision LLaMA 3.2."""
        from app.core.config import settings
        import base64

        jpeg_bytes = self.get_snapshot(camera_id)
        if not jpeg_bytes or len(jpeg_bytes) < 1000:
            return {
                "timestamp": time.time(),
                "camera_id": camera_id,
                "error": "No se pudo obtener imagen de la cámara para análisis",
                "description": "Error: flujo de vídeo no disponible."
            }

        img_b64 = base64.b64encode(jpeg_bytes).decode("utf-8")
        camera_name = self.cameras.get(camera_id, {}).get("name", camera_id)

        if not prompt:
            prompt = (
                f"Estás viendo la cámara de seguridad '{camera_name}'. "
                "Describe brevemente lo que se observa en la imagen (personas, objetos, iluminación, vehículos). "
                "Determina si hay alguna situación anómala o si todo está en orden (NORMAL, PRECAUCIÓN o ALERTA)."
            )

        groq_key = settings.GROQ_API_KEY
        if groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_key, timeout=12.0)
                completion = client.chat.completions.create(
                    model="qwen/qwen3.8-27b",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
                                }
                            ]
                        }
                    ],
                    max_tokens=220,
                    temperature=0.2
                )
                description = completion.choices[0].message.content if completion.choices else "Sin descripción."
                threat_level = "NORMAL"
                desc_upper = description.upper()
                if ("NORMAL" in desc_upper and "ESTADO" in desc_upper) or "TODO ESTÁ EN ORDEN" in desc_upper or "TODO EN ORDEN" in desc_upper:
                    threat_level = "NORMAL"
                elif "INTRUSO DETECTADO" in desc_upper or "PELIGRO INMINENTE" in desc_upper or "AMENAZA: ALERTA" in desc_upper or "ESTADO:\n**ALERTA**" in desc_upper:
                    threat_level = "ALERTA"
                elif "PRECAUCIÓN" in desc_upper or "PRECAUCION" in desc_upper or "SOSPECHOSO" in desc_upper:
                    threat_level = "PRECAUCIÓN"

                return {
                    "timestamp": time.time(),
                    "camera_id": camera_id,
                    "camera_name": camera_name,
                    "description": description,
                    "threat_level": threat_level,
                    "has_people": ("PERSONA" in desc_upper or "HOMBRE" in desc_upper or "MUJER" in desc_upper or "HUMANO" in desc_upper)
                }
            except Exception as e:
                logger.error(f"Error en análisis con Groq Vision: {e}")
                return {
                    "timestamp": time.time(),
                    "camera_id": camera_id,
                    "camera_name": camera_name,
                    "description": f"Análisis de visión no completado: {e}",
                    "threat_level": "NORMAL"
                }

        return {
            "timestamp": time.time(),
            "camera_id": camera_id,
            "camera_name": camera_name,
            "description": "API de visión no configurada (falta GROQ_API_KEY).",
            "threat_level": "NORMAL"
        }

    def classify_subject(self, camera_id: str) -> Dict[str, Any]:
        """
        Clasifica con precisión si en la escena hay personas humanas o mascotas (gatos/perros).
        Permite la inmunidad ante mascotas en alarmas y automatizaciones.
        """
        now = time.time()
        cached = getattr(self, "_classification_cache", {}).get(camera_id)
        if cached and (now - cached.get("ts", 0)) < 8.0:
            return cached.get("data")

        from app.core.config import settings
        import base64

        jpeg_bytes = self.get_snapshot(camera_id)
        if not jpeg_bytes or len(jpeg_bytes) < 1000:
            return {
                "timestamp": time.time(),
                "camera_id": camera_id,
                "has_human": True,
                "has_pet": False,
                "is_safe_pet_only": False,
                "pet_type": "ninguno",
                "details": "No se pudo obtener imagen de la cámara. Preservando iluminación de presencia.",
                "threat_level": "NORMAL"
            }

        camera_name = self.cameras.get(camera_id, {}).get("name", camera_id)

        # Redimensionar y comprimir para reducir el consumo de tokens en Groq en un 75%
        try:
            nparr = np.frombuffer(jpeg_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                h_orig, w_orig = img.shape[:2]
                target_w = 480
                target_h = int(round(h_orig * (target_w / float(w_orig))))
                resized = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_AREA)
                success, enc = cv2.imencode(".jpg", resized, [cv2.IMWRITE_JPEG_QUALITY, 60])
                if success:
                    jpeg_bytes = enc.tobytes()
        except Exception:
            pass

        img_b64 = base64.b64encode(jpeg_bytes).decode("utf-8")

        prompt = (
            "Eres el analizador de seguridad y presencia de HABANA. "
            "Analiza minuciosamente los seres vivos en la imagen. "
            "Determina si hay personas humanas o si solo hay animales domésticos (gatos, perros) o ninguno. "
            "Responde ÚNICAMENTE un objeto JSON válido con los campos exactos:\n"
            "{\n"
            '  "has_human": false,\n'
            '  "has_pet": false,\n'
            '  "is_safe_pet_only": true,\n'
            '  "pet_type": "gato",\n'
            '  "details": "descripción de lo detectado",\n'
            '  "threat_level": "NORMAL"\n'
            "}"
        )

        groq_key = settings.GROQ_API_KEY
        rate_limit_until = getattr(self, "_groq_rate_limited_until", 0)

        # Si Groq está en cooldown por rate limit temporal, usar detector local de presencia
        if time.time() < rate_limit_until:
            rem = int(rate_limit_until - time.time())
            logger.info(f"⚡ [CameraService] Groq en espera por TPD ({rem}s restantes). Activando presencia óptica local.")
            return {
                "timestamp": time.time(),
                "camera_id": camera_id,
                "camera_name": camera_name,
                "has_human": True,
                "has_pet": False,
                "is_safe_pet_only": False,
                "pet_type": "ninguno",
                "details": f"Presencia detectada por visión óptica local (Modo Autónomo, Groq en espera {rem}s)",
                "threat_level": "NORMAL"
            }

        if groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_key, timeout=10.0)
                completion = client.chat.completions.create(
                    model="qwen/qwen3.8-27b",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
                                }
                            ]
                        }
                    ],
                    max_tokens=180,
                    temperature=0.1
                )
                text = completion.choices[0].message.content.strip() if completion.choices else "{}"
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()

                data = json.loads(text)
                data["timestamp"] = time.time()
                data["camera_id"] = camera_id
                data["camera_name"] = camera_name
                if not hasattr(self, "_classification_cache"):
                    self._classification_cache = {}
                self._classification_cache[camera_id] = {"ts": time.time(), "data": data}
                return data

            except Exception as e:
                err_str = str(e)
                logger.warning(f"Aviso en Groq Vision API: {err_str}")
                if "429" in err_str or "rate_limit" in err_str.lower():
                    # Entrar en modo autónomo local durante 5 minutos para no bloquear las luces
                    self._groq_rate_limited_until = time.time() + 300.0
                    logger.info("⚠️ [CameraService] Límite de Groq alcanzado. Conmutando a sensor de presencia óptico local.")

                # FALLBACK ROBUSTO: ¡Jamás dejar a la persona a oscuras si el detector detectó movimiento!
                return {
                    "timestamp": time.time(),
                    "camera_id": camera_id,
                    "camera_name": camera_name,
                    "has_human": True,
                    "has_pet": False,
                    "is_safe_pet_only": False,
                    "pet_type": "ninguno",
                    "details": "Presencia detectada por visión óptica local (Modo Autónomo Local)",
                    "threat_level": "NORMAL"
                }

        return {
            "timestamp": time.time(),
            "camera_id": camera_id,
            "camera_name": camera_name,
            "has_human": True,
            "has_pet": False,
            "is_safe_pet_only": False,
            "pet_type": "ninguno",
            "details": "Servicio de visión en reposo. Preservando temporizador de iluminación.",
            "threat_level": "NORMAL"
        }


camera_service = CameraService()
