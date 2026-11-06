#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HABANA - Gestor Blindado de Puntos de Restauración (Create Restore Point)
Solo ejecutable desde entorno local / terminal de desarrollo.
Inaccesible desde la API web o WhatsApp.
"""

import os
import sys
import json
import time
import shutil
import zipfile
import hashlib
from datetime import datetime
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

EXCLUDE_DIRS = {
    "node_modules",
    "venv",
    ".venv",
    "env",
    "__pycache__",
    ".git",
    ".idea",
    ".vscode",
    ".pytest_cache",
    "dist",
    "build"
}

EXCLUDE_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".log",
    ".tmp"
}

def get_dir_sha256(zip_path: Path) -> str:
    h = hashlib.sha256()
    with open(zip_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def create_restore_point(description: str = "Punto de restauracion manual") -> dict:
    RESTORE_DIR.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_desc = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in description)[:40]
    point_id = f"RESTORE_{timestamp}_{clean_desc}"
    zip_path = RESTORE_DIR / f"{point_id}.zip"
    
    print(f"\n=======================================================")
    print(f"🛡️  CREANDO PUNTO DE RESTAURACIÓN BLINDADO: HABANA")
    print(f"=======================================================")
    print(f"📁 Directorio base: {BASE_DIR}")
    print(f"📦 Destino: {zip_path}")
    print(f"📝 Descripción: {description}\n")

    files_count = 0
    total_bytes = 0
    
    start_time = time.time()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(BASE_DIR):
            # Filtrar carpetas excluidas en el recorrido
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".restore_")]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in EXCLUDE_EXTENSIONS:
                    continue
                
                # Evitar incluir copias de backups anteriores o zips gigantes
                if ext == ".zip" or ext == ".tar" or ext == ".gz":
                    continue

                abs_file = Path(root) / file
                rel_file = abs_file.relative_to(BASE_DIR)

                try:
                    # Excluir archivos individuales mayores a 80MB (ej. videos raw muy pesados)
                    if abs_file.stat().st_size > 80 * 1024 * 1024:
                        print(f"   [Omitido >80MB]: {rel_file}")
                        continue
                    
                    zf.write(abs_file, rel_file)
                    files_count += 1
                    total_bytes += abs_file.stat().st_size
                except Exception as e:
                    print(f"   [Aviso no leido]: {rel_file} ({e})")
                    
    duration = time.time() - start_time
    zip_size_mb = zip_path.stat().st_size / (1024 * 1024)
    sha256 = get_dir_sha256(zip_path)

    # Actualizar manifest
    manifest = []
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = []
            
    point_entry = {
        "id": point_id,
        "filename": zip_path.name,
        "description": description,
        "timestamp": datetime.now().isoformat(),
        "files_count": files_count,
        "uncompressed_mb": round(total_bytes / (1024 * 1024), 2),
        "compressed_mb": round(zip_size_mb, 2),
        "sha256": sha256,
        "base_dir": str(BASE_DIR),
        "created_by": "Developer Console (Protected)"
    }
    
    manifest.insert(0, point_entry)
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"✅ PUNTO DE RESTAURACIÓN CREADO CON ÉXITO")
    print(f"-------------------------------------------------------")
    print(f"🔑 ID: {point_id}")
    print(f"📊 Archivos empaquetados: {files_count}")
    print(f"💾 Tamaño comprimido: {zip_size_mb:.2f} MB ({total_bytes / (1024*1024):.2f} MB descomprimido)")
    print(f"⏱️  Tiempo de procesado: {duration:.2f} segundos")
    print(f"🔒 SHA256: {sha256[:16]}...")
    print(f"=======================================================\n")
    return point_entry

if __name__ == "__main__":
    desc = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Punto de restauracion inicial antes de cambios dinamicos"
    create_restore_point(desc)
