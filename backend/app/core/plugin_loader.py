import importlib.util
import inspect
import logging
import os
import sys
from pathlib import Path
from typing import Callable, Dict, Any

logger = logging.getLogger("PluginLoader")

class PluginRecord:
    def __init__(self, name: str, description: str, handler: Callable):
        self.name = name
        self.description = description
        self.handler = handler

class PluginRegistry:
    def __init__(self):
        self.plugins: Dict[str, PluginRecord] = {}

    def discover_plugins(self, skills_dir: str):
        path = Path(skills_dir)
        if not path.exists() or not path.is_dir():
            logger.warning(f"El directorio de skills {skills_dir} no existe.")
            return

        for py_file in path.glob("*.py"):
            if py_file.name.startswith("_"):
                continue
            
            module_name = py_file.stem
            try:
                spec = importlib.util.spec_from_file_location(module_name, py_file)
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    sys.modules[module_name] = module
                    spec.loader.exec_module(module)
                    
                    if hasattr(module, "TOOL") and hasattr(module, "handler"):
                        tool_def = module.TOOL
                        name = tool_def.get("name")
                        description = tool_def.get("description", "")
                        handler = module.handler
                        
                        if name and callable(handler):
                            self.plugins[name] = PluginRecord(name, description, handler)
                            logger.info(f"Plugin cargado con éxito: {name}")
            except Exception as e:
                logger.error(f"Error cargando plugin {py_file.name}: {e}")

    def get_prompt_extensions(self) -> str:
        if not self.plugins:
            return ""
            
        ext = "\n[HABILIDADES ADICIONALES (PLUGINS)]:\n"
        ext += "Puedes usar las siguientes habilidades imprimiendo el tag correspondiente al final de tu respuesta.\n"
        for name, rec in self.plugins.items():
            ext += f"- Para {rec.description}, usa exactamente [{name.upper()}].\n"
        return ext

    def execute_plugin(self, name: str, **kwargs) -> str:
        if name in self.plugins:
            try:
                return self.plugins[name].handler(**kwargs)
            except Exception as e:
                logger.error(f"Error ejecutando plugin {name}: {e}")
                return f"Error interno en plugin {name}"
        return f"Plugin {name} no encontrado."

plugin_registry = PluginRegistry()
