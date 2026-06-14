// Pantallas del rol Estudiante.
const UIStudent = (() => {

  const root = () => document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  function formatGrade(g) {
    if (!g) return '';
    const n = parseInt(g, 10);
    if (!n || n < 1 || n > 5) return String(g);
    return `${n}° de Secundaria`;
  }
  function formatGradeShort(g) {
    if (!g) return '';
    const n = parseInt(g, 10);
    if (!n || n < 1 || n > 5) return String(g);
    return `${n}° Sec.`;
  }

  const _MALLAS = {
    'UNI':     ['Álgebra', 'Aritmética', 'Geometría', 'Trigonometría', 'Física', 'Química', 'R. Matemático', 'R. Verbal'],
    'UNMSM':   ['Biología', 'Química', 'Física', 'Álgebra', 'Aritmética', 'Geometría', 'Comprensión Lectora', 'R. Verbal'],
    'PUCP':    ['Matemáticas', 'Comprensión Lectora', 'Argumentación', 'Redacción', 'Pensamiento Crítico'],
    'UNAC':    ['Matemáticas', 'Física', 'Química', 'Comprensión Aplicada'],
    'Beca 18': ['Comprensión Lectora', 'R. Verbal', 'R. Matemático', 'Pensamiento Crítico', 'Hábitos de Estudio']
  };

  function showXpToast(xpEarned, newBadges) {
    const el = document.createElement('div');
    el.className = 'xp-toast';
    el.innerHTML = `<strong>+${xpEarned} XP</strong>` +
      (newBadges && newBadges.length ? `<br>🏆 ${newBadges.map(b => b.label).join(', ')}` : '');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  // ---- Pantalla: Pendiente de aprobación ----
  function screenPendingApproval() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const school = user.schoolId ? s.schools[user.schoolId] : null;
    const isRejected = user.approvalStatus === 'rejected';
    const requests = Schools.getStudentRequests(user.id);
    const lastReq = requests[0] || null;

    const statusBadge = isRejected
      ? '<span class="rejected-badge">❌ Rechazada</span>'
      : '<span class="pending-badge">Pendiente</span>';

    const iconEl = isRejected ? '❌' : '⏳';
    const title = isRejected ? 'Solicitud rechazada' : 'Pendiente de aprobación';
    const desc = isRejected
      ? 'Tu solicitud de ingreso fue rechazada. Contacta a tu docente para más información o intenta con un nuevo código de aula.'
      : `Tu solicitud de ingreso al colegio <strong>${esc(school?.name || '')}</strong> está siendo revisada. Cuando tu docente la apruebe, tendrás acceso completo.`;

    return `
      <div style="max-width:520px;margin:50px auto;text-align:center;">
        <div style="font-size:64px;margin-bottom:16px;line-height:1;">${iconEl}</div>
        <h1 style="margin-bottom:8px;">${title}</h1>
        <p class="muted" style="font-size:15px;line-height:1.7;margin-bottom:28px;">${desc}</p>

        <div class="card" style="text-align:left;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:600;font-size:14px;">Estado de tu solicitud</span>
            ${statusBadge}
          </div>
          ${school ? `<p class="muted" style="font-size:13px;margin:4px 0;">Colegio: <strong style="color:var(--text);">${esc(school.name)}</strong></p>` : ''}
          ${lastReq ? `<p class="muted" style="font-size:12px;margin:4px 0;">Enviada: ${new Date(lastReq.createdAt).toLocaleString('es-PE')}</p>` : ''}
          ${lastReq?.classroomId && s.classrooms[lastReq.classroomId] ? `<p class="muted" style="font-size:12px;margin:4px 0;">Aula solicitada: <strong>${esc(s.classrooms[lastReq.classroomId].name)}</strong></p>` : ''}
        </div>

        <div class="card" style="text-align:left;margin-bottom:16px;">
          <h3>¿Qué hacer ahora?</h3>
          <p class="muted" style="font-size:13px;line-height:1.6;">
            ${isRejected
              ? 'Habla con tu docente para que genere un código de invitación de aula y te lo comparta. Luego usa "Ingresar con código" para enviar una nueva solicitud.'
              : 'Avísale a tu docente que enviaste la solicitud. Cuando la apruebe, podrás iniciar sesión normalmente y acceder a todas las funciones.'}
          </p>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="ghost" id="checkStatusBtn">↻ Verificar estado</button>
          <button class="ghost danger-ghost" id="logoutPendingBtn">Cerrar sesión</button>
        </div>
      </div>`;
  }

  function wirePendingApproval() {
    document.getElementById('checkStatusBtn')?.addEventListener('click', () => {
      const user = Storage.get().users[Storage.get().currentUserId];
      if (user.approvalStatus === 'approved') {
        App.go('dashboard');
        UI.flash('¡Tu solicitud fue aprobada! Bienvenido al sistema.', 'success');
      } else {
        UI.flash('Tu solicitud aún está pendiente. El docente recibirá tu solicitud cuando inicie sesión.', 'info');
      }
    });
    document.getElementById('logoutPendingBtn')?.addEventListener('click', () => {
      Auth.logout();
      App.go('welcome');
    });
  }

  // ---- Pantalla: Selección de institución ----
  function screenInstitution() {
    const list = Subjects.listInstitutions();
    return `
      <h1>Selecciona tu tipo de institución</h1>
      <p class="muted">Las materias se cargarán automáticamente según tu elección.</p>
      <div class="choice-grid" style="margin-top:18px;">
        ${list.map(i => `
          <div class="choice ${i.enabled ? '' : 'disabled'}" data-id="${esc(i.id)}">
            <div class="ic">${i.icon}</div>
            <h2 style="margin:8px 0 4px;">${esc(i.label)}</h2>
            <p class="muted" style="margin:0;font-size:12px;">${i.enabled ? 'Disponible' : 'Próximamente'}</p>
          </div>`).join('')}
      </div>`;
  }

  function wireInstitution() {
    root().querySelectorAll('.choice:not(.disabled)').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const userId = Storage.get().currentUserId;
        Storage.set(s => { s.users[userId].institutionType = id; });
        App.go('dashboard');
      });
    });
  }

  // ---- Pantalla: Dashboard (bifurca entre personal e institucional) ----
  function screenDashboard() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const sessions = Sessions.listFor(user.id);
    const isPersonal = !user.schoolId;
    return isPersonal ? _dashPersonal(user, sessions, s) : _dashStudent(user, sessions, s);
  }

  function _relTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'Hoy';
    if (d === 1) return 'Ayer';
    if (d < 7) return `Hace ${d} días`;
    const w = Math.floor(d / 7);
    return `Hace ${w} semana${w > 1 ? 's' : ''}`;
  }

  function _pickSubjectToday(sessions, profile) {
    if (!profile?.enabledSubjects?.length) return null;
    const bySubj = {};
    profile.enabledSubjects.forEach(subj => { bySubj[subj] = { count: 0, total: 0 }; });
    const weekAgo = Date.now() - 7 * 86400000;
    sessions.filter(s => new Date(s.datetime) > weekAgo).forEach(sess => {
      if (bySubj[sess.subject] !== undefined) {
        bySubj[sess.subject].count++;
        bySubj[sess.subject].total += (sess.concentration || 0);
      }
    });
    return [...profile.enabledSubjects].sort((a, b) => {
      const avgA = bySubj[a].count ? bySubj[a].total / bySubj[a].count : 0;
      const avgB = bySubj[b].count ? bySubj[b].total / bySubj[b].count : 0;
      return avgA - avgB;
    })[0];
  }

  function _calcPrep(user, sessions, profile) {
    const gam = user.gamification || {};
    const sum = Stats.summary(sessions);
    const streak  = Math.min((gam.streak || 0) / 30, 1) * 25;
    const scount  = Math.min(sessions.length / 20, 1) * 20;
    const xpLevel = Math.min((gam.xp || 0) / 1000, 1) * 30;
    const concent = ((parseFloat(sum.avgConc) || 0) / 5) * 15;
    const tiempo  = Math.min((sum.totalMin || 0) / 600, 1) * 10;
    return Math.round(streak + scount + xpLevel + concent + tiempo);
  }

  function _dashPersonal(user, sessions, s) {
    const gam = user.gamification || {};
    const levelInfo = Gamification.getLevelInfo(gam.xp || 0);
    const sum = Stats.summary(sessions);
    const sorted = [...sessions].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    const profile = JSON.parse(localStorage.getItem('tf-academic-profile-v3') || '{}');
    const prepPct = _calcPrep(user, sessions, profile);
    const todaySubject = _pickSubjectToday(sessions, profile);
    const lastSession = sorted[0] || null;
    const studySubject = todaySubject || lastSession?.subject || null;
    const nowMs = Date.now();
    const nearestExam = (profile.examDates || [])
      .map(e => ({ ...e, days: Math.ceil((new Date(e.date) - nowMs) / 86400000) }))
      .filter(e => e.days > 0).sort((a, b) => a.days - b.days)[0] || null;

    const heroHtml = `
      <div class="dp-hero">
        <div class="dp-hero-name">👋 Hola, ${esc(user.name.split(' ')[0])}</div>
        ${profile.university ? `
          <div class="dp-hero-goal">${esc(profile.career || 'Tu carrera')} · ${esc(profile.university)}</div>
          <div class="dp-prep-wrap">
            <div class="dp-prep-bar-wrap"><div class="dp-prep-bar" style="width:${prepPct}%;"></div></div>
            <div class="dp-prep-label">${prepPct}% preparación${nearestExam ? ` · 📅 ${nearestExam.days} días para ${esc(nearestExam.label)}` : ''}</div>
          </div>` : `
          <div class="dp-hero-goal">Configura tu meta universitaria en <strong>Mi Perfil → Meta</strong></div>`}
      </div>`;

    const studyNowHtml = studySubject ? `
      <div class="dp-study-now">
        <div class="dp-study-header">🎯 Estudia esto hoy</div>
        <div class="dp-study-subject">${esc(studySubject)}</div>
        <div class="dp-study-reason">${todaySubject ? 'Concentración más baja esta semana' : `Continúa donde te quedaste · ${_relTime(lastSession.datetime)}`}</div>
        <div class="dp-study-actions">
          <button class="primary dp-study-btn" data-go="ai-study">▶ Estudiar con Minerva</button>
          <button class="ghost dp-study-btn" data-go="new-session">⚡ Nueva sesión</button>
        </div>
      </div>` : `
      <div class="dp-study-now dp-study-empty">
        <div class="dp-study-header">🎯 ¿Qué estudias hoy?</div>
        <div class="dp-study-reason">Registra tu primera sesión para comenzar.</div>
        <div class="dp-study-actions">
          <button class="primary dp-study-btn" data-go="new-session">+ Comenzar sesión</button>
        </div>
      </div>`;

    return `
      <div class="dp-wrap">
        ${heroHtml}
        ${studyNowHtml}
        <div class="dp-chips-row">
          <div class="dp-chip dp-chip-fire">🔥 ${gam.streak || 0} días</div>
          <div class="dp-chip dp-chip-xp">💎 ${gam.xp || 0} XP</div>
          <div class="dp-chip dp-chip-conc">🧠 ${sum.avgConc || '—'} conc.</div>
          <div class="dp-chip dp-chip-session">📚 ${sum.total} sesiones</div>
        </div>
        <div class="dp-nav-grid">
          <div class="dp-nav-card" data-go="achievements">
            <div class="dp-nav-icon">🏆</div>
            <div class="dp-nav-body">
              <div class="dp-nav-title">Logros</div>
              <div class="dp-nav-sub">Nivel ${levelInfo.current.level} — ${esc(levelInfo.current.title)}</div>
            </div>
            <div class="dp-nav-arrow">→</div>
          </div>
          <div class="dp-nav-card" data-go="stats">
            <div class="dp-nav-icon">📊</div>
            <div class="dp-nav-body">
              <div class="dp-nav-title">Estadísticas</div>
              <div class="dp-nav-sub">${sum.total} ses. · ${Math.round(((sum.totalMin||0)/60)*10)/10}h totales</div>
            </div>
            <div class="dp-nav-arrow">→</div>
          </div>
          <div class="dp-nav-card" data-go="profile">
            <div class="dp-nav-icon">👤</div>
            <div class="dp-nav-body">
              <div class="dp-nav-title">Mi Perfil</div>
              <div class="dp-nav-sub">Meta · Ruta · Calendario</div>
            </div>
            <div class="dp-nav-arrow">→</div>
          </div>
          <div class="dp-nav-card" data-go="ai-study">
            <div class="dp-nav-icon">🤖</div>
            <div class="dp-nav-body">
              <div class="dp-nav-title">Estudio IA</div>
              <div class="dp-nav-sub">Minerva + DECO</div>
            </div>
            <div class="dp-nav-arrow">→</div>
          </div>
        </div>
      </div>`;
  }

  function _dashStudent(user, sessions, s) {
    const gam = user.gamification || {};
    const alerts = Analytics.generateAlerts(user.id);
    const school = user.schoolId ? s.schools[user.schoolId] : null;
    const classroom = user.classroomId ? s.classrooms[user.classroomId] : null;
    const sorted = [...sessions].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    const schoolProfile = JSON.parse(localStorage.getItem('tf-school-profile-v1') || '{}');
    const nowMs = Date.now();
    const exams = (schoolProfile.exams || [])
      .map(e => ({ ...e, days: Math.ceil((new Date(e.date) - nowMs) / 86400000) }))
      .filter(e => e.days > 0).sort((a, b) => a.days - b.days);
    const todayStr = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

    const heroHtml = `
      <div class="ds-hero">
        <div class="ds-hero-name">🎓 ${esc(user.name)}</div>
        <div class="ds-hero-meta">
          ${classroom ? `<span class="ds-hero-pill">${esc(classroom.name)}</span>` : ''}
          ${school ? `<span class="ds-hero-pill">🏫 ${esc(school.name)}</span>` : ''}
        </div>
        <div class="ds-hero-date">${todayStr}</div>
      </div>`;

    const urgent = exams[0] || null;
    let priorityHtml;
    if (urgent && urgent.days <= 3) {
      priorityHtml = `
        <div class="ds-priority ds-priority-urgent">
          <div class="ds-priority-label">⚠️ Examen ${urgent.days === 1 ? 'mañana' : `en ${urgent.days} días`}:</div>
          <div class="ds-priority-subject">${esc(urgent.subject || urgent.label)}</div>
          <button class="primary" data-go="ai-study" style="margin-top:10px;width:100%;">▶ Repasar con IA ahora</button>
        </div>`;
    } else if (urgent) {
      priorityHtml = `
        <div class="ds-priority">
          <div class="ds-priority-label">📅 Próxima evaluación en ${urgent.days} días:</div>
          <div class="ds-priority-subject">${esc(urgent.subject || urgent.label)}</div>
          <button class="ghost" data-go="ai-study" style="margin-top:8px;width:100%;">Estudiar para esta evaluación →</button>
        </div>`;
    } else if (sorted[0]) {
      priorityHtml = `
        <div class="ds-priority">
          <div class="ds-priority-label">▶ Continúa donde te quedaste:</div>
          <div class="ds-priority-subject">${esc(sorted[0].subject)} · ${_relTime(sorted[0].datetime)}</div>
          <button class="ghost" data-go="ai-study" style="margin-top:8px;width:100%;">Continuar →</button>
        </div>`;
    } else {
      priorityHtml = `
        <div class="ds-priority">
          <div class="ds-priority-label">🚀 ¡Comienza tu primera sesión!</div>
          <button class="primary" data-go="new-session" style="margin-top:8px;width:100%;">+ Nueva sesión</button>
        </div>`;
    }

    let rankText = '#—', rankSub = 'Sin datos aún';
    if (user.classroomId) {
      try {
        const lb = Gamification.getLeaderboard('classroom', user.classroomId, 'week');
        const me = lb.find(e => e.userId === user.id);
        if (me) { rankText = `#${me.rank}`; rankSub = `de ${lb.length} alumnos`; }
      } catch (_) {}
    }
    const examsCount = exams.length;
    const coursesCount = new Set(sessions.map(sess => sess.subject)).size;
    const alertsHtml = alerts.length ? `
      <div class="ds-alerts">
        ${alerts.slice(0, 2).map(a => `<div class="ds-alert-item">⚡ ${a.msg}</div>`).join('')}
      </div>` : '';

    return `
      <div class="ds-wrap">
        ${heroHtml}
        ${priorityHtml}
        <div class="ds-hub-grid">
          <div class="ds-hub-card" data-go="stats">
            <div class="ds-hub-icon">📚</div>
            <div class="ds-hub-body">
              <div class="ds-hub-title">Mis Materias</div>
              <div class="ds-hub-sub">${coursesCount > 0 ? `${coursesCount} materias activas` : 'Sin sesiones aún'}</div>
            </div>
            <div class="ds-hub-arrow">→</div>
          </div>
          <div class="ds-hub-card" data-go="leaderboard">
            <div class="ds-hub-icon">🏆</div>
            <div class="ds-hub-body">
              <div class="ds-hub-title">Ranking</div>
              <div class="ds-hub-sub">${rankText} ${rankSub}</div>
            </div>
            <div class="ds-hub-arrow">→</div>
          </div>
          <div class="ds-hub-card" data-go="profile">
            <div class="ds-hub-icon">👤</div>
            <div class="ds-hub-body">
              <div class="ds-hub-title">Mi Perfil</div>
              <div class="ds-hub-sub">${examsCount > 0 ? `${examsCount} evaluación${examsCount !== 1 ? 'es' : ''} próxima${examsCount !== 1 ? 's' : ''}` : 'Evaluaciones · Materias · Ajustes'}</div>
            </div>
            <div class="ds-hub-arrow">→</div>
          </div>
          <div class="ds-hub-card" data-go="ai-study">
            <div class="ds-hub-icon">🤖</div>
            <div class="ds-hub-body">
              <div class="ds-hub-title">Estudio IA</div>
              <div class="ds-hub-sub">Minerva + DECO</div>
            </div>
            <div class="ds-hub-arrow">→</div>
          </div>
        </div>
        ${alertsHtml}
      </div>`;
  }

  function wireDashboard() {
    root().querySelectorAll('[data-go]').forEach(b =>
      b.addEventListener('click', () => App.go(b.dataset.go)));
  }

  // ---- Pantalla: Nueva sesión — Etapa 1: Configuración de metadatos ----
  function screenNewSession() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const subjects = Subjects.listSubjects(user.institutionType || 'colegio', user.id);
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const grades = [
      { id: '1ro', label: '1° de Secundaria' },
      { id: '2do', label: '2° de Secundaria' },
      { id: '3ro', label: '3° de Secundaria' },
      { id: '4to', label: '4° de Secundaria' },
      { id: '5to', label: '5° de Secundaria' }
    ];

    return `
      <div class="session-setup-wrap">
        <h1>Aprendizaje con IA</h1>
        <p class="muted" style="margin-bottom:20px;">Configura tu sesión y estudia con un tutor inteligente que analizará tu concentración automáticamente.</p>

        <form id="sessionSetupForm" class="card">
          <div class="row">
            <div class="field">
              <label>Fecha y hora</label>
              <input type="datetime-local" name="datetime" value="${local}" required />
            </div>
            <div class="field">
              <label>Duración (minutos)</label>
              <input type="number" name="durationMin" min="5" max="240" value="30" required />
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Materia</label>
              <select name="subject" required>
                ${subjects.map(x => `<option>${esc(x)}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Grado escolar</label>
              <select name="grade" required>
                ${grades.map(g => `<option value="${g.id}">${esc(g.label)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field">
            <label>Actividad previa</label>
            <select name="previousActivity" required>
              ${Sessions.PREVIOUS_ACTIVITIES.map(a => `<option value="${a.id}">${esc(a.label)}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
            <button type="button" class="ghost" data-go="dashboard">Cancelar</button>
            <button class="primary" type="submit">Comenzar sesión con IA ✨</button>
          </div>
        </form>

        <p class="muted" style="font-size:12px;margin-top:12px;text-align:center;">
          La IA evaluará tu concentración y aprendizaje de forma invisible mientras estudias.
        </p>
      </div>`;
  }

  function wireNewSession() {
    root().querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => App.go(b.dataset.go)));

    document.getElementById('sessionSetupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const metadata = {
        datetime:         new Date(fd.get('datetime')).toISOString(),
        durationMin:      Number(fd.get('durationMin')),
        subject:          fd.get('subject'),
        grade:            fd.get('grade'),
        previousActivity: fd.get('previousActivity')
      };
      _startAiChat(metadata);
    });
  }

  // ---- Chat IA — estado en memoria (no persiste en Storage) ----
  let _chatState = null;
  // Guarda para registrar el listener de borrado de archivos una sola vez
  let _aiDeleteBound = false;

  async function _startAiChat(metadata) {
    _chatState = {
      metadata, history: [], startedAt: Date.now(), attachedFiles: [],
      quizQuestions: [], preQuizScore: null
    };
    const tabTutor = document.getElementById('tabTutor');
    if (!tabTutor) return;
    tabTutor.innerHTML = _renderChatScreen(metadata);
    _wireChatScreen();

    // Mini-quiz inicial (Fase C): punto de partida. Se reutilizan las mismas
    // preguntas en el quiz final → la comparación pre/post es válida.
    try {
      const qs = await Quiz.generate(metadata, metadata.subject);
      _chatState.quizQuestions = qs;
      if (qs.length) {
        _chatState.preQuizScore = await Quiz.present(qs, '📋 Quiz inicial — ' + metadata.subject);
      }
    } catch (_) { /* sin quiz → continuar sin bloquear */ }

    _sendAiMessage('Hola, estoy listo para comenzar. ¿Qué tema de ' + metadata.subject + ' vas a estudiar hoy?');
  }

  // Lee un File como base64 (sin el prefijo data:...)
  function _readBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function _renderChatScreen(metadata) {
    const gradeLabel = formatGradeShort(metadata.grade);

    return `
      <div class="chat-screen">
        <div class="chat-header">
          <div class="chat-header-info">
            <span class="chat-header-title">🤖 TrackTutor · ${esc(metadata.subject)}</span>
            <span class="chat-header-sub">${esc(gradeLabel)} · ${metadata.durationMin} min planificados</span>
          </div>
          <div class="chat-header-actions">
            <button class="ghost" id="chatCancelBtn" style="font-size:12px;padding:6px 12px;">Cancelar</button>
            <button class="primary" id="chatFinalizeBtn" style="font-size:12px;padding:6px 14px;">Finalizar sesión</button>
          </div>
        </div>

        <div class="chat-messages" id="chatMessages"></div>

        <div class="chat-input-area">
          <div class="chat-attachments" id="chatAttachments"></div>
          <div class="chat-input-row">
            <button class="ghost chat-attach-btn" id="chatAttachBtn" title="Adjuntar archivo" style="height:44px;padding:0 12px;flex-shrink:0;">📎</button>
            <input type="file" id="chatFileInput" multiple style="display:none"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.pptx,.mp3,.wav,.m4a,.mp4,.webm,.docx,.txt" />
            <textarea
              id="chatInput"
              placeholder="Escribe, habla o adjunta archivos..."
              rows="1"
            ></textarea>
            <button class="ghost chat-mic-btn" id="chatMicBtn" title="Hablar" style="height:44px;padding:0 12px;flex-shrink:0;">🎤</button>
            <button class="primary" id="chatSendBtn" style="height:44px;padding:0 18px;flex-shrink:0;">Enviar</button>
          </div>
          <div class="chat-footer-actions">
            <span class="chat-hint">Enter para enviar · Shift+Enter nueva línea · 📎 adjuntar · 🎤 voz</span>
          </div>
        </div>
      </div>`;
  }

  function _wireChatScreen() {
    const input     = document.getElementById('chatInput');
    const sendBtn   = document.getElementById('chatSendBtn');
    const finalBtn  = document.getElementById('chatFinalizeBtn');
    const cancelBtn = document.getElementById('chatCancelBtn');

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Enter envía, Shift+Enter nueva línea
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });

    // Adjuntar archivos
    const attachBtn  = document.getElementById('chatAttachBtn');
    const fileInput  = document.getElementById('chatFileInput');
    const attachArea = document.getElementById('chatAttachments');

    attachBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async (e) => {
      for (const file of Array.from(e.target.files || [])) {
        try {
          const base64 = await _readBase64(file);
          const id     = Math.random().toString(36).slice(2);
          if (_chatState) {
            _chatState.attachedFiles.push({ id, fileName: file.name, mimeType: file.type, base64 });
          }
          const chip = document.createElement('div');
          chip.className = 'chat-attach-chip';
          chip.innerHTML = `<span>📄 ${esc(file.name)}</span><button data-fid="${id}">✕</button>`;
          chip.querySelector('button').addEventListener('click', () => {
            if (_chatState) _chatState.attachedFiles = _chatState.attachedFiles.filter(f => f.id !== id);
            chip.remove();
          });
          attachArea?.appendChild(chip);
        } catch(err) {
          UI.flash?.('Error al leer el archivo: ' + err.message, 'error');
        }
      }
      if (fileInput) fileInput.value = '';
    });

    // Micrófono — Nivel 1: dictado nativo (instantáneo); Nivel 2: grabación + Gemini
    const micBtn = document.getElementById('chatMicBtn');
    let _micActive = false;
    function _micIdle() { _micActive = false; micBtn.textContent = '🎤'; micBtn.classList.remove('recording'); }
    micBtn?.addEventListener('click', async () => {
      if (AudioTranscriber.isDictationSupported()) {
        if (!_micActive) {
          _micActive = true;
          micBtn.textContent = '⏹';
          micBtn.classList.add('recording');
          AudioTranscriber.startDictation(
            (text) => { _micIdle(); if (text) { input.value = text; sendBtn.click(); } else UI.flash?.('No se detectó voz. Intenta de nuevo.', 'error'); },
            (errMsg) => { _micIdle(); UI.flash?.(errMsg, 'error'); }
          );
        } else {
          AudioTranscriber.stopDictation();
          _micIdle();
        }
        return;
      }
      // Fallback (sin Web Speech API): grabar + transcribir con Gemini
      if (!_micActive) {
        _micActive = true;
        micBtn.textContent = '⏹';
        micBtn.classList.add('recording');
        try { await AudioTranscriber.startRecording(() => {}); }
        catch(err) { _micIdle(); UI.flash?.(err.message, 'error'); }
      } else {
        _micActive = false;
        micBtn.textContent = '⌛';
        micBtn.classList.remove('recording');
        try {
          const audioBlob = await AudioTranscriber.stopRecording();
          const { text }  = await AudioTranscriber.transcribe(audioBlob, 'es-ES');
          micBtn.textContent = '🎤';
          if (text && text.trim()) { input.value = text.trim(); sendBtn.click(); }
          else UI.flash?.('No se detectó voz. Intenta de nuevo.', 'error');
        } catch(err) { micBtn.textContent = '🎤'; UI.flash?.(err.message, 'error'); }
      }
    });

    // Enviar (texto + archivos adjuntos)
    sendBtn.addEventListener('click', () => {
      const text  = input.value.trim();
      const files = _chatState?.attachedFiles ? [..._chatState.attachedFiles] : [];
      if (!text && files.length === 0) return;
      if (!_chatState) return;
      input.value = '';
      input.style.height = 'auto';
      if (attachArea) attachArea.innerHTML = '';
      if (_chatState) _chatState.attachedFiles = [];
      _handleUserMessage(text, files);
    });

    cancelBtn.addEventListener('click', () => {
      if (!confirm('¿Salir de la sesión? No se guardará el progreso.')) return;
      _chatState = null;
      App.go('ai-study');
    });

    finalBtn.addEventListener('click', () => _finalizeChat());
  }

  function _appendBubble(role, text, streaming) {
    const messages = document.getElementById('chatMessages');
    if (!messages) return null;

    const wrap = document.createElement('div');
    wrap.className = `chat-bubble-wrap ${role}`;

    const label = document.createElement('div');
    label.className = 'chat-bubble-label';
    label.textContent = role === 'ia' ? 'TrackTutor' : 'Tú';

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.textContent = text;

    wrap.appendChild(label);
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;

    return streaming ? bubble : null;
  }

  function _showTyping() {
    const messages = document.getElementById('chatMessages');
    if (!messages) return null;
    const el = document.createElement('div');
    el.id = 'chatTyping';
    el.className = 'chat-bubble-wrap ia';
    el.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function _removeTyping() {
    document.getElementById('chatTyping')?.remove();
  }

  // Contingencia del tutor (Fase B): si Gemini cae, no rompemos la sesión.
  // Mostramos una tarjeta amable y ofrecemos seguir con el Pomodoro o reintentar.
  function _showTutorContingency() {
    const messages = document.getElementById('chatMessages');
    if (!messages || messages.querySelector('.tutor-contingency')) return;
    const card = document.createElement('div');
    card.className = 'tutor-contingency';
    card.innerHTML = `
      <div class="tc-icon">🌿</div>
      <div class="tc-title">El Tutor IA está tomando un respiro</div>
      <div class="tc-text">No pudimos conectar con la IA en este momento. Tu sesión y tu progreso están a salvo. Mientras tanto puedes seguir estudiando:</div>
      <div class="tc-actions">
        <button class="primary" id="tcPomodoro">⏱️ Usar el temporizador Pomodoro</button>
        <button class="ghost" id="tcRetry">🔄 Reintentar</button>
      </div>`;
    messages.appendChild(card);
    messages.scrollTop = messages.scrollHeight;
    card.querySelector('#tcPomodoro')?.addEventListener('click', () => {
      window._showPomBar?.();
      UI.flash?.('Temporizador listo. ¡Sigue concentrado! 🍅', 'success');
    });
    card.querySelector('#tcRetry')?.addEventListener('click', () => {
      card.remove();
      document.getElementById('chatInput')?.focus();
      UI.flash?.('Puedes volver a enviar tu mensaje.', 'info');
    });
  }

  // Registro del piloto (Fase C) con gate de consentimiento parental (Fase E):
  // sin consentimiento explícito NO se registra ningún dato del piloto (LPDP).
  function _recordPilot(data) {
    if (typeof Pilot === 'undefined') return;
    const u = (typeof Roles !== 'undefined') ? Roles.current() : null;
    if (!u || u.parentalConsent !== true) return;
    Pilot.record(data);
  }

  async function _sendAiMessage(userTriggerText) {
    if (!_chatState) return;

    const typingEl = _showTyping();
    const sendBtn  = document.getElementById('chatSendBtn');
    const finalBtn = document.getElementById('chatFinalizeBtn');
    if (sendBtn)  sendBtn.disabled = true;
    if (finalBtn) finalBtn.disabled = true;

    const bubble = _appendBubble('ia', '', true);
    typingEl?.remove();

    let fullText = '';
    const msgTimestamp = Date.now();

    try {
      fullText = await AiChatProxy.sendMessage(
        _chatState.metadata,
        _chatState.history,
        userTriggerText,
        (chunk) => {
          if (bubble) {
            bubble.textContent += chunk;
            const msgs = document.getElementById('chatMessages');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
          }
        }
      );

      _chatState.history.push(
        { role: 'user',  content: userTriggerText, timestamp: msgTimestamp },
        { role: 'model', content: fullText,         timestamp: Date.now()   }
      );
    } catch (err) {
      _removeTyping();
      if (bubble) bubble.remove();
      window.Monitor?.log?.('gemini', 'Tutor: fallo al iniciar respuesta', err?.message);
      _showTutorContingency();
    } finally {
      if (sendBtn)  sendBtn.disabled = false;
      if (finalBtn) finalBtn.disabled = false;
    }
  }

  async function _handleUserMessage(text, files = []) {
    if (!_chatState) return;
    const ts = Date.now();

    // Mostrar burbuja del usuario (con nombres de archivos si los hay)
    const displayText = text + (files.length > 0 ? '\n' + files.map(f => '📎 ' + f.fileName).join('\n') : '');
    _appendBubble('user', displayText);

    const typingEl = _showTyping();
    const sendBtn  = document.getElementById('chatSendBtn');
    const finalBtn = document.getElementById('chatFinalizeBtn');
    if (sendBtn)  sendBtn.disabled = true;
    if (finalBtn) finalBtn.disabled = true;

    const histContent = text || (files.length > 0 ? '(Archivos adjuntos: ' + files.map(f => f.fileName).join(', ') + ')' : '');
    _chatState.history.push({ role: 'user', content: histContent, timestamp: ts });

    _removeTyping();
    const bubble = _appendBubble('ia', '', true);

    let fullText = '';
    try {
      fullText = await AiChatProxy.sendMessage(
        _chatState.metadata,
        _chatState.history.slice(0, -1),
        text || 'Analiza este material y ayúdame a entenderlo.',
        (chunk) => {
          if (bubble) {
            bubble.textContent += chunk;
            const msgs = document.getElementById('chatMessages');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
          }
        },
        files  // archivos adjuntos multimodal
      );
      _chatState.history.push({ role: 'model', content: fullText, timestamp: Date.now() });
    } catch (err) {
      if (bubble) bubble.remove();
      _chatState.history.pop();
      window.Monitor?.log?.('gemini', 'Tutor: fallo al responder', err?.message);
      _showTutorContingency();
    } finally {
      if (sendBtn)  sendBtn.disabled = false;
      if (finalBtn) finalBtn.disabled = false;
    }
  }

  async function _finalizeChat() {
    if (!_chatState) return;

    if (_chatState.history.length < 2) {
      UI.flash('Chatea un poco más antes de finalizar la sesión.', 'error');
      return;
    }

    const finalBtn  = document.getElementById('chatFinalizeBtn');
    const cancelBtn = document.getElementById('chatCancelBtn');
    const sendBtn   = document.getElementById('chatSendBtn');
    const inputArea = document.querySelector('.chat-input-area');

    if (finalBtn)  finalBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (sendBtn)   sendBtn.disabled = true;
    if (inputArea) inputArea.innerHTML = `
      <div class="chat-finalizing">
        <div class="spinner-ring"></div>
        <span>Analizando tu sesión… esto toma unos segundos</span>
      </div>`;

    try {
      const { concentration, metrics } = await AiChatProxy.finalizeSession(
        _chatState.metadata,
        _chatState.history
      );

      const s    = Storage.get();
      const user = s.users[s.currentUserId];
      const { record, gamResult } = Sessions.add({
        email:            user.id,
        datetime:         _chatState.metadata.datetime,
        institutionType:  user.institutionType || 'colegio',
        subject:          _chatState.metadata.subject,
        concentration:    concentration,
        durationMin:      _chatState.metadata.durationMin,
        previousActivity: _chatState.metadata.previousActivity,
        comment:          JSON.stringify(metrics)
      });

      // Quiz final (Fase C): mismas preguntas que el inicial → mide aprendizaje real.
      let postQuizScore = null;
      if (_chatState.quizQuestions && _chatState.quizQuestions.length) {
        postQuizScore = await Quiz.present(
          _chatState.quizQuestions, '✅ Quiz final — ' + _chatState.metadata.subject
        );
      }
      const timeSpentSeconds = (Date.now() - (_chatState.startedAt || Date.now())) / 1000;
      const preQuizScore = _chatState.preQuizScore;

      _chatState = null;

      // Registro anónimo del piloto (Fase C). Gateado por consentimiento en Fase E.
      // Fire-and-forget: tiene su propia cola offline (Pilot.flushOutbox).
      _recordPilot({ sessionId: record.id, focusScore: concentration, timeSpentSeconds, preQuizScore, postQuizScore });

      App.go('dashboard');
      const mejora = (preQuizScore != null && postQuizScore != null)
        ? ` · Quiz: ${preQuizScore}→${postQuizScore}`
        : '';
      UI.flash(`Sesión guardada · Concentración deducida: ${concentration}/5 🎯${mejora}`, 'success');
      showXpToast(gamResult.xpEarned, gamResult.newBadges);
    } catch (err) {
      UI.flash('Error al guardar la sesión: ' + err.message, 'error');
      if (finalBtn)  finalBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (sendBtn)   sendBtn.disabled = false;
    }
  }

  // ---- Pantalla: Materias ----
  function screenSubjects() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const base = s.subjectsByInstitution[user.institutionType || 'colegio'] || [];
    const custom = s.customSubjects[user.id] || [];

    return `
      <h1>Materias</h1>
      <p class="muted">Materias disponibles para tu institución. Puedes agregar materias personalizadas.</p>
      <div class="card">
        <h3>Materias predefinidas</h3>
        <div>${base.map(x => `<span class="chip">${esc(x)}</span>`).join('') || '<span class="muted">Ninguna</span>'}</div>
      </div>
      <div class="card">
        <h3>Materias personalizadas</h3>
        <div id="customList">${custom.map(x => `<span class="chip">${esc(x)}<span class="x" data-del="${esc(x)}">✕</span></span>`).join('') || '<span class="muted">Aún no agregaste materias.</span>'}</div>
        <form id="addSubjectForm" style="margin-top:14px;display:flex;gap:8px;">
          <input name="subject" placeholder="Ej. Robótica, Filosofía…" style="flex:1;background:var(--bg-2);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:10px;" />
          <button class="primary" type="submit">Agregar</button>
        </form>
      </div>`;
  }

  function wireSubjects() {
    const userId = Storage.get().currentUserId;
    document.getElementById('addSubjectForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get('subject');
      try { Subjects.addCustomSubject(userId, name); App.go('subjects'); UI.flash('Materia agregada.', 'success'); }
      catch (err) { UI.flash(err.message, 'error'); }
    });
    root().querySelectorAll('[data-del]').forEach(el => {
      el.addEventListener('click', () => { Subjects.removeCustomSubject(userId, el.dataset.del); App.go('subjects'); });
    });
  }

  // ---- Pantalla: Historial ----
  function screenHistory(filters = {}) {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const subjects = Subjects.listSubjects(user.institutionType || 'colegio', user.id);
    const list = Sessions.listFor(user.id, filters);

    return `
      <h1>Historial de sesiones</h1>
      <div class="toolbar">
        <div class="filters">
          <select id="fSubject">
            <option value="">Todas las materias</option>
            ${subjects.map(x => `<option ${filters.subject === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
          </select>
          <input type="date" id="fFrom" value="${filters.fromDate || ''}" />
          <input type="date" id="fTo" value="${filters.toDate || ''}" />
          <button class="ghost" id="applyF">Aplicar</button>
          <button class="ghost" id="clearF">Limpiar</button>
        </div>
        <button class="primary" id="exportBtn">Exportar CSV</button>
      </div>
      <div class="card" style="padding:0;overflow:auto;">
        ${list.length === 0 ? '<div class="empty">No hay sesiones con esos filtros.</div>' : `
        <table class="table">
          <thead><tr>
            <th>Fecha</th><th>Materia</th><th>Conc.</th><th>Min</th><th>Actividad previa</th><th>Comentario</th><th></th>
          </tr></thead>
          <tbody>
            ${list.map(x => `
              <tr>
                <td>${new Date(x.datetime).toLocaleString('es-PE')}</td>
                <td>${esc(x.subject)}</td>
                <td><strong>${x.concentration}</strong>/5</td>
                <td>${x.durationMin}</td>
                <td>${esc(x.previousActivity)}${x.previousActivityOther ? ' — '+esc(x.previousActivityOther) : ''}</td>
                <td>${esc(x.comment)}</td>
                <td><button class="danger" data-rm="${x.id}">Eliminar</button></td>
              </tr>`).join('')}
          </tbody>
        </table>`}
      </div>`;
  }

  function wireHistory() {
    const userId = Storage.get().currentUserId;
    document.getElementById('applyF').addEventListener('click', () => {
      const subject = document.getElementById('fSubject').value;
      const fromDate = document.getElementById('fFrom').value;
      const toDate = document.getElementById('fTo').value;
      App._historyFilters = { subject, fromDate, toDate,
        from: fromDate ? new Date(fromDate + 'T00:00:00').toISOString() : '',
        to: toDate ? new Date(toDate + 'T23:59:59').toISOString() : '' };
      App.go('history');
    });
    document.getElementById('clearF').addEventListener('click', () => { App._historyFilters = {}; App.go('history'); });
    document.getElementById('exportBtn').addEventListener('click', () => {
      const list = Sessions.listFor(userId, App._historyFilters || {});
      if (!list.length) return UI.flash('No hay sesiones para exportar.', 'error');
      Exporter.exportSessions(list);
    });
    root().querySelectorAll('[data-rm]').forEach(b => {
      b.addEventListener('click', () => {
        if (!confirm('¿Eliminar esta sesión?')) return;
        Sessions.remove(b.dataset.rm);
        App.go('history');
      });
    });
  }

  // ---- Pantalla: Estadísticas ----
  function screenStats() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const sessions = Sessions.listFor(user.id);

    if (!sessions.length) {
      return `<h1>Estadísticas</h1><div class="card empty">Aún no tienes sesiones registradas. <a href="#" data-go="new-session" style="color:var(--accent);">Registra tu primera sesión.</a></div>`;
    }

    const sum = Stats.summary(sessions);
    const subs = Stats.bySubject(sessions);
    const buckets = Stats.byHourBucket(sessions);
    const acts = Stats.byPreviousActivity(sessions);
    const dist = Stats.likertDistribution(sessions);
    const total = sessions.length;

    const renderBar = (rows, key) => rows.map(r => {
      const pct = (r.avgConcentration / 5) * 100;
      return `<div>
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span>${esc(r[key])}</span>
          <span class="muted">${r.avgConcentration}/5 · ${r.count} ses.</span>
        </div>
        <div class="bar"><span style="width:${pct}%"></span></div>
      </div>`;
    }).join('');

    return `
      <h1>Estadísticas</h1>
      <div class="grid cols-4">
        <div class="kpi"><div class="v">${sum.total}</div><div class="l">Sesiones</div></div>
        <div class="kpi"><div class="v">${sum.avgConc}</div><div class="l">Concentración prom.</div></div>
        <div class="kpi"><div class="v">${sum.totalMin}</div><div class="l">Min totales</div></div>
        <div class="kpi"><div class="v">${sum.avgDur}</div><div class="l">Min prom./sesión</div></div>
      </div>

      <div class="card" style="margin-top:18px;">
        <h3>Actividad semanal (últimas 52 semanas)</h3>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">Menos →→ Más actividad</div>
        ${Charts.heatmapGrid(sessions)}
      </div>

      <div class="grid cols-2" style="margin-top:18px;">
        <div class="card">
          <h2>Concentración por materia</h2>
          <div class="chart-container">
            <canvas id="chartSubject"></canvas>
          </div>
        </div>
        <div class="card">
          <h2>Distribución Likert</h2>
          <div class="chart-container">
            <canvas id="chartLikert"></canvas>
          </div>
        </div>
        <div class="card">
          <h2>Por franja horaria</h2>
          ${renderBar(buckets, 'bucket')}
        </div>
        <div class="card">
          <h2>Por actividad previa</h2>
          ${renderBar(acts, 'activity')}
        </div>
      </div>`;
  }

  function wireStats() {
    root().querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); App.go(b.dataset.go); }));

    const s = Storage.get();
    const sessions = Sessions.listFor(s.currentUserId);
    if (!sessions.length) return;

    const subs = Stats.bySubject(sessions);
    if (subs.length > 0) {
      Charts.create('chartSubject', Charts.barConfig(
        subs.map(r => r.subject),
        subs.map(r => r.avgConcentration),
        'Concentración prom.',
        Charts.COLORS.primary
      ));
    }

    const dist = Stats.likertDistribution(sessions);
    Charts.create('chartLikert', Charts.doughnutConfig(
      Sessions.LIKERT.map(l => l.label),
      Sessions.LIKERT.map(l => dist[l.v] || 0)
    ));
  }

  // ---- Pantalla: Recomendaciones ----
  function screenRecommend() {
    const s = Storage.get();
    const sessions = Sessions.listFor(s.currentUserId);
    const tips = Analytics.buildRecommendations(sessions);
    const oldTips = Recommend.build(sessions);
    const allTips = [...tips, ...oldTips.filter(t => !tips.some(n => n.text === t.text))];

    return `
      <h1>Recomendaciones personalizadas</h1>
      <p class="muted">Basadas en tus ${sessions.length} sesión${sessions.length === 1 ? '' : 'es'} registrada${sessions.length === 1 ? '' : 's'}.</p>
      <div style="margin-top:14px;">
        ${allTips.map(t => `<div class="alert ${t.type}">${esc(t.text || t.msg || '')}</div>`).join('')}
      </div>`;
  }

  // ---- Pantalla: Logros ----
  function screenAchievements() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const earned = new Set((user.gamification?.badges) || []);

    return `
      <h1>Logros e Insignias</h1>
      <p class="muted">Desbloquea insignias completando desafíos y manteniendo constancia.</p>

      <div style="margin:12px 0;display:flex;gap:12px;flex-wrap:wrap;">
        <div class="kpi" style="min-width:120px;">
          <div class="v">${earned.size}</div>
          <div class="l">Desbloqueadas</div>
        </div>
        <div class="kpi" style="min-width:120px;">
          <div class="v">${Gamification.BADGES.length - earned.size}</div>
          <div class="l">Por obtener</div>
        </div>
        <div class="kpi" style="min-width:120px;">
          <div class="v">${user.gamification?.xp || 0}</div>
          <div class="l">XP total</div>
        </div>
      </div>

      <div class="badges-grid">
        ${Gamification.BADGES.map(b => `
          <div class="badge-card ${earned.has(b.id) ? '' : 'locked'}">
            <span class="badge-icon">${b.icon}</span>
            <div class="badge-name">${esc(b.label)}</div>
            <div class="badge-desc">${esc(b.desc)}</div>
            ${earned.has(b.id) ? '<div class="badge-date">✓ Obtenida</div>' : '<div class="badge-date" style="color:var(--muted);">Bloqueada</div>'}
          </div>`).join('')}
      </div>`;
  }

  // ---- Pantalla: Leaderboard ----
  function screenLeaderboard() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const scope = App._lbScope || 'classroom';
    const period = App._lbPeriod || 'week';

    let scopeId = null;
    let scopeLabel = 'Global';
    let hasClassroom = !!user.classroomId;
    let hasSchool = !!user.schoolId;

    if (scope === 'classroom' && user.classroomId) {
      scopeId = user.classroomId;
      scopeLabel = s.classrooms[user.classroomId]?.name || 'Mi Aula';
    } else if (scope === 'school' && user.schoolId) {
      scopeId = user.schoolId;
      scopeLabel = s.schools[user.schoolId]?.name || 'Mi Colegio';
    }

    const lb = Gamification.getLeaderboard(
      (scope === 'classroom' && !user.classroomId) ? 'global' : scope,
      scopeId,
      period
    );

    const scopeOptions = [
      hasClassroom ? `<button class="tab-btn ${scope === 'classroom' ? 'active' : ''}" data-scope="classroom">Mi Aula</button>` : '',
      hasSchool    ? `<button class="tab-btn ${scope === 'school' ? 'active' : ''}" data-scope="school">Mi Colegio</button>` : '',
      `<button class="tab-btn ${scope === 'global' ? 'active' : ''}" data-scope="global">Global</button>`
    ].filter(Boolean).join('');

    return `
      <h1>Ranking</h1>
      <div class="tab-bar">${scopeOptions}</div>
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        <button class="ghost ${period === 'week' ? 'active-filter' : ''}" data-period="week">Esta semana</button>
        <button class="ghost ${period === 'month' ? 'active-filter' : ''}" data-period="month">Este mes</button>
        <button class="ghost ${period === 'all' ? 'active-filter' : ''}" data-period="all">Total</button>
      </div>

      <div class="card" style="padding:0;overflow:auto;">
        ${lb.length === 0 ? '<div class="empty">No hay datos de ranking todavía.</div>' : `
        <table class="leaderboard-table">
          <thead><tr>
            <th style="padding:12px 16px;">#</th>
            <th style="padding:12px 8px;">Estudiante</th>
            <th style="padding:12px 8px;">XP</th>
            <th style="padding:12px 8px;">Nivel</th>
            <th style="padding:12px 8px;">Racha</th>
            <th style="padding:12px 8px;">Sesiones</th>
          </tr></thead>
          <tbody>
            ${lb.map(e => `
              <tr class="${e.userId === user.id ? 'self' : ''}">
                <td style="padding:12px 16px;" class="rank-medal-${e.rank}">${e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}</td>
                <td style="padding:12px 8px;"><span class="avatar-initials">${esc(e.name.slice(0,2).toUpperCase())}</span> ${esc(e.name)}</td>
                <td style="padding:12px 8px;"><strong>${e.xp}</strong></td>
                <td style="padding:12px 8px;"><span class="chip">Nv.${e.level}</span></td>
                <td style="padding:12px 8px;">🔥 ${e.streak}</td>
                <td style="padding:12px 8px;">${e.sessionCount}</td>
              </tr>`).join('')}
          </tbody>
        </table>`}
      </div>`;
  }

  function wireLeaderboard() {
    root().querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => { App._lbScope = btn.dataset.scope; App.go('leaderboard'); });
    });
    root().querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => { App._lbPeriod = btn.dataset.period; App.go('leaderboard'); });
    });
  }

  // ---- Pantalla: Pomodoro ----
  function screenPomodoro() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const subjects = Subjects.listSubjects(user.institutionType || 'colegio', user.id);
    const pState = Pomodoro.getState();
    const remaining = pState.remaining || Pomodoro.DEFAULTS.focus * 60;

    return `
      <h1>Timer Pomodoro</h1>
      <div class="pomodoro-wrap">
        <div class="timer-display" id="timerDisplay">${Pomodoro.formatTime(remaining)}</div>
        <div class="timer-mode" id="timerMode">Listo para enfocar</div>
        <div class="cycle-dots" id="cycleDots">
          ${Array.from({length: Math.min(pState.cycleCount || 0, 8)}, () => '<span class="done">●</span>').join('')}
        </div>

        <div class="field" style="margin-top:20px;max-width:300px;margin-left:auto;margin-right:auto;">
          <label>Materia a estudiar</label>
          <select id="pomSubject">
            ${subjects.map(x => `<option>${esc(x)}</option>`).join('')}
          </select>
        </div>

        <div class="timer-controls">
          <button class="primary" id="pomStart">▶ Iniciar</button>
          <button class="ghost" id="pomPause">⏸ Pausar</button>
          <button class="ghost" id="pomSkip">⏭ Saltar</button>
          <button class="ghost" id="pomReset">↺ Reiniciar</button>
        </div>

        <div class="card" style="margin-top:24px;text-align:left;max-width:340px;margin-left:auto;margin-right:auto;">
          <h3>Configuración</h3>
          <div class="row">
            <div class="field">
              <label>Enfoque (min)</label>
              <input type="number" id="focusDur" value="${Pomodoro.DEFAULTS.focus}" min="1" max="120" />
            </div>
            <div class="field">
              <label>Descanso (min)</label>
              <input type="number" id="breakDur" value="${Pomodoro.DEFAULTS.shortBreak}" min="1" max="30" />
            </div>
          </div>
        </div>

        <p class="muted" style="margin-top:16px;font-size:12px;">Al completar un ciclo de enfoque se te pedirá registrar tu concentración y la sesión se guardará automáticamente.</p>
      </div>

      <!-- Modal de concentración -->
      <div id="pomModal" class="pom-modal hidden">
        <div class="pom-modal-inner card">
          <h2>🍅 ¡Ciclo completado!</h2>
          <p>¿Qué nivel de concentración tuviste?</p>
          <div class="likert" id="pomLikert">
            ${Sessions.LIKERT.map(l => `
              <label title="${esc(l.label)}">
                <input type="radio" name="pomConc" value="${l.v}" ${l.v === 3 ? 'checked' : ''} />
                <div class="lk-num">${l.v}</div>
                <div class="lk-txt">${esc(l.label)}</div>
              </label>`).join('')}
          </div>
          <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
            <button class="ghost" id="pomSkipLog">Saltar registro</button>
            <button class="primary" id="pomSaveSession">Guardar sesión</button>
          </div>
        </div>
      </div>`;
  }

  function wirePomodoro() {
    const s = Storage.get();
    const userId = s.currentUserId;

    // El timer y sus callbacks los gestiona la barra global (#pomBar en app.js).
    // Aquí solo renderizamos el estado inicial y cableamos los botones de la página.
    const modeLabels = { focus: 'Enfocado 🧠', break: 'Descanso ☕', paused: 'Pausado ⏸', idle: 'Listo para enfocar' };
    const pState = Pomodoro.getState();
    const display = document.getElementById('timerDisplay');
    const modeEl  = document.getElementById('timerMode');
    if (display) display.textContent = Pomodoro.formatTime(pState.remaining || Pomodoro.DEFAULTS.focus * 60);
    if (modeEl)  modeEl.textContent  = modeLabels[pState.mode] || 'Listo para enfocar';

    document.getElementById('pomStart')?.addEventListener('click', () => {
      const focusInput = document.getElementById('focusDur');
      const breakInput = document.getElementById('breakDur');
      Pomodoro.DEFAULTS.focus = Number(focusInput?.value || 25);
      Pomodoro.DEFAULTS.shortBreak = Number(breakInput?.value || 5);
      const subject = document.getElementById('pomSubject')?.value || 'Sin materia';
      Pomodoro.reset();
      Pomodoro.start(subject, userId);
    });
    document.getElementById('pomPause')?.addEventListener('click', () => {
      const st = Pomodoro.getState();
      if (st.mode === 'paused') Pomodoro.resume();
      else Pomodoro.pause();
    });
    document.getElementById('pomSkip')?.addEventListener('click', () => Pomodoro.skip());
    document.getElementById('pomReset')?.addEventListener('click', () => Pomodoro.reset());
  }

  // ---- helpers de Cuenta ----
  function _roleLabel(user) {
    if (!user.schoolId) return 'Personal';
    if (user.institutionType === 'colegio') return 'Estudiante';
    return 'Institucional';
  }

  // ---- Pantalla: Perfil (bifurca entre personal e institucional) ----
  function screenProfile() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const sessions = Sessions.listFor(user.id);
    return user.schoolId
      ? _profileStudent(user, sessions, s)
      : _profilePersonal(user, sessions, s);
  }

  function _profilePersonal(user, sessions, s) {
    const gam = user.gamification || {};
    const levelInfo = Gamification.getLevelInfo(gam.xp || 0);
    const sum = Stats.summary(sessions);
    const acadProfile = JSON.parse(localStorage.getItem('tf-academic-profile-v3') || '{}');
    const schedule = JSON.parse(localStorage.getItem('tf-weekly-schedule') || '{}');
    const prefs = JSON.parse(localStorage.getItem('tf-prefs') || '{}');
    const initials = user.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const avatarColor = acadProfile.avatarColor || '#C89B6D';
    const message = acadProfile.message || 'Cada sesión te acerca a tu objetivo.';
    const prepPct = _calcPrep(user, sessions, acadProfile);
    const nowMs = Date.now();
    const nearestExam = (acadProfile.examDates || [])
      .map(e => ({ ...e, days: Math.ceil((new Date(e.date) - nowMs) / 86400000) }))
      .filter(e => e.days > 0).sort((a, b) => a.days - b.days)[0] || null;

    const AVATAR_COLORS = ['#C89B6D','#8B5CF6','#3B82F6','#22C55E','#EF4444','#F59E0B'];
    const colorDotsHtml = AVATAR_COLORS.map(c =>
      `<div class="pp-color-dot${c === avatarColor ? ' active' : ''}" data-color="${esc(c)}" style="background:${esc(c)};"></div>`
    ).join('');

    // ── Panel: Mi Perfil ──
    const panelProfile = `
      <div class="pp-panel active" data-panel="profile">
        <h2 class="pp-section-title">Mi Perfil</h2>
        <div class="pp-avatar-row">
          <div class="pp-avatar-side">
            <div class="pp-avatar-big" id="ppAvatarBig" style="background:${esc(avatarColor)};">${esc(initials)}</div>
            <div class="pp-avatar-colors">${colorDotsHtml}</div>
          </div>
          <div class="pp-profile-info">
            <div class="pp-name">${esc(user.name)}</div>
            <div class="pp-msg-wrap">
              <div class="pp-msg-display" id="ppMsgDisplay">
                <span class="pp-msg-text" id="ppMsgText">${esc(message)}</span>
                <button class="pp-msg-edit-btn ghost" id="ppMsgEditBtn">✏️</button>
              </div>
              <div id="ppMsgEdit" style="display:none;flex-direction:column;gap:6px;">
                <textarea class="pp-msg-textarea" id="ppMsgInput" maxlength="100">${esc(message)}</textarea>
                <button class="primary pp-msg-edit-btn" id="ppMsgSaveBtn" style="align-self:flex-end;padding:5px 14px;">Guardar</button>
              </div>
            </div>
          </div>
        </div>
        ${acadProfile.university ? `
          <div class="pp-summary-card">
            <div class="pp-summary-uni">${esc(acadProfile.university === 'otro' ? (acadProfile.customUniversity || 'Mi universidad') : acadProfile.university)}</div>
            <div class="pp-summary-meta">${esc(acadProfile.career || '')}${nearestExam ? ` · 📅 ${nearestExam.days} días para ${esc(nearestExam.label)}` : ''}</div>
            <div class="pp-summary-bar-wrap"><div class="pp-summary-bar" style="width:${prepPct}%;"></div></div>
            <div class="pp-summary-prep">${prepPct}% de preparación</div>
          </div>` : `
          <div class="pp-cta-card">
            <div class="pp-cta-icon">🎓</div>
            <div class="pp-cta-title">Configura tu meta universitaria</div>
            <div class="pp-cta-sub">Define tu universidad y carrera para personalizar tu ruta de preparación.</div>
            <button class="primary" id="ppGoToMeta" style="margin-top:4px;">Configurar ahora →</button>
          </div>`}
      </div>`;

    // ── Panel: Meta Universitaria ──
    let panelUniversity;
    if (acadProfile.university) {
      const uniDisplay = acadProfile.university === 'otro'
        ? (acadProfile.customUniversity || 'Mi universidad') : acadProfile.university;
      panelUniversity = `
        <div class="pp-panel" data-panel="university">
          <h2 class="pp-section-title">Meta Universitaria</h2>
          <div class="card">
            <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${esc(uniDisplay)}</div>
            <div style="color:var(--primary);font-size:14px;margin-bottom:10px;">${esc(acadProfile.career || '')}</div>
            <div style="font-size:13px;color:var(--muted);margin-bottom:14px;">Materias: ${(acadProfile.enabledSubjects || []).map(s => esc(s)).join(', ') || 'Ninguna'}</div>
            <button class="ghost" id="ppChangeMeta" style="width:100%;">Cambiar meta</button>
          </div>
        </div>`;
    } else {
      panelUniversity = `
        <div class="pp-panel" data-panel="university">
          <h2 class="pp-section-title">Meta Universitaria</h2>
          <div class="card">
            <p class="muted" style="font-size:13px;margin-bottom:14px;">Selecciona tu universidad objetivo para obtener una ruta personalizada.</p>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <select id="pp-uni-select" style="padding:10px;border-radius:var(--radius-sm);background:var(--panel);border:1px solid var(--border);color:var(--text);font-size:14px;">
                <option value="">Selecciona universidad</option>
                <option value="UNI">UNI — Universidad Nacional de Ingeniería</option>
                <option value="UNMSM">UNMSM — Universidad Mayor de San Marcos</option>
                <option value="PUCP">PUCP — Pontificia Universidad Católica del Perú</option>
                <option value="UNAC">UNAC — Universidad Nacional del Callao</option>
                <option value="Beca 18">Beca 18</option>
                <option value="otro">Otra universidad</option>
              </select>
              <input type="text" id="pp-custom-uni" placeholder="Nombre de tu universidad" style="display:none;padding:10px;border-radius:var(--radius-sm);background:var(--panel);border:1px solid var(--border);color:var(--text);font-size:14px;" />
              <input type="text" id="pp-career-input" placeholder="¿Qué carrera quieres estudiar?" style="padding:10px;border-radius:var(--radius-sm);background:var(--panel);border:1px solid var(--border);color:var(--text);font-size:14px;" />
              <button class="primary" id="pp-save-meta" style="width:100%;">Guardar mi meta 🎯</button>
            </div>
          </div>
        </div>`;
    }

    // ── Panel: Ruta ──
    let panelRoute;
    if (!acadProfile.university || !(acadProfile.enabledSubjects || []).length) {
      panelRoute = `
        <div class="pp-panel" data-panel="route">
          <h2 class="pp-section-title">Ruta de Aprendizaje</h2>
          <div class="pp-cta-card">
            <div class="pp-cta-icon">📚</div>
            <div class="pp-cta-title">Define tu ruta primero</div>
            <div class="pp-cta-sub">Configura tu meta universitaria para ver tu ruta personalizada.</div>
            <button class="primary" id="ppGoToMetaRoute" style="margin-top:4px;">Configurar meta →</button>
          </div>
        </div>`;
    } else {
      const enabledSubjects = acadProfile.enabledSubjects || [];
      const subjectStats = {};
      enabledSubjects.forEach(subj => { subjectStats[subj] = { count: 0, total: 0 }; });
      sessions.forEach(sess => {
        if (subjectStats[sess.subject] !== undefined) {
          subjectStats[sess.subject].count++;
          subjectStats[sess.subject].total += (sess.concentration || 0);
        }
      });
      const routeRows = enabledSubjects.map(subj => {
        const st = subjectStats[subj];
        const idx = st.count ? Math.round((st.total / st.count / 5) * 100) : 0;
        return `
          <div class="pp-route-row">
            <div class="pp-route-name">${esc(subj)}</div>
            <div class="pp-route-bar-wrap"><div class="pp-route-bar" style="width:${Math.min(idx,100)}%;"></div></div>
            <div class="pp-route-stats">${st.count > 0 ? `${st.count} ses.&nbsp;${idx}%` : '—'}</div>
            <button class="pp-route-btn ghost" data-go="ai-study">▶</button>
          </div>`;
      }).join('');
      const uniLabel = acadProfile.university === 'otro' ? (acadProfile.customUniversity || '') : acadProfile.university;
      panelRoute = `
        <div class="pp-panel" data-panel="route">
          <h2 class="pp-section-title">Ruta de Aprendizaje</h2>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);margin-bottom:12px;flex-wrap:wrap;gap:6px;">
            <span>${esc(acadProfile.career)} · ${esc(uniLabel)}</span>
            <button class="ghost" id="ppChangeMeta2" style="font-size:12px;padding:4px 10px;">Cambiar meta</button>
          </div>
          <div class="pp-route-list">${routeRows || '<p class="muted" style="text-align:center;padding:20px;">Aún no tienes sesiones en estas materias.</p>'}</div>
        </div>`;
    }

    // ── Panel: Calendario ──
    const sortedExams = (acadProfile.examDates || [])
      .map((e, i) => ({ ...e, _i: i, days: Math.ceil((new Date(e.date) - nowMs) / 86400000) }))
      .filter(e => e.days > 0).sort((a, b) => a.days - b.days);
    const examItemsHtml = sortedExams.map(e => `
      <div class="pp-date-item${e.days <= 7 ? ' urgent' : e.days <= 30 ? ' soon' : ''}">
        <div class="pp-date-label">${esc(e.label)}</div>
        <div class="pp-date-badge">${e.days} días</div>
        <button class="pp-date-del" data-idx="${e._i}" title="Eliminar">×</button>
      </div>`).join('');
    const panelCalendar = `
      <div class="pp-panel" data-panel="calendar">
        <h2 class="pp-section-title">Calendario de Exámenes</h2>
        ${sortedExams.length
          ? `<div class="pp-dates-list">${examItemsHtml}</div>`
          : `<p class="muted" style="text-align:center;padding:24px 0;font-size:13px;">No hay fechas registradas. Agrega tu próximo examen.</p>`}
        <button class="ghost" id="ppShowDateForm" style="width:100%;margin-bottom:12px;">+ Agregar fecha</button>
        <div class="pp-add-form" id="ppDateForm" style="display:none;">
          <input type="text" id="ppDateLabel" placeholder="Ej. Examen UNI" />
          <input type="date" id="ppDateDate" />
          <button class="primary" id="ppSaveDate">Guardar fecha</button>
        </div>
      </div>`;

    // ── Panel: Planificador Semanal ──
    const DAYS = [
      {key:'lunes',label:'Lunes'},{key:'martes',label:'Martes'},{key:'miercoles',label:'Miércoles'},
      {key:'jueves',label:'Jueves'},{key:'viernes',label:'Viernes'},{key:'sabado',label:'Sábado'},{key:'domingo',label:'Domingo'}
    ];
    const schedSubjects = (acadProfile.enabledSubjects || []).length
      ? acadProfile.enabledSubjects
      : Subjects.listSubjects(user.institutionType || 'colegio', user.id);
    const schedSubjOpts = schedSubjects.map(sub => `<option>${esc(sub)}</option>`).join('');
    const PRIORITY_LABELS = { alta: '🔴', media: '🟡', baja: '🟢' };
    const daysHtml = DAYS.map(d => {
      const blocks = schedule[d.key] || [];
      const blocksHtml = blocks.length
        ? blocks.map((b, i) => `
            <div class="pp-sched-block">
              <span class="pp-sched-prio">${PRIORITY_LABELS[b.priority] || '🟡'}</span>
              <span class="pp-sched-time">${esc(b.time||'')}</span>
              <span class="pp-sched-subj">${esc(b.subject||'')}</span>
              <button class="pp-sched-del" data-day="${d.key}" data-idx="${i}">×</button>
            </div>`).join('')
        : `<p class="muted" style="font-size:12px;margin:6px 0;">Sin bloques</p>`;
      return `
        <div class="pp-day-block">
          <div class="pp-day-header">
            <span class="pp-day-name">${d.label}</span>
            <button class="pp-day-add-btn ghost" data-day="${d.key}">+ Agregar</button>
          </div>
          <div class="pp-day-body">${blocksHtml}</div>
          <div class="pp-day-form" id="ppDayForm-${d.key}">
            <div class="pp-day-form-row">
              <select class="pp-sched-subject-sel">${schedSubjOpts}</select>
              <input type="time" class="pp-sched-time-inp" value="08:00" />
              <select class="pp-sched-priority-sel">
                <option value="alta">🔴 Alta</option>
                <option value="media" selected>🟡 Media</option>
                <option value="baja">🟢 Baja</option>
              </select>
            </div>
            <button class="primary pp-sched-save-btn" data-day="${d.key}" style="width:100%;">Agregar</button>
          </div>
        </div>`;
    }).join('');
    const panelSchedule = `
      <div class="pp-panel" data-panel="schedule">
        <h2 class="pp-section-title">Planificador Semanal</h2>
        <p class="muted" style="font-size:13px;margin-bottom:16px;">Organiza tu semana asignando materias, horarios y prioridades.</p>
        <div class="pp-days-list">${daysHtml}</div>
      </div>`;

    // ── Panel: Progreso (compacto — dirige a pantallas existentes) ──
    const earnedBadges = Gamification.BADGES.filter(b => (gam.badges || []).includes(b.id));
    const panelProgress = `
      <div class="pp-panel" data-panel="progress">
        <h2 class="pp-section-title">Mi Progreso</h2>
        <div class="pp-kpi-grid">
          <div class="pp-kpi-card"><div class="pp-kpi-val">${esc(levelInfo.current.title)}</div><div class="pp-kpi-lbl">Nivel ${levelInfo.current.level}</div></div>
          <div class="pp-kpi-card"><div class="pp-kpi-val">${gam.xp||0}</div><div class="pp-kpi-lbl">XP Total</div></div>
          <div class="pp-kpi-card"><div class="pp-kpi-val">🔥 ${gam.streak||0}</div><div class="pp-kpi-lbl">Días seguidos</div></div>
          <div class="pp-kpi-card"><div class="pp-kpi-val">${sum.total}</div><div class="pp-kpi-lbl">Sesiones</div></div>
          <div class="pp-kpi-card"><div class="pp-kpi-val">${sum.totalMin}</div><div class="pp-kpi-lbl">Minutos</div></div>
          <div class="pp-kpi-card"><div class="pp-kpi-val">${earnedBadges.length}</div><div class="pp-kpi-lbl">Insignias</div></div>
        </div>
        <div class="pp-prog-actions">
          <button class="primary" data-go="stats" style="width:100%;margin-bottom:10px;">📊 Ver estadísticas completas →</button>
          <button class="ghost" data-go="achievements" style="width:100%;">🏆 Logros e insignias →</button>
        </div>
      </div>`;

    // ── Panel: Cuenta ──
    const panelAccount = `
      <div class="pp-panel" data-panel="account">
        <h2 class="pp-section-title">🔐 Mi Cuenta</h2>
        <div class="pp-account-card">
          <div class="pp-account-name">${esc(user.name)}</div>
          <div class="pp-account-email">${esc(user.email || '—')}</div>
          <div class="pp-account-role">Modo: ${_roleLabel(user)}</div>
        </div>
        <div class="pp-account-actions">
          <button class="ghost pp-account-btn" id="ppExportBtn">📥 Exportar mis datos</button>
          <input type="file" id="ppRestoreInput" accept=".json" style="display:none;" />
          <button class="ghost pp-account-btn" id="ppRestoreBtn">📤 Restaurar respaldo</button>
          <button class="primary pp-account-btn" id="ppLogoutBtn">Cerrar sesión</button>
        </div>
        <div class="pp-version-info">TrackFocus · Todos los datos guardados localmente</div>
      </div>`;

    // ── Panel: Preferencias ──
    const currentTheme = localStorage.getItem('tf-theme') || 'light';
    const panelPrefs = `
      <div class="pp-panel" data-panel="prefs">
        <h2 class="pp-section-title">Preferencias</h2>
        <div class="pp-prefs-section">
          <div class="pp-prefs-section-title">Apariencia</div>
          <div class="pp-prefs-row">
            <div><div class="pp-prefs-label">Tema visual</div><div class="pp-prefs-sub">Modo claro u oscuro</div></div>
            <div class="pp-theme-btns">
              <button class="pp-theme-btn${currentTheme==='light'?' active':''}" data-theme="light">☀️ Claro</button>
              <button class="pp-theme-btn${currentTheme==='dark'?' active':''}" data-theme="dark">🌙 Oscuro</button>
            </div>
          </div>
          <div class="pp-prefs-row">
            <div><div class="pp-prefs-label">Reducir animaciones</div></div>
            <input type="checkbox" class="pp-toggle" id="ppToggleMotion"${prefs.reduceMotion?' checked':''} />
          </div>
        </div>
        <div class="pp-prefs-section">
          <div class="pp-prefs-section-title">Funcionalidades</div>
          <div class="pp-prefs-row">
            <div><div class="pp-prefs-label">Mostrar Tracky</div><div class="pp-prefs-sub">Mascota virtual</div></div>
            <input type="checkbox" class="pp-toggle" id="ppToggleTracky"${prefs.tracky!==false?' checked':''} />
          </div>
          <div class="pp-prefs-row">
            <div><div class="pp-prefs-label">Sonidos Pomodoro</div></div>
            <input type="checkbox" class="pp-toggle" id="ppToggleSounds"${prefs.sounds!==false?' checked':''} />
          </div>
        </div>
      </div>`;

    return `
      <div class="pp-layout">
        <aside class="pp-sidebar">
          <div class="pp-avatar-big" style="background:${esc(avatarColor)};">${esc(initials)}</div>
          <nav class="pp-nav">
            <button class="pp-nav-item active" data-panel="profile">👤 Mi Perfil</button>
            <button class="pp-nav-item" data-panel="university">🎯 Meta</button>
            <button class="pp-nav-item" data-panel="route">📚 Ruta</button>
            <button class="pp-nav-item" data-panel="calendar">📅 Calendario</button>
            <button class="pp-nav-item" data-panel="schedule">📋 Planificador</button>
            <button class="pp-nav-item" data-panel="progress">🏆 Progreso</button>
            <button class="pp-nav-item" data-panel="prefs">⚙️ Ajustes</button>
            <button class="pp-nav-item" data-panel="account">🔐 Cuenta</button>
          </nav>
        </aside>
        <main class="pp-content">
          ${panelProfile}
          ${panelUniversity}
          ${panelRoute}
          ${panelCalendar}
          ${panelSchedule}
          ${panelProgress}
          ${panelPrefs}
          ${panelAccount}
        </main>
      </div>`;
  }

  function _profileStudent(user, sessions, s) {
    const gam = user.gamification || {};
    const levelInfo = Gamification.getLevelInfo(gam.xp || 0);
    const school = user.schoolId ? s.schools[user.schoolId] : null;
    const classroom = user.classroomId ? s.classrooms[user.classroomId] : null;
    const schoolProfile = JSON.parse(localStorage.getItem('tf-school-profile-v1') || '{}');
    const prefs = JSON.parse(localStorage.getItem('tf-prefs') || '{}');
    const initials = user.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const nowMs = Date.now();
    const exams = (schoolProfile.exams || [])
      .map((e, i) => ({ ...e, _i: i, days: Math.ceil((new Date(e.date) - nowMs) / 86400000) }))
      .filter(e => e.days > 0).sort((a, b) => a.days - b.days);

    // ── Panel: Mi Perfil ──
    const panelProfile = `
      <div class="ps-panel active" data-panel="profile">
        <h2 class="pp-section-title">Mi Perfil</h2>
        <div class="pp-avatar-row">
          <div class="ps-avatar-big">${esc(initials)}</div>
          <div class="pp-profile-info" style="margin-left:16px;">
            <div class="pp-name">${esc(user.name)}</div>
            <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
              ${classroom ? `<span class="ps-pill">🏫 ${esc(classroom.name)}</span>` : ''}
              ${school ? `<span class="ps-pill">🏛️ ${esc(school.name)}</span>` : ''}
              ${user.grade ? `<span class="ps-pill">📚 ${formatGrade(user.grade)}</span>` : ''}
            </div>
          </div>
        </div>
      </div>`;

    // ── Panel: Evaluaciones ──
    const evalItemsHtml = exams.map(e => `
      <div class="pp-date-item${e.days <= 3 ? ' urgent' : e.days <= 7 ? ' soon' : ''}">
        <div class="pp-date-label">${esc(e.subject || e.label)}</div>
        <div class="pp-date-badge">${e.days} días</div>
        <button class="pp-date-del" data-idx="${e._i}" title="Eliminar">×</button>
      </div>`).join('');
    const panelEvals = `
      <div class="ps-panel" data-panel="evals">
        <h2 class="pp-section-title">Evaluaciones</h2>
        ${exams.length
          ? `<div class="pp-dates-list">${evalItemsHtml}</div>`
          : `<p class="muted" style="text-align:center;padding:24px 0;font-size:13px;">No hay evaluaciones próximas.</p>`}
        <button class="ghost" id="psShowEvalForm" style="width:100%;margin-bottom:12px;">+ Agregar evaluación</button>
        <div class="pp-add-form" id="psEvalForm" style="display:none;">
          <input type="text" id="psEvalSubject" placeholder="Materia (ej. Álgebra)" />
          <input type="date" id="psEvalDate" />
          <button class="primary" id="psSaveEval">Guardar evaluación</button>
        </div>
      </div>`;

    // ── Panel: Mis Cursos ──
    const SCHOOL_SUBJECTS = ['Matemática','Comunicación','Inglés','Historia','DPCC','Física','Química','Biología','Arte','Ed. Física'];
    const subjStats = {};
    SCHOOL_SUBJECTS.forEach(sub => { subjStats[sub] = { count: 0, total: 0 }; });
    sessions.forEach(sess => {
      if (!subjStats[sess.subject]) subjStats[sess.subject] = { count: 0, total: 0 };
      subjStats[sess.subject].count++;
      subjStats[sess.subject].total += (sess.concentration || 0);
    });
    const activeSubjs = [...new Set([...SCHOOL_SUBJECTS, ...sessions.map(ss => ss.subject)])];
    const courseRowsHtml = activeSubjs.map(subj => {
      const st = subjStats[subj] || { count: 0, total: 0 };
      const idx = st.count ? Math.round((st.total / st.count / 5) * 100) : 0;
      return `
        <div class="ps-course-row">
          <div class="ps-course-name">${esc(subj)}</div>
          <div class="ps-course-bar-wrap"><div class="ps-course-bar" style="width:${Math.min(idx,100)}%;"></div></div>
          <div class="ps-course-stats">${st.count > 0 ? `${st.count} ses.` : '—'}</div>
        </div>`;
    }).join('');
    const panelCourses = `
      <div class="ps-panel" data-panel="courses">
        <h2 class="pp-section-title">Mis Materias</h2>
        <div class="ps-courses-list">${courseRowsHtml}</div>
      </div>`;

    // ── Panel: Ranking ──
    let rankingInner;
    if (user.classroomId) {
      try {
        const lb = Gamification.getLeaderboard('classroom', user.classroomId, 'week');
        const me = lb.find(e => e.userId === user.id);
        const rowsHtml = lb.slice(0, 10).map(entry => `
          <tr class="${entry.userId === user.id ? 'ps-rank-me' : ''}">
            <td>${entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank-1] : '#'+entry.rank}</td>
            <td>${esc(entry.name || 'Estudiante')}</td>
            <td>${entry.xp||0} XP</td>
            <td>Nv.${entry.level||1}</td>
          </tr>`).join('');
        rankingInner = `
          ${me ? `<p style="font-size:13px;color:var(--muted);margin-bottom:12px;">Tu posición: <strong style="color:var(--blue);">#${me.rank}</strong> de ${lb.length} alumnos</p>` : ''}
          <table class="ps-rank-table">
            <thead><tr><th>#</th><th>Alumno</th><th>XP</th><th>Nivel</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>`;
      } catch (_) {
        rankingInner = '<p class="muted" style="text-align:center;padding:24px 0;font-size:13px;">Sin datos de ranking disponibles.</p>';
      }
    } else {
      rankingInner = '<p class="muted" style="text-align:center;padding:24px 0;font-size:13px;">Únete a un aula para ver el ranking.</p>';
    }
    const panelRanking = `
      <div class="ps-panel" data-panel="ranking">
        <h2 class="pp-section-title">Ranking</h2>
        ${rankingInner}
      </div>`;

    // ── Panel: Perfil Cognitivo ──
    const profileType = Analytics.classifyProfile(sessions);
    const patterns = Analytics.detectPatterns(sessions);
    const DECO_DIMS = [
      {key:'comprension',label:'Comprensión',desc:'Capacidad de entender y procesar nueva información.'},
      {key:'aplicacion',label:'Aplicación',desc:'Habilidad de usar el conocimiento en ejercicios prácticos.'},
      {key:'analisis',label:'Análisis',desc:'Descomposición de problemas complejos en partes manejables.'},
      {key:'constancia',label:'Constancia',desc:'Regularidad y persistencia en tus sesiones de estudio.'}
    ];
    const hasDecoData = sessions.some(ss => ss.deco);
    const decoHtml = hasDecoData
      ? DECO_DIMS.map(dim => {
          const vals = sessions.filter(ss => ss.deco && ss.deco[dim.key]);
          const avg = vals.length ? vals.reduce((acc, ss) => acc + ss.deco[dim.key], 0) / vals.length * 20 : 0;
          return `
            <div class="ps-deco-card">
              <div class="ps-deco-label">${dim.label}</div>
              <div class="ps-deco-bar-wrap"><div class="ps-deco-bar" style="width:${Math.min(Math.round(avg),100)}%;"></div></div>
              <div class="ps-deco-desc">${dim.desc}</div>
            </div>`;
        }).join('')
      : `<div class="pp-cta-card">
           <div class="pp-cta-icon">🧠</div>
           <div class="pp-cta-title">Perfil Cognitivo DECO</div>
           <div class="pp-cta-sub">Completa sesiones con la evaluación DECO en Estudio IA para descubrir tus dimensiones cognitivas: comprensión, aplicación, análisis y constancia.</div>
           <button class="primary" data-go="ai-study" style="margin-top:8px;">Ir a Estudio IA →</button>
         </div>`;
    const panelCognitive = `
      <div class="ps-panel" data-panel="cognitive">
        <h2 class="pp-section-title">Perfil Cognitivo</h2>
        ${profileType ? `
          <div class="pp-prog-profile" style="margin-bottom:16px;">
            <div class="pp-prog-profile-icon">${profileType.icon}</div>
            <div class="pp-prog-profile-label">${esc(profileType.label)}</div>
            <div class="pp-prog-profile-desc">${esc(profileType.desc)}</div>
          </div>` : ''}
        ${decoHtml}
        ${patterns ? `
          <div class="pp-patterns-card" style="margin-top:12px;">
            <h3 style="margin:0 0 10px;font-size:15px;">Patrones detectados</h3>
            ${patterns.bestHour !== null ? `<p style="font-size:13px;margin:6px 0;">⏰ Mejor hora: ${patterns.bestHour}:00</p>` : ''}
            ${patterns.worstSubject ? `<p style="font-size:13px;margin:6px 0;">📖 Materia débil: ${esc(patterns.worstSubject)} (${patterns.worstSubjectAvg.toFixed(1)}/5)</p>` : ''}
          </div>` : ''}
      </div>`;

    // ── Panel: Preferencias ──
    const currentTheme = localStorage.getItem('tf-theme') || 'light';
    const panelPrefs = `
      <div class="ps-panel" data-panel="prefs">
        <h2 class="pp-section-title">Preferencias</h2>
        <div class="pp-prefs-section">
          <div class="pp-prefs-section-title">Apariencia</div>
          <div class="pp-prefs-row">
            <div><div class="pp-prefs-label">Tema visual</div></div>
            <div class="pp-theme-btns">
              <button class="pp-theme-btn${currentTheme==='light'?' active':''}" data-theme="light">☀️ Claro</button>
              <button class="pp-theme-btn${currentTheme==='dark'?' active':''}" data-theme="dark">🌙 Oscuro</button>
            </div>
          </div>
          <div class="pp-prefs-row">
            <div><div class="pp-prefs-label">Reducir animaciones</div></div>
            <input type="checkbox" class="pp-toggle" id="ppToggleMotion"${prefs.reduceMotion?' checked':''} />
          </div>
        </div>
        <div class="pp-prefs-section">
          <div class="pp-prefs-section-title">Funcionalidades</div>
          <div class="pp-prefs-row">
            <div><div class="pp-prefs-label">Mostrar Tracky</div><div class="pp-prefs-sub">Mascota virtual</div></div>
            <input type="checkbox" class="pp-toggle" id="ppToggleTracky"${prefs.tracky!==false?' checked':''} />
          </div>
          <div class="pp-prefs-row">
            <div><div class="pp-prefs-label">Sonidos Pomodoro</div></div>
            <input type="checkbox" class="pp-toggle" id="ppToggleSounds"${prefs.sounds!==false?' checked':''} />
          </div>
        </div>
        ${user.classroomId ? `
          <div class="pp-prefs-section">
            <div class="pp-prefs-section-title">Aula</div>
            <form id="changeClassroomForm" class="card" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
              <div class="field" style="flex:1;min-width:180px;margin-bottom:0;">
                <label>Cambio de aula (código de invitación)</label>
                <input name="targetCode" placeholder="Ej. ABCD1234" maxlength="8" style="text-transform:uppercase;" required />
              </div>
              <button class="ghost" type="submit" style="flex-shrink:0;">Solicitar</button>
            </form>
          </div>` : ''}
        ${user.schoolId && !user.classroomId ? `
          <div class="pp-prefs-section">
            <div class="pp-prefs-section-title">Aula</div>
            <form id="joinClassroomForm" class="card" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
              <div class="field" style="flex:1;min-width:180px;margin-bottom:0;">
                <label>Unirse a un aula (código de invitación)</label>
                <input name="inviteCode" placeholder="Ej. ABCD1234" maxlength="8" style="text-transform:uppercase;" required />
              </div>
              <button class="ghost" type="submit" style="flex-shrink:0;">Enviar solicitud</button>
            </form>
          </div>` : ''}
      </div>`;

    // ── Panel: Cuenta (institucional) ──
    const panelAccount = `
      <div class="ps-panel" data-panel="account">
        <h2 class="pp-section-title">🔐 Mi Cuenta</h2>
        <div class="pp-account-card">
          <div class="pp-account-name">${esc(user.name)}</div>
          <div class="pp-account-email">${esc(user.email || '—')}</div>
          <div class="pp-account-role">Modo: ${_roleLabel(user)}</div>
        </div>
        <div class="pp-account-actions">
          <button class="ghost pp-account-btn" id="ppExportBtn">📥 Exportar mis datos</button>
          <input type="file" id="ppRestoreInput" accept=".json" style="display:none;" />
          <button class="ghost pp-account-btn" id="ppRestoreBtn">📤 Restaurar respaldo</button>
          <button class="primary pp-account-btn" id="ppLogoutBtn">Cerrar sesión</button>
        </div>
        <div class="pp-version-info">TrackFocus · Todos los datos guardados localmente</div>
      </div>`;

    return `
      <div class="ps-layout">
        <aside class="ps-sidebar">
          <div class="ps-avatar-big">${esc(initials)}</div>
          <nav class="ps-nav">
            <button class="ps-nav-item active" data-panel="profile">👤 Mi Perfil</button>
            <button class="ps-nav-item" data-panel="evals">📅 Evaluaciones</button>
            <button class="ps-nav-item" data-panel="courses">📚 Mis Materias</button>
            <button class="ps-nav-item" data-panel="ranking">🏆 Ranking</button>
            <button class="ps-nav-item" data-panel="cognitive">🧠 Perfil Cognitivo</button>
            <button class="ps-nav-item" data-panel="prefs">⚙️ Ajustes</button>
            <button class="ps-nav-item" data-panel="account">🔐 Cuenta</button>
          </nav>
        </aside>
        <main class="ps-content">
          ${panelProfile}
          ${panelEvals}
          ${panelCourses}
          ${panelRanking}
          ${panelCognitive}
          ${panelPrefs}
          ${panelAccount}
        </main>
      </div>`;
  }

  function wireProfile() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const isPersonal = !user.schoolId;
    const navSel = isPersonal ? '.pp-nav-item' : '.ps-nav-item';
    const panelSel = isPersonal ? '.pp-panel' : '.ps-panel';

    // Wire all data-go buttons at once (across all panels)
    root().querySelectorAll('[data-go]').forEach(b =>
      b.addEventListener('click', () => App.go(b.dataset.go)));

    function _activatePanel(name) {
      root().querySelectorAll(navSel).forEach(b => b.classList.remove('active'));
      root().querySelectorAll(panelSel).forEach(p => p.classList.remove('active'));
      const btn = root().querySelector(`${navSel}[data-panel="${name}"]`);
      const panel = root().querySelector(`${panelSel}[data-panel="${name}"]`);
      if (btn) btn.classList.add('active');
      if (panel) panel.classList.add('active');
    }

    root().querySelectorAll(navSel).forEach(btn =>
      btn.addEventListener('click', () => _activatePanel(btn.dataset.panel)));

    // Deeplink via sessionStorage (from dashboard CTA or after save)
    const pending = sessionStorage.getItem('tf-profile-panel');
    if (pending) { sessionStorage.removeItem('tf-profile-panel'); _activatePanel(pending); }

    _wireClassroomForms(user);
    if (isPersonal) _wireProfilePersonal(user); else _wireProfileStudent(user);
  }

  function _wireClassroomForms(user) {
    document.getElementById('changeClassroomForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = new FormData(e.target).get('targetCode').trim().toUpperCase();
      const cr = Schools.findClassroomByCode(code);
      if (!cr) return UI.flash('Código de aula inválido.', 'error');
      if (cr.id === user.classroomId) return UI.flash('Ya perteneces a esa aula.', 'error');
      Schools.createChangeRequest(user.id, cr.id);
      UI.flash('Solicitud enviada. Tu docente recibirá la notificación.', 'success');
      sessionStorage.setItem('tf-profile-panel', 'progress');
      App.go('profile');
    });
    document.getElementById('joinClassroomForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = new FormData(e.target).get('inviteCode').trim().toUpperCase();
      const cr = Schools.findClassroomByCode(code);
      if (!cr) return UI.flash('Código de invitación inválido.', 'error');
      if (cr.schoolId !== user.schoolId) return UI.flash('El aula no pertenece a tu colegio.', 'error');
      Schools.createJoinRequest(user.id, user.schoolId, cr.id);
      UI.flash('Solicitud enviada. Tu docente recibirá la notificación.', 'success');
      App.go('pending-approval');
    });
  }

  function _wireProfilePersonal(user) {
    const r = () => root();

    // Avatar color picker
    r().querySelectorAll('.pp-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const color = dot.dataset.color;
        const profile = JSON.parse(localStorage.getItem('tf-academic-profile-v3') || '{}');
        profile.avatarColor = color;
        localStorage.setItem('tf-academic-profile-v3', JSON.stringify(profile));
        r().querySelectorAll('.pp-avatar-big').forEach(el => el.style.background = color);
        r().querySelectorAll('.pp-color-dot').forEach(d => d.classList.toggle('active', d.dataset.color === color));
      });
    });

    // Message edit (two-state toggle)
    r().querySelector('#ppMsgEditBtn')?.addEventListener('click', () => {
      const input = r().querySelector('#ppMsgInput');
      if (input) input.value = r().querySelector('#ppMsgText')?.textContent || '';
      r().querySelector('#ppMsgDisplay').style.display = 'none';
      r().querySelector('#ppMsgEdit').style.display = 'flex';
      r().querySelector('#ppMsgInput')?.focus();
    });
    r().querySelector('#ppMsgSaveBtn')?.addEventListener('click', () => {
      const val = r().querySelector('#ppMsgInput')?.value.trim() || '';
      const profile = JSON.parse(localStorage.getItem('tf-academic-profile-v3') || '{}');
      profile.message = val;
      localStorage.setItem('tf-academic-profile-v3', JSON.stringify(profile));
      const textEl = r().querySelector('#ppMsgText');
      if (textEl) textEl.textContent = val;
      r().querySelector('#ppMsgDisplay').style.display = '';
      r().querySelector('#ppMsgEdit').style.display = 'none';
    });

    // CTA go to Meta
    r().querySelector('#ppGoToMeta')?.addEventListener('click', () => {
      sessionStorage.setItem('tf-profile-panel', 'university');
      App.go('profile');
    });
    r().querySelector('#ppGoToMetaRoute')?.addEventListener('click', () => {
      sessionStorage.setItem('tf-profile-panel', 'university');
      App.go('profile');
    });

    // Change meta buttons
    r().querySelector('#ppChangeMeta')?.addEventListener('click', () => _clearMeta());
    r().querySelector('#ppChangeMeta2')?.addEventListener('click', () => _clearMeta());
    function _clearMeta() {
      const p = JSON.parse(localStorage.getItem('tf-academic-profile-v3') || '{}');
      delete p.university; delete p.career; delete p.enabledSubjects;
      localStorage.setItem('tf-academic-profile-v3', JSON.stringify(p));
      sessionStorage.setItem('tf-profile-panel', 'university');
      App.go('profile');
    }

    // University form
    r().querySelector('#pp-uni-select')?.addEventListener('change', function() {
      const customInput = r().querySelector('#pp-custom-uni');
      if (customInput) customInput.style.display = this.value === 'otro' ? 'block' : 'none';
    });
    r().querySelector('#pp-save-meta')?.addEventListener('click', () => {
      const uniSelect = r().querySelector('#pp-uni-select');
      const customUni = r().querySelector('#pp-custom-uni');
      const careerInput = r().querySelector('#pp-career-input');
      const uniVal = uniSelect?.value;
      const university = uniVal === 'otro' ? customUni?.value.trim() : uniVal;
      const career = careerInput?.value.trim();
      if (!university || !career) return UI.flash('Completa universidad y carrera.', 'error');
      const existing = JSON.parse(localStorage.getItem('tf-academic-profile-v3') || '{}');
      localStorage.setItem('tf-academic-profile-v3', JSON.stringify({
        ...existing,
        university: uniVal === 'otro' ? 'otro' : university,
        customUniversity: uniVal === 'otro' ? university : undefined,
        career,
        enabledSubjects: _MALLAS[university] || []
      }));
      UI.flash('¡Meta guardada! Tu ruta está lista.', 'success');
      sessionStorage.setItem('tf-profile-panel', 'route');
      App.go('profile');
    });

    // Calendar: toggle form
    r().querySelector('#ppShowDateForm')?.addEventListener('click', () => {
      const form = r().querySelector('#ppDateForm');
      if (form) form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    });
    // Calendar: save
    r().querySelector('#ppSaveDate')?.addEventListener('click', () => {
      const label = r().querySelector('#ppDateLabel')?.value.trim();
      const date  = r().querySelector('#ppDateDate')?.value;
      if (!label || !date) return UI.flash('Completa el nombre y la fecha.', 'error');
      const profile = JSON.parse(localStorage.getItem('tf-academic-profile-v3') || '{}');
      profile.examDates = profile.examDates || [];
      profile.examDates.push({ label, type: 'examen', date });
      profile.examDates.sort((a, b) => new Date(a.date) - new Date(b.date));
      localStorage.setItem('tf-academic-profile-v3', JSON.stringify(profile));
      sessionStorage.setItem('tf-profile-panel', 'calendar');
      App.go('profile');
    });
    // Calendar: delete
    r().querySelectorAll('.pp-dates-list .pp-date-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const profile = JSON.parse(localStorage.getItem('tf-academic-profile-v3') || '{}');
        if (Array.isArray(profile.examDates)) {
          profile.examDates = profile.examDates.filter((_, i) => i !== idx);
          localStorage.setItem('tf-academic-profile-v3', JSON.stringify(profile));
        }
        sessionStorage.setItem('tf-profile-panel', 'calendar');
        App.go('profile');
      });
    });

    // Schedule: toggle day form
    r().querySelectorAll('.pp-day-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const form = r().querySelector(`#ppDayForm-${btn.dataset.day}`);
        if (form) form.classList.toggle('open');
      });
    });
    // Schedule: save block
    r().querySelectorAll('.pp-sched-save-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const form = btn.closest('.pp-day-form');
        const subject  = form?.querySelector('.pp-sched-subject-sel')?.value;
        const time     = form?.querySelector('.pp-sched-time-inp')?.value;
        const priority = form?.querySelector('.pp-sched-priority-sel')?.value || 'media';
        if (!subject || !time) return;
        const sched = JSON.parse(localStorage.getItem('tf-weekly-schedule') || '{}');
        if (!sched[btn.dataset.day]) sched[btn.dataset.day] = [];
        sched[btn.dataset.day].push({ subject, time, priority });
        sched[btn.dataset.day].sort((a, b) => a.time.localeCompare(b.time));
        localStorage.setItem('tf-weekly-schedule', JSON.stringify(sched));
        sessionStorage.setItem('tf-profile-panel', 'schedule');
        App.go('profile');
      });
    });
    // Schedule: delete block
    r().querySelectorAll('.pp-sched-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const sched = JSON.parse(localStorage.getItem('tf-weekly-schedule') || '{}');
        const day = btn.dataset.day;
        const idx = parseInt(btn.dataset.idx, 10);
        if (Array.isArray(sched[day])) {
          sched[day].splice(idx, 1);
          localStorage.setItem('tf-weekly-schedule', JSON.stringify(sched));
        }
        sessionStorage.setItem('tf-profile-panel', 'schedule');
        App.go('profile');
      });
    });

    _wirePreferences();
    _wireAccountPanel(user);
  }

  function _wireProfileStudent(user) {
    const r = () => root();

    // Evaluaciones: toggle form
    r().querySelector('#psShowEvalForm')?.addEventListener('click', () => {
      const form = r().querySelector('#psEvalForm');
      if (form) form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    });
    // Evaluaciones: save
    r().querySelector('#psSaveEval')?.addEventListener('click', () => {
      const subject = r().querySelector('#psEvalSubject')?.value.trim();
      const date    = r().querySelector('#psEvalDate')?.value;
      if (!subject || !date) return UI.flash('Completa la materia y la fecha.', 'error');
      const profile = JSON.parse(localStorage.getItem('tf-school-profile-v1') || '{}');
      profile.exams = profile.exams || [];
      profile.exams.push({ subject, label: subject, date });
      profile.exams.sort((a, b) => new Date(a.date) - new Date(b.date));
      localStorage.setItem('tf-school-profile-v1', JSON.stringify(profile));
      sessionStorage.setItem('tf-profile-panel', 'evals');
      App.go('profile');
    });
    // Evaluaciones: delete
    r().querySelectorAll('.pp-dates-list .pp-date-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const profile = JSON.parse(localStorage.getItem('tf-school-profile-v1') || '{}');
        if (Array.isArray(profile.exams)) {
          profile.exams = profile.exams.filter((_, i) => i !== idx);
          localStorage.setItem('tf-school-profile-v1', JSON.stringify(profile));
        }
        sessionStorage.setItem('tf-profile-panel', 'evals');
        App.go('profile');
      });
    });

    _wirePreferences();
    _wireAccountPanel(user);
  }

  function _wireAccountPanel(user) {
    const r = () => root();
    r().querySelector('#ppLogoutBtn')?.addEventListener('click', () => {
      document.getElementById('logoutBtn')?.click();
    });
    r().querySelector('#ppExportBtn')?.addEventListener('click', () => {
      try {
        Exporter.backupJSON('trackfocus-backup-' + new Date().toISOString().slice(0, 10) + '.json');
        UI.flash('Backup exportado correctamente.', 'success');
      } catch (_) { UI.flash('Error al exportar. Intenta de nuevo.', 'error'); }
    });
    r().querySelector('#ppRestoreBtn')?.addEventListener('click', () => {
      r().querySelector('#ppRestoreInput')?.click();
    });
    r().querySelector('#ppRestoreInput')?.addEventListener('change', async function() {
      const file = this.files?.[0];
      if (!file) return;
      try {
        await Exporter.readBackupFile(file);
        UI.flash('Respaldo restaurado. Recargando...', 'success');
        setTimeout(() => location.reload(), 1200);
      } catch (_) { UI.flash('Error al restaurar el respaldo.', 'error'); }
    });
  }

  function _wirePreferences() {
    const r = () => root();
    // Theme buttons
    r().querySelectorAll('.pp-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('tf-theme', theme);
        document.querySelectorAll('.theme-toggle').forEach(b => {
          b.textContent = theme === 'dark' ? '☀️' : '🌙';
          b.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
        });
        r().querySelectorAll('.pp-theme-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.theme === theme));
      });
    });
    // Tracky toggle
    r().querySelector('#ppToggleTracky')?.addEventListener('change', function() {
      const el = document.getElementById('tracky-root');
      if (el) el.style.display = this.checked ? '' : 'none';
      const p = JSON.parse(localStorage.getItem('tf-prefs') || '{}');
      p.tracky = this.checked;
      localStorage.setItem('tf-prefs', JSON.stringify(p));
    });
    // Sounds toggle
    r().querySelector('#ppToggleSounds')?.addEventListener('change', function() {
      const p = JSON.parse(localStorage.getItem('tf-prefs') || '{}');
      p.sounds = this.checked;
      localStorage.setItem('tf-prefs', JSON.stringify(p));
    });
    // Reduce motion toggle
    r().querySelector('#ppToggleMotion')?.addEventListener('change', function() {
      document.documentElement.classList.toggle('reduce-motion', this.checked);
      const p = JSON.parse(localStorage.getItem('tf-prefs') || '{}');
      p.reduceMotion = this.checked;
      localStorage.setItem('tf-prefs', JSON.stringify(p));
    });
  }

  // ---- Pantalla: AI Study (Multimedia) ----
  function screenAIStudy() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const subjects = Subjects.listSubjects(user.institutionType || 'colegio', user.id);
    const sessions = Sessions.listFor(user.id);
    const recentFiles = Object.values(s.uploadedFiles || {})
      .filter(f => f.userId === user.id)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 5);

    const grades = [
      { id: '1ro', label: '1° de Secundaria' },
      { id: '2do', label: '2° de Secundaria' },
      { id: '3ro', label: '3° de Secundaria' },
      { id: '4to', label: '4° de Secundaria' },
      { id: '5to', label: '5° de Secundaria' }
    ];

    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const pState = Pomodoro.getState();
    const remaining = pState.remaining || Pomodoro.DEFAULTS.focus * 60;

    const gam = user.gamification || {};
    const levelInfo = Gamification.getLevelInfo(gam.xp || 0);
    const streak = gam.streak || 0;
    const totalMins = sessions.reduce((sum, s) => sum + (s.durationMin || 0), 0);
    const hoursRound = Math.round(totalMins / 60 * 10) / 10;

    const today = new Date().toDateString();
    const weekSessions = sessions.filter(s => {
      const sDate = new Date(s.datetime);
      const daysAgo = Math.floor((new Date() - sDate) / (1000 * 60 * 60 * 24));
      return daysAgo < 7;
    }).length;

    const avgConc = sessions.length > 0
      ? (Math.round(sessions.reduce((sum, s) => sum + (s.concentration || 0), 0) / sessions.length * 10) / 10).toFixed(1)
      : 0;

    return `
      <!-- Contenedor principal — Pomodoro ahora es la barra global #pomBar -->
      <div class="ai-unified-wrap">

        <!-- Sub-tabs -->
        <div class="study-tabs">
          <button class="study-tab active" data-tab="Tutor">🤖 Tutor IA</button>
          <button class="study-tab" data-tab="Files">📁 Material de Estudio</button>
        </div>

        <!-- Tab: Tutor IA -->
        <div class="study-tab-panel" id="tabTutor">
          <form id="sessionSetupForm" class="card">
            <div class="row">
              <div class="field">
                <label>Fecha y hora</label>
                <input type="datetime-local" name="datetime" value="${local}" required />
              </div>
              <div class="field">
                <label>Duración (minutos)</label>
                <input type="number" name="durationMin" min="5" max="240" value="30" required />
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label>Materia</label>
                <select name="subject" required>
                  ${subjects.map(x => `<option>${esc(x)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label>Grado escolar</label>
                <select name="grade" required>
                  ${grades.map(g => `<option value="${g.id}">${esc(g.label)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="field">
              <label>Actividad previa</label>
              <select name="previousActivity" required>
                ${Sessions.PREVIOUS_ACTIVITIES.map(a => `<option value="${a.id}">${esc(a.label)}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
              <button type="button" class="ghost" id="cancelSessionBtn">Cancelar</button>
              <button class="primary" type="submit">Comenzar sesión con IA ✨</button>
            </div>
          </form>
          <p class="muted" style="font-size:12px;margin-top:12px;text-align:center;">
            La IA evaluará tu concentración y aprendizaje de forma invisible mientras estudias.
          </p>
        </div>

        <!-- Tab: Material de Estudio -->
        <div class="study-tab-panel hidden" id="tabFiles">
          <div class="ai-study-grid">
            <div style="display:flex;flex-direction:column;gap:16px;">
              ${UIComponentsMultimedia.FileUploader('aiStudyUpload', null)}

              ${recentFiles.length > 0 ? `
              <div style="background:var(--bg-2);border-radius:var(--radius,12px);padding:16px;border:1px solid var(--border);">
                <h3 style="margin:0 0 12px;">Archivos recientes</h3>
                <div id="recentFilesList" style="display:flex;flex-direction:column;gap:8px;">
                  ${recentFiles.map(f => UIComponentsMultimedia.FilePreviewCard(f)).join('')}
                </div>
              </div>` : `<div style="background:var(--bg-2);border-radius:var(--radius,12px);padding:16px;border:1px solid var(--border);color:var(--muted);text-align:center;">Aún no hay archivos cargados</div>`}
            </div>

            <div id="chatContainer" class="hidden" style="display:flex;flex-direction:column;">
              ${UIComponentsMultimedia.AIStudyChat('aiStudyChat')}
            </div>
          </div>

          <div id="aiStudyActions" class="hidden ai-action-btns" style="margin-top:16px;">
            <button class="ghost" data-action="summary">📋 Resumen</button>
            <button class="ghost" data-action="questions">❓ Preguntas</button>
            <button class="ghost" data-action="exercises">✏️ Ejercicios</button>
            <button class="ghost" data-action="chat">💬 Conversar</button>
          </div>
        </div>

        <!-- Sección Progreso -->
        <div class="study-progress-grid">
          <div class="progress-card">
            <span class="prog-icon">🔥</span>
            <span class="prog-val" data-count="${streak}">${streak}</span>
            <span class="prog-label">Racha actual</span>
          </div>
          <div class="progress-card">
            <span class="prog-icon">⏱</span>
            <span class="prog-val" data-count="${hoursRound}" data-suffix="h">${hoursRound}h</span>
            <span class="prog-label">Horas estudiadas</span>
          </div>
          <div class="progress-card">
            <span class="prog-icon">⭐</span>
            <span class="prog-val">Nv. ${levelInfo.current.level}</span>
            <span class="prog-label">${esc(levelInfo.current.title)}</span>
            <div class="prog-bar"><div style="width:${levelInfo.progress}%"></div></div>
          </div>
          <div class="progress-card">
            <span class="prog-icon">🎯</span>
            <span class="prog-val">${weekSessions}/5</span>
            <span class="prog-label">Meta semanal</span>
          </div>
          <div class="progress-card">
            <span class="prog-icon">📈</span>
            <span class="prog-val" data-count="${avgConc}" data-suffix="/5">${avgConc}/5</span>
            <span class="prog-label">Concentración</span>
          </div>
          <div class="progress-card">
            <span class="prog-icon">🏛</span>
            <span class="prog-val">${levelInfo.progress}%</span>
            <span class="prog-label">Progreso nivel</span>
          </div>
        </div>

      </div>`;
  }

  function wireAIStudy() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const chatContainer = document.getElementById('chatContainer');
    const aiStudyActions = document.getElementById('aiStudyActions');
    let currentFileId = null;

    // === Sub-tabs navigation ===
    root().querySelectorAll('.study-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        root().querySelectorAll('.study-tab').forEach(b => b.classList.remove('active'));
        root().querySelectorAll('.study-tab-panel').forEach(p => p.classList.add('hidden'));
        btn.classList.add('active');
        const tabName = btn.dataset.tab;
        const tabEl = document.getElementById('tab' + tabName);
        if (tabEl) tabEl.classList.remove('hidden');
      });
    });

    // === Tutor IA tab: session form ===
    const setupForm = document.getElementById('sessionSetupForm');
    if (setupForm) {
      setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const metadata = {
          datetime:         new Date(fd.get('datetime')).toISOString(),
          durationMin:      Number(fd.get('durationMin')),
          subject:          fd.get('subject'),
          grade:            fd.get('grade'),
          previousActivity: fd.get('previousActivity')
        };
        _startAiChat(metadata);
      });
    }

    const cancelBtn = document.getElementById('cancelSessionBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        setupForm?.reset();
      });
    }

    // Pomodoro ahora es la barra global #pomBar (ver wirePomodoroBar en app.js)
    // Mostrar la barra global al entrar a Estudio IA
    window._showPomBar?.();

    // === Material de Estudio: file upload & analysis ===
    UIComponentsMultimedia.wireFileUploader('aiStudyUpload', async (fileRecord) => {
      try {
        currentFileId = fileRecord.id;
        chatContainer.style.display = 'flex';
        aiStudyActions.classList.remove('hidden');

        UIComponentsMultimedia.clearChatMessages('aiStudyChat');
        UIComponentsMultimedia.wireChatMessage('aiStudyChat',
          `Archivo cargado: ${esc(fileRecord.fileName)}. Analizando contenido...`,
          false);
        UIComponentsMultimedia.showChatLoading('aiStudyChat');

        const analysis = await GeminiProxy.analyzeFile(fileRecord, {
          subject: 'Educación',
          language: 'es'
        });

        UIComponentsMultimedia.removeChatLoading('aiStudyChat');

        // Encabezado del archivo analizado
        UIComponentsMultimedia.wireChatMessageRich('aiStudyChat',
          `<div class="analysis-head">📎 <strong>${esc(fileRecord.fileName)}</strong></div>`);

        const nl2br = (t) => esc(t).replace(/\n/g, '<br>');

        if (analysis.summary) {
          UIComponentsMultimedia.wireChatMessageRich('aiStudyChat',
            `<div class="analysis-block"><h4>📋 Resumen</h4><p>${nl2br(analysis.summary)}</p></div>`);
        }
        if (analysis.keyConcepts) {
          UIComponentsMultimedia.wireChatMessageRich('aiStudyChat',
            `<div class="analysis-block"><h4>💡 Conceptos clave</h4><p>${nl2br(analysis.keyConcepts)}</p></div>`);
        }
        if (analysis.questions && analysis.questions.length > 0) {
          const qHtml = analysis.questions.map(q =>
            `<div class="question-item"><strong>P:</strong> ${esc(q.text)}<br><strong>R:</strong> ${esc(q.answer || '')}</div>`
          ).join('');
          UIComponentsMultimedia.wireChatMessageRich('aiStudyChat',
            `<div class="analysis-block"><h4>❓ Preguntas de práctica</h4>${qHtml}</div>`);
        }
        if (analysis.exercises && analysis.exercises.length > 0) {
          const eHtml = analysis.exercises.map(e =>
            `<div class="exercise-item"><strong>${esc(e.title)}:</strong> ${esc(e.prompt)}</div>`
          ).join('');
          UIComponentsMultimedia.wireChatMessageRich('aiStudyChat',
            `<div class="analysis-block"><h4>✏️ Ejercicios</h4>${eHtml}</div>`);
        }
        if (analysis.feedback) {
          UIComponentsMultimedia.wireChatMessageRich('aiStudyChat',
            `<div class="analysis-block"><h4>🔄 Retroalimentación</h4><p>${nl2br(analysis.feedback)}</p></div>`);
        }

        UI.flash?.('Análisis completado. Haz preguntas en el chat.', 'success');
      } catch (err) {
        UIComponentsMultimedia.removeChatLoading('aiStudyChat');
        UI.flash?.(err.message, 'error');
      }
    });

    // === Action buttons (summary, questions, exercises, chat) ===
    root().querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!currentFileId) {
          UI.flash?.('Por favor carga un archivo primero.', 'warning');
          return;
        }
        const action = btn.dataset.action;
        let prompt = '';
        switch (action) {
          case 'summary': prompt = 'Dame un resumen detallado de este material'; break;
          case 'questions': prompt = 'Genera 5 preguntas de práctica sobre este material'; break;
          case 'exercises': prompt = 'Crea ejercicios guiados paso a paso sobre este material'; break;
          case 'chat':
            document.getElementById('aiStudyChat-textarea')?.focus();
            return;
        }
        if (prompt) {
          UIComponentsMultimedia.wireChatMessage('aiStudyChat', prompt, true);
          UIComponentsMultimedia.clearChatInput('aiStudyChat');
          UIComponentsMultimedia.showChatLoading('aiStudyChat');
          try {
            const answer = await GeminiProxy.answerQuestion(
              currentFileId,
              prompt,
              Storage.get().uploadedFiles[currentFileId]?.metadata?.analysis
            );
            UIComponentsMultimedia.removeChatLoading('aiStudyChat');
            UIComponentsMultimedia.wireChatMessage('aiStudyChat', esc(answer), false);
          } catch (err) {
            UIComponentsMultimedia.removeChatLoading('aiStudyChat');
            UI.flash?.(err.message, 'error');
          }
        }
      });
    });

    // Delete files handler — registrar UNA sola vez (evita listeners duplicados)
    if (!_aiDeleteBound) {
      _aiDeleteBound = true;
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-delete]');
        if (btn) {
          const fileId = btn.dataset.delete;
          if (confirm('¿Eliminar este archivo?')) {
            Files.delete(fileId);
            App.go('ai-study');
          }
        }
      });
    }

    // Chat send button
    const sendBtn = document.getElementById('aiStudyChat-send');
    const textarea = document.getElementById('aiStudyChat-textarea');

    if (sendBtn && textarea) {
      sendBtn.addEventListener('click', async () => {
        const message = UIComponentsMultimedia.getChatInput('aiStudyChat').trim();
        if (!message || !currentFileId) return;

        UIComponentsMultimedia.wireChatMessage('aiStudyChat', message, true);
        UIComponentsMultimedia.clearChatInput('aiStudyChat');
        UIComponentsMultimedia.showChatLoading('aiStudyChat');

        try {
          const answer = await GeminiProxy.answerQuestion(
            currentFileId,
            message,
            Storage.get().uploadedFiles[currentFileId]?.metadata?.analysis
          );
          UIComponentsMultimedia.removeChatLoading('aiStudyChat');
          UIComponentsMultimedia.wireChatMessage('aiStudyChat', esc(answer), false);
        } catch (err) {
          UIComponentsMultimedia.removeChatLoading('aiStudyChat');
          UI.flash?.(err.message, 'error');
        }
      });

      textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendBtn.click();
        }
      });
    }

    // Micrófono — dictado nativo (Nivel 1) con fallback a grabación + Gemini (Nivel 2)
    const micBtn = document.getElementById('aiStudyChat-mic');
    if (micBtn) {
      let micActive = false;
      const micIdle = () => { micActive = false; micBtn.textContent = '🎤'; micBtn.style.background = ''; };
      const fillAndSend = (text) => {
        if (!text) { UI.flash?.('No se detectó voz. Intenta de nuevo.', 'error'); return; }
        const ta = document.getElementById('aiStudyChat-textarea');
        if (ta) ta.value = text;
        document.getElementById('aiStudyChat-send')?.click();
      };
      micBtn.addEventListener('click', async () => {
        if (AudioTranscriber.isDictationSupported()) {
          if (!micActive) {
            micActive = true;
            micBtn.textContent = '⏹';
            micBtn.style.background = 'rgba(239,68,68,0.1)';
            AudioTranscriber.startDictation(
              (text) => { micIdle(); fillAndSend(text); },
              (errMsg) => { micIdle(); UI.flash?.(errMsg, 'error'); }
            );
          } else { AudioTranscriber.stopDictation(); micIdle(); }
          return;
        }
        // Fallback: grabación + transcripción Gemini
        try {
          if (!micActive) {
            micActive = true;
            micBtn.textContent = '⏹ Detener';
            micBtn.style.background = 'rgba(239, 68, 68, 0.1)';
            await AudioTranscriber.startRecording(() => {});
          } else {
            micActive = false;
            micBtn.textContent = '🎤';
            micBtn.style.background = '';
            const audioBlob = await AudioTranscriber.stopRecording();
            UIComponentsMultimedia.showChatLoading('aiStudyChat');
            const { text } = await AudioTranscriber.transcribe(audioBlob, 'es-ES');
            UIComponentsMultimedia.removeChatLoading('aiStudyChat');
            fillAndSend(text);
          }
        } catch (err) {
          micIdle();
          UIComponentsMultimedia.removeChatLoading('aiStudyChat');
          UI.flash?.(err.message, 'error');
        }
      });
    }

    // === Progress counters animation ===
    _wireProgressCounters();
  }

  function _wireProgressCounters() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root().querySelectorAll('.prog-val[data-count]').forEach(el => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (reduced) { el.textContent = target + suffix; return; }
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(el);
        const start = performance.now();
        const dur = 1200;
        (function step(now) {
          const t = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          const val = target < 10 ? (ease * target).toFixed(1) : Math.round(ease * target);
          el.textContent = val + suffix;
          if (t < 1) requestAnimationFrame(step);
        })(start);
      }, { threshold: 0.5 });
      observer.observe(el);
    });
  }

  return {
    screens: {
      'pending-approval': { render: screenPendingApproval, wire: wirePendingApproval },
      institution:  { render: screenInstitution,  wire: wireInstitution },
      dashboard:    { render: screenDashboard,    wire: wireDashboard },
      'new-session':{ render: screenNewSession,   wire: wireNewSession },
      subjects:     { render: screenSubjects,     wire: wireSubjects },
      history:      { render: () => screenHistory(App._historyFilters || {}), wire: wireHistory },
      stats:        { render: screenStats,        wire: wireStats },
      recommend:    { render: screenRecommend,    wire: () => {} },
      achievements: { render: screenAchievements, wire: () => {} },
      leaderboard:  { render: screenLeaderboard,  wire: wireLeaderboard },
      pomodoro:     { render: screenPomodoro,     wire: wirePomodoro },
      profile:      { render: screenProfile,      wire: wireProfile },
      'ai-study':   { render: screenAIStudy,      wire: wireAIStudy }
    }
  };
})();
