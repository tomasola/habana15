import math
import time
from datetime import datetime
from typing import Dict, Any, Optional

class CircadianLightingEngine:
    """Motor de Iluminación Circadiana Solar Dinámica para Habana 14.2 Fusión.
    
    Ajusta dinámicamente el tono de blanco (Kelvin) y la intensidad recomendada
    según la elevación solar para respetar los ciclos biológicos de sueño y vigilia.
    """
    def __init__(self, latitude: float = 40.4168, longitude: float = -3.7038):
        self.latitude = latitude
        self.longitude = longitude
        
        # Umbrales Kelvin
        self.MIN_KELVIN = 2200  # Noche profunda / luz de vela relajante
        self.WARM_KELVIN = 2700 # Atardecer / amanecer suave
        self.MID_KELVIN = 4000  # Mañana / media tarde
        self.MAX_KELVIN = 5500  # Mediodía de alta concentración (luz blanca nítida)

    def calculate_sun_elevation(self, dt: Optional[datetime] = None) -> float:
        """Aproximación solar matemática basada en día del año y hora solar."""
        if dt is None:
            dt = datetime.now()

        day_of_year = dt.timetuple().tm_yday
        hour = dt.hour + dt.minute / 60.0 + dt.second / 3600.0

        # Declinación solar aproximada (grados)
        declination = 23.45 * math.sin(math.radians((360 / 365) * (day_of_year - 81)))

        # Ángulo horario (0 a mediodía solar ~ 13:30 en España peninsular)
        solar_noon = 13.5
        hour_angle = (hour - solar_noon) * 15.0

        # Cálculo de elevación solar con trigonometría esférica
        lat_rad = math.radians(self.latitude)
        dec_rad = math.radians(declination)
        ha_rad = math.radians(hour_angle)

        sin_elevation = math.sin(lat_rad) * math.sin(dec_rad) + math.cos(lat_rad) * math.cos(dec_rad) * math.cos(ha_rad)
        elevation = math.degrees(math.asin(max(-1.0, min(1.0, sin_elevation))))
        return elevation

    def get_circadian_profile(self, custom_time: Optional[datetime] = None) -> Dict[str, Any]:
        """Devuelve los parámetros Kelvin y Brillo recomendados en tiempo real."""
        elevation = self.calculate_sun_elevation(custom_time)
        
        # Mapeo no lineal según la posición del sol
        if elevation < -6.0:
            # Noche cerrada astronómica
            kelvin = self.MIN_KELVIN
            brightness_pct = 20
            phase = "Noche Profunda (Melatonina Activa)"
        elif elevation < 0.0:
            # Crepúsculo civil
            ratio = (elevation + 6.0) / 6.0
            kelvin = int(self.MIN_KELVIN + ratio * (self.WARM_KELVIN - self.MIN_KELVIN))
            brightness_pct = int(20 + ratio * 30)
            phase = "Crepúsculo / Transición Cálida"
        elif elevation < 25.0:
            # Mañana temprano o atardecer
            ratio = elevation / 25.0
            kelvin = int(self.WARM_KELVIN + ratio * (self.MID_KELVIN - self.WARM_KELVIN))
            brightness_pct = int(50 + ratio * 35)
            phase = "Luz Diurna Suave"
        else:
            # Pleno día / Mediodía de alta productividad
            ratio = min(1.0, (elevation - 25.0) / 35.0)
            kelvin = int(self.MID_KELVIN + ratio * (self.MAX_KELVIN - self.MID_KELVIN))
            brightness_pct = int(85 + ratio * 15)
            phase = "Pico Circadiano (Concentración Máxima)"

        # Conversión a Mireds (estándar Zigbee: 1000000 / kelvin)
        color_temp_mireds = int(1000000 / kelvin)

        return {
            "sun_elevation_degrees": round(elevation, 1),
            "kelvin": kelvin,
            "color_temp_mireds": color_temp_mireds,
            "recommended_brightness_pct": brightness_pct,
            "circadian_phase": phase,
            "transition_time_seconds": 0.4
        }

circadian_engine = CircadianLightingEngine()
