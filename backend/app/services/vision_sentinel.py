import os
import time
import logging
import threading
from pathlib import Path
from datetime import datetime
import cv2
import numpy as np
from typing import Dict, Any, Optional, List, Tuple

logger = logging.getLogger("VisionSentinel")

class YOLOv8Detector:
    """Motor de Inferencia Neuronal YOLOv8n ONNX para Detección Humana y Discriminación Pet-Safe."""
    def __init__(self, model_path: Path):
        self.lock = threading.Lock()
        self.model_path = str(model_path)
        self.session = None
        self.input_name = None
        self._load_model()

    def _load_model(self):
        try:
            import onnxruntime as ort
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 2
            opts.inter_op_num_threads = 1
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            self.session = ort.InferenceSession(self.model_path, opts, providers=["CPUExecutionProvider"])
            self.input_name = self.session.get_inputs()[0].name
            logger.info(f"🧠 [YOLOv8Detector] Modelo YOLOv8n ONNX cargado exitosamente desde {self.model_path}.")
        except Exception as e:
            logger.error(f"[YOLOv8Detector] Error cargando modelo ONNX: {e}")

    def detect(self, frame_bgr: np.ndarray, conf_thresh: float = 0.30) -> Tuple[bool, float, List[Dict[str, Any]], bool, float, str, float]:
        """
        Infiere si hay personas o mascotas en el fotograma.
        Retorna: (has_person, max_person_conf, boxes, has_pet, max_pet_conf, pet_type, latency_ms)
        """
        if self.session is None or frame_bgr is None:
            return False, 0.0, [], False, 0.0, "", 0.0

        t0 = time.perf_counter()
        
        # Validación y normalización de canales (p.ej. cámaras IR en escala de grises)
        if len(frame_bgr.shape) == 2:
            frame_bgr = cv2.cvtColor(frame_bgr, cv2.COLOR_GRAY2BGR)
        elif frame_bgr.shape[2] == 4:
            frame_bgr = cv2.cvtColor(frame_bgr, cv2.COLOR_BGRA2BGR)

        h_orig, w_orig = frame_bgr.shape[:2]

        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, (640, 640))
        blob = np.expand_dims(np.transpose(resized.astype(np.float32) / 255.0, (2, 0, 1)), axis=0)

        with self.lock:
            outputs = self.session.run(None, {self.input_name: blob})
        lat_ms = (time.perf_counter() - t0) * 1000.0

        preds = np.squeeze(outputs[0]).T  # [8400, 84]
        scale_x = w_orig / 640.0
        scale_y = h_orig / 640.0

        raw_boxes = []
        raw_confs = []
        has_pet = False
        max_pet_conf = 0.0
        pet_type = ""

        for row in preds:
            scores = row[4:]
            cls_id = int(np.argmax(scores))
            conf = float(scores[cls_id])
            if conf >= conf_thresh:
                if cls_id == 0:  # PERSONA
                    cx, cy, w, h = row[0:4]
                    x1 = max(0, int((cx - w / 2.0) * scale_x))
                    y1 = max(0, int((cy - h / 2.0) * scale_y))
                    box_w = min(w_orig - x1, int(w * scale_x))
                    box_h = min(h_orig - y1, int(h * scale_y))
                    # Filtro de dimensiones mínimas: descartar motas de polvo en la lente (<35px alto o <15px ancho)
                    if box_h >= 35 and box_w >= 15:
                        raw_boxes.append([x1, y1, box_w, box_h])
                        raw_confs.append(conf)
                elif cls_id in (15, 16):  # GATO (15) o PERRO (16)
                    has_pet = True
                    if conf > max_pet_conf:
                        max_pet_conf = conf
                        pet_type = "gato" if cls_id == 15 else "perro"

        final_boxes = []
        has_person = False
        max_person_conf = 0.0

        if raw_boxes:
            indices = cv2.dnn.NMSBoxes(raw_boxes, raw_confs, conf_thresh, 0.45)
            if len(indices) > 0:
                has_person = True
                for i in indices.flatten():
                    c = raw_confs[i]
                    if c > max_person_conf:
                        max_person_conf = c
                    final_boxes.append({
                        "conf": round(c, 3),
                        "box": tuple(raw_boxes[i])
                    })

        return has_person, max_person_conf, final_boxes, has_pet, max_pet_conf, pet_type, lat_ms


