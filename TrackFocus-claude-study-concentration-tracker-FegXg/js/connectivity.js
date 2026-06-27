// Conectividad + cola de reintento de sincronización (Fase B — tolerancia a fallos).
// Cuando vuelve internet, reintenta empujar al cloud lo que quedó pendiente
// (Storage.resync), con backoff escalonado. Muestra avisos discretos de estado.
// Reusa Storage.isDirty()/resync() y UI.flash() — no duplica lógica de datos.
const Connectivity = (() => {

  const BACKOFFS = [1000, 4000, 10000, 30000]; // ms — reintentos escalonados
  let _retryTimer    = null;
  let _pollIntervalId = null;
  let _attempt = 0;

  function isOnline() {
    return (typeof navigator === 'undefined') ? true : navigator.onLine !== false;
  }

  async function _tryResync() {
    clearTimeout(_retryTimer);
    if (!isOnline()) return;
    // Reintentar también la cola del piloto (Fase C), independiente del estado.
    if (typeof Pilot !== 'undefined' && Pilot.flushOutbox) Pilot.flushOutbox();
    // Nada pendiente en el estado → terminar.
    if (typeof Storage === 'undefined' || !Storage.isDirty || !Storage.isDirty()) {
      _attempt = 0;
      return;
    }
    await Storage.resync();
    if (Storage.isDirty()) {
      // Sigue pendiente: programar reintento con backoff creciente.
      const delay = BACKOFFS[Math.min(_attempt, BACKOFFS.length - 1)];
      _attempt++;
      _retryTimer = setTimeout(_tryResync, delay);
    } else {
      _attempt = 0;
      UI?.flash?.('Conexión restablecida. Tus datos se sincronizaron. ✅', 'success');
    }
  }

  function _onOnline() {
    _attempt = 0;
    _tryResync();
  }

  function _onOffline() {
    UI?.flash?.('Sin conexión. Tu progreso se guarda en este dispositivo y se sincronizará al volver. 📶', 'info');
  }

  function init() {
    window.addEventListener('online', _onOnline);
    window.addEventListener('offline', _onOffline);
    // Al cargar, si quedó algo pendiente, diferir a tiempo libre del navegador.
    if (isOnline()) {
      var _ric = 'requestIdleCallback' in window
        ? function(fn) { requestIdleCallback(fn, { timeout: 3000 }); }
        : function(fn) { setTimeout(fn, 200); };
      _ric(_tryResync);
    }
    // Red de seguridad: cubre fallos transitorios estando online (sin evento 'online').
    _startPoll();
  }

  function _startPoll() {
    if (_pollIntervalId) return;
    _pollIntervalId = setInterval(() => {
      if (!isOnline()) return;
      const stateDirty = (typeof Storage !== 'undefined' && Storage.isDirty && Storage.isDirty());
      const pilotPending = (typeof Pilot !== 'undefined' && Pilot.pendingCount && Pilot.pendingCount() > 0);
      if (stateDirty || pilotPending) _tryResync();
    }, 20000);
  }

  function pausePoll() {
    if (_pollIntervalId) { clearInterval(_pollIntervalId); _pollIntervalId = null; }
  }

  function resumePoll() {
    _startPoll();
    // Reintento inmediato por si hubo cambios mientras la pestaña estuvo oculta.
    if (isOnline()) {
      var _r = 'requestIdleCallback' in window
        ? function(fn) { requestIdleCallback(fn, { timeout: 3000 }); }
        : function(fn) { setTimeout(fn, 200); };
      _r(_tryResync);
    }
  }

  // Auto-init cuando el DOM esté listo (Storage/UI ya cargados por orden de <script>).
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return { isOnline, resyncNow: _tryResync, init, pausePoll, resumePoll };
})();
