import subprocess
import threading
import logging
import time
import json
import os

logger = logging.getLogger("RadioService")

ICECAST_RADIO_URL = "icecast://source:habana2024@localhost:8001/radio"
RADIO_PUBLIC_URL = "http://192.168.1.139:8001/radio"

STATIONS = {
    "cadena_ser": {
        "name": "Cadena SER",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENASER.mp3",
        "icon": "📻"
    },
    "ser_madrid": {
        "name": "SER Madrid",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/SER_MADRID.mp3",
        "icon": "🏙️"
    },
    "los40": {
        "name": "Los 40",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3",
        "icon": "🎵"
    },
    "los40_classic": {
        "name": "Los 40 Classic",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_CLASSIC.mp3",
        "icon": "🎧"
    },
    "los40_dance": {
        "name": "Los 40 Dance",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_DANCE.mp3",
        "icon": "🩩"
    },
    "los40_urban": {
        "name": "Los 40 Urban",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_URBAN.mp3",
        "icon": "🎤"
    },
    "m80": {
        "name": "M80 Radio",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/M80RADIO_SC",
        "icon": "🎶"
    },
    "cadena_dial": {
        "name": "Cadena Dial",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENADIAL.mp3",
        "icon": "🎹"
    },
    "kebuena": {
        "name": "Ke Buena",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/KEBUENA.mp3",
        "icon": "🌶️"
    },
    "radiole": {
        "name": "Radiolé",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIOLE.mp3",
        "icon": "💃"
    },
    "virgin_radio": {
        "name": "Virgin Radio",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO.mp3",
        "icon": "🎸"
    },
    "rac1": {
        "name": "RAC 1",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/RAC_1.mp3",
        "icon": "📡"
    },
    "rac105": {
        "name": "RAC 105",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/RAC105.mp3",
        "icon": "🎙️"
    },
    "radio3": {
        "name": "Radio 3",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO3.mp3",
        "icon": "🎼"
    },
    "radio4": {
        "name": "R\u00e0dio 4",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO4.mp3",
        "icon": "📢"
    },
    "rfm": {
        "name": "RFM",
        "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/RFM.mp3",
        "icon": "🇵🇹"
    }
}

class RadioService:
    def __init__(self):
        self._lock = threading.Lock()
        self._process = None
        self._current_station = None
        self._usage_file = os.path.join(os.path.dirname(__file__), "radio_usage.json")
        self._usage = self._load_usage()

    def _load_usage(self):
        try:
            if os.path.exists(self._usage_file):
                with open(self._usage_file, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error cargando historial de radio: {e}")
        return {}

    def _save_usage(self):
        try:
            with open(self._usage_file, "w") as f:
                json.dump(self._usage, f)
        except Exception as e:
            logger.error(f"Error guardando historial de radio: {e}")

    def get_stations(self):
        stations_list = []
        for k, v in STATIONS.items():
            count = self._usage.get(k, 0)
            stations_list.append({
                "id": k,
                "name": v["name"],
                "icon": v["icon"],
                "usage_count": count
            })
        stations_list.sort(key=lambda x: x["usage_count"], reverse=True)
        return stations_list

    def play(self, station_id: str) -> dict:
        """Envía la emisora directamente a los altavoces sin usar Icecast."""
        if station_id not in STATIONS:
            return {"error": f"Emisora desconocida: {station_id}"}

        # Update usage statistics
        self._usage[station_id] = self._usage.get(station_id, 0) + 1
        self._save_usage()

        station = STATIONS[station_id]
        with self._lock:
            self._current_station = station_id
            logger.info(f"Iniciando radio (Direct Play): {station['name']} -> {station['url']}")

        return {
            "status": "playing",
            "station": station["name"],
            "stream_url": station["url"]
        }

    def stop(self) -> dict:
        """Para la emisora actual."""
        with self._lock:
            self._current_station = None
            logger.info("Radio detenida.")
        return {"status": "stopped"}

    def status(self) -> dict:
        running = self._current_station is not None
        return {
            "playing": running,
            "station_id": self._current_station if running else None,
            "station_name": STATIONS[self._current_station]["name"] if running and self._current_station else None,
            "stream_url": STATIONS[self._current_station]["url"] if running and self._current_station else None
        }

radio_service = RadioService()
