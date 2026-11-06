---
tipo: guia_migracion
hardware: Intel N100 (4C/4T) / 12 GB RAM
hipervisor: Proxmox VE 8.x
sistema: HABANA 12 + Ollama + Obsidian
actualizado: 2026-10-26
tags:
  - proxmox
  - migracion
  - hardware
  - n100
  - ollama
---

# 🚀 Plan de Migración: HABANA 12 + IA Local a Proxmox (Intel N100)

Esta guía detalla el despliegue de producción cuando se reciba el Mini PC con procesador **Intel N100** y **12 GB de RAM**.

---

## 🎯 Arquitectura de Contenedores en Proxmox

Para maximizar el rendimiento y aislar la IA del control domótico sin sobrecargar el procesador, se utilizarán **dos contenedores LXC**:

```
[ MINI PC INTEL N100 (12 GB RAM / 512 GB SSD NVMe) ]
 ├── Proxmox VE 8 (Host OS Debian 12)       [1.0 GB RAM]
 │
 ├── CT 100: habana-core (LXC Debian 12)    [2.0 GB RAM / 4 Cores]
 │    ├─ Passthrough USB Sonoff Dongle (/dev/ttyUSB0)
 │    ├─ Mosquitto MQTT Broker (Puerto 1883)
 │    ├─ Zigbee2MQTT Daemon (Puerto 8090)
 │    ├─ WhatsApp Bridge Baileys (Puerto 3000)
 │    ├─ FastAPI Backend (Puerto 8050)
 │    ├─ Nginx / Vite Frontend (Puerto 5175 / 80 / 443)
 │    └─ Bóveda Obsidian (/data/vault)
 │
 └── CT 200: habana-ai (LXC Debian/Ubuntu)  [5.0 GB RAM / 4 Cores]
      ├─ Servidor Ollama (Puerto 11434)
      ├─ Modelo: Llama 3.2 3B (o Qwen 2.5 3B) para reflejos y Obsidian
      └─ Modelo Opcional: DeepSeek-R1-Distill-Qwen-7B para análisis
```

---

## 📋 Pasos de Ejecución para la Migración

### 1. Preparación del USB Passthrough (Sonoff Zigbee Dongle)
En el host Proxmox, identificar el ID del dongle:
```bash
ls -l /dev/serial/by-id/
# Ejemplo: /dev/serial/by-id/usb-Silicon_Labs_CP2102N...
```
Añadirlo al archivo `/etc/pve/lxc/100.conf` para que el contenedor LXC tenga acceso directo sin pérdida de milisegundos:
```conf
lxc.cgroup2.devices.allow: c 188:* rwm
lxc.mount.entry: /dev/ttyUSB0 dev/ttyUSB0 none bind,optional,create=file
```

### 2. Copia de la Bóveda de Obsidian y Datos
La carpeta `F:\Habana 12\vault` se copia directamente al directorio compartido de Proxmox (ej. `/mnt/storage/obsidian_vault`).
Se monta en ambos contenedores mediante un **Bind Mount** en `/etc/pve/lxc/100.conf`:
```conf
mp0: /mnt/storage/obsidian_vault,mp=/data/vault
```
*Ventaja*: El backend y la IA leen y escriben en los mismos archivos `.md` simultáneamente.

### 3. Sincronización de Obsidian con el Móvil y la Tablet
Para editar o ver las notas desde la tablet o móvil Android sin depender de la nube de Obsidian:
- Instalar **Syncthing** en el contenedor LXC 100.
- Emparejarlo con la app de Syncthing en la tablet.
- Los cambios hechos por la IA en casa aparecen en la tablet en 2 segundos de forma 100% local.

---

## ⚡ Rendimiento Estimado en el N100
- **Consumo energético**: ~6 Watts en reposo, ~14 Watts a plena carga de IA.
- **Velocidad de respuesta Llama 3.2 3B**: ~18 tokens/segundo (suficiente para que Lola responda en menos de 1 segundo).
- **Estabilidad**: 0 ventiladores ruidosos, 100% silencioso y encendido las 24 horas del día sin degradación.
