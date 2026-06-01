// Piloto científico (Fase C): registra métricas ANÓNIMAS de cada sesión de
// estudio para medir impacto (focus + tiempo + quiz pre/post).
// Anonimización: student_hash = SHA-256(email) — irreversible, sin PII.
// Robustez: si el insert falla (offline), se encola en localStorage y
// connectivity.js lo reintenta (upsert idempotente por id → sin duplicados).
const Pilot = (() => {

  const LS_OUTBOX = 'tf-pilot-outbox';

  // Hash irreversible del identificador (email) → anonimato en la base de datos.
  async function hash(text) {
    try {
      const data = new TextEncoder().encode(String(text || '').toLowerCase().trim());
      const buf  = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
      return 'anon';
    }
  }

  function _readOutbox() {
    try { return JSON.parse(localStorage.getItem(LS_OUTBOX) || '[]'); } catch (_) { return []; }
  }
  function _writeOutbox(arr) {
    try { localStorage.setItem(LS_OUTBOX, JSON.stringify(arr)); } catch (_) {}
  }
  function _enqueue(row) {
    const q = _readOutbox();
    q.push(row);
    _writeOutbox(q);
  }

  // Inserta una fila del piloto. data = { sessionId, focusScore, timeSpentSeconds,
  // preQuizScore, postQuizScore }. classroom_id y student_hash se derivan del usuario.
  async function record(data) {
    if (window.__TF_DEMO) return;          // el modo demo nunca escribe datos reales
    const s   = (typeof Storage !== 'undefined') ? Storage.get() : null;
    const uid = s?.currentUserId;
    if (!uid) return;
    const user = s.users[uid];

    const row = {
      id:                 (typeof Storage !== 'undefined' ? Storage.uuid() : String(Date.now())),
      session_id:         data.sessionId || null,
      student_hash:       await hash(uid),
      classroom_id:       user?.classroomId || null,
      focus_score:        data.focusScore ?? null,
      time_spent_seconds: (data.timeSpentSeconds != null) ? Math.round(data.timeSpentSeconds) : null,
      pre_quiz_score:     data.preQuizScore ?? null,
      post_quiz_score:    data.postQuizScore ?? null
    };

    if (!window.SB) { _enqueue(row); return; }
    try {
      const { error } = await window.SB.from('pilot_analytics').upsert(row);
      if (error) throw new Error(error.message);
    } catch (e) {
      _enqueue(row);  // se reintentará al reconectar
      window.Monitor?.log?.('supabase', 'pilot_analytics insert falló (encolado)', e?.message);
      console.warn('[Pilot] insert falló, encolado para reintento:', e?.message);
    }
  }

  // Reintenta las filas encoladas. La llama connectivity.js. Idempotente.
  async function flushOutbox() {
    if (window.__TF_DEMO || !window.SB) return;
    let q = _readOutbox();
    if (!q.length) return;
    const pendientes = [];
    for (const row of q) {
      try {
        const { error } = await window.SB.from('pilot_analytics').upsert(row);
        if (error) throw new Error(error.message);
      } catch (_) {
        pendientes.push(row);  // sigue pendiente
      }
    }
    _writeOutbox(pendientes);
    if (q.length && !pendientes.length) {
      window.Monitor?.log?.('sync', 'pilot outbox vaciado');
      console.info('[Pilot] outbox sincronizado.');
    }
  }

  function pendingCount() { return _readOutbox().length; }

  // ── Agregación para dashboards (Fases D y H) ──────────────────────────────
  // Trae filas del piloto desde Supabase (RLS limita lo visible al rol).
  async function fetchRows(opts = {}) {
    // Modo demo (Fase G): datos ficticios precargados, sin tocar Supabase.
    if (window.__TF_DEMO) return window.__TF_DEMO_PILOT_ROWS || [];
    if (!window.SB) return [];
    try {
      let q = window.SB.from('pilot_analytics').select('*');
      if (opts.classroomId) q = q.eq('classroom_id', opts.classroomId);
      if (opts.since)       q = q.gte('created_at', opts.since);
      const { data, error } = await q;
      if (error) { window.Monitor?.log?.('supabase', 'pilot fetch error', error.message); return []; }
      return data || [];
    } catch (e) {
      window.Monitor?.log?.('supabase', 'pilot fetch excepción', e?.message);
      return [];
    }
  }

  // Calcula agregados a partir de un array de filas del piloto.
  function summarize(rows) {
    rows = rows || [];
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const focus = rows.filter(r => r.focus_score != null).map(r => Number(r.focus_score));
    const times = rows.filter(r => r.time_spent_seconds != null).map(r => Number(r.time_spent_seconds));
    const pairs = rows.filter(r => r.pre_quiz_score != null && r.post_quiz_score != null);
    const improvements = pairs.map(r => Number(r.post_quiz_score) - Number(r.pre_quiz_score));
    return {
      sessions:       rows.length,
      students:       new Set(rows.map(r => r.student_hash)).size,
      avgFocus:       Math.round(avg(focus) * 10) / 10,
      totalMinutes:   Math.round(times.reduce((x, y) => x + y, 0) / 60),
      avgPre:         Math.round(avg(pairs.map(r => Number(r.pre_quiz_score)))  * 10) / 10,
      avgPost:        Math.round(avg(pairs.map(r => Number(r.post_quiz_score))) * 10) / 10,
      avgImprovement: Math.round(avg(improvements) * 10) / 10,   // puntos de quiz (post - pre)
      improvedPct:    pairs.length ? Math.round((improvements.filter(d => d > 0).length / pairs.length) * 100) : 0,
      quizPairs:      pairs.length
    };
  }

  return { hash, record, flushOutbox, pendingCount, fetchRows, summarize };
})();
