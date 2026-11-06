import requests
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)

for js in ["/js/login.js", "/js/general.js"]:
    print(f"\n--- Leyendo {js} ---")
    try:
        r = requests.get(f"http://192.168.1.132{js}", timeout=2)
        print(r.text[:1200])
    except Exception as e:
        print(e)
