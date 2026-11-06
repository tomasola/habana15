@echo off
setlocal enabledelayedexpansion
title HABANA 15 - Lanzador Maestro Autonomo
echo ======================================================================
echo           HABANA 15 - SISTEMA DOMOTICO CONCENTRADO Y AUTONOMO
echo           Dongle Sonoff Zigbee COM9 ^| WhatsApp IA ^| Resiliencia P2P
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
    powershell -NoProfile -Command "Start-Process -FilePath '%PY_EXE%' -ArgumentList 'run_mqtt_broker.py' -WorkingDirectory 'F:\Habana 15\backend' -WindowStyle Minimized"
    ping 127.0.0.1 -n 3 > nul
) else (
    echo [MQTT] Broker MQTT ya activo en puerto 1883.
)

:: 2. Verificar / Iniciar Zigbee2MQTT (8090)
echo [2/5] Verificando Zigbee2MQTT en puerto 8090 (COM9)...
set "Z2M_UP=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8090 " ^| findstr "LISTENING"') do set "Z2M_UP=1"
if "!Z2M_UP!"=="0" (
    echo [Z2M] Arrancando Zigbee2MQTT en puerto 8090...
    powershell -NoProfile -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'index.js' -WorkingDirectory 'F:\Habana 15\services\zigbee2mqtt' -WindowStyle Minimized"
    ping 127.0.0.1 -n 4 > nul
) else (
    echo [Z2M] Zigbee2MQTT ya activo en puerto 8090.
)

:: 3. Verificar / Iniciar Puente WhatsApp Baileys (Puerto 3000)
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

:: 4. Preparar Backend Habana 15 en puerto 8050
echo [4/5] Preparando Backend Habana 15 en puerto 8050...
set "BACKEND_UP=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8050 " ^| findstr "LISTENING"') do set "BACKEND_UP=1"
if "!BACKEND_UP!"=="0" (
    echo [BACKEND] Arrancando Backend Habana 15...
    powershell -NoProfile -Command "Start-Process -FilePath '%PY_EXE%' -ArgumentList 'main.py' -WorkingDirectory 'F:\Habana 15\backend' -WindowStyle Minimized"
    ping 127.0.0.1 -n 4 > nul
) else (
    echo [BACKEND] Backend Habana 15 ya activo en puerto 8050.
)

:: 5. Preparar Frontend Habana 15 en puerto 5175
echo [5/5] Preparando Frontend Habana 15 en puerto 5175...
set "FRONTEND_UP=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5175 " ^| findstr "LISTENING"') do set "FRONTEND_UP=1"
if "!FRONTEND_UP!"=="0" (
    echo [FRONTEND] Arrancando Frontend Habana 15...
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm.cmd run dev' -WorkingDirectory 'F:\Habana 15\frontend' -WindowStyle Minimized"
    ping 127.0.0.1 -n 3 > nul
) else (
    echo [FRONTEND] Frontend ya activo en puerto 5175.
)

echo.
echo ======================================================================
echo           HABANA 15 LEVANTADO CON EXITO
echo           Panel Web:    https://localhost:5175
echo           API Docs:     http://localhost:8050/docs
echo           Zigbee Web:   http://localhost:8090
echo           WhatsApp API: http://localhost:3000/status
echo ======================================================================
echo.
if /I not "%~1"=="--no-browser" (
    echo Abriendo navegador en https://localhost:5175...
    start https://localhost:5175
)
ping 127.0.0.1 -n 3 > nul