---
tipo: guia_creacion
sistema: HABANA Búnker IA
actualizado: 2026-11-02
tags:
  - bunker
  - widgets
  - macros
  - desarrollo
  - edicion
---

# 🛠️ Guía de Creación de Macros y Widgets en el Búnker

Esta guía explica la anatomía de los widgets del Búnker, cómo crearlos por voz o chat dirigiéndote a la **bola de IA**, cómo editarlos directamente desde la interfaz, y cómo interactúa el Frontend con el Backend.

---

## 🗣️ 1. Creación por Voz o Texto (Dirigiéndote a la Bola)

Puedes pedirle a Lola o al agente de IA cualquiera de estas solicitudes:
> *"Lola, crea en el Búnker una ventana con tres botones: uno que encienda todas las luces, otro que las apague y otro que ponga la radio."*

> *"Crea un widget para el salón con control de persianas y modo cine."*

> *"Añade un botón en el búnker para apagar la habitación de Andrea y poner Virgin Radio."*

El flujo interno es:
1. La IA recibe tu instrucción y llama al endpoint `POST /api/bunker/generate-widget` enviando `{ "prompt": "tu solicitud" }`.
2. El motor de conocimiento (`backend/app/bunker/knowledge.py`) analiza los comandos solicitados y mapea los dispositivos según el catálogo seguro.
3. El Gatekeeper (`gatekeeper.py`) valida los IDs y servicios.
4. El Storage (`storage.py`) crea automáticamente un snapshot Time Machine y guarda el widget en `bunker_manifest.json`.
5. El Frontend lo renderiza al instante en la pantalla del Búnker sin recargar la página.

---

## ✏️ 2. Edición y Ajuste en el Panel Directo

Cada widget en el panel del Búnker dispone ahora de un botón **"Editar"** en su cabecera:
1. **Modificación de Propiedades Visuales**:
   - **Título**: Cambia el nombre visible del widget.
   - **Icono**: Elige un icono rápido (🎛️, 💡, 🌑, 📻, 🎬, 👑, 🚪, 🛁, 🎀, 🛋️, ⚡, 🪟) o escribe cualquier emoji.
   - **Color Neón**: Paleta con selector visual (`#00f3ff`, `#10b981`, `#f59e0b`, `#ef4444`, `#a855f7`, `#3b82f6`).
   - **Categoría**: Clasificación (`macro`, `iluminacion`, `persianas`, `audio`, `relax`, `escena`, `clima`).
   - **Descripción**: Resumen editable del comportamiento.
2. **Ajuste de Botones y Acciones**:
   - Cambia el texto/etiqueta de cada botón (`label`).
   - Cambia el servicio (`light`, `cover`, `radio`, `scene`, `tts`).
   - Cambia la entidad destino (`all_lights`, `all_covers`, `radio_master`, o cualquier dispositivo real del catálogo).
   - Cambia la orden (`turn_on_all`, `turn_off_all`, `open`, `close`, `stop`, `toggle`, `play`, `activate`).
   - Cambia el estilo cromático del botón (`success`, `danger`, `info`, `warning`, `primary`, `secondary`).
   - **+ Añadir Botón**: Permite agregar botones adicionales a cualquier ventana.
   - **Eliminar Botón**: Retira botones específicos sin borrar el widget completo.
3. **Guardado Seguro**:
   - Al pulsar **"💾 Guardar Cambios"**, el sistema genera un snapshot en el Time Machine y actualiza el archivo `bunker_manifest.json` inmediatamente.

---

## 📐 3. Estructura JSON de un Widget

Cualquier widget almacenado en `backend/config/bunker_manifest.json` sigue este esquema:

```json
{
  "id": "widget_control_rapido",
  "title": "Control Rápido de Tomás",
  "icon": "🎛️",
  "category": "macro",
  "author": "IA Local",
  "description": "Encendido general, apagado general y radio",
  "color": "#00f3ff",
  "actions": [
    {
      "label": "💡 Encender Todo",
      "service": "light",
      "entity_id": "all_lights",
      "action": "turn_on_all",
      "style": "success"
    },
    {
      "label": "🌑 Apagar Todo",
      "service": "light",
      "entity_id": "all_lights",
      "action": "turn_off_all",
      "style": "danger"
    },
    {
      "label": "📻 Radio On / Off",
      "service": "radio",
      "entity_id": "radio_master",
      "action": "toggle",
      "style": "info"
    }
  ]
}
```

---

## 🎨 4. Estilos de Botones Disponibles

Puedes asignar los siguientes estilos visuales en la clave `"style"`:
- `success`: Borde verde esmeralda neón (`#10b981`), ideal para encendidos y activaciones.
- `danger`: Borde carmesí / rojo (`#ef4444`), ideal para apagados totales y detenciones.
- `info`: Borde cian cibernético (`#06b6d4`), ideal para radio, streaming y música.
- `warning`: Borde ámbar / naranja (`#f59e0b`), ideal para apertura de persianas y alertas.
- `primary`: Borde azul eléctrico (`#3b82f6`), ideal para persianas o conmutadas.
- `secondary`: Borde púrpura / magenta (`#a855f7`), ideal para escenas y modos ambientales.

---

## 🚀 5. Promoción a Producción

Cuando un widget creado en el Búnker funciona a la perfección y quieres que aparezca permanentemente en la vista oficial de tu casa:
1. Entra en la pestaña **Búnker**.
2. Haz clic en el botón verde con el icono de cohete **"Promocionar"**.
3. El widget quedará registrado en la configuración permanente de Habana.

---

## ⏳ 6. Restauración y Time Machine

Si un nuevo widget o cambio no te convence:
1. Haz clic en la pestaña lateral del Búnker en **Time Machine**.
2. Selecciona la versión anterior que deseas.
3. Haz clic en **"Restaurar Versión"**. El estado de todos los widgets volverá al segundo exacto anterior.

Enlace al catálogo: [[Bunker/CATALOGO_DISPOSITIVOS_Y_ENTIDADES]]
Enlace al índice del Búnker: [[Bunker/00_INDICE_BUNKER]]
