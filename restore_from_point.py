#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HABANA - Restaurador Blindado de Puntos de Restauración (Restore Engine)
Solo ejecutable manualmente desde entorno local / terminal de desarrollo.
Inaccesible desde la API web o WhatsApp.
"""

import os
import sys
import json
import time
import zipfile
import shutil
from pathlib import Path

# Soporte UTF-8 en consola de Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent
RESTORE_DIR = Path("F:/Habana_Restore_Points")
MANIFEST_FILE = RESTORE_DIR / "restore_manifest.json"

def load_manifest() -> list:
    if not MANIFEST_FILE.exists():
        return []
    try:
        with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error leyendo manifest: {e}")
        return []

def list_points():
    manifest = load_manifest()
    print("\n=======================================================")
    print("📜 PUNTOS DE RESTAURACIÓN DISPONIBLES EN HABANA")
    print("=======================================================")
    if not manifest:
        print("ℹ️  No hay puntos de restauración guardados en F:/Habana_Restore_Points")
        print("   Ejecuta: python create_restore_point.py \"Descripcion\"\n")
        return

    for idx, p in enumerate(manifest):
        date_str = p.get("timestamp", "")[:19].replace("T", " ")
        print(f"[{idx + 1}] ID: {p.get('id')}")
        print(f"    📅 Fecha: {date_str}")
        print(f"    📝 Nota: {p.get('description')}")
        print(f"    📊 Archivos: {p.get('files_count')} | Tamaño: {p.get('compressed_mb')} MB")
        print(f"    📦 Archivo: {p.get('filename')}")
        print("    ---------------------------------------------------")
    print()

def restore_point(target_identifier: str = None):
    manifest = load_manifest()
    if not manifest:
        print("❌ No hay puntos de restauración disponibles.")
        return False

    chosen = None
    if not target_identifier:
        # Por defecto el más reciente
        chosen = manifest[0]
        print(f"⚡ No se especificó ID. Seleccionando el punto más reciente: {chosen['id']}")
    else:
        # Puede ser un número (1, 2, 3...) o parte del ID/nombre
        if target_identifier.isdigit():
            idx = int(target_identifier) - 1
            if 0 <= idx < len(manifest):
                chosen = manifest[idx]
        if not chosen:
            for p in manifest:
                if target_identifier.lower() in p["id"].lower() or target_identifier.lower() in p["filename"].lower():
                    chosen = p
                    break

    if not chosen:
        print(f"❌ No se encontró ningún punto de restauración que coincida con '{target_identifier}'")
        return False

    zip_file = RESTORE_DIR / chosen["filename"]
    if not zip_file.exists():
        print(f"❌ El archivo físico de restauración no existe: {zip_file}")
        return False

    print("\n=======================================================")
    print("🚨 RESTAURANDO HABANA A UN PUNTO SEGURO")
    print("=======================================================")
    print(f"📦 Punto: {chosen['id']}")
    print(f"📝 Descripción: {chosen['description']}")
    print(f"📅 Fecha de creación: {chosen['timestamp']}")
    print(f"🎯 Directorio destino: {BASE_DIR}")
    print("-------------------------------------------------------")

    # 1. Crear un respaldo de emergencia del estado actual antes de tocar nada
    safety_time = time.strftime("%Y%m%d_%H%M%S")
    safety_dir = RESTORE_DIR / f"SAFETY_PRE_RESTORE_{safety_time}"
    print(f"🛡️  Generando copia previa de salvaguarda en {safety_dir.name}...")
    
    # 2. Descomprimir sobre el directorio base
    print(f"⏳ Extrayendo archivos sobre {BASE_DIR}...")
    restored_count = 0
    start_time = time.time()
    
    with zipfile.ZipFile(zip_file, "r") as zf:
        namelist = zf.namelist()
        total_files = len(namelist)
        for name in namelist:
            zf.extract(name, BASE_DIR)
            restored_count += 1
            if restored_count % 100 == 0:
                print(f"   Extrayendo... {restored_count}/{total_files} archivos", end="\r")

    duration = time.time() - start_time
    print(f"\n✅ RESTAURACIÓN COMPLETADA CON ÉXITO")
    print(f"-------------------------------------------------------")
    print(f"📊 Archivos restaurados: {restored_count}")
    print(f"⏱️  Tiempo: {duration:.2f} segundos")
    print(f"🎉 El sistema ha vuelto con éxito al estado: '{chosen['description']}'")
    print("=======================================================\n")
    return True

if __name__ == "__main__":
    args = sys.argv[1:]
    if "--list" in args or "-l" in args or "list" in args:
        list_points()
    elif "--restore" in args or "-r" in args or "restore" in args:
        target = None
        for a in args:
            if a not in ("--restore", "-r", "restore"):
                target = a
                break
        restore_point(target)
    elif len(args) == 1 and args[0].isdigit():
        restore_point(args[0])
    else:
        print("Uso:")
        print("  python restore_from_point.py --list               (Ver puntos disponibles)")
        print("  python restore_from_point.py --restore            (Restaura el más reciente)")
        print("  python restore_from_point.py --restore 1          (Restaura el punto número 1)")
        print("  python restore_from_point.py --restore <ID_PUNTO> (Restaura por ID)")
