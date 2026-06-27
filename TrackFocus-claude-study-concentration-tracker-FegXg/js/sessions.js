// CRUD de sesiones de estudio.
const Sessions = (() => {

  const PREVIOUS_ACTIVITIES = [
    { id: 'redes',         label: '📱 Redes sociales' },
    { id: 'videojuegos',   label: '🎮 Videojuegos' },
    { id: 'comer',         label: '🍽️ Comer' },
    { id: 'dormir',        label: '😴 Dormir / Siesta' },
    { id: 'cafe',          label: '☕ Café / Bebida energética' },
    { id: 'youtube',       label: '📺 YouTube / Netflix' },
    { id: 'repaso-previo', label: '📚 Estudiar otra materia' },
    { id: 'descanso',      label: '🚶 Descanso / Caminata' },
    { id: 'trabajo',       label: '💼 Trabajo / Quehaceres' },
  ];

  const LIKERT = [
    { v: 1, label: 'Nada concentrado' },
    { v: 2, label: 'Poco concentrado' },
    { v: 3, label: 'Regular' },
    { v: 4, label: 'Bastante concentrado' },
    { v: 5, label: 'Totalmente concentrado' }
  ];

  // ── Actividades personalizadas (localStorage por usuario) ─────────────

  function _actsKey(uid) { return 'arv-custom-acts-' + uid; }

  function _saveCustomList(uid, list) {
    list.sort((a, b) => (b.uses || 0) - (a.uses || 0));
    try { localStorage.setItem(_actsKey(uid), JSON.stringify(list)); } catch (_) {}
  }

  function getCustomActivities(uid) {
    if (!uid) return [];
    try {
      const raw = localStorage.getItem(_actsKey(uid));
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  function saveCustomActivity(uid, label) {
    if (!uid || !label) return null;
    const trimmed = label.trim();
    if (!trimmed) return null;
    const list = getCustomActivities(uid);
    const existing = list.find(a => a.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    const act = { id: 'custom-' + Date.now(), label: trimmed, uses: 0 };
    list.push(act);
    _saveCustomList(uid, list);
    return act;
  }

  function deleteCustomActivity(uid, id) {
    if (!uid) return;
    const list = getCustomActivities(uid).filter(a => a.id !== id);
    _saveCustomList(uid, list);
  }

  function renameCustomActivity(uid, id, newLabel) {
    if (!uid || !newLabel) return;
    const list = getCustomActivities(uid);
    const act = list.find(a => a.id === id);
    if (act) { act.label = newLabel.trim(); _saveCustomList(uid, list); }
  }

  function trackActivityUse(uid, ids) {
    if (!uid || !ids.length) return;
    const list = getCustomActivities(uid);
    let changed = false;
    ids.forEach(id => {
      const act = list.find(a => a.id === id);
      if (act) { act.uses = (act.uses || 0) + 1; changed = true; }
    });
    if (changed) _saveCustomList(uid, list);
  }

  // ── CRUD de sesiones ──────────────────────────────────────────────────

  function add(session) {
    const required = ['email', 'datetime', 'institutionType', 'subject', 'concentration', 'durationMin', 'previousActivity'];
    for (const k of required) {
      if (session[k] === undefined || session[k] === null || session[k] === '') {
        throw new Error(`Falta el campo: ${k}`);
      }
    }
    const s = Storage.get();
    const user = s.users[session.email];
    const record = {
      id: Storage.uuid(),
      email: session.email,
      datetime: session.datetime,
      institutionType: session.institutionType,
      subject: session.subject,
      concentration: Number(session.concentration),
      durationMin: Number(session.durationMin),
      previousActivity: session.previousActivity,
      previousActivityOther: session.previousActivityOther || '',
      comment: session.comment || '',
      classroomId: user?.classroomId || session.classroomId || null
    };
    Storage.set(st => st.sessions.push(record));
    const gamResult = Gamification.awardSession(session.email, record);
    return { record, gamResult };
  }

  function addFromPomodoro(userId, subject, durationMin, concentration) {
    const s = Storage.get();
    const user = s.users[userId];
    if (!user) throw new Error('Usuario no encontrado');
    return add({
      email: userId,
      datetime: new Date().toISOString(),
      institutionType: user.institutionType || 'colegio',
      subject,
      concentration,
      durationMin,
      previousActivity: 'descanso',
      comment: 'Sesión registrada desde Pomodoro'
    });
  }

  function remove(id) {
    Storage.set(s => { s.sessions = s.sessions.filter(x => x.id !== id); });
  }

  function listFor(email, filters = {}) {
    const s = Storage.get();
    let list = s.sessions.filter(x => x.email === email);
    if (filters.subject) list = list.filter(x => x.subject === filters.subject);
    if (filters.from)    list = list.filter(x => x.datetime >= filters.from);
    if (filters.to)      list = list.filter(x => x.datetime <= filters.to);
    return list.sort((a, b) => b.datetime.localeCompare(a.datetime));
  }

  function listForClassroom(classroomId, filters = {}) {
    const s = Storage.get();
    const cr = s.classrooms[classroomId];
    if (!cr) return [];
    const ids = new Set(cr.studentIds);
    let list = s.sessions.filter(x => ids.has(x.email));
    if (filters.from) list = list.filter(x => x.datetime >= filters.from);
    if (filters.to)   list = list.filter(x => x.datetime <= filters.to);
    return list.sort((a, b) => b.datetime.localeCompare(a.datetime));
  }

  function listAll() {
    return [...Storage.get().sessions].sort((a, b) => b.datetime.localeCompare(a.datetime));
  }

  return {
    PREVIOUS_ACTIVITIES, LIKERT,
    getCustomActivities, saveCustomActivity, deleteCustomActivity, renameCustomActivity, trackActivityUse,
    add, addFromPomodoro, remove, listFor, listForClassroom, listAll
  };
})();
