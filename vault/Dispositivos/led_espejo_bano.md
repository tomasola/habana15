---
id: led_espejo_bano
nombre: "Tira LED Baño"
estancia: "[[Estancias/Bano]]"
tipo: luz_real
potencia_w: 18
canal_potencia: " / "
conmutadas_count: 1
tags:
  - dispositivo
  - iluminacion
  - bano
---

# Tira LED Baño

Luz real perteneciente a la estancia **[[Estancias/Bano]]**.

## ⚡ Conexión Eléctrica
- **Actuador de Carga**: `` (Canal ``)
- **Consumo Estimado**: `18 W`

## 🔀 Interruptores Conmutados Vinculados
- Placa [[Dispositivos/pasillo_bano_andrea]] (Canal `state_l2`)

## 📊 Estado en Vivo
- Para consultar o conmutar: usar API HABANA `/api/devices/control` con ID `led_espejo_bano`.
