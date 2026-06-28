// Modo Demostración (Fase G): carga datos ficticios completos para exponer
// la plataforma SIN internet y SIN tocar datos reales.
// Aislamiento total: window.__TF_DEMO bloquea toda escritura a Supabase y al
// cache real (ver storage.js y pilot.js). Activación: ?demo=1 (docente→Eureka)
// o ?demo=student (vista de estudiante).
const Demo = (() => {

  const SUBJECTS = ['Matemática', 'Comunicación', 'Ciencia y Tecnología', 'Ciencias Sociales', 'Inglés', 'Arte y Cultura', 'Educación Física', 'Tutoría', 'Educación para el Trabajo', 'Desarrollo Personal, Ciudadanía y Cívica'];
  const ACTS = ['comer', 'ejercicio', 'cafe', 'descanso', 'redes'];
  const TEACHER = 'demo.teacher@trackfocus.demo';
  const PARENT  = 'demo.padre@trackfocus.demo';
  const SCHOOL = 'demo-school';
  const CR = 'demo-cr';

  // 32 estudiantes con perfiles académicos diferenciados (AD / A / B / C)
  // scoreRange: [min, max] para generación de calificaciones en el bimestre
  const STUDENTS = [
    // ── Logro Destacado AD (18-20) ─────────────────────────────────────────
    { id: 'demo.lucia@trackfocus.demo',       name: 'Lucía Ramírez',      xp: 1240, level: 8,  streak: 12, badges: ['primera_sesion','racha_3','racha_7','maestro_enfoque','madrugador'],  studentCode: 'ARV-STU-DEMO0001', scoreRange: [17,20] },
    { id: 'demo.sofia@trackfocus.demo',       name: 'Sofía Castro',       xp: 1520, level: 9,  streak: 21, badges: ['primera_sesion','racha_3','racha_7','racha_30','maratonista'],        studentCode: 'ARV-STU-DEMO0003', scoreRange: [18,20] },
    { id: 'demo.camila@trackfocus.demo',      name: 'Camila Torres',      xp: 1380, level: 9,  streak: 18, badges: ['primera_sesion','racha_3','racha_7','maestro_enfoque'],               studentCode: 'ARV-STU-DEMO0007', scoreRange: [17,20] },
    { id: 'demo.andrea@trackfocus.demo',      name: 'Andrea Paredes',     xp: 1190, level: 8,  streak: 15, badges: ['primera_sesion','racha_3','racha_7','multimaterias','madrugador'],    studentCode: 'ARV-STU-DEMO0008', scoreRange: [17,19] },
    { id: 'demo.valcruz@trackfocus.demo',     name: 'Valentina Cruz',     xp: 1060, level: 7,  streak: 14, badges: ['primera_sesion','racha_3','racha_7','noctambulo'],                   studentCode: 'ARV-STU-DEMO0009', scoreRange: [17,20] },
    // ── Logro Previsto A (14-17) ───────────────────────────────────────────
    { id: 'demo.mateo@trackfocus.demo',       name: 'Mateo Flores',       xp: 980,  level: 7,  streak: 5,  badges: ['primera_sesion','racha_3','multimaterias'],                          studentCode: 'ARV-STU-DEMO0002', scoreRange: [14,17] },
    { id: 'demo.valentina@trackfocus.demo',   name: 'Valentina Ríos',     xp: 760,  level: 6,  streak: 7,  badges: ['primera_sesion','racha_3','racha_7','noctambulo'],                   studentCode: 'ARV-STU-DEMO0005', scoreRange: [14,17] },
    { id: 'demo.sebastian@trackfocus.demo',   name: 'Sebastián Rojas',    xp: 870,  level: 6,  streak: 8,  badges: ['primera_sesion','racha_3','racha_7'],                               studentCode: 'ARV-STU-DEMO0010', scoreRange: [14,16] },
    { id: 'demo.mariana@trackfocus.demo',     name: 'Mariana López',      xp: 820,  level: 6,  streak: 6,  badges: ['primera_sesion','racha_3','multimaterias'],                          studentCode: 'ARV-STU-DEMO0011', scoreRange: [14,17] },
    { id: 'demo.carlos@trackfocus.demo',      name: 'Carlos Mendoza',     xp: 790,  level: 6,  streak: 4,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0012', scoreRange: [14,16] },
    { id: 'demo.gabriela@trackfocus.demo',    name: 'Gabriela Soto',      xp: 940,  level: 7,  streak: 9,  badges: ['primera_sesion','racha_3','racha_7','madrugador'],                   studentCode: 'ARV-STU-DEMO0013', scoreRange: [15,17] },
    { id: 'demo.eduardo@trackfocus.demo',     name: 'Eduardo Rivera',     xp: 710,  level: 5,  streak: 5,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0014', scoreRange: [14,17] },
    { id: 'demo.paula@trackfocus.demo',       name: 'Paula Villanueva',   xp: 850,  level: 6,  streak: 7,  badges: ['primera_sesion','racha_3','racha_7'],                               studentCode: 'ARV-STU-DEMO0015', scoreRange: [14,16] },
    { id: 'demo.rodrigo@trackfocus.demo',     name: 'Rodrigo Díaz',       xp: 680,  level: 5,  streak: 4,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0016', scoreRange: [14,17] },
    { id: 'demo.isabella@trackfocus.demo',    name: 'Isabella Vargas',    xp: 910,  level: 7,  streak: 10, badges: ['primera_sesion','racha_3','racha_7','multimaterias'],                studentCode: 'ARV-STU-DEMO0017', scoreRange: [15,17] },
    { id: 'demo.fernando@trackfocus.demo',    name: 'Fernando Quispe',    xp: 730,  level: 5,  streak: 6,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0018', scoreRange: [14,16] },
    { id: 'demo.alejandra@trackfocus.demo',   name: 'Alejandra Ramos',    xp: 800,  level: 6,  streak: 5,  badges: ['primera_sesion','racha_3','racha_7'],                               studentCode: 'ARV-STU-DEMO0019', scoreRange: [14,17] },
    { id: 'demo.natalia@trackfocus.demo',     name: 'Natalia Cárdenas',   xp: 860,  level: 6,  streak: 8,  badges: ['primera_sesion','racha_3','madrugador'],                             studentCode: 'ARV-STU-DEMO0020', scoreRange: [15,17] },
    // ── En Proceso B (11-13) ──────────────────────────────────────────────
    { id: 'demo.diego@trackfocus.demo',       name: 'Diego Huamán',       xp: 460,  level: 4,  streak: 3,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0004', scoreRange: [11,14] },
    { id: 'demo.miguelangel@trackfocus.demo', name: 'Miguel Ángel Castro', xp: 410, level: 4,  streak: 2,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0021', scoreRange: [11,13] },
    { id: 'demo.kevin@trackfocus.demo',       name: 'Kevin Huanca',       xp: 380,  level: 3,  streak: 2,  badges: ['primera_sesion'],                                                    studentCode: 'ARV-STU-DEMO0022', scoreRange: [11,13] },
    { id: 'demo.daniela@trackfocus.demo',     name: 'Daniela Morales',    xp: 490,  level: 4,  streak: 3,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0023', scoreRange: [11,13] },
    { id: 'demo.christian@trackfocus.demo',   name: 'Christian Paucar',   xp: 350,  level: 3,  streak: 1,  badges: ['primera_sesion'],                                                    studentCode: 'ARV-STU-DEMO0024', scoreRange: [10,13] },
    { id: 'demo.rocio@trackfocus.demo',       name: 'Rocío Mamani',       xp: 430,  level: 4,  streak: 3,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0025', scoreRange: [11,13] },
    { id: 'demo.marco@trackfocus.demo',       name: 'Marco Gutierrez',    xp: 400,  level: 4,  streak: 2,  badges: ['primera_sesion'],                                                    studentCode: 'ARV-STU-DEMO0026', scoreRange: [11,13] },
    { id: 'demo.melissa@trackfocus.demo',     name: 'Melissa Condori',    xp: 470,  level: 4,  streak: 4,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0027', scoreRange: [12,14] },
    { id: 'demo.jhon@trackfocus.demo',        name: 'Jhon Ccallo',        xp: 320,  level: 3,  streak: 2,  badges: ['primera_sesion'],                                                    studentCode: 'ARV-STU-DEMO0028', scoreRange: [11,13] },
    { id: 'demo.milagros@trackfocus.demo',    name: 'Milagros Quispe',    xp: 510,  level: 4,  streak: 3,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0029', scoreRange: [12,14] },
    // ── En Inicio C (7-11) ────────────────────────────────────────────────
    { id: 'demo.joaquin@trackfocus.demo',     name: 'Joaquín Mendoza',    xp: 300,  level: 3,  streak: 1,  badges: ['primera_sesion'],                                                    studentCode: 'ARV-STU-DEMO0006', scoreRange: [7,12]  },
    { id: 'demo.angel@trackfocus.demo',       name: 'Ángel Huaylla',      xp: 210,  level: 2,  streak: 1,  badges: ['primera_sesion'],                                                    studentCode: 'ARV-STU-DEMO0030', scoreRange: [7,11]  },
    { id: 'demo.luis@trackfocus.demo',        name: 'Luis Ccorimanya',    xp: 180,  level: 2,  streak: 0,  badges: ['primera_sesion'],                                                    studentCode: 'ARV-STU-DEMO0031', scoreRange: [7,10]  },
    { id: 'demo.rafael@trackfocus.demo',      name: 'Rafael Ticona',      xp: 240,  level: 2,  streak: 1,  badges: ['primera_sesion'],                                                    studentCode: 'ARV-STU-DEMO0032', scoreRange: [8,11]  },
    { id: 'demo.xiomara@trackfocus.demo',     name: 'Xiomara Apaza',      xp: 270,  level: 3,  streak: 2,  badges: ['primera_sesion','racha_3'],                                          studentCode: 'ARV-STU-DEMO0033', scoreRange: [8,12]  },
  ];

  // PRNG simple y determinista (demo reproducible).
  let _seed = 42;
  function rnd() { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function range(min, max) { return Math.floor(rnd() * (max - min + 1)) + min; }

  function _uuid() {
    return 'demo-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function _buildState() {
    const today = new Date();
    const state = JSON.parse(JSON.stringify(Storage.DEFAULT_STATE));

    // Colegio + aula
    state.schools[SCHOOL] = {
      id: SCHOOL, name: 'Colegio Demo Eureka', code: 'DEMO01',
      adminIds: [TEACHER], createdAt: today.toISOString()
    };
    state.classrooms[CR] = {
      id: CR, schoolId: SCHOOL, name: '5° A', grade: '5°', section: 'A',
      teacherIds: [TEACHER], studentIds: STUDENTS.map(s => s.id),
      inviteCode: 'DEMO5A01', createdAt: today.toISOString()
    };

    // Docente (usuario actual por defecto)
    state.users[TEACHER] = {
      id: TEACHER, email: TEACHER, name: 'Prof. Ana Quispe', role: 'teacher',
      schoolId: SCHOOL, classroomId: null, classroomIds: [CR],
      institutionType: 'colegio', approvalStatus: null,
      parentalConsent: true, consentAt: today.toISOString(), createdAt: today.toISOString(),
      gamification: { xp: 0, level: 1, streak: 0, lastStudyDate: null, badges: [], challengeProgress: {} }
    };

    // Padre demo vinculado a Lucía
    state.users[PARENT] = {
      id: PARENT, email: PARENT, name: 'Carlos Ramírez', role: 'parent',
      linkedStudentIds: [STUDENTS[0].id],
      parentalConsent: true, createdAt: today.toISOString(),
      privacyPolicyAcceptedAt: today.toISOString(),
      termsAcceptedAt: today.toISOString(),
      transparencyAcceptedAt: today.toISOString()
    };

    // Estudiantes + sesiones de los últimos 42 días
    STUDENTS.forEach(st => {
      state.users[st.id] = {
        id: st.id, email: st.id, name: st.name, role: 'student',
        schoolId: SCHOOL, classroomId: CR, classroomIds: [],
        institutionType: 'colegio', approvalStatus: 'approved',
        parentalConsent: true, consentAt: today.toISOString(), createdAt: today.toISOString(),
        studentCode: st.studentCode || null,
        gamification: {
          xp: st.xp, level: st.level, streak: st.streak,
          lastStudyDate: today.toISOString().slice(0, 10),
          badges: st.badges, challengeProgress: {}
        }
      };

      const nSessions = range(8, 22);
      for (let i = 0; i < nSessions; i++) {
        const daysAgo = range(0, 41);
        const d = new Date(today);
        d.setDate(today.getDate() - daysAgo);
        d.setHours(range(7, 22), range(0, 59), 0, 0);
        // Concentración según perfil académico + tendencia temporal (efecto Ariven).
        const _sr = st.scoreRange || [10, 16];
        const _concMin = _sr[0] >= 17 ? 3 : _sr[0] >= 14 ? 2 : _sr[0] >= 11 ? 2 : 1;
        const _concMax = _sr[0] >= 17 ? 5 : _sr[0] >= 14 ? 4 : _sr[0] >= 11 ? 3 : 3;
        const baseConc = daysAgo > 28
          ? range(_concMin, Math.min(_concMax, _concMin + 1))
          : daysAgo > 14 ? range(_concMin, _concMax)
          : range(Math.min(_concMin + 1, _concMax), _concMax);

        // V2 (Fase 13): la mayoría de sesiones son de Estudio IA y registran
        // métricas (Índice de Aprendizaje + DECO) en el comment para poblar las
        // vistas nuevas (perfil cognitivo, índice, dashboards docentes).
        const isAiSession = rnd() > 0.25;
        let comment = rnd() > 0.5 ? 'Sesión registrada desde Pomodoro' : '';
        if (isAiSession) {
          // Índice correlacionado con concentración + tendencia temporal (sube con el tiempo).
          const trend = daysAgo > 28 ? 0 : daysAgo > 14 ? 8 : 16;
          const learning_index = Math.max(35, Math.min(98, baseConc * 12 + trend + range(0, 10)));
          const metrics = {
            learning_score: +(learning_index / 100).toFixed(2),
            response_quality: +(0.5 + rnd() * 0.4).toFixed(2),
            engagement: +(0.4 + rnd() * 0.5).toFixed(2),
            coherence: +(0.5 + rnd() * 0.4).toFixed(2),
            response_time_score: +(0.4 + rnd() * 0.5).toFixed(2),
            learning_index
          };
          // ~60% de las sesiones IA incluyen evaluación DECO (aciertos por nivel 0-3).
          if (rnd() > 0.4) {
            const lift = daysAgo > 21 ? 0 : 1;   // mejoran con el tiempo
            metrics.deco = {
              score: 0, total: 12,
              byLevel: {
                comprehension: Math.min(3, range(1, 2) + lift),
                application:   Math.min(3, range(1, 2) + lift),
                reasoning:     Math.min(3, range(0, 2) + lift),
                analysis:      Math.min(3, range(0, 2))
              }
            };
            const bl = metrics.deco.byLevel;
            metrics.deco.score = bl.comprehension + bl.application + bl.reasoning + bl.analysis;
          }
          comment = JSON.stringify(metrics);
        }

        state.sessions.push({
          id: _uuid(),
          email: st.id,
          datetime: d.toISOString(),
          institutionType: 'colegio',
          subject: pick(SUBJECTS),
          concentration: baseConc,
          durationMin: range(20, 90),
          previousActivity: pick(ACTS),
          previousActivityOther: '',
          comment,
          classroomId: CR
        });
      }
    });

    // ── Calificaciones demo ────────────────────────────────────────────────────
    const YEAR  = String(today.getFullYear());
    const BIM1  = 'demo-bim-1';
    const BIM2  = 'demo-bim-2';

    // Bimestre I: cerrado hace ~60 días
    state.bimesters[BIM1] = {
      id: BIM1, schoolId: SCHOOL, academicYear: YEAR, number: 1,
      name: 'I Bimestre', startDate: null, endDate: null,
      status: 'closed',
      closedAt: new Date(today.getTime() - 60 * 86400000).toISOString(),
      closedBy: TEACHER,
      createdAt: new Date(today.getTime() - 90 * 86400000).toISOString()
    };
    // Bimestre II: abierto (en curso)
    state.bimesters[BIM2] = {
      id: BIM2, schoolId: SCHOOL, academicYear: YEAR, number: 2,
      name: 'II Bimestre', startDate: null, endDate: null,
      status: 'open', closedAt: null, closedBy: null,
      createdAt: new Date(today.getTime() - 58 * 86400000).toISOString()
    };

    // Asignaciones: la docente demo cubre todas las materias del aula
    SUBJECTS.forEach(function(sub) {
      const aId = 'demo-asgn-' + sub.toLowerCase().replace(/[^a-z]/g, '');
      state.subjectAssignments[aId] = {
        id: aId, teacherId: TEACHER, classroomId: CR, schoolId: SCHOOL,
        subject: sub, academicYear: YEAR, createdAt: today.toISOString()
      };
    });

    // Calificaciones demo: cada estudiante usa su scoreRange del perfil STUDENTS.
    var EVAL_NAMES = [
      ['Prueba escrita', 'Trabajo grupal', 'Exposición oral', 'Práctica de laboratorio'],
      ['Evaluación formativa', 'Proyecto integrador', 'Prueba de salida', 'Rúbrica de desempeño']
    ];
    var OBS_AD = ['Excelente dominio. Supera los aprendizajes esperados.', 'Demuestra pensamiento crítico sobresaliente.', 'Rendimiento destacado en todas las competencias.'];
    var OBS_A  = ['Logro previsto alcanzado satisfactoriamente.', 'Buen desempeño. Cumple los estándares del ciclo.', 'Aplica correctamente los conocimientos adquiridos.'];
    var OBS_B  = ['En proceso de consolidar los aprendizajes.', 'Avance progresivo. Requiere refuerzo en algunos indicadores.', 'Muestra mejora sostenida con acompañamiento docente.'];
    var OBS_C  = ['Requiere mayor acompañamiento y refuerzo.', 'En inicio. Se recomienda trabajo con el tutor.', 'Dificultades en la comprensión de competencias básicas.'];

    function _obs(scale) {
      var arr = scale === 'AD' ? OBS_AD : scale === 'A' ? OBS_A : scale === 'B' ? OBS_B : OBS_C;
      return arr[Math.floor(rnd() * arr.length)];
    }

    STUDENTS.forEach(function(st, si) {
      var profile = st.scoreRange || [10, 16];
      [[BIM1, 70, 90], [BIM2, 1, 30]].forEach(function(bimDef) {
        var bimId = bimDef[0], daysMin = bimDef[1], daysMax = bimDef[2];
        var evalSet = EVAL_NAMES[bimId === BIM1 ? 0 : 1];
        SUBJECTS.forEach(function(sub, subIdx) {
          var comps = (typeof Grades !== 'undefined' && Grades.COMPETENCIES[sub]) || ['Competencia general'];
          // 3 evaluaciones por materia por bimestre para más datos
          for (var e = 0; e < 3; e++) {
            // Ligera variación dentro del perfil del estudiante
            var lo = profile[0], hi = profile[1];
            var score = Math.max(0, Math.min(20, range(lo, hi)));
            // Segunda evaluación puede mejorar (efecto Ariven)
            if (e === 2 && bimId === BIM2) score = Math.min(20, score + range(0, 2));
            var scale = score >= 18 ? 'AD' : score >= 14 ? 'A' : score >= 11 ? 'B' : 'C';
            var evalDate = new Date(today);
            evalDate.setDate(today.getDate() - range(daysMin, daysMax));
            var gId = 'demo-g-' + si + '-' + (bimId === BIM1 ? '1' : '2') + '-' + subIdx + '-' + e;
            state.grades[gId] = {
              id: gId,
              studentId: st.id,
              teacherId: TEACHER,
              classroomId: CR,
              bimesterId: bimId,
              subject: sub,
              competency: comps[e % comps.length],
              evaluationName: evalSet[e % evalSet.length],
              evaluationDate: evalDate.toISOString().slice(0, 10),
              scale: scale,
              score: score,
              observations: _obs(scale),
              createdAt: evalDate.toISOString(),
              updatedAt: evalDate.toISOString()
            };
          }
        });
      });
    });

    return state;
  }

  // Filas anónimas del piloto (pre/post quiz) que muestran mejora real.
  function _buildPilotRows() {
    const rows = [];
    STUDENTS.forEach((st, idx) => {
      const n = range(3, 6);
      for (let i = 0; i < n; i++) {
        const pre = range(0, 2);
        const post = Math.min(3, pre + range(0, 2)); // tiende a mejorar
        const comp = range(1, 3), app = range(1, 3), rea = range(0, 3), ana = range(0, 2);
        rows.push({
          id: _uuid(),
          session_id: _uuid(),
          student_hash: 'demohash' + idx,
          classroom_id: CR,
          focus_score: range(3, 5),
          time_spent_seconds: range(900, 3000),
          pre_quiz_score: pre,
          post_quiz_score: post,
          // V2 (Fase 13): Índice de Aprendizaje + DECO en el piloto.
          learning_index: range(45, 95),
          deco_score: comp + app + rea + ana,
          deco_comprehension: comp,
          deco_application: app,
          deco_reasoning: rea,
          deco_analysis: ana,
          created_at: new Date(Date.now() - range(0, 30) * 86400000).toISOString()
        });
      }
    });
    return rows;
  }

  function activate(mode) {
    window.__TF_DEMO = true;

    const state = _buildState();
    window.__TF_DEMO_PILOT_ROWS = _buildPilotRows();

    // Usuario actual según el modo de demo.
    const asParent  = mode === 'parent';
    const asStudent = (mode === 'student' || mode === 'guided');
    const currentId = asParent ? PARENT : asStudent ? STUDENTS[0].id : TEACHER;
    state.currentUserId = currentId;

    Storage.hydrate(state);
    Storage.setCurrent(currentId);
    try { Auth.setActiveRole?.(null); } catch (_) {}

    UI?.flash?.('🎭 Modo demostración activo · datos de ejemplo, sin conexión.', 'info');

    // Modo guiado: pre-configura metadata y salta directo a chat
    if (mode === 'guided') {
      window.__TF_DEMO_GUIDED_META = {
        subject: 'Matemática',
        grade: '4°',
        durationMin: 45,
        previousActivity: 'repaso-previo',
        topic: 'Ecuaciones cuadráticas'
      };
      App.go('ai-study');
    } else if (asParent) {
      App._parentViewingStudentId = STUDENTS[0].id;
      App.go('parent-dashboard');
    } else {
      App.go(asStudent ? 'dashboard' : 'eureka');
    }
  }

  function isActive() { return !!window.__TF_DEMO; }

  return { activate, isActive };
})();
