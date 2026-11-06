"""
energy_ai_optimizer.py - Habana 14.8 Energy AI Optimizer Engine
Gestión inteligente de potencia contratada, excedentes fotovoltaicos y peak-shaving.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import logging

logger = logging.getLogger("Habana.EnergyOptimizer")

class EnergyAIOptimizer:
    def __init__(self, contracted_power_w: float = 4600.0, solar_installed_w: float = 3200.0):
        self.contracted_power_w = contracted_power_w
        self.solar_installed_w = solar_installed_w
        
        # Prioridades de cargas (P0 = Vital, P1 = Confort alto, P2 = Postergable, P3 = Excedente puro)
        self.managed_loads: Dict[str, Dict[str, Any]] = {
            "frigorifico": {"priority": 0, "nominal_w": 180, "state": "on", "deferrable": False},
            "iluminacion_general": {"priority": 0, "nominal_w": 250, "state": "on", "deferrable": False},
            "climatizacion_salon": {"priority": 1, "nominal_w": 1200, "state": "auto", "deferrable": True},
            "climatizacion_dormitorios": {"priority": 1, "nominal_w": 900, "state": "auto", "deferrable": True},
            "termo_electrico": {"priority": 2, "nominal_w": 1500, "state": "off", "deferrable": True},
            "lavadora": {"priority": 2, "nominal_w": 2000, "state": "idle", "deferrable": True},
            "cargador_ve": {"priority": 3, "nominal_w": 2300, "state": "off", "deferrable": True}
        }
        
        # Telemetría actual
        self.current_grid_w = 0.0
        self.current_solar_w = 0.0
        self.current_battery_soc = 85.0 # %
        self.shedded_loads: List[str] = []
        self.shaved_peak_events: int = 0
        self.solar_surplus_diverted_kwh: float = 0.0

    def get_tariff_period(self, hour: Optional[int] = None) -> str:
        """Devuelve el periodo tarifario español (PVPC / 2.0TD): Valle, Llano, Punta."""
        if hour is None:
            hour = datetime.now().hour
        
        # Lunes a Viernes
        if hour in range(0, 8):
            return "VALLE" # 00:00 a 08:00
        elif hour in [8, 9, 14, 15, 16, 17, 22, 23]:
            return "LLANO"
        else:
            return "PUNTA" # 10-14 y 18-22

    def analyze_grid_balance(self, total_consumption_w: float, solar_generation_w: float) -> Dict[str, Any]:
        """
        Calcula balance neto instantáneo y ejecuta peak-shaving o redirección de excedente.
        """
        self.current_solar_w = solar_generation_w
        net_grid_w = total_consumption_w - solar_generation_w
        self.current_grid_w = max(0.0, net_grid_w)
        surplus_w = max(0.0, solar_generation_w - total_consumption_w)
        
        actions_taken = []
        
        # 1. Protección de Salto de ICP (Peak-Shaving Preventivo a 92% de potencia contratada)
        icp_threshold = self.contracted_power_w * 0.92
        if self.current_grid_w > icp_threshold:
            logger.warning(f"Alerta sobrepotencia: {self.current_grid_w:.0f}W > {icp_threshold:.0f}W. Iniciando deslastre.")
            self.shaved_peak_events += 1
            # Deslastrar de menor a mayor prioridad
            for load_id, load in sorted(self.managed_loads.items(), key=lambda x: -x[1]["priority"]):
                if load["deferrable"] and load["state"] in ["on", "auto"]:
                    load["state"] = "shedded"
                    self.shedded_loads.append(load_id)
                    actions_taken.append(f"Deslastre preventivo: {load_id} ({load['nominal_w']}W apagado)")
                    # Recalcular tras apagar
                    if (self.current_grid_w - load["nominal_w"]) <= icp_threshold:
                        break

        # 2. Inyección de Excedentes Solares (Solar Surplus Diverter)
        elif surplus_w > 800.0:
            if self.managed_loads["termo_electrico"]["state"] == "off":
                self.managed_loads["termo_electrico"]["state"] = "on"
                actions_taken.append(f"Aprovechamiento solar: Termo eléctrico encendido con {surplus_w:.0f}W de excedente")
            elif surplus_w > 1800.0 and self.managed_loads["cargador_ve"]["state"] == "off":
                self.managed_loads["cargador_ve"]["state"] = "on"
                actions_taken.append(f"Aprovechamiento solar: Carga VE activada a {min(surplus_w, 2300):.0f}W")

        # 3. Restauración si la red se normaliza
        elif self.current_grid_w < (self.contracted_power_w * 0.70) and self.shedded_loads:
            restored = self.shedded_loads.pop(0)
            self.managed_loads[restored]["state"] = "auto"
            actions_taken.append(f"Restauración automática: {restored} recupera estado normal")

        return {
            "status": "balanced",
            "grid_consumption_w": round(self.current_grid_w, 1),
            "solar_generation_w": round(self.current_solar_w, 1),
            "surplus_w": round(surplus_w, 1),
            "contracted_power_w": self.contracted_power_w,
            "tariff_period": self.get_tariff_period(),
            "active_shedded_loads": list(set(self.shedded_loads)),
            "actions": actions_taken
        }

    def get_optimizer_stats(self) -> Dict[str, Any]:
        return {
            "version": "14.8-ENERGY",
            "peak_shaving_events": self.shaved_peak_events,
            "managed_loads": self.managed_loads,
            "tariff": self.get_tariff_period()
        }

energy_optimizer = EnergyAIOptimizer()
