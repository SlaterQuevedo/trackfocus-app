# Alineación de marca: TrackFocus → Ariven (revisión documental)

> **Alcance.** Revisión **documental**, sin tocar código ni infraestructura. Objetivo: que ningún
> material que vea el jurado diga "TrackFocus", **sin romper** identificadores técnicos reales.

## 1. Lo que YA está alineado (sin acción)

La **marca visible de la aplicación ya es "Ariven"**. Verificado en [index.html](../index.html):
`<title>`, `application-name`, `og:site_name`/`og:title`, Twitter cards, JSON-LD (`"name": "Ariven"`),
`canonical → https://ariven.vercel.app/`, y el header (`<span>Ariven</span>`). **El usuario final ve
"Ariven".**

## 2. Lo que se alineó en esta revisión (prosa de documentos)

Cambios **solo de texto humano**, no de identificadores:

- **`INFORME_INSTITUCIONAL.md`** — título "TrackFocus: …" → "**Ariven**: …" + nota aclaratoria.
- **`SETUP.md`** — título "TrackFocus — Setup…" → "**Ariven** — Setup…" + nota; y las referencias a la
  app que ve el usuario ("Inicia sesión… en **Ariven**", "Recarga **Ariven**").

## 3. Lo que se PRESERVÓ a propósito (no tocar sin programar/migrar)

Estas menciones de "TrackFocus" son **identificadores técnicos o de infraestructura reales**. Renombrarlas
rompería referencias o instrucciones. Quedan **fuera de alcance** (requerirían cambios de código/infra):

| Dónde | Qué | Por qué se conserva |
|---|---|---|
| `SETUP.md` | Proyecto Supabase `trackfocus`, app OAuth `TrackFocus` / `TrackFocus Web`, URL `track-focus.vercel.app` | Son recursos **ya creados** con ese nombre; cambiarlos en el doc lo haría incorrecto |
| Repo/deploy | `trackfocus-app` (en `INFORME_INSTITUCIONAL.md`, `vercel.json`, `package.json`) | Nombre real del repositorio/proyecto |
| Código | Prefijos CSS `tf-`, IDs, clases (p. ej. `tf-change-account-btn`), claves `localStorage` (`tf-theme` con respaldo) | Cambiarlos es **programar** y puede romper estilos/estado |
| Config | `site.webmanifest`, `.vscode/settings.json`, `supabase/schema.sql`, `api/ai-chat.js` | Identificadores internos / técnicos |
| Assets | `assets/logo-submarca.svg`, `assets/logo-icon.svg` (texto interno del SVG) | Archivos de diseño; renombrar es tarea de diseño/código |

## 4. Hallazgos que conviene revisar (banderas, NO corregidas aquí)

> No se corrigen porque tocan rutas/infraestructura y podrían introducir errores. Decisión del equipo.

- ⚠️ **Ruta desactualizada en `SETUP.md` (paso 6):** apunta a
  `TrackFocus-claude-study-concentration-tracker-FegXg/js/supabase-config.js`, que es la **carpeta
  duplicada/antigua**. El archivo activo es `js/supabase-config.js`. *Recomendación:* verificar y corregir
  la ruta cuando se trabaje el código.
- ⚠️ **URL de despliegue:** `index.html` usa `ariven.vercel.app` (canónica), pero `SETUP.md` menciona
  `track-focus.vercel.app`. *Recomendación:* confirmar cuál es la URL vigente y unificar.
- ⚠️ **Carpeta duplicada `TrackFocus-claude-study-concentration-tracker-FegXg/` y el `.zip`** en la raíz:
  copia antigua del proyecto. *Recomendación:* archivar/eliminar para evitar confusiones (tarea de
  mantenimiento, no documental).

## 5. Si el equipo quisiera un rebranding total (futuro, requiere programar)

Sería un trabajo de **código + infraestructura**, fuera de esta tarea: migrar claves `localStorage` con
retrocompatibilidad, renombrar prefijos `tf-`, crear/renombrar proyecto Supabase y app OAuth, y el repo.
**No es necesario para Eureka:** lo que el jurado ve (app y materiales) ya dice **Ariven**.
