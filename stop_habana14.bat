@echo off
chcp 65001 > nul
title HABANA 14 - Detencion Segura
echo ======================================================================
echo           HABANA 14 - DETENCION DE SERVICIOS
echo ======================================================================

echo [1/3] Deteniendo Frontend (puerto 5175)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5175 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a > nul 2>&1
)

echo [2/3] Deteniendo Backend (puerto 8050)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8050 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a > nul 2>&1
)

echo [3/3] Deteniendo Zigbee2MQTT (puerto 8090)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8090 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a > nul 2>&1
)

echo.
echo Todos los servicios de HABANA 14 se han detenido correctamente.
ping 127.0.0.1 -n 2 > nul
