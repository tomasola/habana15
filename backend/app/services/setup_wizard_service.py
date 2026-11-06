#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HABANA 13 - Asistente Guiado de Dispositivos "Toca y Listo" (Setup Wizard Service)
Elimina el 100% de la jerga técnica. El usuario va a la pared, pulsa el interruptor,
HABANA lo detecta y lo vincula al instante.
"""

import os
import json
import logging
import threading
import time
import uuid
from typing import List, Dict, Any, Optional

logger = logging.getLogger("SetupWizardService")

class SetupWizardService:
    def __init__(self):
        self._lock = threading.RLock()
        self._listening = False
        self._listen_room: Optional[str] = None
        self._last_event: Optional[Dict[str, Any]] = None
        self._event_history: List[Dict[str, Any]] = []

    def start_listen(self, room: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            self._listening = True
            self._listen_room = room
            self._last_event = None
            logger.info(f"Modo escucha Setup Wizard activado para habitación: {room or 'todas'}")
            return {
                "status": "listening",
                "room": room,
                "message": "Ve a la pared y pulsa el interruptor físico que deseas vincular."
            }

    def stop_listen(self) -> Dict[str, Any]:
        with self._lock:
            self._listening = False
            self._listen_room = None
            logger.info("Modo escucha Setup Wizard detenido.")
            return {"status": "stopped"}

    def is_listening(self) -> bool:
        with self._lock:
            return self._listening

    def on_hardware_press(self, device_name: str, channel: str, new_state: str, raw_payload: Optional[dict] = None):
        """Llamado automáticamente por Z2MEngine cuando alguien pulsa un interruptor en la pared."""
        with self._lock:
            from app.services.z2m_lighting_engine import z2m_engine

            full_state = z2m_engine.get_full_state()
            raw_plates = full_state.get("plates", {})
            if isinstance(raw_plates, list):
                plates = {p.get("id") or p.get("friendly_name"): p for p in raw_plates if isinstance(p, dict)}
            elif isinstance(raw_plates, dict):
                plates = raw_plates
            else:
                plates = {}

            raw_real_lights = full_state.get("real_lights", {})
            if isinstance(raw_real_lights, list):
                real_lights = {l.get("id") or l.get("habana_entity_id"): l for l in raw_real_lights if isinstance(l, dict)}
            elif isinstance(raw_real_lights, dict):
                real_lights = raw_real_lights
            else:
                real_lights = {}

            # Buscar si el dispositivo es una placa conocida
            plate_info = plates.get(device_name, {})
            plate_display_name = plate_info.get("name") or device_name
            channel_labels = plate_info.get("channel_labels", {})
            if not channel_labels and isinstance(plate_info.get("channels"), list):
                channel_labels = {c.get("channel"): c.get("label") for c in plate_info["channels"] if isinstance(c, dict)}
            channel_label = channel_labels.get(channel) or channel

            # Buscar si ya está asignado a alguna luz real
            assigned_as = None
            assigned_light_name = None
            assigned_light_id = None

            lights_iter = real_lights.values() if isinstance(real_lights, dict) else (real_lights if isinstance(real_lights, list) else [])
            for linfo in lights_iter:
                if not isinstance(linfo, dict):
                    continue
                lid = linfo.get("id") or linfo.get("habana_entity_id")
                p_dev = linfo.get("power_source", {}).get("device") if isinstance(linfo.get("power_source"), dict) else linfo.get("power_device")
                p_chan = linfo.get("power_source", {}).get("channel") if isinstance(linfo.get("power_source"), dict) else linfo.get("power_channel")
                
                if p_dev == device_name and p_chan == channel:
                    assigned_as = "real_power_source"
                    assigned_light_name = linfo.get("name")
                    assigned_light_id = lid
                    break
                for comm in linfo.get("commutation_switches", []):
                    if isinstance(comm, dict) and comm.get("device") == device_name and comm.get("channel") == channel:
                        assigned_as = "commutation"
                        assigned_light_name = linfo.get("name")
                        assigned_light_id = lid
                        break

            event = {
                "id": str(uuid.uuid4()),
                "timestamp": time.time(),
                "time_str": time.strftime("%H:%M:%S"),
                "device_name": device_name,
                "device_display_name": plate_display_name,
                "channel": channel,
                "channel_label": channel_label,
                "state": new_state,
                "assigned_as": assigned_as,
                "assigned_light_name": assigned_light_name,
                "assigned_light_id": assigned_light_id,
                "is_free": assigned_as is None
            }

            self._last_event = event
            self._event_history.insert(0, event)
            if len(self._event_history) > 20:
                self._event_history.pop()

            logger.info(f"Setup Wizard Event: [{plate_display_name} · {channel_label}] -> {new_state} (Asignado: {assigned_light_name or 'LIBRE'})")

    def poll_events(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "listening": self._listening,
                "room": self._listen_room,
                "latest_event": self._last_event,
                "history": self._event_history[:5]
            }

    def clear_latest_event(self):
        with self._lock:
            self._last_event = None

    def assign_real_light(self, room: str, light_name: str, kind: str, device_name: str, channel: str, watts: int = 18) -> Dict[str, Any]:
        """Crea o actualiza la luz declarando este interruptor como el cable de potencia física."""
        from app.services.z2m_lighting_engine import z2m_engine

        # Generar un ID limpio basado en el nombre
        clean_name = light_name.lower().strip()
        for ch in (" ", "-", "/", ".", ",", "á", "é", "í", "ó", "ú", "ñ"):
            mapping = {"á":"a", "é":"e", "í":"i", "ó":"o", "ú":"u", "ñ":"n", " ":"_", "-":"_", "/":"_", ".":"_", ",":"_"}
            clean_name = clean_name.replace(ch, mapping.get(ch, "_"))
        clean_name = "".join(c for c in clean_name if c.isalnum() or c == "_").strip("_")
        
        light_id = f"luz_{clean_name}_{uuid.uuid4().hex[:4]}" if not clean_name.startswith("luz_") else f"{clean_name}_{uuid.uuid4().hex[:4]}"

        # Crear luz en z2m_engine
        result = z2m_engine.create_or_update_real_light(
            light_id=light_id,
            name=light_name,
            room=room,
            kind=kind,
            power_device=device_name,
            power_channel=channel
        )

        with self._lock:
            self._last_event = None

        logger.info(f"Luz real creada vía Setup Wizard: '{light_name}' ({light_id}) en {room} vinculada a {device_name}/{channel}")
        return {
            "status": "success",
            "light_id": light_id,
            "name": light_name,
            "room": room,
            "kind": kind,
            "power_device": device_name,
            "power_channel": channel,
            "result": result
        }

    def add_commutation_to_light(self, light_id: str, device_name: str, channel: str) -> Dict[str, Any]:
        """Añade un interruptor como conmutada de la luz especificada."""
        from app.services.z2m_lighting_engine import z2m_engine

        result = z2m_engine.add_commutation_switch(
            light_id=light_id,
            device=device_name,
            channel=channel
        )

        with self._lock:
            self._last_event = None

        logger.info(f"Conmutada añadida vía Setup Wizard: {device_name}/{channel} -> Luz {light_id}")
        return {
            "status": "success",
            "light_id": light_id,
            "device": device_name,
            "channel": channel,
            "result": result
        }

    def get_room_summary(self, room: str) -> Dict[str, Any]:
        """Devuelve un resumen limpio y humano de una habitación (luces, conmutadas y placas)."""
        from app.services.z2m_lighting_engine import z2m_engine

        state = z2m_engine.get_full_state()
        raw_real_lights = state.get("real_lights", [])
        raw_plates = state.get("plates", {})
        if isinstance(raw_plates, list):
            plates = {p.get("id") or p.get("friendly_name"): p for p in raw_plates if isinstance(p, dict)}
        elif isinstance(raw_plates, dict):
            plates = raw_plates
        else:
            plates = {}
        z2m_live = getattr(z2m_engine, "_live_states", {})

        # Normalizar a lista de diccionarios
        lights_list = []
        if isinstance(raw_real_lights, dict):
            for k, v in raw_real_lights.items():
                if isinstance(v, dict):
                    v["id"] = k
                    lights_list.append(v)
        elif isinstance(raw_real_lights, list):
            lights_list = raw_real_lights

        room_lights = []
        for linfo in lights_list:
            if not isinstance(linfo, dict):
                continue
            if linfo.get("room") != room:
                continue

            lid = linfo.get("id") or linfo.get("habana_entity_id") or ""
            
            # Obtener datos de fuente de potencia
            p_source = linfo.get("power_source", {})
            if isinstance(p_source, dict):
                p_dev = p_source.get("device") or linfo.get("power_device")
                p_chan = p_source.get("channel") or linfo.get("power_channel")
                p_plate_name = p_source.get("device_name") or plates.get(p_dev, {}).get("name", p_dev)
                p_chan_label = p_source.get("channel_label") or plates.get(p_dev, {}).get("channel_labels", {}).get(p_chan, p_chan)
            else:
                p_dev = linfo.get("power_device")
                p_chan = linfo.get("power_channel")
                p_plate_name = plates.get(p_dev, {}).get("name", p_dev)
                p_chan_label = plates.get(p_dev, {}).get("channel_labels", {}).get(p_chan, p_chan)

            # Obtener conmutadas
            comm_list = []
            for comm in linfo.get("commutation_switches", []):
                if not isinstance(comm, dict):
                    continue
                c_dev = comm.get("device")
                c_chan = comm.get("channel")
                c_plate_name = comm.get("plate_name") or plates.get(c_dev, {}).get("name", c_dev)
                c_chan_label = comm.get("channel_label") or plates.get(c_dev, {}).get("channel_labels", {}).get(c_chan, c_chan)
                c_state = comm.get("state") or z2m_live.get(c_dev, {}).get(c_chan, "OFF")
                comm_list.append({
                    "device": c_dev,
                    "channel": c_chan,
                    "plate_name": c_plate_name,
                    "channel_label": c_chan_label,
                    "state": c_state
                })

            st_val = linfo.get("state")
            is_on = (st_val == "ON") if st_val is not None else linfo.get("is_on", False)

            room_lights.append({
                "id": lid,
                "name": linfo.get("name", lid),
                "kind": linfo.get("kind", "ceiling"),
                "is_on": is_on,
                "power_switch": {
                    "device": p_dev,
                    "channel": p_chan,
                    "plate_name": p_plate_name,
                    "channel_label": p_chan_label,
                    "state": z2m_live.get(p_dev, {}).get(p_chan, "OFF")
                },
                "commutations": comm_list
            })

        return {
            "room": room,
            "lights_count": len(room_lights),
            "lights": room_lights
        }

setup_wizard_service = SetupWizardService()
