// Sistema de Metas (Fase 9 V2): objetivos semanales que el alumno puede ajustar.
// Persisten por usuario en localStorage; los valores actuales se calculan desde
// las sesiones y la gamificación en el dashboard.
const Goals = (() => {

  const KEY = uid => `tf-goals-${uid || 'anon'}`;
  const DEFAULTS = { studyHours: 5, sessions: 3, streak: 7, learningIndex: 70 };
  const LIMITS = { studyHours: [1, 60], sessions: [1, 30], streak: [1, 60], learningIndex: [10, 100] };

  function get(uid) {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY(uid)) || '{}') || {}; } catch (_) {}
    return { ...DEFAULTS, ...saved };
  }

  function set(uid, key, value) {
    if (!(key in DEFAULTS)) return get(uid);
    const [min, max] = LIMITS[key];
    const v = Math.max(min, Math.min(max, Math.round(Number(value) || DEFAULTS[key])));
    const goals = get(uid);
    goals[key] = v;
    try { localStorage.setItem(KEY(uid), JSON.stringify(goals)); } catch (_) {}
    return goals;
  }

  return { get, set, DEFAULTS, LIMITS };
})();
