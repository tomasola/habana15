@echo off
title REGISTRAR AUTO-ARRANQUE TRAS CORTE DE LUZ - HABANA 15
chcp 65001 > nul
cls

echo ===============================================================================
echo     🏛️  CONFIGURACIÓN DE RESILIENCIA Y AUTO-ARRANQUE - HABANA 15
echo ===============================================================================
echo.
echo Este script registra una Tarea Programada en Windows para que HABANA 15
echo arranque automáticamente en cuanto regrese la luz y se encienda el PC.
echo.

set TASK_NAME=Habana15_AutoStart_OnBoot
set SCRIPT_PATH=F:\Habana 15\start_habana15_daemon.bat

echo [*] Registrando tarea programada: %TASK_NAME%...
schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\"" /sc onstart /ru SYSTEM /rl HIGHEST /f

if %errorlevel% equ 0 (
    echo.
    echo [+] TAREA CREADA CON ÉXITO: El servidor arrancará automáticamente al iniciar Windows.
) else (
    echo.
    echo [!] Aviso: Se requiere elevación de Administrador para 'onstart'.
    echo [*] Creando tarea en modo inicio de sesión de usuario como alternativa...
    schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\"" /sc onlogon /rl HIGHEST /f
)

echo.
echo ===============================================================================
echo  PASO FINAL OBLIGATORIO EN LA BIOS DEL ORDENADOR:
echo  1. Reinicia el PC y entra en la BIOS (tecla Supr o F2).
echo  2. Ve a la pestaña 'Power Management' o 'Advanced'.
echo  3. Cambia 'Restore on AC Power Loss' (o 'State after G3') a: [ POWER ON ].
echo.
echo  Con esto, el PC se encenderá solo en cuanto vuelva la corriente eléctrica
echo  y Habana 15 levantará el broker MQTT y las conmutaciones en segundos.
echo ===============================================================================
echo.
pause
