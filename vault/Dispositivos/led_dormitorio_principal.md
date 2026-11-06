---
id: led_dormitorio_principal
nombre: "Tira LED Dormitorio Principal"
estancia: "[[Estancias/Principal]]"
tipo: luz_real
potencia_w: 18
canal_potencia: " / "
conmutadas_count: 3
tags:
  - dispositivo
  - iluminacion
  - principal
---

# Tira LED Dormitorio Principal

Luz real perteneciente a la estancia **[[Estancias/Principal]]**.

## ⚡ Conexión Eléctrica
- **Actuador de Carga**: `` (Canal ``)
- **Consumo Estimado**: `18 W`

## 🔀 Interruptores Conmutados Vinculados
- Placa [[Dispositivos/principal_cama_izq]] (Canal `state_center`)
- Placa [[Dispositivos/principal_cama_der]] (Canal `state_center`)
- Placa [[Dispositivos/principal_armario]] (Canal `state_center`)

## 📊 Estado en Vivo
- Para consultar o conmutar: usar API HABANA `/api/devices/control` con ID `led_dormitorio_principal`.
