---
id: led_cama_andrea
nombre: "Tira LED Cabecero Cama Andrea"
estancia: "[[Estancias/Andrea]]"
tipo: luz_real
potencia_w: 18
canal_potencia: " / "
conmutadas_count: 2
tags:
  - dispositivo
  - iluminacion
  - andrea
---

# Tira LED Cabecero Cama Andrea

Luz real perteneciente a la estancia **[[Estancias/Andrea]]**.

## ⚡ Conexión Eléctrica
- **Actuador de Carga**: `` (Canal ``)
- **Consumo Estimado**: `18 W`

## 🔀 Interruptores Conmutados Vinculados
- Placa [[Dispositivos/andrea_placa_cama_izq]] (Canal `state_right`)
- Placa [[Dispositivos/andrea_placa_cama_der]] (Canal `state_right`)

## 📊 Estado en Vivo
- Para consultar o conmutar: usar API HABANA `/api/devices/control` con ID `led_cama_andrea`.
