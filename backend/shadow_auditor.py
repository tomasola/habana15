"""
shadow_auditor.py - Agente Centinela de Auditoría en Modo Sombra (Dry-Run) para HABANA 15.

Inspecciona y evalúa el 100% del sistema SIN encender ni apagar luces físicas:
1. Coherencia entre los 4 inventarios de dispositivos (Z2M Core, Direct Devices, AI Mapping, Gemelo 3D).
2. Integridad de canales y relés en placas físicas Zigbee.
3. Validación de disparadores (sensores/cámaras) y acciones de todas las Automatizaciones y Escenas.
4. Escaneo AST/Regex de las 55 pantallas React (.jsx), sus 598 botones (<button>) y 642 eventos onClick
   cruzados contra el catálogo completo de rutas FastAPI del Backend.
"""
import os
import re
import json
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_SRC = BASE_DIR / "frontend" / "src"
CONFIG_DIR = BACKEND_DIR / "config"
LOGS_DIR = BASE_DIR / "logs"

def load_json(path: Path):
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def audit_inventories():
    z2m_core = load_json(CONFIG_DIR / "z2m_lighting_core.json")
    direct_devs = load_json(CONFIG_DIR / "direct_devices.json").get("devices", {})
    dev_mapping = load_json(CONFIG_DIR / "device_mapping.json")
    twin_layout = load_json(CONFIG_DIR / "digital_twin_layout.json")

    real_lights = z2m_core.get("real_lights", {})
    plates = z2m_core.get("plates", {})
    led_controllers = z2m_core.get("led_controllers", {})

    twin_entities = set()
    rooms_list = twin_layout if isinstance(twin_layout, list) else twin_layout.get("rooms", [])
    for room in rooms_list:
        for k in ("lights", "ledStrips", "covers"):
            for item in room.get(k, []):
                twin_entities.add(item)

    missing_in_direct = []
    missing_in_mapping = []
    missing_in_twin = []

    for rl_id, rl_data in real_lights.items():
        if rl_id not in direct_devs:
            missing_in_direct.append({"id": rl_id, "name": rl_data.get("name"), "room": rl_data.get("room")})
        if rl_id not in dev_mapping:
            missing_in_mapping.append({"id": rl_id, "name": rl_data.get("name"), "room": rl_data.get("room")})
        if rl_id not in twin_entities:
            missing_in_twin.append({"id": rl_id, "name": rl_data.get("name"), "room": rl_data.get("room")})

    orphan_direct = []
    known_aliases = {"luz_techo_cocina", "luz_recibidor_entrada"}
    for d_id, d_data in direct_devs.items():
        if d_data.get("domain") == "light":
            if d_id not in real_lights and d_id not in led_controllers and d_id not in known_aliases:
                orphan_direct.append({"id": d_id, "name": d_data.get("name"), "room": d_data.get("room")})

    plate_issues = []
    for p_id, p_data in plates.items():
        for ch_id, ch_data in p_data.get("channels", {}).items():
            role = ch_data.get("role")
            has_wire = ch_data.get("has_physical_wire")
            assigned_light = ch_data.get("assigned_light_id")
            if role == "wired_load" and not has_wire:
                plate_issues.append({
                    "plate": p_id,
                    "channel": ch_id,
                    "issue": "role='wired_load' pero has_physical_wire=False"
                })
            if assigned_light and assigned_light not in real_lights:
                plate_issues.append({
                    "plate": p_id,
                    "channel": ch_id,
                    "issue": f"assigned_light_id '{assigned_light}' no existe en real_lights"
                })

    return {
        "counts": {
            "z2m_real_lights": len(real_lights),
            "z2m_plates": len(plates),
            "z2m_led_controllers": len(led_controllers),
            "direct_devices": len(direct_devs),
            "device_mapping": len(dev_mapping),
            "twin_entities": len(twin_entities)
        },
        "missing_in_direct": missing_in_direct,
        "missing_in_mapping": missing_in_mapping,
        "missing_in_twin": missing_in_twin,
        "orphan_direct_lights": orphan_direct,
        "plate_channel_issues": plate_issues
    }

