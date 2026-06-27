# Informe técnico — Ariven: de prototipo a plataforma institucional

> Nota: el proyecto se llama **Ariven** (antes *TrackFocus*). Los identificadores técnicos que conservan
> su nombre original (p. ej. el repo `trackfocus-app`) se mantienen a propósito; ver `eureka/ALINEACION.md`.

**Rama de trabajo:** `feature/institucional` (12 commits, uno por fase → rollback aislado con `git revert`).
**Stack (sin cambios):** JavaScript vanilla + HTML/CSS + Supabase + Gemini (proxy serverless) + Vercel.
**Alcance:** Fases A–L solicitadas. No se migró a React/Next.js. No se eliminó ninguna función existente.

> ⚠️ **Importante:** estos cambios están en una **rama git** y en tu **carpeta local**. Aún **no** se han
> subido a GitHub `trackfocus-app` ni desplegado. Ver "Cómo desplegar" al final. **No se ha probado en
> navegador en este entorno** (no había Node ni navegador) — la validación fue estática (revisión de
> código, orden de carga, dependencias). **Debes probar en el navegador** con la checklist incluida.

---

## 1. Archivos modificados (22)
**Nuevos:** `js/connectivity.js`, `js/pilot.js`, `js/quiz.js`, `js/monitor.js`, `js/demo.js`,
`js/ui-eureka.js`.
**Modificados:** `index.html`, `assets/styles.css`, `assets/styles-gamification.css`,
`js/app.js`, `js/storage.js`, `js/cloud.js`, `js/ui-student.js`, `js/ui-teacher.js`, `js/charts.js`,
`js/export.js`, `js/auth.js`, `api/ai-chat.js`, `supabase/schema.sql`.
**Eliminados (código muerto):** `api/ai-chat-fallback.js`, `api/transcribe.js`, `DEBUG_ADMIN.js`.

## 2. Cambios por fase
- **A · Móvil:** chat del tutor `100vh→100dvh` (el teclado ya no tapa el input); `pom-bar` con
  `flex-wrap` (sin desborde en 320px) y controles táctiles ≥44px; modales con scroll en pantallas cortas.
- **B · Tolerancia a fallos:** tarjeta de contingencia del tutor (caída de Gemini → seguir con Pomodoro
  o reintentar, sin perder la sesión); persistencia del estado en localStorage (sobrevive recarga sin
  red); cola de reintento con backoff (1/4/10/30s) y red de seguridad cada 20s; `insert→upsert`
  (sin duplicados al reintentar).
- **F · Seguridad:** eliminada la contraseña `ADMIN_PASSWORD` hardcodeada (repo público); auditoría
  confirma que no quedan otros secretos en el front ni en `api/`.
- **C · Piloto científico:** tabla `pilot_analytics` **anónima** (hash SHA-256 del email) + RLS;
  mini-quiz IA de 3 preguntas **(mismas pre y post → comparación válida)**; registro con cola offline.
- **E · Consentimiento (LPDP):** columnas `parental_consent`/`consent_at`; pantalla de consentimiento
  que bloquea el acceso al panel; **sin consentir no se registra ningún dato del piloto**.
- **D · Dashboard + reportes:** tarjeta "Piloto científico" en el panel docente; **Reporte semanal
  imprimible** (docentes/padres/directivos, guardable como PDF); CSV del piloto.
- **H · Dashboard Eureka:** vista de exposición con KPIs grandes, gráfico de crecimiento (CSS puro) y
  mejora de aprendizaje; botón "🏆 Vista Eureka" en el panel docente.
- **G · Demo Mode:** `?demo=1` (docente→Eureka) o `?demo=student` carga datos ficticios completos
  **sin internet y sin tocar datos reales** (aislamiento total).
- **I · Monitoreo:** `window.Monitor` registra errores (gemini/supabase/sync/críticos) en localStorage;
  acceso por consola `Monitor.exportLog()`.
- **J · Backups:** botones de **Backup (JSON)** y **Restaurar** + CSV en el panel docente.
- **K · Rendimiento:** Chart.js con **carga diferida** (no en el arranque); sin re-render durante el
  chat/modales; eliminado código muerto.
- **L · Gamificación:** top de estudiantes en Eureka reusando el motor existente. **`gamification.js`
  NO se tocó** (regresión cero).

