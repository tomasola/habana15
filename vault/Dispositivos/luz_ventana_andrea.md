---
id: luz_ventana_andrea
nombre: "Luz Oculta Viga / Ventana Andrea"
estancia: "[[Estancias/Andrea]]"
tipo: luz_real
potencia_w: 18
canal_potencia: " / "
conmutadas_count: 3
tags:
  - dispositivo
  - iluminacion
  - andrea
---

# Luz Oculta Viga / Ventana Andrea

Luz real perteneciente a la estancia **[[Estancias/Andrea]]**.

## ⚡ Conexión Eléctrica
- **Actuador de Carga**: `` (Canal ``)
- **Consumo Estimado**: `18 W`

## 🔀 Interruptores Conmutados Vinculados
- Placa [[Dispositivos/andrea_placa_entrada]] (Canal `state_right`)
- Placa [[Dispositivos/andrea_placa_cama_izq]] (Canal `state_left`)
- Placa [[Dispositivos/andrea_placa_cama_der]] (Canal `state_left`)

## 📊 Estado en Vivo
- Para consultar o conmutar: usar API HABANA `/api/devices/control` con ID `luz_ventana_andrea`.
