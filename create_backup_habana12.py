import os
import shutil
import zipfile
import datetime

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR_NAME = f"backup_habana12_checkpoint_{timestamp}"
BACKUP_PATH = os.path.join(BASE_DIR, "backups", BACKUP_DIR_NAME)
ZIP_NAME = f"Habana12_Backup_{timestamp}.zip"
ZIP_DESTINATION_LOCAL = os.path.join(BASE_DIR, "backups", ZIP_NAME)
ZIP_DESTINATION_ROOT = os.path.join("F:\\", ZIP_NAME)

os.makedirs(BACKUP_PATH, exist_ok=True)

items_to_backup = [
    ("backend/app", "backend_app"),
    ("backend/main.py", "backend_main.py"),
    ("backend/config", "backend_config"),
    ("backend/requirements.txt", "backend_requirements.txt"),
    ("backend/run_mqtt_broker.py", "backend_run_mqtt_broker.py"),
    ("frontend/src", "frontend_src"),
    ("frontend/public", "frontend_public"),
    ("frontend/package.json", "frontend_package.json"),
    ("frontend/vite.config.js", "frontend_vite.config.js"),
    ("vault", "vault_obsidian"),
    ("services/zigbee2mqtt/data", "z2m_data"),
    ("start_habana12.bat", "start_habana12.bat"),
    ("README.md", "README.md"),
]

# Include Habana Tablet APK
apk_dir = "F:\\Habana Tablet APK"
if os.path.exists(apk_dir):
    items_to_backup.append((apk_dir, "habana_tablet_apk_project"))

print(f"=== Creando copia de seguridad de HABANA 12 ({timestamp}) ===")

for src, dst in items_to_backup:
    if os.path.isabs(src):
        src_full = src
    else:
        src_full = os.path.join(BASE_DIR, src)
    
    dst_full = os.path.join(BACKUP_PATH, dst)
    if not os.path.exists(src_full):
        print(f" [SKIP] No encontrado: {src}")
        continue
    if os.path.isdir(src_full):
        if os.path.exists(dst_full):
            shutil.rmtree(dst_full)
        shutil.copytree(
            src_full, 
            dst_full, 
            ignore=shutil.ignore_patterns(
                "__pycache__", "*.pyc", ".pytest_cache", "node_modules", ".gradle", "build", ".git"
            )
        )
        print(f" [OK] Directorio: {src} -> {dst}")
    elif os.path.isfile(src_full):
        shutil.copy2(src_full, dst_full)
        print(f" [OK] Archivo: {src} -> {dst}")

# Generate restore.py inside the backup folder
restore_script_code = f'''import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP_PATH = os.path.dirname(os.path.abspath(__file__))

restore_mapping = [
    ("backend_app", "backend/app"),
    ("backend_main.py", "backend/main.py"),
    ("backend_config", "backend/config"),
    ("backend_requirements.txt", "backend/requirements.txt"),
    ("backend_run_mqtt_broker.py", "backend/run_mqtt_broker.py"),
    ("frontend_src", "frontend/src"),
    ("frontend_public", "frontend/public"),
    ("frontend_package.json", "frontend/package.json"),
    ("frontend_vite.config.js", "frontend/vite.config.js"),
    ("vault_obsidian", "vault"),
    ("z2m_data", "services/zigbee2mqtt/data"),
    ("start_habana12.bat", "start_habana12.bat"),
    ("README.md", "README.md")
]

for bkp_item, target in restore_mapping:
    bkp_full = os.path.join(BACKUP_PATH, bkp_item)
    target_full = os.path.join(BASE_DIR, target)
    if not os.path.exists(bkp_full):
        continue
    if os.path.isdir(bkp_full):
        if os.path.exists(target_full):
            shutil.rmtree(target_full)
        shutil.copytree(bkp_full, target_full)
        print(f"Restored directory: {{target}}")
    elif os.path.isfile(bkp_full):
        shutil.copy2(bkp_full, target_full)
        print(f"Restored file: {{target}}")

print("Restoration of {BACKUP_DIR_NAME} completed successfully!")
'''

with open(os.path.join(BACKUP_PATH, "restore.py"), "w", encoding="utf-8") as f:
    f.write(restore_script_code)

# Root restore_last_checkpoint.py
with open(os.path.join(BASE_DIR, "restore_last_checkpoint.py"), "w", encoding="utf-8") as f:
    f.write(f'''import subprocess, sys, os
target_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups", "{BACKUP_DIR_NAME}", "restore.py")
subprocess.run([sys.executable, target_script])
''')

print(f"\n[OK] Copia estructurada completada en: {BACKUP_PATH}")

# Create ZIP
print(f"=== Comprimiendo en archivo ZIP: {ZIP_NAME} ===")
with zipfile.ZipFile(ZIP_DESTINATION_LOCAL, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(BACKUP_PATH):
        for file in files:
            full_file_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_file_path, BACKUP_PATH)
            zipf.write(full_file_path, arcname=rel_path)

shutil.copy2(ZIP_DESTINATION_LOCAL, ZIP_DESTINATION_ROOT)

zip_size_mb = os.path.getsize(ZIP_DESTINATION_LOCAL) / (1024 * 1024)
print(f"[OK] Archivo ZIP creado con éxito ({zip_size_mb:.2f} MB)")
print(f" - Local: {ZIP_DESTINATION_LOCAL}")
print(f" - Raíz:  {ZIP_DESTINATION_ROOT}")
