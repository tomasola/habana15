@echo off
title HABANA 14.8 ENERGY (ENERGY AI OPTIMIZER & PEAK-SHAVING)
chcp 65001 > nul
cls

echo ===============================================================================
echo     HABANA 14.8 ENERGY - OPTIMIZADOR ENERGÉTICO IA Y EXCEDENTES FOTOVOLTAICOS
echo ===============================================================================
echo.
echo [1/3] Iniciando Broker MQTT Local (Puerto 1883)...
start "Habana MQTT Broker" /min python "backend\run_mqtt_broker.py"
timeout /t 2 /nobreak > nul

echo [2/3] Iniciando Backend FastAPI + Energy AI Engine (Puerto 8050)...
start "Habana Backend Core" cmd /k "cd backend && python main.py"
timeout /t 3 /nobreak > nul

echo [3/3] Iniciando Frontend React 18 + Vite (Puerto 5175)...
start "Habana Frontend UI" cmd /k "cd frontend && npm run dev"

echo.
echo ===============================================================================
echo   HABANA 14.8 ENERGY ARRANCADO CON ÉXITO
echo   - Frontend: http://localhost:5175
echo   - Backend API: http://localhost:8050/docs
echo   - Energy Optimizer: backend/app/services/energy_ai_optimizer.py
echo ===============================================================================
pause
