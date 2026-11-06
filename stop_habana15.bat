@echo off
title DETENER HABANA 15
chcp 65001 > nul
cls

echo ===============================================================================
echo     DETENIENDO PROCESOS DE HABANA 15
echo ===============================================================================
echo.

echo [*] Cerrando backend en puerto 8050 o 8055...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8055 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8050 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1

echo [*] Cerrando frontend en puerto 5180 o 5175...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5180 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5175 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1

echo.
echo ===============================================================================
echo   HABANA 15 DETENIDO CON ÉXITO.
echo ===============================================================================
timeout /t 3 > nul
