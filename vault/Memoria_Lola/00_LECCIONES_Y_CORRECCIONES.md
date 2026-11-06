---
tipo: base_de_conocimiento_adaptativa
sistema: HABANA Cognitive Core
actualizado: 2026-11-03 13:02:29
total_lecciones: 4
lecciones_activas: 4
tags:
  - lecciones_aprendidas
  - auto_aprendizaje
  - feedback_loop
  - correcciones_tomas
---

# 🧠 Lecciones Aprendidas y Reglas de Corrección de Tomás

Este documento contiene las reglas acumuladas por **HABANA** a partir de fallos previos, aclaraciones y correcciones directas de **Tomás**.
El orquestador de IA consulta estas lecciones de forma preventiva con **MÁXIMA PRIORIDAD** antes de ejecutar cualquier comando.

---

## 📌 Reglas Activas (4)

### [LECCION-20261103-130229] Encendido general (✅ ACTIVA)
- **📅 Fecha**: `2026-11-03 13:02:29` | **Fuente**: [[Personas/Tomas]]
- **⚠️ Fallo previo evitado**: No se especificó si incluir tiras LED
- **🛠️ Corrección indicada**: Incluir todas las luces y tiras
- **🎯 Regla de oro aprendida**: **Al pedir encender luces de una habitación, encender bombillas y tiras LED**

---

### [LECCION-20261103-130121] Apagado Tiras LED (✅ ACTIVA)
- **📅 Fecha**: `2026-11-03 13:01:21` | **Fuente**: [[Personas/Tomas]]
- **⚠️ Fallo previo evitado**: No especificó habitación
- **🛠️ Corrección indicada**: Apagar todas las tiras LED disponibles
- **🎯 Regla de oro aprendida**: **"tiraned" o similar se interpreta como apagado de todas las tiras LED del hogar**

---

### [LECCION-20261102-01] Apagado General de Luces (✅ ACTIVA)
- **📅 Fecha**: `2026-11-02 21:47:30` | **Fuente**: [[Personas/Tomas]]
- **⚠️ Fallo previo evitado**: Dejar tiras LED o pilotos encendidos al pedir apagar todo
- **🛠️ Corrección indicada**: El protocolo de apagado general debe abarcar TODOS los IDs de luz y tiras LED sin excepción
- **🎯 Regla de oro aprendida**: **Al pedir 'apaga todo' o 'buenas noches', emitir apagado para todas las bombillas y tiras registradas**

---

### [LECCION-20261102-02] Luz de Fondo en Interruptores (✅ ACTIVA)
- **📅 Fecha**: `2026-11-02 22:15:00` | **Fuente**: [[Personas/Tomas]]
- **⚠️ Fallo previo evitado**: Activar el piloto de fondo creyendo que es una luz de techo
- **🛠️ Corrección indicada**: Las entidades con nombre 'Luz de fondo' son solo el piloto LED indicador de pared
- **🎯 Regla de oro aprendida**: **Nunca encender 'Luz de fondo' salvo que el usuario lo pida de forma explícita**

---

