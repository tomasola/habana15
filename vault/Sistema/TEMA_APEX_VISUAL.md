---
tipo: especificacion_diseno
modulo: Motor Chameleon UI
tema: APEX VISUAL
actualizado: 2026-11-02
tags:
  - apex
  - diseño
  - ui
  - hud
  - cyberpunk
---

# 🎯 APEX VISUAL · Motor Estético Militar-Cyberpunk de HABANA

Inspirado en la dirección de arte y los sistemas HUD tácticos de **Apex Legends**, este tema transforma la interfaz de Habana en un panel de mando militar de ciencia ficción con geometría angular cortada a 45°, fibra de carbono y alto contraste.

---

## 🎨 1. Paleta de Color de Alto Impacto
- **Fondo Primario Charcoal**: `#07090C` y `#0B0D12` (Negro carbón mate y grafito profundo).
- **Paneles y Tarjetas Modulares**: `#12151C` y `#1A1E27` con textura de titanio cepillado.
- **Apex Orange Neón (Acento Maestro)**: `#FF4612` (Bordes activos, indicadores luminosos, resaltados).
- **Apex Crimson (Contraste Militar)**: `#DA292A` (Badges de campeón, alertas tácticas).
- **Tactical Cyan HUD**: `#00F3FF` (Métricas de escudo, sensores, telemetría y botón del Búnker IA).
- **Blanco Puro de Alto Contraste**: `#FFFFFF` para tipografía principal y encabezados.

---

## 📐 2. Geometría Angular & Biseles a 45° (Chamfered Edges)
- **Marcos Biselados**: Cada botón y contenedor lateral aplica `clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 8px 100%, 0 calc(100% - 8px))` eliminando los bordes redondeados tradicionales y aportando un aspecto balístico/armado.
- **Hazard Warning Stripes**: Franjas diagonales de advertencia táctica a 45° (`repeating-linear-gradient`) en pie de página y cabeceras.
- **Tactical Corner Brackets**: Corchetes L tácticos en las esquinas de los módulos principales (`::before` en naranja y `::after` en cian).

---

## 🔤 3. Tipografía Industrial Condensada & Monospace
- **Títulos y Botones HUD**: Fuentes condensadas pesadas `Teko` y `Rajdhani` con tracking espaciado y mayúsculas completas.
- **Datos y Métricas Numéricas**: `JetBrains Mono` con espaciado monoespaciado para telemetría en tiempo real (`<2 MS`, `100% ONLINE`, etc.).

---

## 🕹️ 4. Elementos del HUD Táctico
- **Cabecera de Combate**:
  - `APEX PROTOCOL // [PESTAÑA ACTIVA]`.
  - Telemetría en vivo: `SHIELD: 100% (LVL 3)`, `LATENCY: <2 MS`, `SECTOR: HABANA_MAIN`.
  - Distintivo de Campeón: `👑 CHAMPION TOMÁS`.
- **Navegación Táctica Numerada**:
  - `01 // PRINCIPAL`
  - `02 // NEURAL NET`
  - `03 // COMMS LINK`
  - `04 // IOT MESH`
  - `05 // SYSTEM PREFS`
  - `06 // AUDIT LOGS`
  - `07 // BÚNKER IA` (Con acento cian táctico)

---

## 🚀 Activación en 1 Clic
Para activar este tema:
1. Abre Habana y entra en **Configuración (⚙️ System Prefs)**.
2. Ve a la sección **Ajustes Visuales**.
3. Selecciona la tarjeta **APEX VISUAL**.