def audit_automations():
    z2m_core = load_json(CONFIG_DIR / "z2m_lighting_core.json")
    direct_devs = load_json(CONFIG_DIR / "direct_devices.json").get("devices", {})
    sensors_cfg = load_json(CONFIG_DIR / "sensors.json")
    cameras_cfg = load_json(CONFIG_DIR / "cameras.json")
    automations = load_json(CONFIG_DIR / "automations.json")

    real_lights = z2m_core.get("real_lights", {})
    led_controllers = z2m_core.get("led_controllers", {})

    sensor_ids = set(sensors_cfg.keys()) if isinstance(sensors_cfg, dict) else set()
    camera_ids = set(cameras_cfg.keys()) if isinstance(cameras_cfg, dict) else set()
    if isinstance(cameras_cfg, list):
        for c in cameras_cfg:
            if isinstance(c, dict) and "id" in c:
                camera_ids.add(c["id"])

    valid_covers = {
        "cover.persiana_salon",
        "cover.persiana_salon_puerta",
        "cover.persiana_principal",
        "cover.persiana_andrea"
    }

    results = []
    for auto in automations:
        auto_id = auto.get("id")
        name = auto.get("name")
        enabled = auto.get("enabled", False)
        trig = auto.get("trigger", {}) or {}
        trig_type = trig.get("type")
        issues = []

        if trig_type == "sensor":
            s_eid = trig.get("entity_id")
            if s_eid and s_eid not in sensor_ids:
                issues.append(f"Trigger sensor '{s_eid}' no existe en sensors.json")
        elif trig_type == "camera":
            c_id = trig.get("camera_id")
            if c_id and c_id not in camera_ids:
                issues.append(f"Trigger camera '{c_id}' no existe en cameras.json")

        for act in auto.get("actions", []):
            act_type = act.get("type")
            eid = act.get("entity_id")
            if act_type == "device" or eid:
                if not act_type:
                    issues.append(f"Acción sobre '{eid}' no define campo 'type'")
                if eid and eid not in real_lights and eid not in direct_devs and eid not in led_controllers and eid not in valid_covers and eid not in ("all", "all_lights", "all_off", "luz_techo_cocina"):
                    issues.append(f"Acción apunta a entidad '{eid}' inexistente")

        results.append({
            "id": auto_id,
            "name": name,
            "enabled": enabled,
            "trigger_type": trig_type,
            "actions_count": len(auto.get("actions", [])),
            "status": "WARNING" if issues else "OK",
            "issues": issues
        })
    return results

def extract_backend_routes():
    api_dir = BACKEND_DIR / "app" / "api"
    bunker_dir = BACKEND_DIR / "app" / "bunker"
    routes = set()
    route_details = []
    router_files = list(api_dir.glob("*.py")) + list(bunker_dir.glob("*.py"))
    for py_file in router_files:
        content = py_file.read_text(encoding="utf-8", errors="ignore")
        prefix_match = re.search(r'APIRouter\s*\([^)]*prefix\s*=\s*["\']([^"\']+)["\']', content)
        prefix = prefix_match.group(1) if prefix_match else "/api"
        if py_file.name == "router.py" and py_file.parent.name == "api":
            prefix = "/api"
        elif py_file.name == "robot.py":
            prefix = "/api/robot"
        elif py_file.name == "security.py":
            # En main.py: app.include_router(security_router.router, prefix="/api") + prefix="/security"
            prefix = "/api/security"

        for m in re.finditer(r'@router\.(get|post|put|delete|patch|websocket)\s*\(\s*["\']([^"\']+)["\']', content):
            method = m.group(1).upper()
            subpath = m.group(2)
            full_path = prefix.rstrip("/") + "/" + subpath.lstrip("/")
            routes.add((method, full_path))
            route_details.append({"file": f"{py_file.parent.name}/{py_file.name}", "method": method, "path": full_path})

    main_py = (BACKEND_DIR / "main.py").read_text(encoding="utf-8", errors="ignore")
    for m in re.finditer(r'@app\.(get|post|put|delete|patch|websocket)\s*\(\s*["\']([^"\']+)["\']', main_py):
        routes.add((m.group(1).upper(), m.group(2)))
        route_details.append({"file": "main.py", "method": m.group(1).upper(), "path": m.group(2)})

    return routes, route_details

def path_matches(called_path, backend_routes):
    clean_call = called_path.split("?")[0].rstrip("/")
    if not clean_call:
        clean_call = "/"
    for method, r_path in backend_routes:
        clean_r = r_path.rstrip("/")
        pattern = re.sub(r'\{[^}]+\}', r'[^/]+', clean_r)
        pattern_call = re.sub(r'\$\{[^}]+\}', r'PLACEHOLDER', clean_call)
        regex = "^" + pattern + "$"
        if re.match(regex, pattern_call):
            return True
    return False

