#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HABANA 13 - Servicio de Widgets y Botones Dinámicos (Dynamic Widgets Service)
Permite que la IA y el usuario creen, modifiquen y ejecuten botones en caliente en la UI
sin necesidad de recompilar el frontend ni editar código JSX.
"""

import os
import json
import logging
import threading
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger("WidgetService")

CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "custom_widgets.json"

DEFAULT_WIDGETS = [
    {
        "id": "widget_apagar_todo",
        "title": "Apagar Casa",
        "icon": "🌙",
        "color": "#ef4444",
        "bg_gradient": "linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(185, 28, 28, 0.15))",
        "border_color": "rgba(239, 68, 68, 0.5)",
        "room": "general",
        "action_type": "all_off",
        "description": "Apaga todas las luces y tiras LED de la vivienda",
        "payload": {},
        "created_by": "system",
        "order": 1
    },
    {
        "id": "widget_modo_relax_salon",
        "title": "Relax Salón",
        "icon": "🕯️",
        "color": "#f59e0b",
        "bg_gradient": "linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(180, 83, 9, 0.15))",
        "border_color": "rgba(245, 158, 11, 0.5)",
        "room": "salon",
        "action_type": "multi_command",
        "description": "Tiras LED del salón al 40% en luz cálida y techo apagado",
        "payload": {
            "commands": [
                {"entity_id": "luz_luz_principal_del_salon_53c1", "action": "turn_off"},
                {"entity_id": "luz_luz_del_comedor_d9b2", "action": "turn_off"},
                {"entity_id": "led_sofa_salon", "action": "turn_on", "brightness_pct": 40, "color_temp_kelvin": 2700},
                {"entity_id": "led_tv_salon", "action": "turn_on", "brightness_pct": 35, "color_temp_kelvin": 2700},
                {"entity_id": "led_aparador_salon", "action": "turn_on", "brightness_pct": 30, "color_temp_kelvin": 2700}
            ]
        },
        "created_by": "system",
        "order": 2
    },
    {
        "id": "widget_modo_cine",
        "title": "Modo Cine",
        "icon": "🎬",
        "color": "#8b5cf6",
        "bg_gradient": "linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(109, 40, 217, 0.15))",
        "border_color": "rgba(139, 92, 246, 0.5)",
        "room": "salon",
        "action_type": "multi_command",
        "description": "Baja la persiana al 90% y deja luz ambiental tenue",
        "payload": {
            "commands": [
                {"entity_id": "cover.persiana_salon", "action": "set_position", "position": 90},
                {"entity_id": "luz_luz_principal_del_salon_53c1", "action": "turn_off"},
                {"entity_id": "luz_luz_del_comedor_d9b2", "action": "turn_off"},
                {"entity_id": "led_tv_salon", "action": "turn_on", "brightness_pct": 20, "rgb_color": [0, 80, 255]}
            ]
        },
        "created_by": "system",
        "order": 3
    }
]

class WidgetService:
    def __init__(self):
        self._lock = threading.RLock()
        self._widgets: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        with self._lock:
            if not CONFIG_PATH.exists():
                self._widgets = list(DEFAULT_WIDGETS)
                self._save()
                return

            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        self._widgets = data
                    else:
                        self._widgets = data.get("widgets", list(DEFAULT_WIDGETS))
            except Exception as e:
                logger.error(f"Error cargando custom_widgets.json: {e}")
                self._widgets = list(DEFAULT_WIDGETS)

    def _save(self):
        with self._lock:
            try:
                CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
                with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                    json.dump(self._widgets, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.error(f"Error guardando custom_widgets.json: {e}")

    def list_widgets(self, room: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            widgets = list(self._widgets)
            if room and room != "all" and room != "general":
                widgets = [w for w in widgets if w.get("room") in (room, "general", "all")]
            widgets.sort(key=lambda x: x.get("order", 999))
            return widgets

    def get_widget(self, widget_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            for w in self._widgets:
                if w.get("id") == widget_id:
                    return w
            return None

    def add_widget(self, data: Dict[str, Any], created_by: str = "user") -> Dict[str, Any]:
        with self._lock:
            new_id = data.get("id") or f"widget_{uuid.uuid4().hex[:8]}"
            # Evitar colisión de IDs
            existing = self.get_widget(new_id)
            if existing:
                return self.update_widget(new_id, data)

            color = data.get("color") or "#00f3ff"
            new_widget = {
                "id": new_id,
                "title": data.get("title", "Nuevo Botón"),
                "icon": data.get("icon", "⚡"),
                "color": color,
                "bg_gradient": data.get("bg_gradient") or f"linear-gradient(135deg, {color}44, {color}11)",
                "border_color": data.get("border_color") or f"{color}88",
                "room": data.get("room", "general"),
                "action_type": data.get("action_type", "multi_command"),
                "description": data.get("description", ""),
                "payload": data.get("payload", {}),
                "created_by": created_by,
                "order": len(self._widgets) + 1
            }
            self._widgets.append(new_widget)
            self._save()
            logger.info(f"Widget creado: '{new_widget['title']}' ({new_id}) por {created_by}")
            return new_widget

    def update_widget(self, widget_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._lock:
            for idx, w in enumerate(self._widgets):
                if w.get("id") == widget_id:
                    w.update({k: v for k, v in data.items() if k != "id"})
                    self._widgets[idx] = w
                    self._save()
                    return w
            return None

    def delete_widget(self, widget_id: str) -> bool:
        with self._lock:
            before_len = len(self._widgets)
            self._widgets = [w for w in self._widgets if w.get("id") != widget_id]
            if len(self._widgets) < before_len:
                self._save()
                logger.info(f"Widget eliminado: {widget_id}")
                return True
            return False

    def execute_widget(self, widget_id: str) -> Dict[str, Any]:
        widget = self.get_widget(widget_id)
        if not widget:
            return {"status": "error", "message": f"Widget {widget_id} no encontrado"}

        action_type = widget.get("action_type")
        payload = widget.get("payload", {})
        results = []

        try:
            from app.services.z2m_lighting_engine import z2m_engine

            if action_type == "all_off":
                z2m_engine.turn_off_all()
                return {"status": "success", "message": "Todas las luces apagadas", "action": "all_off"}

            elif action_type in ("scene", "multi_scene"):
                from app.services.automation_service import automation_service
                scene_ids = payload.get("scene_ids") or []
                if not scene_ids and payload.get("scene_id"):
                    scene_ids = [payload.get("scene_id")]
                executed_scenes = []
                for sid in scene_ids:
                    if sid:
                        res_auto = automation_service.execute_automation(sid, context={"force": True})
                        executed_scenes.append({"scene_id": sid, "result": res_auto})
                return {
                    "status": "success",
                    "message": f"Ejecutadas {len(executed_scenes)} escenas/reglas",
                    "executed_scenes": executed_scenes
                }

            elif action_type == "device_toggle":
                entity_id = payload.get("entity_id")
                action = payload.get("action", "toggle")
                res = z2m_engine.control_habana_entity(
                    entity_id=entity_id,
                    action=action,
                    brightness_pct=payload.get("brightness_pct"),
                    color_temp_kelvin=payload.get("color_temp_kelvin"),
                    rgb_color=payload.get("rgb_color")
                )
                return {"status": "success", "entity_id": entity_id, "result": res}

            elif action_type == "multi_command":
                commands = payload.get("commands", [])
                if not commands:
                    raw_cmd = payload.get("raw_command") or widget.get("description")
                    if raw_cmd:
                        from app.services.agent import agent
                        ans, _ = agent.process_message(raw_cmd, source="widget")
                        return {"status": "success", "executed_count": 1, "raw_command": raw_cmd, "reply": ans}
                for cmd in commands:
                    eid = cmd.get("entity_id")
                    act = cmd.get("action", "turn_on")
                    pos = cmd.get("position")
                    pct = cmd.get("brightness_pct")
                    kelvin = cmd.get("color_temp_kelvin")
                    rgb = cmd.get("rgb_color")
                    
                    # Manejo de persianas
                    if "cover." in eid or "persiana" in eid.lower():
                        if pos is not None:
                            r = z2m_engine.control_habana_entity(eid, "set_position", position=pos)
                        elif act in ("open", "subir"):
                            r = z2m_engine.control_habana_entity(eid, "open")
                        elif act in ("close", "bajar"):
                            r = z2m_engine.control_habana_entity(eid, "close")
                        else:
                            r = z2m_engine.control_habana_entity(eid, act)
                    else:
                        r = z2m_engine.control_habana_entity(eid, act, brightness_pct=pct, color_temp_kelvin=kelvin, rgb_color=rgb)
                    results.append({"entity_id": eid, "result": r})

                return {"status": "success", "executed_count": len(results), "results": results}

            return {"status": "unknown_action_type", "action_type": action_type}

        except Exception as e:
            logger.error(f"Error ejecutando widget {widget_id}: {e}")
            return {"status": "error", "message": str(e)}

widget_service = WidgetService()
