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

  return { hash, record, flushOutbox, pendingCount };
})();