def audit_frontend_screens(backend_routes):
    jsx_files = list(FRONTEND_SRC.rglob("*.jsx"))
    screens_report = []
    total_buttons = 0
    total_on_clicks = 0
    total_api_calls = 0
    unmatched_endpoints = []

    for jsx in sorted(jsx_files):
        content = jsx.read_text(encoding="utf-8", errors="ignore")
        rel_path = str(jsx.relative_to(FRONTEND_SRC))

        buttons_count = len(re.findall(r'<button\b', content))
        onclick_count = len(re.findall(r'onClick\s*=', content))
        total_buttons += buttons_count
        total_on_clicks += onclick_count

        api_calls = set()
        for m in re.finditer(r'["\'`][^"\'`]*?(/api/[a-zA-Z0-9_\-\./\$\{\}\?=&]+)["\'`]', content):
            api_calls.add(m.group(1))

        total_api_calls += len(api_calls)
        screen_unmatched = []
        for call in sorted(api_calls):
            if not path_matches(call, backend_routes):
                screen_unmatched.append(call)
                unmatched_endpoints.append({"screen": rel_path, "endpoint": call})

        screens_report.append({
            "screen": rel_path,
            "buttons": buttons_count,
            "interactive_elements": onclick_count,
            "api_endpoints_called": sorted(list(api_calls)),
            "unmatched_endpoints": screen_unmatched,
            "status": "WARNING" if screen_unmatched else "OK"
        })

    return {
        "total_jsx_files": len(jsx_files),
        "total_buttons": total_buttons,
        "total_interactive_onclicks": total_on_clicks,
        "total_api_calls_detected": total_api_calls,
        "unmatched_endpoints": unmatched_endpoints,
        "screens": screens_report
    }

def run_full_shadow_audit():
    inv = audit_inventories()
    autos = audit_automations()
    routes, route_details = extract_backend_routes()
    fe = audit_frontend_screens(routes)

    auto_issues_count = sum(1 for a in autos if a["issues"])
    inv_issues_count = (
        len(inv["missing_in_direct"])
        + len(inv["missing_in_mapping"])
        + len(inv["missing_in_twin"])
        + len(inv["orphan_direct_lights"])
        + len(inv["plate_channel_issues"])
    )
    fe_issues_count = len(fe["unmatched_endpoints"])

    overall_health = "100% HEALTHY" if (auto_issues_count == 0 and inv_issues_count == 0 and fe_issues_count == 0) else "ISSUES_DETECTED"

    report = {
        "timestamp": datetime.now().isoformat(),
        "mode": "SHADOW_DRY_RUN (0 physical relays touched)",
        "overall_health": overall_health,
        "summary": {
            "total_screens_jsx": fe["total_jsx_files"],
            "total_buttons": fe["total_buttons"],
            "total_interactive_handlers": fe["total_interactive_onclicks"],
            "total_backend_routes": len(route_details),
            "inventory_discrepancies": inv_issues_count,
            "automations_with_issues": f"{auto_issues_count}/{len(autos)}",
            "unmatched_api_calls": fe_issues_count
        },
        "inventories_audit": inv,
        "automations_audit": autos,
        "frontend_audit": fe
    }

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    out_file = LOGS_DIR / "shadow_audit_report.json"
    out_file.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report

if __name__ == "__main__":
    rep = run_full_shadow_audit()
    print("=" * 72)
    print("  CENTINELA AUDITOR EN SOMBRA (DRY-RUN) - HABANA 15")
    print("=" * 72)
    print(f"  Estado Global:               {rep['overall_health']}")
    print(f"  Pantallas JSX Auditadas:     {rep['summary']['total_screens_jsx']}")
    print(f"  Botones <button> Auditados:  {rep['summary']['total_buttons']}")
    print(f"  Eventos onClick Auditados:   {rep['summary']['total_interactive_handlers']}")
    print(f"  Endpoints Backend Activos:   {rep['summary']['total_backend_routes']}")
    print(f"  Desfases de Inventario:      {rep['summary']['inventory_discrepancies']}")
    print(f"  Automatizaciones con Fallo:  {rep['summary']['automations_with_issues']}")
    print(f"  Endpoints UI sin Ruta:       {rep['summary']['unmatched_api_calls']}")
    print("=" * 72)
    print(f"  Informe completo guardado en: F:\\Habana 15\\logs\\shadow_audit_report.json")
    print("=" * 72)
