---
id: led_foso_andrea
nombre: "Tira LED Foso Entrada Andrea"
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

# Tira LED Foso Entrada Andrea

Luz real perteneciente a la estancia **[[Estancias/Andrea]]**.

## ⚡ Conexión Eléctrica
- **Actuador de Carga**: `` (Canal ``)
- **Consumo Estimado**: `18 W`

## 🔀 Interruptores Conmutados Vinculados
- Placa [[Dispositivos/andrea_placa_entrada]] (Canal `state_left`)
- Placa [[Dispositivos/andrea_placa_ventana]] (Canal `state_right`)

## 📊 Estado en Vivo
- Para consultar o conmutar: usar API HABANA `/api/devices/control` con ID `led_foso_andrea`.
