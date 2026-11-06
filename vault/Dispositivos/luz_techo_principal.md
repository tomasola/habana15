---
id: luz_techo_principal
nombre: "Luz Techo Dormitorio Principal"
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

# Luz Techo Dormitorio Principal

Luz real perteneciente a la estancia **[[Estancias/Principal]]**.

## ⚡ Conexión Eléctrica
- **Actuador de Carga**: `` (Canal ``)
- **Consumo Estimado**: `18 W`

## 🔀 Interruptores Conmutados Vinculados
- Placa [[Dispositivos/principal_ventana]] (Canal `state_left`)
- Placa [[Dispositivos/principal_cama_izq]] (Canal `state_left`)
- Placa [[Dispositivos/principal_cama_der]] (Canal `state_left`)

## 📊 Estado en Vivo
- Para consultar o conmutar: usar API HABANA `/api/devices/control` con ID `luz_techo_principal`.