## 3. Problemas encontrados (causa raíz)
- 🔴 Chat con `100vh` → el teclado móvil tapaba el input. **Fix:** `100dvh`.
- 🔴 Caída de Gemini sin alternativa → la demo podía "romperse". **Fix:** contingencia + Pomodoro.
- 🔴 `ADMIN_PASSWORD` en repo público. **Fix:** eliminada (acceso admin gated por email).
- 🟠 `Storage` solo en memoria → sesión offline se perdía al recargar. **Fix:** cache localStorage + resync.
- 🟠 Sin tabla de impacto ni consentimiento. **Fix:** `pilot_analytics` anónima + gate de consentimiento.

## 4. Soluciones aplicadas
Detalladas en §2. Patrón transversal: cambios **aditivos**, idempotentes en SQL, con degradación
elegante (si la IA o la red fallan, la app sigue usable) y sin alterar gamificación/historial/temporizador.

## 5. Mejoras de rendimiento
Chart.js diferido (menos RAM/CPU/red al iniciar); Eureka con gráfico en CSS puro; re-render del realtime
evitado durante chat/modales; `defer` ya presente; deploy más liviano sin código muerto.

## 6. Mejoras de seguridad y privacidad
Contraseña hardcodeada eliminada; consentimiento parental obligatorio (LPDP); datos del piloto
anonimizados (hash irreversible, sin PII); RLS existente ya aísla los datos por estudiante; la clave de
Gemini sigue solo en Vercel (variable de entorno).

## 7. Riesgos residuales
- **Sin pruebas automatizadas ni verificación en navegador en este entorno** → requiere tu prueba manual.
- El mini-quiz depende de Gemini; si falla, la sesión continúa pero sin puntaje pre/post (degradación esperada).
- `resync` re-empuja solo datos del propio usuario (las ediciones offline de un docente sobre aulas no se reintentan).
- Cuotas gratuitas de Gemini/Supabase pueden limitar pilotos grandes.
- "Restaurar" backup es una **vista local** (no sobrescribe la nube) por seguridad.

## 8. Cómo desplegar (pasos)
1. **Supabase:** ejecuta `supabase/schema.sql` completo en el SQL Editor (crea `pilot_analytics`,
   columnas de consentimiento y políticas; es idempotente). **Obligatorio antes de desplegar.**
2. **GitHub:** sube los archivos modificados/nuevos a `trackfocus-app` (repo plano). Incluye las carpetas
   `js/`, `api/`, `assets/`, `index.html`. Borra en el repo `api/ai-chat-fallback.js`, `api/transcribe.js`,
   `DEBUG_ADMIN.js`.
3. **Vercel:** redeploy automático. La variable `GEMINI_API_KEY` no cambia.
4. **Rollback:** `git revert <commit-de-fase>` o Instant Rollback en Vercel.

## 9. Checklist de verificación (pruébalo en el navegador)
- [ ] Móvil (DevTools 360–414px): el chat no desborda; el teclado no tapa el input; pom-bar sin scroll horizontal.
- [ ] Tutor: con `/api/ai-chat` bloqueado (DevTools→Network) aparece la tarjeta de contingencia + Pomodoro.
- [ ] Offline: crear sesión sin red → reconectar → la fila aparece en Supabase **una sola vez**.
- [ ] Sesión IA: quiz inicial → chat → quiz final → fila **anónima** en `pilot_analytics` (verifica que `student_hash` no revela el email).
- [ ] Consentimiento: cuenta nueva → pantalla de consentimiento bloquea el panel; sin aceptar no hay filas de piloto.
- [ ] Docente: panel con tarjeta "Piloto científico"; "Reporte semanal" abre PDF imprimible; CSV descarga.
- [ ] Eureka: `?demo=1` **sin internet** → dashboards y Eureka poblados; verifica que NO aparecen filas nuevas en Supabase.
- [ ] Gamificación: registrar una sesión real → XP/badge/racha siguen sumando igual que antes.
- [ ] Consola (F12): sin errores en rojo.

## Estado final
Las 12 fases (A–L) están implementadas y commiteadas en `feature/institucional`. La plataforma es más
estable, tolerante a fallos, medible (piloto anónimo con quiz pre/post), defendible (consentimiento +
anonimización), demostrable sin internet (Demo Mode) y más liviana. Pendiente: ejecutar el SQL, subir a
GitHub y **validar con la checklist** antes de la feria.
