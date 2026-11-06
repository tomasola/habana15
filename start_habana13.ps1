# HABANA 13 - Lanzador Nativo en PowerShell
$ErrorActionPreference = "SilentlyContinue"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          HABANA 13 - SISTEMA DOMOTICO COGNITIVO PRODUCCION           " -ForegroundColor Cyan
Write-Host "               Lanzador Nativo PowerShell                             " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$pyExe = "F:\Habana 8\backend\venv\Scripts\python.exe"
if (-not (Test-Path $pyExe)) {
    $pyExe = "C:\Users\tomas\.platformio\python3\python.exe"
}
if (-not (Test-Path $pyExe)) {
    $pyExe = "python.exe"
}

# 1. Broker MQTT
Write-Host "[1/5] Verificando Broker MQTT en 1883..." -ForegroundColor Yellow
$m = Get-NetTCPConnection -LocalPort 1883 -ErrorAction SilentlyContinue
if (-not $m) {
    Write-Host "[MQTT] Arrancando Broker MQTT en puerto 1883..." -ForegroundColor Green
    Start-Process -FilePath $pyExe -ArgumentList "run_mqtt_broker.py" -WorkingDirectory "F:\Habana 13\backend"
    Start-Sleep -Seconds 2
} else {
    Write-Host "[MQTT] Broker ya activo en 1883." -ForegroundColor Gray
}

# 2. Zigbee2MQTT
Write-Host "[2/5] Verificando Zigbee2MQTT en 8090..." -ForegroundColor Yellow
$z = Get-NetTCPConnection -LocalPort 8090 -ErrorAction SilentlyContinue
if (-not $z) {
    Write-Host "[Z2M] Arrancando Zigbee2MQTT en puerto 8090..." -ForegroundColor Green
    Start-Process -FilePath "node.exe" -ArgumentList "index.js" -WorkingDirectory "F:\Habana 13\services\zigbee2mqtt"
    Start-Sleep -Seconds 3
} else {
    Write-Host "[Z2M] Zigbee2MQTT ya activo en 8090." -ForegroundColor Gray
}

# 3. WhatsApp Bridge
Write-Host "[3/5] Verificando Puente WhatsApp en 3000..." -ForegroundColor Yellow
$w = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if (-not $w) {
    Write-Host "[WA] Arrancando Puente WhatsApp en puerto 3000..." -ForegroundColor Green
    Start-Process -FilePath "node.exe" -ArgumentList "wa_index_current.js" -WorkingDirectory "F:\Habana 8\backend"
    Start-Sleep -Seconds 2
} else {
    Write-Host "[WA] Puente WhatsApp ya activo en 3000." -ForegroundColor Gray
}

# 4. Backend Habana 13
Write-Host "[4/5] Verificando Backend Habana 13 en 8050..." -ForegroundColor Yellow
$b = Get-NetTCPConnection -LocalPort 8050 -State Listen -ErrorAction SilentlyContinue
if (-not $b) {
    Write-Host "[BACKEND] Arrancando Backend Habana 13..." -ForegroundColor Green
    Start-Process -FilePath $pyExe -ArgumentList "main.py" -WorkingDirectory "F:\Habana 13\backend"
    Start-Sleep -Seconds 3
} else {
    Write-Host "[BACKEND] Backend ya activo en 8050." -ForegroundColor Gray
}

# 5. Frontend Habana 13
Write-Host "[5/5] Verificando Frontend Habana 13 en 5175..." -ForegroundColor Yellow
$f = Get-NetTCPConnection -LocalPort 5175 -State Listen -ErrorAction SilentlyContinue
if (-not $f) {
    Write-Host "[FRONTEND] Arrancando Frontend Habana 13 (Vite)..." -ForegroundColor Green
    Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "F:\Habana 13\frontend"
    Start-Sleep -Seconds 3
} else {
    Write-Host "[FRONTEND] Frontend ya activo en 5175." -ForegroundColor Gray
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          HABANA 13 LEVANTADO CON EXITO                               " -ForegroundColor Green
Write-Host "          Panel Web: https://localhost:5175                           " -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