class VisionSentinel:
    """
    Centinela de Visión Artificial Inteligente basado en Red Neuronal YOLOv8-Nano (ONNX).
    - Detección semántica de personas humanas (inmune a cambios de luz, destellos y sombras).
    - Inmunidad total a mascotas: Discrimina gatos/perros y no enciende la luz.
    - Respuesta en tiempo real (~25ms CPU) y encendido instantáneo (<80ms).
    - Auto-extensión de tiempo mientras la persona permanezca en la estancia.
    - Cero rebotes de apagado: Al apagarse la luz, la red reconoce 0 personas y permanece en reposo.
    - Tiempos de inactividad adaptativos según estancia (p.ej. Pasillo: 40s, Salón: 60s).
    """

    def __init__(self):
        self.lock = threading.RLock()
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.last_trigger_ts: Dict[str, float] = {}
        self.last_processed_frame_ts: Dict[str, float] = {}
        self.trigger_cooldown_seconds = 1.5
        self.auto_off_delay_seconds = 45.0
        # Delays optimizados por estancia: Pasillo es de paso (40s), Salón permite estancia reposada (60s)
        self.camera_delays: Dict[str, float] = {
            "camara_pasillo": 40.0,
            "camara_cam720": 60.0
        }
        self.auto_off_timers: Dict[str, threading.Timer] = {}
        self.active_presence_lights: Dict[str, Dict[str, Any]] = {}
        self.recent_events: List[Dict[str, Any]] = []
        self.last_scores: Dict[str, Dict[str, Any]] = {}
        self.trigger_snapshots: List[Dict[str, Any]] = []

        self.models_dir = Path(__file__).resolve().parent.parent.parent / "models"
        self.model_path = self.models_dir / "yolov8n.onnx"
        self.yolo = YOLOv8Detector(self.model_path)

        self.snapshots_dir = Path(__file__).resolve().parent.parent.parent / "media" / "trigger_snapshots"
        self.snapshots_dir.mkdir(parents=True, exist_ok=True)
        self._load_existing_snapshots()

    def _load_existing_snapshots(self):
        """Carga en memoria solo las 10 últimas capturas y elimina permanentemente las anteriores del disco."""
        try:
            files = sorted(
                list(self.snapshots_dir.glob("trigger_*_annotated.jpg")),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            keep_files = files[:50]
            remove_files = files[50:]
            for old_f in remove_files:
                try:
                    old_raw = old_f.parent / old_f.name.replace("_annotated.jpg", "_raw.jpg")
                    if old_f.exists(): old_f.unlink()
                    if old_raw.exists(): old_raw.unlink()
                except Exception:
                    pass

            for f in keep_files:
                parts = f.stem.split("_")
                if len(parts) > 2 and parts[1] == "camara":
                    cam_id = f"camara_{parts[2]}"
                elif len(parts) > 1:
                    cam_id = parts[1]
                else:
                    cam_id = "camara"
                raw_name = f.name.replace("_annotated.jpg", "_raw.jpg")
                raw_path = f.parent / raw_name
                self.trigger_snapshots.append({
                    "id": f.stem,
                    "cam_id": cam_id,
                    "cam_name": "Pasillo" if "pasillo" in cam_id else "Salón" if "cam720" in cam_id else cam_id,
                    "time_str": datetime.fromtimestamp(f.stat().st_mtime).strftime("%H:%M:%S"),
                    "timestamp": f.stat().st_mtime,
                    "raw_url": f"/api/cameras/sentinel/snapshots/{raw_name}" if raw_path.exists() else None,
                    "annotated_url": f"/api/cameras/sentinel/snapshots/{f.name}",
                    "filename_raw": raw_name if raw_path.exists() else None,
                    "filename_annotated": f.name,
                    "details": f"Detección neuronal YOLOv8 en {cam_id}"
                })
            logger.info(f"[VisionSentinel] Retenidas las {len(self.trigger_snapshots)} capturas más recientes (límite máximo 50).")
        except Exception as e:
            logger.warning(f"[VisionSentinel] Error cargando capturas previas: {e}")

    def start(self):
        with self.lock:
            if self.running:
                return
            self.running = True
            self.thread = threading.Thread(target=self._sentinel_loop, name="VisionSentinelYOLOLoop", daemon=True)
            self.thread.start()
            logger.info("🟢 [VisionSentinel] Centinela Neuronal YOLOv8 (<30ms) iniciado exitosamente.")

    def stop(self):
        with self.lock:
            self.running = False
            for t in self.auto_off_timers.values():
                try:
                    t.cancel()
                except Exception:
                    pass
            self.auto_off_timers.clear()

    def _log_event(self, event_data: Dict[str, Any]):
        with self.lock:
            event_data["time_str"] = datetime.now().strftime("%H:%M:%S")
            event_data["timestamp"] = time.time()
            self.recent_events.insert(0, event_data)
            if len(self.recent_events) > 30:
                self.recent_events.pop()

    def set_camera_delay(self, cam_id: str, delay_seconds: float):
        """Permite ajustar en caliente el tiempo de apagado para una cámara concreta."""
        with self.lock:
            self.camera_delays[cam_id] = max(10.0, float(delay_seconds))
            logger.info(f"⏱️ [VisionSentinel] Tiempo auto-off para '{cam_id}' fijado en {delay_seconds:.1f}s.")

    def _sentinel_loop(self):
        time.sleep(1.0)
        logger.info("👀 [VisionSentinel] Vigilancia neuronal activa en Pasillo y Salón...")

        while self.running:
            try:
                self.loop_count = getattr(self, "loop_count", 0) + 1
                self.last_loop_ts = time.time()
                from app.services.camera_service import camera_service
                from app.services.automation_service import automation_service
                from app.services.sensor_service import sensor_service

                now = time.time()
                indoor_cameras = ["camara_pasillo", "camara_cam720"]

                for cam_id in indoor_cameras:
                    worker = camera_service.workers.get(cam_id)
                    if not worker:
                        continue

                    worker.touch()

                    # 1. Evitar procesar el mismo fotograma duplicado si el loop va más rápido que la cámara
                    frame_ts = getattr(worker, "latest_timestamp", 0)
                    if frame_ts > 0 and frame_ts == self.last_processed_frame_ts.get(cam_id, 0):
                        continue
                    self.last_processed_frame_ts[cam_id] = frame_ts

                    # 2. Obtener fotograma nativo
                    raw_frame = None
                    with worker.lock:
                        if worker.latest_frame is not None:
                            raw_frame = worker.latest_frame.copy()

                    if raw_frame is None:
                        frame_bytes = worker.latest_jpeg
                        if not frame_bytes:
                            continue
                        nparr = np.frombuffer(frame_bytes, np.uint8)
                        raw_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        if raw_frame is None:
                            continue

                    # 3. Inferencia Neuronal YOLOv8n Directa
                    has_person, max_conf, detections, has_pet, pet_conf, pet_type, lat_ms = self.yolo.detect(
                        raw_frame, conf_thresh=0.30
                    )

                    self.last_scores[cam_id] = {
                        "has_person": has_person,
                        "conf": round(max_conf, 3),
                        "has_cat": has_pet and pet_type == "gato",
                        "cat_conf": round(pet_conf, 3) if pet_type == "gato" else 0.0,
                        "has_pet": has_pet,
                        "pet_type": pet_type,
                        "pet_conf": round(pet_conf, 3),
                        "detections": len(detections),
                        "latency_ms": round(lat_ms, 1),
                        "ts": now
                    }

                    # 4. Caso Mascota Exclusiva (Gato o Perro sin personas)
                    if has_pet and not has_person:
                        if (now - self.last_trigger_ts.get(f"{cam_id}_pet", 0)) > 30.0:
                            self.last_trigger_ts[f"{cam_id}_pet"] = now
                            cam_name = camera_service.cameras.get(cam_id, {}).get("name", cam_id)
                            pet_label = "Gato" if pet_type == "gato" else "Perro"
                            logger.info(f"🐾 [VisionSentinel] {pet_label} detectado en '{cam_name}' ({int(pet_conf*100)}%). Inmunidad activa: luz no encendida.")
                            self._log_event({
                                "cam_id": cam_id,
                                "cam_name": cam_name,
                                "subject": "pet",
                                "has_human": False,
                                "has_pet": True,
                                "pet_type": pet_type,
                                "details": f"{pet_label} detectado ({int(pet_conf*100)}% certeza). Luz apagada por inmunidad.",
                                "action_taken": "PET_IGNORED",
                                "action_desc": f"Mascota ({pet_type}) ignorada. Sin activación de luces."
                            })
                        continue

                    # 5. Caso Persona Humana Confirmada -> Disparo o Extensión
                    if has_person:
                        primary_box = detections[0]["box"]
                        box_area = primary_box[2] * primary_box[3]
                        box_h = primary_box[3]
                        self._handle_detection(
                            cam_id=cam_id,
                            score=max_conf,
                            max_area=float(box_area),
                            max_h=int(box_h),
                            camera_service=camera_service,
                            automation_service=automation_service,
                            sensor_service=sensor_service,
                            raw_frame=raw_frame,
                            yolo_boxes=detections,
                            lat_ms=lat_ms
                        )

            except Exception as e:
                self.last_exception = str(e)
                logger.error(f"[VisionSentinel] Excepción en bucle de vigilancia: {e}")

            time.sleep(0.18)  # ~5 FPS de escaneo continuo con consumo CPU imperceptible

    def _handle_detection(
        self,
        cam_id: str,
        score: float,
        max_area: float,
        max_h: int,
        camera_service,
        automation_service,
        sensor_service,
        raw_frame: Optional[np.ndarray] = None,
        yolo_boxes: Optional[List[Dict[str, Any]]] = None,
        lat_ms: float = 25.0
    ):
        now = time.time()
        target_entity = "led_pasillo_central" if cam_id == "camara_pasillo" else "led_sofa_salon" if cam_id == "camara_cam720" else None
        cam_name = camera_service.cameras.get(cam_id, {}).get("name", cam_id)
        effective_delay = self.camera_delays.get(cam_id, self.auto_off_delay_seconds)

        # CASO 1: La luz ya está encendida por presencia -> AUTO-EXTENSIÓN DE TIEMPO
        if cam_id in self.active_presence_lights:
            info = self.active_presence_lights[cam_id]
            remaining = info.get("turn_off_due_ts", 0) - now
            # Si quedan menos de 30s y se confirma persona, renovar cuenta atrás completa
            if remaining < 30.0:
                logger.info(f"🔄 [VisionSentinel] Persona en movimiento en '{cam_name}' ({int(score*100)}%, restaban {int(remaining)}s). Renovando cuenta atrás a {int(effective_delay)}s.")
                self._schedule_auto_off(cam_id, target_entity, delay_seconds=effective_delay)
            return

        # CASO 2: La luz está apagada -> RESPUESTA INSTANTÁNEA (<80ms)
        last_ts = self.last_trigger_ts.get(cam_id, 0)
        if (now - last_ts) < self.trigger_cooldown_seconds:
            return

        self.last_trigger_ts[cam_id] = now
        t_start = time.perf_counter()

        logger.info(f"🏃 [VisionSentinel] ¡PERSONA DETECTADA POR YOLOv8 en '{cam_name}' (certeza: {int(score*100)}%, latencia: {lat_ms:.1f}ms)! Encendiendo luz...")

        # ⚡ 1. Encender la luz al instante
        results = automation_service.trigger_by_camera(cam_id, "person_detected")
        t_elapsed_ms = (time.perf_counter() - t_start) * 1000

        # Programar temporizador estándar de auto-apagado
        if target_entity:
            self._schedule_auto_off(cam_id, target_entity, delay_seconds=effective_delay)

        # Actualizar sensor de presencia si aplica
        if cam_id == "camara_cam720":
            try:
                sensor_service.update_sensor_state("sensor_presencia_camara_salon", "ocupado")
            except Exception:
                pass

        # 📸 2. Guardar captura forense con recuadro YOLOv8
        if raw_frame is not None:
            self._save_trigger_snapshot_async(
                cam_id=cam_id,
                cam_name=cam_name,
                raw_frame=raw_frame,
                yolo_boxes=yolo_boxes or [],
                score=score,
                max_area=max_area,
                max_h=max_h,
                lat_ms=lat_ms
            )

        self._log_event({
            "cam_id": cam_id,
            "cam_name": cam_name,
            "subject": "human",
            "score": round(score, 3),
            "max_area": int(max_area),
            "latency_ms": round(t_elapsed_ms, 1),
            "has_human": True,
            "has_pet": False,
            "action_taken": "INSTANT_LIGHT_ON",
            "action_desc": f"Persona confirmada por YOLOv8 ({int(score*100)}%). Luz encendida en {t_elapsed_ms:.1f}ms (auto-apagado en {int(effective_delay)}s)."
        })

    def _save_trigger_snapshot_async(
        self,
        cam_id: str,
        cam_name: str,
        raw_frame: np.ndarray,
        yolo_boxes: List[Dict[str, Any]],
        score: float,
        max_area: float,
        max_h: int,
        lat_ms: float
    ):
        """Guarda en segundo plano el fotograma original y la versión anotada con recuadros verdes de YOLOv8."""
        def _worker():
            try:
                now = time.time()
                ts_str = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
                time_str = datetime.now().strftime("%H:%M:%S")

                raw_filename = f"trigger_{cam_id}_{ts_str}_raw.jpg"
                annotated_filename = f"trigger_{cam_id}_{ts_str}_annotated.jpg"

                raw_path = self.snapshots_dir / raw_filename
                annotated_path = self.snapshots_dir / annotated_filename

                # 1. Guardar fotograma original completo
                cv2.imwrite(str(raw_path), raw_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])

                # 2. Generar imagen anotada con recuadro verde sobre la persona
                annotated = raw_frame.copy()
                h_img, w_img = annotated.shape[:2]

                for det in yolo_boxes:
                    x, y, w, h = det["box"]
                    c = det.get("conf", score)
                    cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 255, 0), 2)
                    label = f"PERSONA {int(c * 100)}%"
                    cv2.putText(
                        annotated,
                        label,
                        (x, max(22, y - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.60,
                        (0, 255, 0),
                        2
                    )

                # Banner superior con información forense
                banner_h = 36
                cv2.rectangle(annotated, (0, 0), (w_img, banner_h), (10, 15, 30), -1)
                info_text = f"YOLOv8 DETECCION: {cam_name} | {time_str} | Persona: {int(score * 100)}% | Inferencia: {lat_ms:.1f}ms"
                cv2.putText(annotated, info_text, (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 243, 255), 2)

                cv2.imwrite(str(annotated_path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])

                # 3. Registrar en memoria
                record = {
                    "id": f"{cam_id}_{ts_str}",
                    "cam_id": cam_id,
                    "cam_name": cam_name,
                    "time_str": time_str,
                    "timestamp": now,
                    "score": round(score, 3),
                    "max_area": int(max_area),
                    "max_h": int(max_h),
                    "raw_url": f"/api/cameras/sentinel/snapshots/{raw_filename}",
                    "annotated_url": f"/api/cameras/sentinel/snapshots/{annotated_filename}",
                    "filename_raw": raw_filename,
                    "filename_annotated": annotated_filename,
                    "details": f"Detección neuronal de persona en {cam_name} a las {time_str} ({int(score*100)}% certeza)"
                }

                with self.lock:
                    self.trigger_snapshots.insert(0, record)
                    while len(self.trigger_snapshots) > 50:
                        old = self.trigger_snapshots.pop()
                        try:
                            f1 = self.snapshots_dir / old.get("filename_raw", "")
                            f2 = self.snapshots_dir / old.get("filename_annotated", "")
                            if f1.exists(): f1.unlink()
                            if f2.exists(): f2.unlink()
                        except Exception:
                            pass

                logger.info(f"📸 [VisionSentinel] Captura forense YOLOv8 guardada: {annotated_filename}")

            except Exception as e:
                logger.error(f"[VisionSentinel] Error guardando captura de disparo: {e}")

        threading.Thread(target=_worker, daemon=True, name="SaveYOLOSnapshot").start()

    def clear_snapshots(self) -> int:
        """Elimina todas las capturas de disparo guardadas."""
        count = 0
        with self.lock:
            for f in self.snapshots_dir.glob("trigger_*"):
                try:
                    f.unlink()
                    count += 1
                except Exception:
                    pass
            self.trigger_snapshots.clear()
        return count

    def _schedule_auto_off(self, cam_id: str, entity_id: str, delay_seconds: Optional[float] = None):
        delay = delay_seconds if delay_seconds is not None else self.camera_delays.get(cam_id, self.auto_off_delay_seconds)
        with self.lock:
            if cam_id in self.auto_off_timers:
                try:
                    self.auto_off_timers[cam_id].cancel()
                except Exception:
                    pass

            due_ts = time.time() + delay
            self.active_presence_lights[cam_id] = {
                "entity_id": entity_id,
                "cam_id": cam_id,
                "turned_on_ts": time.time(),
                "turn_off_due_ts": due_ts,
                "remaining_seconds": int(delay),
                "delay_seconds": int(delay)
            }

            def _turn_off_action():
                logger.info(f"⏱️ [VisionSentinel] Tiempo de inactividad completado ({int(delay)}s) para '{cam_id}'. Apagando {entity_id}.")

                with self.lock:
                    self.active_presence_lights.pop(cam_id, None)

                # Apagar la luz físicamente
                try:
                    from app.services.z2m_lighting_engine import z2m_engine
                    z2m_engine.control_habana_entity(entity_id, "turn_off")
                except Exception as ex:
                    logger.error(f"[VisionSentinel] Error apagando {entity_id}: {ex}")

                # Actualizar sensor de presencia si aplica
                if cam_id == "camara_cam720":
                    try:
                        from app.services.sensor_service import sensor_service
                        sensor_service.update_sensor_state("sensor_presencia_camara_salon", "despejado")
                    except Exception:
                        pass

                from app.services.camera_service import camera_service
                cam_name = camera_service.cameras.get(cam_id, {}).get("name", cam_id)

                self._log_event({
                    "cam_id": cam_id,
                    "cam_name": cam_name,
                    "subject": "timer",
                    "has_human": False,
                    "has_pet": False,
                    "details": f"Inactividad completada tras {int(delay)}s",
                    "action_taken": "AUTO_OFF",
                    "action_desc": f"Luz ({entity_id}) apagada automáticamente por inactividad."
                })

            timer = threading.Timer(delay, _turn_off_action)
            self.auto_off_timers[cam_id] = timer
            timer.daemon = True
            timer.start()

    def turn_off_all_presence_lights(self) -> Dict[str, Any]:
        """Apaga de inmediato todas las luces de presencia y cancela temporizadores."""
        with self.lock:
            for t in self.auto_off_timers.values():
                try:
                    t.cancel()
                except Exception:
                    pass
            self.auto_off_timers.clear()
            self.active_presence_lights.clear()

        from app.services.z2m_lighting_engine import z2m_engine
        res1 = z2m_engine.control_habana_entity("led_pasillo_central", "turn_off")
        res2 = z2m_engine.control_habana_entity("led_sofa_salon", "turn_off")

        try:
            from app.services.sensor_service import sensor_service
            sensor_service.update_sensor_state("sensor_presencia_camara_salon", "despejado")
        except Exception:
            pass

        self._log_event({
            "cam_id": "all",
            "cam_name": "Sistema",
            "subject": "manual",
            "has_human": False,
            "has_pet": False,
            "details": "Apagado manual inmediato de luces de presencia",
            "action_taken": "MANUAL_ALL_OFF",
            "action_desc": "Todas las luces de presencia apagadas por orden del usuario."
        })

        return {"status": "success", "led_pasillo": res1, "led_sofa": res2}

    def get_activity_summary(self) -> Dict[str, Any]:
        now = time.time()
        with self.lock:
            active = []
            for cam_id, info in self.active_presence_lights.items():
                rem = max(0, int(info["turn_off_due_ts"] - now))
                active.append({
                    "cam_id": cam_id,
                    "entity_id": info["entity_id"],
                    "remaining_seconds": rem,
                    "delay_seconds": info.get("delay_seconds", int(self.auto_off_delay_seconds))
                })

            return {
                "running": self.running,
                "thread_alive": self.thread.is_alive() if self.thread else False,
                "auto_off_delay_seconds": int(self.auto_off_delay_seconds),
                "camera_delays": dict(self.camera_delays),
                "detector_engine": "YOLOv8n-ONNX",
                "active_presence_lights": active,
                "last_scores": dict(self.last_scores),
                "recent_events": list(self.recent_events),
                "trigger_snapshots": list(self.trigger_snapshots[:50])
            }

vision_sentinel = VisionSentinel()
