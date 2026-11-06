@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
title HABANA 14.2 FUSIÓN - Lanzador Maestro
echo ======================================================================
echo           HABANA 14.2 FUSIÓN - ARQUITECTURA SENSORIAL & MULTI-AGENTE
echo           Arranque Automático Completo
echo ======================================================================
echo.

set "PY_EXE=F:\Habana 8\backend\venv\Scripts\python.exe"
if not exist "%PY_EXE%" (
    set "PY_EXE=C:\Users\tomas\.platformio\python3\python.exe"
)
if not exist "%PY_EXE%" (
    set "PY_EXE=python.exe"
)

echo [1/3] Verificando Backend Habana 14.2 Fusión...
cd /d "F:\Habana 14.2 Fusion\backend"
powershell -NoProfile -Command "Start-Process -FilePath '%PY_EXE%' -ArgumentList 'main.py' -WorkingDirectory 'F:\Habana 14.2 Fusion\backend' -WindowStyle Normal"

echo [2/3] Verificando Frontend...
cd /d "F:\Habana 14.2 Fusion\frontend"
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/k npm run dev' -WorkingDirectory 'F:\Habana 14.2 Fusion\frontend' -WindowStyle Normal"

echo [3/3] Abriendo Sandbox Digital Twin (8088)...
start "" "http://localhost:8088"

echo.
echo ======================================================================
echo   HABANA 14.2 FUSIÓN INICIADO CORRECTAMENTE
echo   Frontend: http://localhost:5175
echo   Backend:  http://localhost:8050
echo   Sandbox:  http://localhost:8088
echo ======================================================================
pause
