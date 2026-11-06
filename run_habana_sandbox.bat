@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
title HABANA 14 - SANDBOX DIGITAL TWIN & SIMULADOR HUMANO
echo ======================================================================
echo       HABANA 14 - SANDBOX DIGITAL TWIN & SIMULADOR DE PRUEBAS
echo       Modo Aislado (0 Interferencia Fisica) - 0 Tokens Antigravity
echo ======================================================================
echo.

set "PY_EXE=F:\Habana 8\backend\venv\Scripts\python.exe"
if not exist "%PY_EXE%" (
    set "PY_EXE=C:\Users\tomas\.platformio\python3\python.exe"
)
if not exist "%PY_EXE%" (
    set "PY_EXE=python.exe"
)

echo [1/2] Verificando Ollama local en http://localhost:11434...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:11434/api/tags' -TimeoutSec 2 -UseBasicParsing; Write-Host '  -> Ollama ONLINE' -ForegroundColor Green } catch { Write-Host '  -> Ollama no detectado (Se usará motor heurístico local de respaldo)' -ForegroundColor Yellow }"

echo [2/2] Iniciando Servidor Sandbox en puerto 8088...
start "" "http://localhost:8088"

cd /d "F:\Habana 14\habana_sandbox"
"%PY_EXE%" server.py

pause
