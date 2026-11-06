---
id: luz_techo_pasillo
nombre: "Luz Techo Pasillo"
estancia: "[[Estancias/Pasillo]]"
tipo: luz_real
potencia_w: 18
canal_potencia: " / "
conmutadas_count: 2
tags:
  - dispositivo
  - iluminacion
  - pasillo
---

# Luz Techo Pasillo

Luz real perteneciente a la estancia **[[Estancias/Pasillo]]**.

## ⚡ Conexión Eléctrica
- **Actuador de Carga**: `` (Canal ``)
- **Consumo Estimado**: `18 W`

## 🔀 Interruptores Conmutados Vinculados
- Placa [[Dispositivos/pasillo_habitacion]] (Canal `state_l2`)
- Placa [[Dispositivos/pasillo_cocina]] (Canal `state_l2`)

## 📊 Estado en Vivo
- Para consultar o conmutar: usar API HABANA `/api/devices/control` con ID `luz_techo_pasillo`.
