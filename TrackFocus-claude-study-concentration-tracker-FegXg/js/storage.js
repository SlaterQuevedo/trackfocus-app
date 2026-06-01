// Storage cloud-backed con cache en memoria.
// API pública IDÉNTICA a la versión anterior (get / set / uuid / DEFAULT_STATE)
// para que sessions.js, schools.js, gamification.js, subjects.js, ui-*.js
// sigan funcionando sin cambios. El sync hacia Supabase ocurre transparentemente
// después de cada mutación (fire-and-forget, errores logueados).
const Storage = (() => {

  const DEFAULT_STATE = {
    schemaVersion: 2,
    currentUserId: null,

    users: {},
    schools: {},
    classrooms: {},
    sessions: [],
    uploadedFiles: {},
    availableRoles: [],  // NEW: roles disponibles para el usuario actual
    subjectsByInstitution: {
      colegio: ['Matemática', 'Comunicación', 'Física', 'Química', 'Inglés', 'Historia']
    },
    customSubjects: {},
    students: {},
    classroomRequests: {}
  };

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Snapshot profundo del estado para diffing posterior.
  function snapshot(s) { return JSON.parse(JSON.stringify(s)); }

  // Estado interno
  let state = structuredClone(DEFAULT_STATE);
  let booted = false;
  let pendingSync = Promise.resolve();

  // Tolerancia a fallos (Fase B): cache local + bandera de "pendiente de sync".
  const LS_CACHE = 'tf-state-cache';
  let _syncDirty = false;

  // ¿Estamos en modo demostración aislado? (Fase G). Nunca sincroniza ni cachea datos reales.
  function _isDemo() { return !!window.__TF_DEMO; }

  // Mirror del estado a localStorage → los datos sobreviven a una recarga aunque
  // no haya red. No se usa en modo demo para no contaminar el cache real.
  function _persistCache() {
    if (_isDemo()) return;
    try { localStorage.setItem(LS_CACHE, JSON.stringify(state)); } catch (_) {}
  }
  function _loadCache() {
    try { return JSON.parse(localStorage.getItem(LS_CACHE) || 'null'); } catch (_) { return null; }
  }

  // ----- Bootstrap: traer todo desde la nube tras autenticarse -----
  async function bootstrap() {
    if (!window.SB) {
      console.warn('[Storage] Supabase no configurado — modo desconectado (sólo lectura cache).');
      booted = false;
      return state;
    }
    try {
      state = await Cloud.bootstrap();
    } catch (e) {
      // Sin red al arrancar: si hay cache local, seguimos trabajando offline.
      const cached = _loadCache();
      if (cached) {
        console.warn('[Storage] bootstrap sin red → usando cache local. Se sincronizará al reconectar.');
        window.Monitor?.log?.('sync', 'bootstrap offline → cache local', e?.message);
        state = cached;
        booted = true;
        _syncDirty = true;
        return state;
      }
      throw e;
    }

    // NEW: Cargar availableRoles para el usuario actual
    const activeRole = Auth.getActiveRole?.();
    if (activeRole?.email) {
      try {
        const rolesRes = await window.SB
          .from('user_roles')
          .select('*')
          .eq('email', activeRole.email);
        state.availableRoles = rolesRes.data || [];
      } catch (err) {
        console.warn('[Storage] Error loading available roles:', err);
        state.availableRoles = [];
      }
    }

    booted = true;
    return state;
  }

  // Carga el currentUserId desde la sesión auth de Supabase (si existe)
  function setCurrent(userId) {
    state.currentUserId = userId;
  }

  function clear() {
    state = structuredClone(DEFAULT_STATE);
    booted = false;
    _syncDirty = false;
    // Privacidad en equipos compartidos (colegio): no dejar datos en el cache tras salir.
    try { localStorage.removeItem(LS_CACHE); } catch (_) {}
  }

  // ----- API pública -----

  function get() { return state; }

  // set(mutator): muta el estado y, si estamos booteados con cloud,
  // dispara un sync por diff hacia Supabase. NO bloquea — devuelve inmediato.
  // Para esperar a que termine el último sync, llama a Storage.flush().
  function set(mutator) {
    // Modo demo (Fase G): muta sólo en memoria, jamás toca Supabase ni el cache real.
    if (_isDemo()) { mutator(state); return; }

    if (!booted || !window.SB) {
      // Modo desconectado: muta y guarda en cache local (sobrevive recarga).
      mutator(state);
      _persistCache();
      return;
    }
    const before = snapshot(state);
    mutator(state);
    const after = snapshot(state);
    _persistCache();
    pendingSync = pendingSync
      .then(() => Cloud.syncDiff(before, after))
      .catch(e => {
        // El sync falló (red caída, etc.): marcamos pendiente. La bandera es "sticky":
        // sólo un resync() completo y exitoso la limpia (evita falsos "limpio" y pérdida de datos).
        // connectivity.js reintenta al reconectar y periódicamente.
        _syncDirty = true;
        console.error('[Storage] cloud sync error (pendiente de reintento):', e);
      });
  }

  async function flush() {
    try { await pendingSync; } catch (_) {}
  }

  // Reintenta empujar al cloud SÓLO los datos propios del usuario (upserts idempotentes
  // → sin duplicados). Se acota a lo que RLS permite escribir para no chocar con filas de
  // compañeros/aulas que se leen pero no se pueden modificar. La llama connectivity.js.
  async function resync() {
    if (_isDemo() || !booted || !window.SB || !_syncDirty) return;
    const uid = state.currentUserId;
    if (!uid) return;

    // Sub-estado con SOLO lo escribible por este usuario.
    const scoped = structuredClone(DEFAULT_STATE);
    if (state.users[uid]) scoped.users[uid] = state.users[uid];
    scoped.sessions = (state.sessions || []).filter(s => s.email === uid);
    if (state.customSubjects[uid]) scoped.customSubjects[uid] = state.customSubjects[uid];
    for (const [id, f] of Object.entries(state.uploadedFiles || {})) {
      if (f.userId === uid) scoped.uploadedFiles[id] = f;
    }
    for (const [id, r] of Object.entries(state.classroomRequests || {})) {
      if (r.studentId === uid) scoped.classroomRequests[id] = r;
    }

    try {
      await Cloud.syncDiff(structuredClone(DEFAULT_STATE), snapshot(scoped));
      _syncDirty = false;
      window.Monitor?.log?.('sync', 'resync OK tras reconexión');
      console.info('[Storage] resync completado tras reconexión.');
    } catch (e) {
      _syncDirty = true;
      console.error('[Storage] resync falló, se reintentará:', e);
    }
  }

  function isDirty() { return _syncDirty; }

  // ----- Realtime: cuando otro dispositivo modifica datos, re-bootstrap el cache -----

  let _realtimeBound = false;
  function bindRealtime(onAfterRefresh) {
    if (_realtimeBound || !window.SB) return;
    _realtimeBound = true;
    let _refreshTimer = null;
    Cloud.subscribeRealtime(() => {
      // Debounce: si llegan varios cambios en ráfaga, hacemos un solo refresh
      clearTimeout(_refreshTimer);
      _refreshTimer = setTimeout(async () => {
        try {
          const currentUserId = state.currentUserId;
          state = await Cloud.bootstrap();
          state.currentUserId = currentUserId;
          if (typeof onAfterRefresh === 'function') onAfterRefresh();
        } catch (e) {
          console.error('[Storage] realtime refresh error:', e);
        }
      }, 400);
    });
  }

  return {
    get,
    set,
    bootstrap,
    setCurrent,
    clear,
    flush,
    resync,
    isDirty,
    bindRealtime,
    uuid,
    DEFAULT_STATE,
    isBooted: () => booted
  };
})();
