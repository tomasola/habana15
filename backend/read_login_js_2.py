import requests
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
r = requests.get("http://192.168.1.132/js/login.js", timeout=2)
lines = r.text.splitlines()
for i, l in enumerate(lines[45:120], start=46):
    print(f"{i}: {l}")
