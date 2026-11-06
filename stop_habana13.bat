@echo off
chcp 65001 > nul
title HABANA 13 - Apagado Completo
echo ======================================================================
echo           DETENIENDO TODOS LOS SERVICIOS DE HABANA 13
echo ======================================================================

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5175 " ^| findstr "LISTENING"') do (
    echo [FRONTEND] Deteniendo puerto 5175 - PID %%a...
    taskkill /F /T /PID %%a > nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8050 " ^| findstr "LISTENING"') do (
    echo [BACKEND] Deteniendo puerto 8050 - PID %%a...
    taskkill /F /T /PID %%a > nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo [WHATSAPP] Deteniendo puerto 3000 - PID %%a...
    taskkill /F /T /PID %%a > nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8090 " ^| findstr "LISTENING"') do (
    echo [ZIGBEE2MQTT] Deteniendo puerto 8090 - PID %%a...
    taskkill /F /T /PID %%a > nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":1883 " ^| findstr "LISTENING"') do (
    echo [MQTT BROKER] Deteniendo puerto 1883 - PID %%a...
    taskkill /F /T /PID %%a > nul 2>&1
)

echo.
echo Todos los servicios de Habana 13 han sido apagados.
ping 127.0.0.1 -n 3 > nul
