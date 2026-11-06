import subprocess, sys, os
target_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups", "backup_habana12_checkpoint_20261026_190952", "restore.py")
subprocess.run([sys.executable, target_script])
