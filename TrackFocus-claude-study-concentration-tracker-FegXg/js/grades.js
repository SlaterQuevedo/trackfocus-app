// grades.js — Sistema de Calificaciones Ariven
// Lógica de negocio: asignaciones, bimestres, calificaciones, auditoría.
// No contiene UI. Todos los writes pasan por Storage.set() → sync automático.
const Grades = (() => {

  // ── Escala MINEDU ─────────────────────────────────────────────────────────────
  const SCALE_MAP = {
    AD: { label: 'AD', min: 18, max: 20, color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  desc: 'Logro Destacado' },
    A:  { label: 'A',  min: 14, max: 17, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', desc: 'Logro Previsto'  },
    B:  { label: 'B',  min: 11, max: 13, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', desc: 'En Proceso'      },
    C:  { label: 'C',  min: 0,  max: 10, color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  desc: 'En Inicio'       }
  };
  const _DEFAULT_SCORE = { AD: 19, A: 15, B: 12, C: 8 };

  // ── Competencias MINEDU 2016 — secundaria ────────────────────────────────────
  const COMPETENCIES = {
    'Matemática': [
      'Resuelve problemas de cantidad',
      'Resuelve problemas de regularidad, equivalencia y cambio',
      'Resuelve problemas de forma, movimiento y localización',
      'Resuelve problemas de gestión de datos e incertidumbre'
    ],
    'Comunicación': [
      'Se comunica oralmente en lengua materna',
      'Lee diversos tipos de textos escritos',
      'Escribe diversos tipos de textos'
    ],
    'Ciencia y Tecnología': [
      'Indaga mediante métodos científicos',
      'Explica el mundo físico basándose en conocimientos',
      'Diseña y construye soluciones tecnológicas'
    ],
    'Ciencias Sociales': [
      'Construye interpretaciones históricas',
      'Gestiona responsablemente el espacio y el ambiente',
      'Gestiona responsablemente los recursos económicos'
    ],
    'Desarrollo Personal, Ciudadanía y Cívica': [
      'Construye su identidad',
      'Convive y participa democráticamente'
    ],
    'Educación Religiosa': [
      'Construye su identidad como persona humana',
      'Asume la experiencia del encuentro personal y comunitario con Dios'
    ],
    'Tutoría': [
      'Gestiona su aprendizaje de manera autónoma'
    ],
    'Educación Física': [
      'Se desenvuelve de manera autónoma a través de su motricidad',
      'Asume una vida saludable',
      'Interactúa a través de sus habilidades sociomotrices'
    ],
    'Arte y Cultura': [
      'Aprecia de manera crítica manifestaciones artístico-culturales',
      'Crea proyectos desde los lenguajes artísticos'
    ],
    'Inglés': [
      'Se comunica oralmente en inglés como lengua extranjera',
      'Lee diversos tipos de textos en inglés',
      'Escribe diversos tipos de textos en inglés'
    ],
    'Educación para el Trabajo': [
      'Gestiona proyectos de emprendimiento económico y social',
      'Crea prototipos tecnológicos para resolver problemas del contexto'
    ]
  };

  // Demo mode: omite validaciones para permitir exploración libre en la feria
  function _isDemo() { return !!(typeof window !== 'undefined' && window.__TF_DEMO); }

  // ── Helpers escala ────────────────────────────────────────────────────────────

  function scaleToScore(scale) {
    return _DEFAULT_SCORE[scale] ?? 0;
  }

  function scoreToScale(score) {
    const n = Number(score);
    if (n >= 18) return 'AD';
    if (n >= 14) return 'A';
    if (n >= 11) return 'B';
    return 'C';
  }

  // ── Helpers de permisos ───────────────────────────────────────────────────────

  function isDirector(userId) {
    const s = Storage.get();
    const user = s.users[userId];
    if (!user || !user.schoolId) return false;
    const school = s.schools[user.schoolId];
    if (!school) return false;
    return (school.adminIds || []).includes(userId);
  }

  function isAssigned(teacherId, classroomId, subject) {
    const s = Storage.get();
    return Object.values(s.subjectAssignments || {}).some(
      a => a.teacherId === teacherId && a.classroomId === classroomId && a.subject === subject
    );
  }

  function isBimesterOpen(bimesterId) {
    if (!bimesterId) return false;
    const s = Storage.get();
    const b = s.bimesters?.[bimesterId];
    return b?.status === 'open';
  }

  // ── Asignaciones de materias ──────────────────────────────────────────────────

  function assignSubject(teacherId, classroomId, schoolId, subject, academicYear) {
    const year = academicYear || new Date().getFullYear().toString();
    const s = Storage.get();

    // Solo director puede asignar (o modo demo)
    const actor = s.currentUserId;
    if (!_isDemo() && !isDirector(actor)) {
      console.warn('[Grades] assignSubject: solo el director puede asignar materias');
      return null;
    }

    // Verificar que no haya asignación existente para esta materia/aula/año
    const existing = Object.values(s.subjectAssignments || {}).find(
      a => a.classroomId === classroomId && a.subject === subject && a.academicYear === year
    );
    if (existing) {
      // Actualizar la asignación existente
      Storage.set(st => { st.subjectAssignments[existing.id].teacherId = teacherId; });
      return existing.id;
    }

    const id = Storage.uuid();
    Storage.set(st => {
      if (!st.subjectAssignments) st.subjectAssignments = {};
      st.subjectAssignments[id] = {
        id, teacherId, classroomId, schoolId, subject,
        academicYear: year,
        createdAt: new Date().toISOString()
      };
    });
    return id;
  }

  function removeAssignment(id) {
    const s = Storage.get();
    const actor = s.currentUserId;
    if (!_isDemo() && !isDirector(actor)) {
      console.warn('[Grades] removeAssignment: solo el director puede quitar asignaciones');
      return;
    }
    Storage.set(st => { delete st.subjectAssignments[id]; });
  }

  function getAssignmentsForClassroom(classroomId) {
    const s = Storage.get();
    return Object.values(s.subjectAssignments || {})
      .filter(a => a.classroomId === classroomId);
  }

  function getAssignedSubjects(teacherId, classroomId) {
    return getAssignmentsForClassroom(classroomId)
      .filter(a => a.teacherId === teacherId)
      .map(a => a.subject);
  }

  // ── Bimestres ─────────────────────────────────────────────────────────────────

  const BIMESTER_NAMES = ['I Bimestre', 'II Bimestre', 'III Bimestre', 'IV Bimestre'];

  function createBimester(schoolId, number, academicYear) {
    const s = Storage.get();
    const actor = s.currentUserId;
    if (!_isDemo() && !isDirector(actor)) {
      console.warn('[Grades] createBimester: solo el director puede crear bimestres');
      return null;
    }
    const year = academicYear || new Date().getFullYear().toString();
    const num  = Number(number);
    if (num < 1 || num > 4) return null;

    // Idempotente: si ya existe este bimestre, retornar su id
    const existing = Object.values(s.bimesters || {}).find(
      b => b.schoolId === schoolId && b.academicYear === year && b.number === num
    );
    if (existing) return existing.id;

    const id = Storage.uuid();
    Storage.set(st => {
      if (!st.bimesters) st.bimesters = {};
      st.bimesters[id] = {
        id, schoolId,
        academicYear: year,
        number: num,
        name: BIMESTER_NAMES[num - 1],
        startDate: null,
        endDate: null,
        status: 'open',
        closedAt: null,
        closedBy: null,
        createdAt: new Date().toISOString()
      };
    });
    return id;
  }

  function closeBimester(bimesterId, userId) {
    const s = Storage.get();
    const actor = userId || s.currentUserId;
    if (!_isDemo() && !isDirector(actor)) {
      console.warn('[Grades] closeBimester: solo el director puede cerrar bimestres');
      return false;
    }
    const bimester = s.bimesters?.[bimesterId];
    if (!bimester || bimester.status === 'closed') return false;

    const now = new Date().toISOString();
    Storage.set(st => {
      st.bimesters[bimesterId].status   = 'closed';
      st.bimesters[bimesterId].closedAt = now;
      st.bimesters[bimesterId].closedBy = actor;
    });

    // Auditoría directa (no pasa por Storage — es append-only)
    _insertAudit(null, 'delete', actor, { bimesterId, action: 'close', closedAt: now }, null)
      .catch(e => console.error('[Grades] audit bimester close:', e));

    return true;
  }

  function getCurrentBimester(schoolId) {
    const s = Storage.get();
    const year = new Date().getFullYear().toString();
    return Object.values(s.bimesters || {})
      .filter(b => b.schoolId === schoolId && b.academicYear === year && b.status === 'open')
      .sort((a, b) => a.number - b.number)[0] || null;
  }

  function listBimesters(schoolId) {
    const s = Storage.get();
    const year = new Date().getFullYear().toString();
    return Object.values(s.bimesters || {})
      .filter(b => b.schoolId === schoolId && b.academicYear === year)
      .sort((a, b) => a.number - b.number);
  }

  // ── Calificaciones ────────────────────────────────────────────────────────────

  function add(gradeData) {
    const s = Storage.get();
    const actor = s.currentUserId;
    const { studentId, classroomId, bimesterId, subject } = gradeData;

    if (!_isDemo() && !isAssigned(actor, classroomId, subject)) {
      UI?.flash?.('No tienes permiso para calificar esta materia.', 'error');
      return null;
    }
    if (!_isDemo() && !isBimesterOpen(bimesterId)) {
      UI?.flash?.('El bimestre está cerrado. No se pueden agregar calificaciones.', 'error');
      return null;
    }

    const scale = gradeData.scale || scoreToScale(gradeData.score ?? 0);
    const score = gradeData.score != null ? Number(gradeData.score) : scaleToScore(scale);
    const now   = new Date().toISOString();
    const id    = Storage.uuid();

    const grade = {
      id,
      studentId,
      teacherId:       actor,
      classroomId,
      bimesterId,
      subject,
      competency:      gradeData.competency || '',
      evaluationName:  gradeData.evaluationName || '',
      evaluationDate:  gradeData.evaluationDate || now.slice(0, 10),
      scale,
      score,
      observations:    gradeData.observations || '',
      createdAt:       now,
      updatedAt:       now
    };

    Storage.set(st => {
      if (!st.grades) st.grades = {};
      st.grades[id] = grade;
    });

    _insertAudit(id, 'create', actor, null, grade)
      .catch(e => console.error('[Grades] audit create:', e));

    return id;
  }

  function update(gradeId, changes) {
    const s = Storage.get();
    const actor = s.currentUserId;
    const grade = s.grades?.[gradeId];
    if (!grade) return false;

    if (!_isDemo() && grade.teacherId !== actor && !isDirector(actor)) {
      UI?.flash?.('Solo el docente responsable puede editar esta calificación.', 'error');
      return false;
    }
    if (!_isDemo() && !isBimesterOpen(grade.bimesterId)) {
      UI?.flash?.('El bimestre está cerrado. No se pueden editar calificaciones.', 'error');
      return false;
    }

    const old = { ...grade };
    // Mantener consistencia escala ↔ puntaje
    if (changes.scale && changes.score == null)  changes.score = scaleToScore(changes.scale);
    if (changes.score != null && !changes.scale) changes.scale = scoreToScale(changes.score);

    Storage.set(st => {
      Object.assign(st.grades[gradeId], changes, { updatedAt: new Date().toISOString() });
    });

    _insertAudit(gradeId, 'update', actor, old, { ...old, ...changes })
      .catch(e => console.error('[Grades] audit update:', e));

    return true;
  }

  function remove(gradeId) {
    const s = Storage.get();
    const actor = s.currentUserId;
    const grade = s.grades?.[gradeId];
    if (!grade) return false;

    if (!_isDemo() && grade.teacherId !== actor && !isDirector(actor)) {
      UI?.flash?.('Solo el docente responsable puede eliminar esta calificación.', 'error');
      return false;
    }
    if (!_isDemo() && !isBimesterOpen(grade.bimesterId)) {
      UI?.flash?.('El bimestre está cerrado. No se pueden eliminar calificaciones.', 'error');
      return false;
    }

    const snapshot = { ...grade };
    Storage.set(st => { delete st.grades[gradeId]; });

    _insertAudit(gradeId, 'delete', actor, snapshot, null)
      .catch(e => console.error('[Grades] audit delete:', e));

    return true;
  }

  function listForStudent(studentId, bimesterId) {
    const s = Storage.get();
    return Object.values(s.grades || {})
      .filter(g => g.studentId === studentId && (!bimesterId || g.bimesterId === bimesterId))
      .sort((a, b) => a.evaluationDate < b.evaluationDate ? -1 : 1);
  }

  function listForClassroom(classroomId, bimesterId) {
    const s = Storage.get();
    return Object.values(s.grades || {})
      .filter(g => g.classroomId === classroomId && (!bimesterId || g.bimesterId === bimesterId));
  }

  // ── Auditoría (INSERT directo a Supabase, no pasa por Storage) ────────────────

  async function _insertAudit(gradeId, action, changedBy, oldValue, newValue) {
    if (!window.SB) return;
    const id = Storage.uuid();
    await window.SB.from('grade_audit').insert({
      id,
      grade_id:   gradeId || id,
      action,
      changed_by: changedBy,
      old_value:  oldValue  ? JSON.parse(JSON.stringify(oldValue))  : null,
      new_value:  newValue  ? JSON.parse(JSON.stringify(newValue))  : null,
      created_at: new Date().toISOString()
    });
  }

  // ── API pública ───────────────────────────────────────────────────────────────

  return {
    SCALE_MAP,
    COMPETENCIES,
    BIMESTER_NAMES,
    scaleToScore,
    scoreToScale,
    isDirector,
    isAssigned,
    isBimesterOpen,
    // Asignaciones
    assignSubject,
    removeAssignment,
    getAssignmentsForClassroom,
    getAssignedSubjects,
    // Bimestres
    createBimester,
    closeBimester,
    getCurrentBimester,
    listBimesters,
    // Calificaciones
    add,
    update,
    remove,
    listForStudent,
    listForClassroom
  };
})();
