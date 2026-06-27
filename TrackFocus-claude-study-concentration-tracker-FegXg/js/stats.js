// Cálculos estadísticos sobre las sesiones.
const Stats = (() => {

  // Memoización: clave = nombre_función + sessions.length + datetime de la última sesión.
  // Se invalida automáticamente al agregar o eliminar sesiones.
  const _memo = new Map();
  const _MEMO_MAX = 20;

  function _memoGet(fn, sessions) {
    if (!sessions.length) return null;
    const last = sessions[sessions.length - 1];
    const key = `${fn}:${sessions.length}:${last.datetime || last.id || ''}`;
    return _memo.has(key) ? _memo.get(key) : null;
  }

  function _memoSet(fn, sessions, value) {
    if (!sessions.length) return value;
    const last = sessions[sessions.length - 1];
    const key = `${fn}:${sessions.length}:${last.datetime || last.id || ''}`;
    if (_memo.size >= _MEMO_MAX) _memo.delete(_memo.keys().next().value);
    _memo.set(key, value);
    return value;
  }

  function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function hourBucket(iso) {
    const h = new Date(iso).getHours();
    if (h < 6) return 'Madrugada (00–06)';
    if (h < 12) return 'Mañana (06–12)';
    if (h < 18) return 'Tarde (12–18)';
    return 'Noche (18–24)';
  }

  function summary(sessions) {
    const hit = _memoGet('summary', sessions);
    if (hit) return hit;
    const total = sessions.length;
    const totalMin = sessions.reduce((a, s) => a + s.durationMin, 0);
    const avgConc = +avg(sessions.map(s => s.concentration)).toFixed(2);
    const avgDur = total ? Math.round(totalMin / total) : 0;
    return _memoSet('summary', sessions, { total, totalMin, avgConc, avgDur });
  }

  function bySubject(sessions) {
    const hit = _memoGet('bySubject', sessions);
    if (hit) return hit;
    const map = {};
    for (const s of sessions) {
      if (!map[s.subject]) map[s.subject] = [];
      map[s.subject].push(s);
    }
    const result = Object.entries(map).map(([subject, list]) => ({
      subject,
      count: list.length,
      avgConcentration: +avg(list.map(s => s.concentration)).toFixed(2),
      totalMin: list.reduce((a, x) => a + x.durationMin, 0)
    })).sort((a, b) => b.avgConcentration - a.avgConcentration);
    return _memoSet('bySubject', sessions, result);
  }

  function byHourBucket(sessions) {
    const hit = _memoGet('byHourBucket', sessions);
    if (hit) return hit;
    const map = {};
    for (const s of sessions) {
      const k = hourBucket(s.datetime);
      if (!map[k]) map[k] = [];
      map[k].push(s);
    }
    const result = Object.entries(map).map(([bucket, list]) => ({
      bucket,
      count: list.length,
      avgConcentration: +avg(list.map(s => s.concentration)).toFixed(2)
    })).sort((a, b) => b.avgConcentration - a.avgConcentration);
    return _memoSet('byHourBucket', sessions, result);
  }

  function byPreviousActivity(sessions) {
    const hit = _memoGet('byPreviousActivity', sessions);
    if (hit) return hit;
    const map = {};
    for (const s of sessions) {
      const k = s.previousActivity;
      if (!map[k]) map[k] = [];
      map[k].push(s);
    }
    const result = Object.entries(map).map(([activity, list]) => ({
      activity,
      count: list.length,
      avgConcentration: +avg(list.map(s => s.concentration)).toFixed(2)
    })).sort((a, b) => b.avgConcentration - a.avgConcentration);
    return _memoSet('byPreviousActivity', sessions, result);
  }

  function likertDistribution(sessions) {
    const hit = _memoGet('likert', sessions);
    if (hit) return hit;
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const s of sessions) dist[s.concentration] = (dist[s.concentration] || 0) + 1;
    return _memoSet('likert', sessions, dist);
  }

  // Parsea el comment de una sesión (JSON de métricas). Devuelve {} si no es JSON.
  function parseMetrics(session) {
    try { return JSON.parse(session?.comment || '{}') || {}; } catch (_) { return {}; }
  }

  // Serie histórica del Índice de Aprendizaje (Fase 5). Devuelve, en orden
  // cronológico, las sesiones que registraron learning_index en su comment.
  function learningIndexSeries(sessions) {
    return (sessions || [])
      .map(s => ({ datetime: s.datetime, value: parseMetrics(s).learning_index }))
      .filter(p => typeof p.value === 'number' && !isNaN(p.value))
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  }

  // Perfil cognitivo (Fase 6): promedia los aciertos DECO por nivel a través de
  // las sesiones que registraron una evaluación DECO. Devuelve fracciones 0-1.
  function cognitiveProfile(sessions) {
    const levels = ['comprehension', 'application', 'reasoning', 'analysis'];
    const acc = { comprehension: [], application: [], reasoning: [], analysis: [] };
    for (const s of sessions || []) {
      const deco = parseMetrics(s).deco;
      if (!deco || !deco.byLevel) continue;
      for (const k of levels) {
        const v = deco.byLevel[k];
        if (typeof v === 'number') acc[k].push(v / 3); // 3 preguntas por nivel
      }
    }
    const out = {};
    for (const k of levels) out[k] = acc[k].length ? +avg(acc[k]).toFixed(2) : null;
    out.samples = Math.max(...levels.map(k => acc[k].length), 0);
    return out;
  }

  return {
    summary, bySubject, byHourBucket, byPreviousActivity, likertDistribution, hourBucket,
    parseMetrics, learningIndexSeries, cognitiveProfile
  };
})();
