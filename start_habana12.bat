@echo off
chcp 65001 > nul
title HABANA 12 - Lanzador Maestro de Produccion
echo ======================================================================
echo           HABANA 12 - SISTEMA DOMOTICO COGNITIVO PRODUCCION
echo               Dongle Sonoff Zigbee2MQTT en COM9 ^| 0ms Latencia
echo ======================================================================
echo.

:: 1. Iniciar Broker MQTT en puerto 1883 (Python amqtt)
echo [1/5] Verificando Broker MQTT en puerto 1883...
netstat -ano | findstr :1883 | findstr LISTENING > nul
if %ERRORLEVEL% NEQ 0 (
    echo [MQTT] Arrancando Broker MQTT en 0.0.0.0:1883...
    start "HABANA 12 - MQTT Broker (1883)" cmd /k "cd /d F:\Habana 12\backend && "F:\Habana 8\backend\venv\Scripts\python.exe" run_mqtt_broker.py"
    timeout /t 3 > nul
) else (
    echo [MQTT] Broker MQTT ya activo en puerto 1883.
)

:: 2. Iniciar Zigbee2MQTT Daemon (COM9)
echo [2/5] Verificando Zigbee2MQTT Daemon...
netstat -ano | findstr :8090 | findstr LISTENING > nul
if %ERRORLEVEL% NEQ 0 (
    echo [Z2M] Arrancando Zigbee2MQTT (COM9)...
    start "HABANA 12 - Zigbee2MQTT (COM9)" cmd /k "cd /d F:\Habana 12\services\zigbee2mqtt && node index.js"
    timeout /t 4 > nul
) else (
    echo [Z2M] Zigbee2MQTT ya activo.
)

:: 3. Iniciar WhatsApp Bridge (Puerto 3000)
echo [3/5] Verificando Puente WhatsApp en puerto 3000...
netstat -ano | findstr :3000 | findstr LISTENING > nul
if %ERRORLEVEL% NEQ 0 (
    echo [WA] Arrancando WhatsApp Bridge Baileys...
    start "HABANA 12 - WhatsApp Bridge (3000)" cmd /k "cd /d F:\Habana 8\backend && node wa_index_current.js"
    timeout /t 2 > nul
) else (
    echo [WA] WhatsApp Bridge ya activo en puerto 3000.
)

:: 4. Iniciar Backend FastAPI (Puerto 8050)
echo [4/5] Verificando Backend Habana 12 en puerto 8050...
netstat -ano | findstr :8050 | findstr LISTENING > nul
if %ERRORLEVEL% NEQ 0 (
    echo [BACKEND] Arrancando Backend Habana 12...
    start "HABANA 12 - Backend (8050)" cmd /k "cd /d F:\Habana 12\backend && "F:\Habana 8\backend\venv\Scripts\python.exe" main.py"
    timeout /t 3 > nul
) else (
    echo [BACKEND] Backend Habana 12 ya activo en puerto 8050.
)

:: 5. Iniciar Frontend Vite (Puerto 5175)
echo [5/5] Verificando Frontend Habana 12 en puerto 5175...
netstat -ano | findstr :5175 | findstr LISTENING > nul
if %ERRORLEVEL% NEQ 0 (
    echo [FRONTEND] Arrancando Frontend Habana 12...
    start "HABANA 12 - Frontend (5175)" cmd /k "cd /d F:\Habana 12\frontend && npm run dev"
    timeout /t 2 > nul
) else (
    echo [FRONTEND] Frontend ya activo en puerto 5175.
)

echo.
echo ======================================================================
echo   HABANA 12 - Todos los servicios verificados y activos:
echo     - Broker MQTT:      localhost:1883
echo     - Zigbee2MQTT:      COM9 (Frontend en :8090)
echo     - WhatsApp Bridge:  localhost:3000
echo     - Backend API:      http://localhost:8050
echo     - Frontend Web:     https://localhost:5175 (o http://localhost:5175)
echo ======================================================================
echo.
