@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
title HABANA 14 - Lanzador Maestro (1-Clic)
echo ======================================================================
echo           HABANA 14 - SISTEMA DOMOTICO COGNITIVO & BUNKER IA
echo           Arranque Automatico Completo (1-Clic)
echo ======================================================================
echo.

set "PY_EXE=F:\Habana 8\backend\venv\Scripts\python.exe"
if not exist "%PY_EXE%" (
    set "PY_EXE=C:\Users\tomas\.platformio\python3\python.exe"
)
if not exist "%PY_EXE%" (
    set "PY_EXE=python.exe"
)

:: 1. Verificar / Iniciar Broker MQTT (1883)
echo [1/5] Verificando Broker MQTT en puerto 1883...
set "MQTT_UP=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":1883 " ^| findstr "LISTENING"') do set "MQTT_UP=1"
if "!MQTT_UP!"=="0" (
    echo [MQTT] Arrancando Broker MQTT en 1883...
    powershell -NoProfile -Command "Start-Process -FilePath '%PY_EXE%' -ArgumentList 'run_mqtt_broker.py' -WorkingDirectory 'F:\Habana 14\backend' -WindowStyle Minimized"
    ping 127.0.0.1 -n 3 > nul
) else (
    echo [MQTT] Broker MQTT ya activo en puerto 1883.
)

:: 2. Verificar / Iniciar Zigbee2MQTT (8090)
echo [2/5] Verificando Zigbee2MQTT en puerto 8090...
set "Z2M_UP=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8090 " ^| findstr "LISTENING"') do set "Z2M_UP=1"
if "!Z2M_UP!"=="0" (
    echo [Z2M] Arrancando Zigbee2MQTT en puerto 8090...
    if exist "F:\Habana 13\services\zigbee2mqtt\data\state.json" (
        copy /Y "F:\Habana 13\services\zigbee2mqtt\data\state.json" "F:\Habana 14\services\zigbee2mqtt\data\state.json" > nul 2>&1
    )
    powershell -NoProfile -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'index.js' -WorkingDirectory 'F:\Habana 14\services\zigbee2mqtt' -WindowStyle Minimized"
    ping 127.0.0.1 -n 4 > nul
) else (
    echo [Z2M] Zigbee2MQTT ya activo en puerto 8090.
)

:: 3. Verificar / Iniciar Puente WhatsApp (3000)
echo [3/5] Verificando Puente WhatsApp en puerto 3000...
set "WA_UP=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do set "WA_UP=1"
if "!WA_UP!"=="0" (
    echo [WA] Arrancando Puente WhatsApp en puerto 3000...
    powershell -NoProfile -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'wa_index_current.js' -WorkingDirectory 'F:\Habana 8\backend' -WindowStyle Minimized"
    ping 127.0.0.1 -n 3 > nul
) else (
    echo [WA] Puente WhatsApp ya activo en puerto 3000.
)

:: 4. Liberar puerto 8050 si pertenecia a una version previa y arrancar Habana 14 Backend
echo [4/5] Preparando Backend Habana 14 en puerto 8050...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8050 " ^| findstr "LISTENING"') do (
    echo [BACKEND] Deteniendo proceso previo en puerto 8050 - PID %%a...
    taskkill /F /PID %%a > nul 2>&1
)
ping 127.0.0.1 -n 2 > nul
echo [BACKEND] Arrancando Backend Habana 14...
powershell -NoProfile -Command "Start-Process -FilePath '%PY_EXE%' -ArgumentList 'main.py' -WorkingDirectory 'F:\Habana 14\backend' -WindowStyle Minimized"
ping 127.0.0.1 -n 4 > nul

:: 5. Liberar puerto 5175 si pertenecia a una version previa y arrancar Habana 14 Frontend
echo [5/5] Preparando Frontend Habana 14 en puerto 5175...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5175 " ^| findstr "LISTENING"') do (
    echo [FRONTEND] Deteniendo frontend previo en puerto 5175 - PID %%a...
    taskkill /F /PID %%a > nul 2>&1
)
ping 127.0.0.1 -n 2 > nul
echo [FRONTEND] Arrancando Frontend Habana 14...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm.cmd run dev' -WorkingDirectory 'F:\Habana 14\frontend' -WindowStyle Minimized"
ping 127.0.0.1 -n 4 > nul

echo.
echo ======================================================================
echo           HABANA 14 LEVANTADO CON EXITO (MODO BUNKER IA ACTIVO)
echo           Panel Web: https://localhost:5175
echo           API Docs:  http://localhost:8050/docs
echo ======================================================================
echo.
if /I not "%~1"=="--no-browser" (
    echo Abriendo navegador en https://localhost:5175...
    start https://localhost:5175
)
ping 127.0.0.1 -n 3 > nul
