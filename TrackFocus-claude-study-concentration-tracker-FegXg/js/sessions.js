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

  const MAX_CUSTOM = 15;
  const MAX_LABEL  = 40;
  const MIN_LABEL  = 2;

  function _normalize(label) {
    return label.replace(/\s+/g, ' ').trim();
  }

  function _saveCustomList(uid, list) {
    // Orden: mayor uso primero; empate → más reciente (mayor lastUsed)
    list.sort((a, b) => (b.uses || 0) - (a.uses || 0) || (b.lastUsed || 0) - (a.lastUsed || 0));
    try { localStorage.setItem(_actsKey(uid), JSON.stringify(list)); } catch (_) {}
  }

  function getCustomActivities(uid) {
    if (!uid) return [];
    try {
      const raw = localStorage.getItem(_actsKey(uid));
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  // Retorna { act, error } donde error es string o null
  function saveCustomActivity(uid, label) {
    if (!uid) return { act: null, error: 'Usuario no identificado.' };
    const norm = _normalize(label || '');
    if (norm.length < MIN_LABEL) return { act: null, error: 'El nombre debe tener al menos 2 caracteres.' };
    if (norm.length > MAX_LABEL) return { act: null, error: `El nombre no puede superar ${MAX_LABEL} caracteres.` };

    const list = getCustomActivities(uid);
    const existing = list.find(a => a.label.toLowerCase() === norm.toLowerCase());
    if (existing) {
      existing.uses = (existing.uses || 0) + 1;
      existing.lastUsed = Date.now();
      _saveCustomList(uid, list);
      return { act: existing, error: null };
    }
    if (list.length >= MAX_CUSTOM) {
      return { act: null, error: `Límite de ${MAX_CUSTOM} actividades personalizadas alcanzado. Elimina una desde Administrar.` };
    }
    const act = { id: 'custom-' + Date.now(), label: norm, uses: 1, lastUsed: Date.now() };
    list.push(act);
    _saveCustomList(uid, list);
    return { act, error: null };
  }

  function deleteCustomActivity(uid, id) {
    if (!uid) return;
    const list = getCustomActivities(uid).filter(a => a.id !== id);
    _saveCustomList(uid, list);
  }

  function renameCustomActivity(uid, id, newLabel) {
    if (!uid || !newLabel) return { error: 'Nombre vacío.' };
    const norm = _normalize(newLabel);
    if (norm.length < MIN_LABEL) return { error: 'El nombre debe tener al menos 2 caracteres.' };
    if (norm.length > MAX_LABEL) return { error: `El nombre no puede superar ${MAX_LABEL} caracteres.` };
    const list = getCustomActivities(uid);
    const dup = list.find(a => a.id !== id && a.label.toLowerCase() === norm.toLowerCase());
    if (dup) return { error: 'Ya existe una actividad con ese nombre.' };
    const act = list.find(a => a.id === id);
    if (act) { act.label = norm; _saveCustomList(uid, list); }
    return { error: null };
  }

  function trackActivityUse(uid, ids) {
    if (!uid || !ids.length) return;
    const list = getCustomActivities(uid);
    let changed = false;
    const now = Date.now();
    ids.forEach(id => {
      const act = list.find(a => a.id === id);
      if (act) { act.uses = (act.uses || 0) + 1; act.lastUsed = now; changed = true; }
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
