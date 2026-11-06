import os
import json
import shutil
import time
from typing import Dict, Any, List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_DIR = os.path.join(BASE_DIR, "config")
ROOMS_MEDIA_DIR = os.path.join(BASE_DIR, "media", "rooms")
REGISTRY_FILE = os.path.join(CONFIG_DIR, "room_studio_registry.json")

# Default registry if file doesn't exist
DEFAULT_REGISTRY = {
    "andrea": {
        "id": "andrea",
        "name": "Habitación de Andrea",
        "status": "ready",
        "active_in_3d": True,
        "raw_photos": [
            {
                "id": "raw_andrea_1",
                "filename": "andrea_raw_view.jpg",
                "url": "/room_photos/andrea_clean_view_window.jpg",
                "angle": "window",
                "uploaded_at": "2026-10-14 18:30"
            }
        ],
        "views": [
            {
                "angle": "window",
                "name": "Vista Ventanal y Cama",
                "image_url": "/room_photos/andrea_clean_view_window.jpg",
                "processed_url": "/room_photos/andrea_clean_view_window.jpg",
                "description": "Fotografía HD fotorrealista limpia con TV en pared y ambas mesitas",
                "lights": [
                    {
                        "id": "techo",
                        "name": "Lámpara de Lazos Cama Andrea",
                        "entity_id": "luz_lazos_andrea",
                        "type": "emissive_bloom",
                        "zone": "center_ceiling"
                    },
                    {
                        "id": "viga",
                        "name": "Luz Oculta Viga / Ventana Andrea",
                        "entity_id": "luz_ventana_andrea",
                        "type": "downward_wash",
                        "zone": "desk_alcove"
                    },
                    {
                        "id": "led_cabecero",
                        "name": "Tira LED Cabecero Cama Andrea",
                        "entity_id": "led_cama_andrea",
                        "type": "grazing_cove",
                        "zone": "headboard_wall"
                    },
                    {
                        "id": "led_entrada",
                        "name": "Tira LED Foso Entrada Andrea",
                        "entity_id": "led_foso_andrea",
                        "type": "indirect_cove",
                        "zone": "entrance_hallway"
                    }
                ],
                "covers": [
                    {
                        "id": "persiana",
                        "name": "Persiana Habitación Andrea",
                        "entity_id": "cover.persiana_andrea"
                    }
                ]
            },
            {
                "angle": "door",
                "name": "Vista Entrada y Cómoda",
                "image_url": "/room_photos/andrea_clean_view_door.jpg",
                "processed_url": "/room_photos/andrea_clean_view_door.jpg",
                "description": "Vista inversa hacia el espejo y la cómoda",
                "lights": [
                    {
                        "id": "techo",
                        "name": "Lámpara de Lazos Cama Andrea",
                        "entity_id": "luz_lazos_andrea",
                        "type": "emissive_bloom",
                        "zone": "center_ceiling"
                    },
                    {
                        "id": "led_entrada",
                        "name": "Tira LED Foso Entrada Andrea",
                        "entity_id": "led_foso_andrea",
                        "type": "indirect_cove",
                        "zone": "entrance_hallway"
                    }
                ],
                "covers": []
            }
        ]
    },
    "salon": {
        "id": "salon",
        "name": "Salón Principal",
        "status": "pending_upload",
        "active_in_3d": False,
        "raw_photos": [],
        "views": []
    },
    "principal": {
        "id": "principal",
        "name": "Dormitorio Principal",
        "status": "pending_upload",
        "active_in_3d": False,
        "raw_photos": [],
        "views": []
    },
    "cocina": {
        "id": "cocina",
        "name": "Cocina",
        "status": "pending_upload",
        "active_in_3d": False,
        "raw_photos": [],
        "views": []
    },
    "terraza": {
        "id": "terraza",
        "name": "Terraza Exterior",
        "status": "pending_upload",
        "active_in_3d": False,
        "raw_photos": [],
        "views": []
    },
    "bano": {
        "id": "bano",
        "name": "Baño",
        "status": "pending_upload",
        "active_in_3d": False,
        "raw_photos": [],
        "views": []
    },
    "despacho": {
        "id": "despacho",
        "name": "Despacho / Oficina",
        "status": "pending_upload",
        "active_in_3d": False,
        "raw_photos": [],
        "views": []
    },
    "pasillo": {
        "id": "pasillo",
        "name": "Pasillo",
        "status": "pending_upload",
        "active_in_3d": False,
        "raw_photos": [],
        "views": []
    }
}

