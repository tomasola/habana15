@echo off
set BASE_DIR=F:\Habana 15
cd /d "%BASE_DIR%"
if not exist "%BASE_DIR%\logs" mkdir "%BASE_DIR%\logs"
echo [%date% %time%] Auto-arranque Habana 15 iniciado >> "%BASE_DIR%\logs\autostart.log"

set "PY_EXE=F:\Habana 8\backend\venv\Scripts\python.exe"
if not exist "%PY_EXE%" set "PY_EXE=python.exe"

netstat -ano | findstr :1883 | findstr LISTENING > nul
if %errorlevel% neq 0 (
    echo [%date% %time%] Levantando Broker MQTT 1883 >> "%BASE_DIR%\logs\autostart.log"
    powershell -NoProfile -Command "Start-Process -FilePath '%PY_EXE%' -ArgumentList 'run_mqtt_broker.py' -WorkingDirectory '%BASE_DIR%\backend' -WindowStyle Minimized"
    ping 127.0.0.1 -n 3 > nul
)

netstat -ano | findstr :8090 | findstr LISTENING > nul
if %errorlevel% neq 0 (
    echo [%date% %time%] Levantando Zigbee2MQTT COM9 >> "%BASE_DIR%\logs\autostart.log"
    powershell -NoProfile -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'index.js' -WorkingDirectory '%BASE_DIR%\services\zigbee2mqtt' -WindowStyle Minimized"
    ping 127.0.0.1 -n 4 > nul
)

netstat -ano | findstr :3000 | findstr LISTENING > nul
if %errorlevel% neq 0 (
    echo [%date% %time%] Levantando WhatsApp Bridge 3000 >> "%BASE_DIR%\logs\autostart.log"
    powershell -NoProfile -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'wa_index_current.js' -WorkingDirectory 'F:\Habana 8\backend' -WindowStyle Minimized"
    ping 127.0.0.1 -n 3 > nul
)

netstat -ano | findstr :8050 | findstr LISTENING > nul
if %errorlevel% neq 0 (
    echo [%date% %time%] Levantando Backend 8050 >> "%BASE_DIR%\logs\autostart.log"
    powershell -NoProfile -Command "Start-Process -FilePath '%PY_EXE%' -ArgumentList 'main.py' -WorkingDirectory '%BASE_DIR%\backend' -WindowStyle Minimized"
    ping 127.0.0.1 -n 5 > nul
)

netstat -ano | findstr :5175 | findstr LISTENING > nul
if %errorlevel% neq 0 (
    echo [%date% %time%] Levantando Frontend 5175 >> "%BASE_DIR%\logs\autostart.log"
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm.cmd run dev' -WorkingDirectory '%BASE_DIR%\frontend' -WindowStyle Minimized"
)

echo [%date% %time%] Auto-arranque Habana 15 completado exitosamente >> "%BASE_DIR%\logs\autostart.log"