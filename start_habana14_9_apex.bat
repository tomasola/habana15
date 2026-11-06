@echo off
title HABANA 14.9 APEX (EDICIÓN PARALELA - PUERTOS 8055 & 5180)
chcp 65001 > nul
cls

echo ===============================================================================
echo     👑 HABANA 14.9 APEX - LANZAMIENTO PARALELO DE MÁXIMO RENDIMIENTO
echo ===============================================================================
echo.
echo [*] Verificando Broker MQTT (Puerto 1883)...
netstat -ano | findstr :1883 > nul
if %errorlevel% equ 0 (
    echo [+] Broker MQTT ya activo en puerto 1883 (Compartido con exito).
) else (
    echo [1/3] Iniciando Broker MQTT Local (Puerto 1883)...
    start "Habana MQTT Broker" /min python "backend\run_mqtt_broker.py"
    timeout /t 2 /nobreak > nul
)

echo.
echo [2/3] Iniciando Backend FastAPI Habana 14.9 Apex (Puerto 8055)...
start "Habana 14.9 Apex Backend Core" cmd /k "cd /d F:\Habana 14.9 Apex\backend && python main.py"
timeout /t 5 /nobreak > nul

echo.
echo [3/3] Iniciando Frontend React 18 + Vite Habana 14.9 Apex (Puerto 5180)...
start "Habana 14.9 Apex Frontend UI" cmd /k "cd /d F:\Habana 14.9 Apex\frontend && npm.cmd run dev"

echo.
echo ===============================================================================
echo   👑 HABANA 14.9 APEX ARRANCADO CON ÉXITO EN MODO PARALELO
echo   -----------------------------------------------------------------------------
echo   - Frontend UI:       https://localhost:5180
echo   - Backend API Docs:  http://localhost:8055/docs
echo   - Apex Kernel Stats: http://localhost:8055/api/apex/status
echo   - Habana 14 Original: Sigue activo en https://localhost:5175 (Puerto 8050)
echo ===============================================================================
pause
