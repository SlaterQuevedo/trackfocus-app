// Monitoreo ligero de errores (Fase I). Registra fallos de Gemini, Supabase,
// sincronización y errores críticos en un buffer circular (localStorage, últimos 50)
// y en consola. Sin servicios externos. Se expone como window.Monitor para que
// los ganchos window.Monitor?.log?.(...) de toda la app lo usen.
// Acceso para depurar: Monitor.list(), Monitor.toText(), Monitor.exportLog().
const Monitor = (() => {

  const LS_KEY = 'tf-error-log';
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

  // type: 'gemini' | 'supabase' | 'sync' | 'critical' | 'info'
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
    a.download = `trackfocus-monitor-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const api = { log, list, clear, toText, exportLog };

  // Captura global de errores no atrapados (best-effort, acotada a 50 entradas).
  if (typeof window !== 'undefined') {
    window.Monitor = api;
    window.addEventListener('error', (e) => {
      try { log('critical', e.message || 'Error JS', (e.filename || '') + ':' + (e.lineno || '')); } catch (_) {}
    });
    window.addEventListener('unhandledrejection', (e) => {
      try { log('critical', 'Promesa no manejada', e.reason?.message || String(e.reason || '')); } catch (_) {}
    });
  }

  return api;
})();
