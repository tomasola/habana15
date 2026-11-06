@echo off
title AGENTE CENTINELA DE AUDITORIA EN SOMBRA - HABANA 15
echo.
set "PY_EXE=F:\Habana 8\backend\venv\Scripts\python.exe"
if not exist "%PY_EXE%" set "PY_EXE=python.exe"

"%PY_EXE%" "F:\Habana 15\backend\shadow_auditor.py"
echo.
if /I not "%~1"=="--no-pause" pause