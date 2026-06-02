// Memoria Académica (Fase 7 V2): TrackFocus Intelligence recuerda, por materia,
// los temas trabajados, las fortalezas y las debilidades del alumno, y adapta las
// sesiones futuras. Persiste en localStorage (sin nueva tabla en Supabase) y es
// privada del dispositivo del alumno. El contexto se inyecta en el system prompt.
const AcademicMemory = (() => {

  const KEY = uid => `tf-academic-memory-${uid || 'anon'}`;
  const MAX_TAGS = 6;        // máximo de fortalezas/debilidades guardadas por materia

  // Etiquetas legibles de los niveles DECO.
  const LEVEL_LABELS = {
    comprehension: 'comprensión',
    application:   'aplicación',
    reasoning:     'razonamiento',
    analysis:      'análisis crítico'
  };

  function get(uid) {
    try { return JSON.parse(localStorage.getItem(KEY(uid)) || '{"subjects":{}}'); }
    catch (_) { return { subjects: {} }; }
  }

  function _save(uid, mem) {
    try { localStorage.setItem(KEY(uid), JSON.stringify(mem)); } catch (_) {}
  }

  function _pushUnique(arr, items) {
    for (const it of items) {
      if (!it) continue;
      const i = arr.indexOf(it);
      if (i !== -1) arr.splice(i, 1);   // mover al frente (lo más reciente)
      arr.unshift(it);
    }
    return arr.slice(0, MAX_TAGS);
  }

  // Actualiza la memoria tras una sesión. data = { topic, learningIndex, decoByLevel }.
  function update(uid, subject, data) {
    if (window.__TF_DEMO || !uid || !subject) return;   // demo nunca escribe
    data = data || {};
    const mem = get(uid);
    if (!mem.subjects) mem.subjects = {};
    const subj = mem.subjects[subject] || { sessionCount: 0, mastered: [], struggling: [], lastTopic: '' };

    subj.sessionCount = (subj.sessionCount || 0) + 1;
    subj.lastDate = new Date().toISOString();
    if (data.topic) subj.lastTopic = String(data.topic).slice(0, 80);
    if (data.learningIndex != null) subj.lastIndex = data.learningIndex;

    // Fortalezas / debilidades a partir de la evaluación DECO (3 preguntas por nivel).
    const lvl = data.decoByLevel;
    if (lvl) {
      const strong = [], weak = [];
      for (const k of Object.keys(LEVEL_LABELS)) {
        const v = lvl[k];
        if (typeof v !== 'number') continue;
        if (v >= 2) strong.push(LEVEL_LABELS[k]);
        else if (v <= 1) weak.push(LEVEL_LABELS[k]);
      }
      subj.mastered   = _pushUnique(subj.mastered   || [], strong);
      subj.struggling = _pushUnique(subj.struggling || [], weak);
    }

    mem.subjects[subject] = subj;
    _save(uid, mem);
  }

  // Devuelve un bloque de texto para el system prompt, o '' si no hay memoria útil.
  function getContext(uid, subject) {
    if (!uid || !subject) return '';
    const subj = get(uid).subjects?.[subject];
    if (!subj || !subj.sessionCount) return '';
    const parts = [`El alumno ya ha tenido ${subj.sessionCount} sesión(es) de ${subject} contigo.`];
    if (subj.lastTopic)   parts.push(`La última vez trabajó: "${subj.lastTopic}".`);
    if (subj.mastered && subj.mastered.length)   parts.push(`Domina bien: ${subj.mastered.join(', ')}.`);
    if (subj.struggling && subj.struggling.length) parts.push(`Necesita reforzar: ${subj.struggling.join(', ')}.`);
    if (subj.lastIndex != null) parts.push(`Su último Índice de Aprendizaje fue ${subj.lastIndex}/100.`);
    parts.push('Retoma desde ahí, reconoce su progreso y propón el siguiente paso adecuado.');
    return parts.join(' ');
  }

  // Resumen legible para mostrar al alumno (perfil) o limpiar.
  function listSubjects(uid) {
    const subs = get(uid).subjects || {};
    return Object.entries(subs).map(([subject, v]) => ({ subject, ...v }));
  }

  function clear(uid) { try { localStorage.removeItem(KEY(uid)); } catch (_) {} }

  return { get, update, getContext, listSubjects, clear };
})();