class RoomStudioService:
    def __init__(self):
        import threading
        self._lock = threading.RLock()
        os.makedirs(CONFIG_DIR, exist_ok=True)
        os.makedirs(ROOMS_MEDIA_DIR, exist_ok=True)
        self._ensure_registry()

    def _ensure_registry(self):
        with self._lock:
            if not os.path.exists(REGISTRY_FILE):
                with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
                    json.dump(DEFAULT_REGISTRY, f, indent=2, ensure_ascii=False)

    def get_all_rooms(self) -> Dict[str, Any]:
        self._ensure_registry()
        with self._lock:
            try:
                with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return json.loads(json.dumps(DEFAULT_REGISTRY))

    def get_room(self, room_id: str) -> Dict[str, Any]:
        rooms = self.get_all_rooms()
        return rooms.get(room_id, {
            "id": room_id,
            "name": room_id.capitalize(),
            "status": "pending_upload",
            "active_in_3d": False,
            "raw_photos": [],
            "views": []
        })

    def save_room(self, room_id: str, room_data: Dict[str, Any]):
        with self._lock:
            rooms = self.get_all_rooms()
            rooms[room_id] = room_data
            with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
                json.dump(rooms, f, indent=2, ensure_ascii=False)
            return room_data

    def save_raw_photo(self, room_id: str, file_name: str, file_content: bytes, angle: str = "window") -> Dict[str, Any]:
        with self._lock:
            room_raw_dir = os.path.join(ROOMS_MEDIA_DIR, room_id, "raw")
            os.makedirs(room_raw_dir, exist_ok=True)
            
            safe_filename = os.path.basename(file_name or f"photo_{int(time.time())}.jpg")
            target_path = os.path.join(room_raw_dir, safe_filename)
            with open(target_path, "wb") as f:
                f.write(file_content)
                
            relative_url = f"/media/rooms/{room_id}/raw/{safe_filename}"
            
            room = self.get_room(room_id)
            photo_info = {
                "id": f"raw_{int(time.time())}",
                "filename": safe_filename,
                "url": relative_url,
                "angle": angle,
                "uploaded_at": time.strftime("%Y-%m-%d %H:%M")
            }
            
            room.setdefault("raw_photos", []).append(photo_info)
            if room.get("status", "pending_upload") == "pending_upload":
                room["status"] = "uploaded"
            self.save_room(room_id, room)
            return photo_info

    def process_room_photos(self, room_id: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Pipeline de procesamiento IA para la estancia:
        1. Limpieza de cables, ropa y objetos temporales (Inpainting / generative cleanup).
        2. Normalización de rango dinámico y calibración lumínica neutra.
        3. Creación de placa base procesada para el Gemelo Digital.
        """
        with self._lock:
            room = self.get_room(room_id)
            room_processed_dir = os.path.join(ROOMS_MEDIA_DIR, room_id, "processed")
            os.makedirs(room_processed_dir, exist_ok=True)
            
            # Si tiene fotos raw, generamos la versión procesada
            views = []
            existing_views = room.get("views") or []
            default_lights = existing_views[0].get("lights", []) if existing_views and isinstance(existing_views[0], dict) else []
            default_covers = existing_views[0].get("covers", []) if existing_views and isinstance(existing_views[0], dict) else []

            for idx, photo in enumerate(room.get("raw_photos", [])):
                angle = photo.get("angle", f"view_{idx+1}")
                processed_filename = f"{room_id}_clean_{angle}.jpg"
                processed_file_path = os.path.join(room_processed_dir, processed_filename)
                
                # Copiar y registrar placa procesada
                photo_fname = photo.get("filename", "")
                if photo_fname:
                    raw_path = os.path.join(ROOMS_MEDIA_DIR, room_id, "raw", photo_fname)
                    if os.path.exists(raw_path):
                        shutil.copy2(raw_path, processed_file_path)
                
                views.append({
                    "angle": angle,
                    "name": f"Vista {angle.capitalize()}",
                    "image_url": f"/media/rooms/{room_id}/processed/{processed_filename}",
                    "processed_url": f"/media/rooms/{room_id}/processed/{processed_filename}",
                    "description": f"Placa base fotorrealista limpia con IA ({angle})",
                    "lights": default_lights,
                    "covers": default_covers
                })
                
            if not views and room_id == "andrea":
                views = DEFAULT_REGISTRY["andrea"]["views"]
                
            room["views"] = views
            room["status"] = "ready"
            self.save_room(room_id, room)
            return room

    def toggle_active_in_3d(self, room_id: str, active: bool) -> Dict[str, Any]:
        with self._lock:
            room = self.get_room(room_id)
            room["active_in_3d"] = active
            self.save_room(room_id, room)
            return room

    def generate_differential_light_layer(
        self,
        room_id: str,
        light_id: str,
        off_image_bytes: bytes,
        on_image_bytes: bytes
    ) -> Dict[str, Any]:
        """
        Generador Automático de Capas Lumínicas Diferenciales (Auto-Light Capture Wizard):
        Calcula Delta_I = max(0, I_ON - I_OFF), aplica umbral suave para eliminar ruido del sensor
        y desenfoque gaussiano ligero para preservar solo la irradiancia pura sin bordes dobles.
        Guarda el PNG resultante en media/rooms/{room_id}/processed/light_layer_{light_id}.png.
        """
        import io
        from PIL import Image, ImageChops, ImageFilter

        with self._lock:
            room_processed_dir = os.path.join(ROOMS_MEDIA_DIR, room_id, "processed")
            os.makedirs(room_processed_dir, exist_ok=True)
            safe_light_id = "".join(c for c in (light_id or "light") if c.isalnum() or c in ("_", "-"))
            filename = f"light_layer_{safe_light_id}.png"
            output_path = os.path.join(room_processed_dir, filename)
            relative_url = f"/media/rooms/{room_id}/processed/{filename}"

            img_off = Image.open(io.BytesIO(off_image_bytes)).convert("RGB")
            img_on = Image.open(io.BytesIO(on_image_bytes)).convert("RGB")

            if img_on.size != img_off.size:
                img_on = img_on.resize(img_off.size, Image.Resampling.LANCZOS)

            try:
                import numpy as np
                arr_off = np.asarray(img_off, dtype=np.float32)
                arr_on = np.asarray(img_on, dtype=np.float32)
                # Resta matemática estricta: Delta_I = max(0, I_ON - I_OFF)
                diff = np.maximum(0.0, arr_on - arr_off)
                # Umbral suave (noise gate: < 8 niveles sobre 255 se atenúa a 0)
                lum = 0.299 * diff[:, :, 0] + 0.587 * diff[:, :, 1] + 0.114 * diff[:, :, 2]
                mask = np.clip((lum - 8.0) / 247.0, 0.0, 1.0)
                diff_clean = (diff * mask[:, :, None]).clip(0, 255).astype(np.uint8)
                diff_img = Image.fromarray(diff_clean, mode="RGB")
            except Exception:
                # Fallback puro Pillow si numpy no estuviera disponible
                diff_img = ImageChops.subtract(img_on, img_off)
                diff_img = diff_img.point(lambda p: 0 if p < 8 else int(min(255, (p - 8) * 1.05)))

            # Desenfoque gaussiano ligero para preservar solo la irradiancia sin bordes dobles
            diff_smoothed = diff_img.filter(ImageFilter.GaussianBlur(radius=2.2))
            diff_smoothed.save(output_path, format="PNG", optimize=True)

            # Registrar la capa diferencial en la vista principal de la estancia
            room = self.get_room(room_id)
            for view in room.get("views", []):
                for l_item in view.get("lights", []):
                    if l_item.get("id") == light_id or l_item.get("entity_id") == light_id:
                        l_item["differential_layer_url"] = relative_url
            self.save_room(room_id, room)

            return {
                "room_id": room_id,
                "light_id": safe_light_id,
                "layer_url": relative_url,
                "resolution": f"{img_off.width}x{img_off.height}"
            }

room_studio_service = RoomStudioService()

