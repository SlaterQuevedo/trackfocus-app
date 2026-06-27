// Monitoreo ligero de errores (Fase I). Registra fallos de Gemini, Supabase,
// sincronización y errores críticos en un buffer circular (localStorage, últimos 50)
// y en consola. Sin servicios externos. Se expone como window.Monitor para que
// los ganchos window.Monitor?.log?.(...) de toda la app lo usen.
// Acceso para depurar: Monitor.list(), Monitor.toText(), Monitor.exportLog().
const Monitor = (() => {

  const LS_KEY = 'arv-error-log';
  const MAX = 50;

  function _read() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (_) { return []; }
  }
  function _write(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(-MAX))); } catch (_) {}
  }
  function _safe(ctx) {
    if (ctx == null) return '';
    try { return typeof ctx === 'string' ? ctx : JSON.stringify(ctx); }
    catch (_) { return String(ctx); }
  }

  // type: 'arv-intelligence' | 'supabase' | 'sync' | 'critical' | 'info'
  function log(type, message, context) {
    const entry = {
      ts: new Date().toISOString(),
      type: type || 'info',
      message: String(message || ''),
      context: _safe(context)
    };
    const arr = _read();
    arr.push(entry);
    _write(arr);
    const tag = '[Monitor:' + entry.type + ']';
    if (entry.type === 'critical') console.error(tag, entry.message, context ?? '');
    else console.warn(tag, entry.message, context ?? '');
    return entry;
  }

  function list()  { return _read(); }
  function clear() { _write([]); }
  function toText() {
    return _read().map(e => `${e.ts} [${e.type}] ${e.message}${e.context ? (' :: ' + e.context) : ''}`).join('\n');
  }
  function exportLog() {
    const content = toText() || '(sin errores registrados)';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ariven-monitor-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // Endurecimiento de pantallas (pre-Eureka): envuelve render/wire de un registro
  // de pantallas en try/catch. Un fallo registra en el Monitor y muestra un
  // fallback amable en vez de pantalla blanca. No cambia el flujo: si todo va
  // bien, el comportamiento es idéntico al original.
  function safeScreens(moduleName, screens) {
    const fallback = `
      <div class="card" style="text-align:center;padding:48px 24px;max-width:520px;margin:40px auto;">
        <div style="font-size:44px;margin-bottom:8px;">🌿</div>
        <h2 style="margin:0 0 8px;">Algo no cargó del todo</h2>
        <p class="muted" style="margin:0 0 20px;">Tu información está a salvo. Recarga la página para volver a intentarlo.</p>
        <button class="primary" onclick="location.reload()">Recargar</button>
      </div>`;
    const out = {};
    for (const name in screens) {
      const def = screens[name] || {};
      out[name] = {
        render: (p) => {
          try { return def.render ? def.render(p) : ''; }
          catch (e) { log('render', `${moduleName}/${name} render falló`, e?.message); return fallback; }
        },
        wire: (p) => {
          try { return def.wire ? def.wire(p) : undefined; }
          catch (e) { log('render', `${moduleName}/${name} wire falló`, e?.message); }
        }
      };
    }
    return out;
  }

  const api = { log, list, clear, toText, exportLog, safeScreens };

  // Captura global de errores no atrapados (best-effort, acotada a 50 entradas).
  if (typeof window !== 'undefined') {
    window.Monitor = api;
    window.__tfSafeScreens = safeScreens;
    window.addEventListener('error', (e) => {
      try { log('critical', e.message || 'Error JS', (e.filename || '') + ':' + (e.lineno || '')); } catch (_) {}
    });
    window.addEventListener('unhandledrejection', (e) => {
      try { log('critical', 'Promesa no manejada', e.reason?.message || String(e.reason || '')); } catch (_) {}
    });

    // PerformanceObserver para Long Tasks (Chromium/Edge; falla silenciosamente en Safari/Firefox).
    // Registra tareas ≥50ms en el buffer circular sin costo cuando no hay tareas largas.
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const _perfObs = new PerformanceObserver((list) => {
          list.getEntries().forEach(function(entry) {
            if (entry.duration >= 50) {
              log('perf', 'Long task ' + Math.round(entry.duration) + 'ms',
                  (entry.attribution && entry.attribution[0] && entry.attribution[0].containerType) || 'window');
            }
          });
        });
        _perfObs.observe({ type: 'longtask', buffered: false });
      } catch (_) {}
    }
  }

  return api;
})();

