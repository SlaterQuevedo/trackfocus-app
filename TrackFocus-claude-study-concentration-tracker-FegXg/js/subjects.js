// Catálogo dinámico de materias por institución + materias personalizadas por estudiante.
const Subjects = (() => {

  const INSTITUTIONS = [
    { id: 'colegio', label: 'Colegio', icon: '🎒', enabled: true }
    // Futuro: universidad, academia, autodidacta… (estructura ya soporta varios)
  ];

  // Emojis para los cursos del currículo peruano de secundaria
  const SUBJECT_ICONS = {
    'Matemática':                                    '📐',
    'Comunicación':                                  '📖',
    'Ciencia y Tecnología':                          '🔬',
    'Ciencias Sociales':                             '🌎',
    'Desarrollo Personal, Ciudadanía y Cívica':      '🤝',
    'Educación Religiosa':                           '⛪',
    'Tutoría':                                       '🧭',
    'Educación Física':                              '⚽',
    'Arte y Cultura':                                '🎨',
    'Inglés':                                        '🇬🇧'
  };

  function getIcon(subjectName) {
    return SUBJECT_ICONS[subjectName] || '📚';
  }

  function listInstitutions() {
    return INSTITUTIONS;
  }

  function getInstitution(id) {
    return INSTITUTIONS.find(i => i.id === id);
  }

  function listSubjects(institutionId, email) {
    const s = Storage.get();
    const base = s.subjectsByInstitution[institutionId] || [];
    const custom = (email && s.customSubjects[email]) || [];
    // Sin duplicados, conservando orden.
    const seen = new Set();
    return [...base, ...custom].filter(x => {
      const k = x.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function addCustomSubject(email, name) {
    const clean = (name || '').trim();
    if (!clean) throw new Error('El nombre no puede estar vacío.');
    Storage.set(s => {
      if (!s.customSubjects[email]) s.customSubjects[email] = [];
      const exists = s.customSubjects[email].some(x => x.toLowerCase() === clean.toLowerCase());
      if (!exists) s.customSubjects[email].push(clean);
    });
  }

  function removeCustomSubject(email, name) {
    Storage.set(s => {
      if (!s.customSubjects[email]) return;
      s.customSubjects[email] = s.customSubjects[email].filter(x => x !== name);
    });
  }

  // Guarda la última materia usada por el estudiante
  function saveLastSubject(email, subjectName) {
    if (!email || !subjectName) return;
    Storage.set(s => {
      if (s.users[email]) s.users[email].lastSubject = subjectName;
    });
  }

  // Recupera la última materia usada (o null)
  function getLastSubject(email) {
    if (!email) return null;
    const s = Storage.get();
    return s.users[email]?.lastSubject || null;
  }

  // Genera el HTML de las <option> con emojis, con pre-selección y opción "Otro curso"
  function renderOptions(subjects, selectedValue) {
    const opts = subjects.map(name => {
      const icon = getIcon(name);
      const sel = name === selectedValue ? ' selected' : '';
      return `<option value="${name}"${sel}>${icon} ${name}</option>`;
    });
    opts.push(`<option value="__otro__">➕ Otro curso…</option>`);
    return opts.join('');
  }

  return {
    INSTITUTIONS,
    listInstitutions,
    getInstitution,
    listSubjects,
    addCustomSubject,
    removeCustomSubject,
    saveLastSubject,
    getLastSubject,
    getIcon,
    renderOptions
  };
})();
