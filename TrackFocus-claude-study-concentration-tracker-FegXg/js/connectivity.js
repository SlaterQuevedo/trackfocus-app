// Conectividad + cola de reintento de sincronización (Fase B — tolerancia a fallos).
// Cuando vuelve internet, reintenta empujar al cloud lo que quedó pendiente
// (Storage.resync), con backoff escalonado. Muestra avisos discretos de estado.
// Reusa Storage.isDirty()/resync() y UI.flash() — no duplica lógica de datos.
const Connectivity = (() => {

  const BACKOFFS = [1000, 4000, 10000, 30000]; // ms — reintentos escalonados
  let _retryTimer = null;
  let _attempt = 0;

  function isOnline() {
    return (typeof navigator === 'undefined') ? true : navigator.onLine !== false;
  }

  async function _tryResync() {
    clearTimeout(_retryTimer);
    if (!isOnline()) return;
    // Nada pendiente → terminar.
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
    // Al cargar, si quedó algo pendiente de una sesión previa, reintentar tras estabilizar.
    if (isOnline()) setTimeout(_tryResync, 2000);
    // Red de seguridad: cubre fallos transitorios estando online (sin evento 'online').
    setInterval(() => {
      if (typeof Storage !== 'undefined' && Storage.isDirty && Storage.isDirty()) _tryResync();
    }, 20000);
  }

  // Auto-init cuando el DOM esté listo (Storage/UI ya cargados por orden de <script>).
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return { isOnline, resyncNow: _tryResync, init };
})();
