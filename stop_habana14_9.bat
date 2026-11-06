@echo off
title DETENER HABANA 14.9 APEX
chcp 65001 > nul
cls

echo ===============================================================================
echo     DETENIENDO HABANA 14.9 APEX (PUERTOS 8055 Y 5180)
echo ===============================================================================
echo.

echo [*] Buscando y cerrando procesos en puerto 8055 (Backend Apex)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8055 ^| findstr LISTENING') do (
    echo [+] Terminando PID %%a...
    taskkill /F /PID %%a > nul 2>&1
)

echo [*] Buscando y cerrando procesos en puerto 5180 (Frontend Apex)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5180 ^| findstr LISTENING') do (
    echo [+] Terminando PID %%a...
    taskkill /F /PID %%a > nul 2>&1
)

echo.
echo ===============================================================================
echo   HABANA 14.9 APEX DETENIDO CORRECTAMENTE.
echo   Habana 14 (Produccion en puertos 8050/5175) no ha sido modificado.
echo ===============================================================================
timeout /t 3 > nul
