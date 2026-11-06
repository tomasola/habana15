@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
title HABANA 14.3 CONTEXTUAL - Lanzador Maestro
echo ======================================================================
echo       HABANA 14.3 CONTEXTUAL - INTERFAZ INTELIGENTE Y ONE-TOUCH MOODS
echo       Arranque Automático Completo
echo ======================================================================
echo.

set "PY_EXE=F:\Habana 8\backend\venv\Scripts\python.exe"
if not exist "%PY_EXE%" (
    set "PY_EXE=C:\Users\tomas\.platformio\python3\python.exe"
)
if not exist "%PY_EXE%" (
    set "PY_EXE=python.exe"
)

echo [1/3] Iniciando Backend Habana 14.3...
cd /d "F:\Habana 14.3 Contextual\backend"
powershell -NoProfile -Command "Start-Process -FilePath '%PY_EXE%' -ArgumentList 'main.py' -WorkingDirectory 'F:\Habana 14.3 Contextual\backend' -WindowStyle Normal"

echo [2/3] Iniciando Frontend React Contextual...
cd /d "F:\Habana 14.3 Contextual\frontend"
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/k npm run dev' -WorkingDirectory 'F:\Habana 14.3 Contextual\frontend' -WindowStyle Normal"

echo [3/3] Abriendo Sandbox Digital Twin (8088)...
start "" "http://localhost:8088"

echo.
echo ======================================================================
echo   HABANA 14.3 CONTEXTUAL INICIADO CON ÉXITO
echo   Frontend: http://localhost:5175
echo   Backend:  http://localhost:8050
echo   Sandbox:  http://localhost:8088
echo ======================================================================
pause
