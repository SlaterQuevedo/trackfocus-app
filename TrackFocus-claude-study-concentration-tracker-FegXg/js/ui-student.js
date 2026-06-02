// Pantallas del rol Estudiante.
const UIStudent = (() => {

  const root = () => document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

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

  // ---- Pantalla: Dashboard ----
  function screenDashboard() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const inst = Subjects.getInstitution(user.institutionType);
    const sessions = Sessions.listFor(user.id);
    const sum = Stats.summary(sessions);
    const gam = user.gamification || {};
    const levelInfo = Gamification.getLevelInfo(gam.xp || 0);
    const alerts = Analytics.generateAlerts(user.id);
    const weekXP = Gamification.getWeeklyXP(user.id);

    // Sistema de Metas (Fase 9): objetivos semanales con progreso visual.
    const goalsCard = _renderGoalsCard(user, sessions, gam);

    // Leaderboard del aula (top 5)
    let leaderboardHtml = '';
    if (user.classroomId) {
      const lb = Gamification.getLeaderboard('classroom', user.classroomId, 'week').slice(0, 5);
      if (lb.length > 0) {
        leaderboardHtml = `
          <div class="card" style="margin-top:0;">
            <h3>🏅 Ranking del Aula (esta semana)</h3>
            <table class="table">
              <thead><tr><th>#</th><th>Estudiante</th><th>XP</th><th>Racha</th></tr></thead>
              <tbody>
                ${lb.map(e => `
                  <tr class="${e.userId === user.id ? 'self-row' : ''}">
                    <td class="rank-medal-${e.rank}">${e.rank <= 3 ? ['🥇','🥈','🥉'][e.rank-1] : e.rank}</td>
                    <td><span class="avatar-initials">${esc(e.name.slice(0,2).toUpperCase())}</span> ${esc(e.name)}</td>
                    <td><strong>${e.xp}</strong></td>
                    <td>🔥 ${e.streak}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
            <button class="ghost" style="margin-top:10px;width:100%;" data-go="leaderboard">Ver ranking completo</button>
          </div>`;
      }
    }

    return `
      ${alerts.map(a => `<div class="alert ${a.type === 'success' ? 'success' : a.type === 'error' ? 'error' : 'info'}">${a.msg}</div>`).join('')}

      <div class="student-hero">
        <div class="xp-section">
          <div class="level-badge-wrap">
            <div class="level-badge">Nv.<br>${levelInfo.current.level}</div>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                <span style="font-weight:600;color:var(--text);">${esc(levelInfo.current.title)}</span>
                <span class="muted">${gam.xp || 0} XP</span>
              </div>
              <div class="xp-bar-wrap">
                <div class="xp-bar" style="width:${levelInfo.progress}%"></div>
              </div>
              ${levelInfo.next ? `<div class="xp-label">${levelInfo.progress}% hacia ${esc(levelInfo.next.title)} (${levelInfo.next.xpRequired} XP)</div>` : '<div class="xp-label">¡Nivel máximo alcanzado!</div>'}
            </div>
          </div>
        </div>
        <div class="streak-widget">
          <span class="streak-fire">🔥</span>
          <span class="streak-count">${gam.streak || 0}</span>
          <span class="streak-label">días<br>seguidos</span>
        </div>
        <div class="streak-widget">
          <span class="streak-fire">⚡</span>
          <span class="streak-count" style="color:var(--accent);">${weekXP}</span>
          <span class="streak-label">XP<br>esta semana</span>
        </div>
      </div>

      <h1>Hola, ${esc(user.name)} 👋</h1>
      ${user.institutionType ? `<p class="muted">Institución: <strong>${esc(inst?.label || user.institutionType)}</strong>${user.classroomId && s.classrooms[user.classroomId] ? ` · Aula: <strong>${esc(s.classrooms[user.classroomId].name)}</strong>` : ''}</p>` : ''}

      <div class="grid cols-4" style="margin:16px 0 4px;">
        <div class="kpi"><div class="v">${sum.total}</div><div class="l">Sesiones</div></div>
        <div class="kpi"><div class="v">${sum.avgConc || '—'}</div><div class="l">Concentración prom.</div></div>
        <div class="kpi"><div class="v">${sum.totalMin}</div><div class="l">Minutos totales</div></div>
        <div class="kpi"><div class="v">${sum.avgDur || '—'}</div><div class="l">Min/sesión prom.</div></div>
      </div>

      <div class="grid cols-3" style="margin-top:18px;">
        <div class="card">
          <h2>📝 Registrar sesión</h2>
          <p class="muted">Anota tu última sesión de estudio.</p>
          <button class="primary" data-go="new-session">Nueva sesión</button>
        </div>
        <div class="card">
          <h2>🍅 Pomodoro</h2>
          <p class="muted">Timer de enfoque con registro automático.</p>
          <button class="primary" data-go="pomodoro">Iniciar Pomodoro</button>
        </div>
        <div class="card">
          <h2>🏆 Logros</h2>
          <p class="muted">${(gam.badges || []).length} insignias desbloqueadas.</p>
          <button class="ghost" data-go="achievements">Ver logros</button>
        </div>
        <div class="card">
          <h2>📊 Estadísticas</h2>
          <p class="muted">Promedios, gráficas y tendencias.</p>
          <button class="ghost" data-go="stats">Ver estadísticas</button>
        </div>
        <div class="card">
          <h2>💡 Recomendaciones</h2>
          <p class="muted">Consejos basados en tus datos.</p>
          <button class="ghost" data-go="recommend">Ver recomendaciones</button>
        </div>
        <div class="card">
          <h2>👤 Mi Perfil</h2>
          <p class="muted">Perfil de aprendizaje y resumen.</p>
          <button class="ghost" data-go="profile">Ver perfil</button>
        </div>
      </div>

      ${goalsCard}

      ${leaderboardHtml}`;
  }

  // Sistema de Metas (Fase 9): tarjeta con 4 objetivos semanales y su progreso.
  function _renderGoalsCard(user, sessions, gam) {
    if (typeof Goals === 'undefined') return '';
    const goals = Goals.get(user.id);

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekSessions = sessions.filter(se => new Date(se.datetime) >= weekAgo);
    const weekMinutes = weekSessions.reduce((a, b) => a + (b.durationMin || 0), 0);
    const weekHours = Math.round(weekMinutes / 60 * 10) / 10;
    const liSeries = (typeof Stats !== 'undefined' && Stats.learningIndexSeries) ? Stats.learningIndexSeries(sessions) : [];
    const lastIndex = liSeries.length ? liSeries[liSeries.length - 1].value : 0;

    const items = [
      { key: 'studyHours',    icon: '⏱', label: 'Horas de estudio',    cur: weekHours,            tgt: goals.studyHours,    suffix: 'h' },
      { key: 'sessions',      icon: '📚', label: 'Sesiones',            cur: weekSessions.length,  tgt: goals.sessions,      suffix: '' },
      { key: 'streak',        icon: '🔥', label: 'Racha (días)',        cur: gam.streak || 0,      tgt: goals.streak,        suffix: '' },
      { key: 'learningIndex', icon: '📊', label: 'Índice de Aprendizaje', cur: lastIndex,          tgt: goals.learningIndex, suffix: '' }
    ];

    return `
      <div class="card" style="margin-top:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <h2 style="margin:0;">🎯 Mis Metas (esta semana)</h2>
          <span class="muted" style="font-size:12px;">Toca el lápiz para ajustar un objetivo.</span>
        </div>
        <div class="goals-grid">
          ${items.map(it => {
            const pct = it.tgt > 0 ? Math.min(100, Math.round((it.cur / it.tgt) * 100)) : 0;
            const done = pct >= 100;
            return `<div class="goal-card${done ? ' goal-done' : ''}">
              <div class="goal-head">
                <span>${it.icon} ${it.label}</span>
                <button class="goal-edit-btn" data-goal="${it.key}" title="Editar meta">✎</button>
              </div>
              <div class="goal-val">${it.cur}${it.suffix} <span class="muted">/ ${it.tgt}${it.suffix}</span></div>
              <div class="goal-progress"><div style="width:${pct}%"></div></div>
              <div class="goal-pct">${done ? '✅ ¡Meta lograda!' : pct + '%'}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function wireDashboard() {
    root().querySelectorAll('[data-go]').forEach(b =>
      b.addEventListener('click', () => App.go(b.dataset.go)));

    // Sistema de Metas (Fase 9): editar el valor objetivo de cada meta.
    const labels = {
      studyHours: 'horas de estudio por semana',
      sessions: 'sesiones por semana',
      streak: 'días de racha objetivo',
      learningIndex: 'Índice de Aprendizaje objetivo (0-100)'
    };
    root().querySelectorAll('.goal-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof Goals === 'undefined') return;
        const key = btn.dataset.goal;
        const current = Goals.get(Storage.get().currentUserId)[key];
        const input = prompt(`Nueva meta de ${labels[key] || key}:`, current);
        if (input === null) return;
        const val = Number(input);
        if (!val || isNaN(val)) { UI.flash?.('Ingresa un número válido.', 'error'); return; }
        Goals.set(Storage.get().currentUserId, key, val);
        UI.flash?.('Meta actualizada.', 'success');
        App.go('dashboard');
      });
    });
  }

  // ---- Pantalla: Nueva sesión — Etapa 1: Configuración de metadatos ----
  function screenNewSession() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const subjects = Subjects.listSubjects(user.institutionType || 'colegio', user.id);
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const grades = [
      { id: '1ro', label: '1ro de Secundaria' },
      { id: '2do', label: '2do de Secundaria' },
      { id: '3ro', label: '3ro de Secundaria' },
      { id: '4to', label: '4to de Secundaria' },
      { id: '5to', label: '5to de Secundaria' }
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
              <label>Curso / materia</label>
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

  async function _startAiChat(metadata) {
    // mode: 'tutor' (guía explicativa) | 'minerva' (socrático puro). Viaja dentro
    // de metadata → llega solo al system prompt del servidor sin cambiar firmas.
    metadata.mode = metadata.mode || 'tutor';
    // Memoria Académica (Fase 7): contexto del historial del alumno en esta materia.
    if (typeof AcademicMemory !== 'undefined') {
      const uid = Storage.get().currentUserId;
      const ctx = AcademicMemory.getContext(uid, metadata.subject);
      if (ctx) metadata.memoryContext = ctx;
    }
    _chatState = {
      metadata, history: [], startedAt: Date.now(), attachedFiles: [],
      quizQuestions: [], preQuizScore: null
    };
    // El chat reemplaza el cuerpo de la pantalla actual. Funciona tanto en
    // 'ai-study' (#aiPanelBody) como en 'new-session' (.session-setup-wrap).
    const panelBody = document.getElementById('aiPanelBody')
      || document.querySelector('.session-setup-wrap')
      || root();
    if (!panelBody) return;
    panelBody.innerHTML = _renderChatScreen(metadata);
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
    const gradeLabel = {
      '1ro': '1ro Sec.', '2do': '2do Sec.', '3ro': '3ro Sec.',
      '4to': '4to Sec.', '5to': '5to Sec.'
    }[metadata.grade] || metadata.grade;

    return `
      <div class="chat-screen">
        <div class="chat-header">
          <div class="chat-header-info">
            <span class="chat-header-title">🤖 TrackTutor · ${esc(metadata.subject)} <span class="ai-mode-badge" id="chatModeBadge" hidden>🦉 Minerva</span></span>
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
            <div class="ai-toolbar">
              <button class="ghost ai-toolbar-btn" id="chatMinervaBtn" title="Modo Minerva: aprendizaje socrático puro (el tutor nunca da la respuesta, solo te guía con preguntas)">🦉 Minerva</button>
              <button class="ghost ai-toolbar-btn" id="chatDecoBtn" title="Evaluación DECO: preguntas en 4 niveles cognitivos para medir tu comprensión">🎯 DECO</button>
            </div>
            <span class="chat-hint">Enter envía · Shift+Enter salto de línea</span>
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

    // Micrófono — Nivel 1: dictado nativo (instantáneo); Nivel 2: grabación + transcripción IA
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
      // Fallback (sin Web Speech API): grabar + transcribir con TrackFocus Intelligence
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

    // Modo Minerva (Fase 4): toggle socrático. Solo cambia el system prompt de
    // los próximos mensajes; no reescribe el historial ni interrumpe la sesión.
    const minervaBtn = document.getElementById('chatMinervaBtn');
    const modeBadge  = document.getElementById('chatModeBadge');
    minervaBtn?.addEventListener('click', () => {
      if (!_chatState) return;
      const on = _chatState.metadata.mode === 'minerva';
      _chatState.metadata.mode = on ? 'tutor' : 'minerva';
      minervaBtn.classList.toggle('active', !on);
      if (modeBadge) modeBadge.hidden = on;
      UI.flash?.(on
        ? 'Modo Tutor: explicaciones guiadas activadas.'
        : '🦉 Modo Minerva: el tutor te guiará solo con preguntas, sin darte la respuesta.',
        'info');
    });

    // Modo DECO (Fase 5): evaluación en 4 niveles cognitivos dentro del chat.
    const decoBtn = document.getElementById('chatDecoBtn');
    decoBtn?.addEventListener('click', () => _launchDeco(decoBtn));
  }

  // Genera y presenta la evaluación DECO como tarjeta expandible en el chat.
  async function _launchDeco(btn) {
    if (!_chatState || typeof Deco === 'undefined') return;
    const messages = document.getElementById('chatMessages');
    if (!messages) return;
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando…'; }

    const typingEl = _showTyping();
    let blocks = null;
    try {
      blocks = await Deco.generate(_chatState.metadata, _chatState.metadata.subject);
    } catch (_) { /* degradación silenciosa */ }
    typingEl?.remove();

    if (btn) { btn.disabled = false; btn.textContent = '🎯 DECO'; }

    if (!blocks) {
      UI.flash?.('No se pudo generar la evaluación DECO ahora. Inténtalo de nuevo.', 'error');
      return;
    }
    Deco.renderInto(messages, blocks, (result) => {
      _chatState.decoResult = result;
      UI.flash?.(`DECO calificado: ${result.decoScore}/${result.total}. Se reflejará en tu Índice de Aprendizaje al finalizar.`, 'success');
    });
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

  // Contingencia del tutor (Fase B): si TrackFocus Intelligence cae, no rompemos la sesión.
  // Mostramos una tarjeta amable y ofrecemos seguir con el Pomodoro o reintentar.
  function _showTutorContingency() {
    const messages = document.getElementById('chatMessages');
    if (!messages || messages.querySelector('.tutor-contingency')) return;
    const card = document.createElement('div');
    card.className = 'tutor-contingency';
    card.innerHTML = `
      <div class="tc-icon">🌿</div>
      <div class="tc-title">El Tutor Socrático está tomando un respiro</div>
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
      window.Monitor?.log?.('tf-intelligence', 'Tutor: fallo al iniciar respuesta', err?.message);
      _showTutorContingency();
    } finally {
      if (sendBtn)  sendBtn.disabled = false;
      if (finalBtn) finalBtn.disabled = false;
    }
  }

  async function _handleUserMessage(text, files = []) {
    if (!_chatState) return;
    const ts = Date.now();

    // Memoria Académica (Fase 7): el primer mensaje real del alumno define el tema.
    if (!_chatState.firstUserTopic && text && text.trim()) {
      _chatState.firstUserTopic = text.trim();
    }

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
      window.Monitor?.log?.('tf-intelligence', 'Tutor: fallo al responder', err?.message);
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
      const { concentration, metrics, recommendations } = await AiChatProxy.finalizeSession(
        _chatState.metadata,
        _chatState.history
      );

      // Índice de Aprendizaje (Fase 5): combina métricas de la sesión + DECO.
      // Se calcula ANTES de guardar para persistirlo en el comment de la sesión
      // (así la pantalla de Estadísticas puede mostrar la evolución histórica local).
      const decoResult = _chatState.decoResult || null;
      const learningIndex = (typeof Deco !== 'undefined')
        ? Deco.learningIndex(metrics, decoResult)
        : null;
      const commentMetrics = { ...metrics };
      if (learningIndex != null) commentMetrics.learning_index = learningIndex;
      if (decoResult) commentMetrics.deco = { score: decoResult.decoScore, total: decoResult.total, byLevel: decoResult.byLevel };

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
        comment:          JSON.stringify(commentMetrics)
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

      // Memoria Académica (Fase 7): actualiza lo que el tutor recuerda de esta materia.
      if (typeof AcademicMemory !== 'undefined') {
        AcademicMemory.update(user.id, _chatState.metadata.subject, {
          topic: _chatState.firstUserTopic || _chatState.metadata.subject,
          learningIndex,
          decoByLevel: decoResult ? decoResult.byLevel : null
        });
      }

      _chatState = null;

      // Registro anónimo del piloto (Fase C). Gateado por consentimiento en Fase E.
      // Fire-and-forget: tiene su propia cola offline (Pilot.flushOutbox).
      _recordPilot({
        sessionId: record.id, focusScore: concentration, timeSpentSeconds,
        preQuizScore, postQuizScore,
        decoScore: decoResult ? decoResult.decoScore : null,
        learningIndex,
        decoByLevel: decoResult ? decoResult.byLevel : null
      });

      // Recomendaciones inteligentes (Fase 10): combina IA + análisis local,
      // se guardan para la pantalla "Recomendaciones" y se muestran ahora.
      const recs = (typeof Recommend !== 'undefined')
        ? Recommend.fromSession(recommendations, metrics, decoResult)
        : [];
      try { sessionStorage.setItem('tf-last-recommendations', JSON.stringify({ at: Date.now(), subject: record.subject, recs })); } catch (_) {}

      const mejora = (preQuizScore != null && postQuizScore != null)
        ? ` · Quiz: ${preQuizScore}→${postQuizScore}`
        : '';
      const idxTxt = (learningIndex != null) ? ` · Índice ${learningIndex}/100 📊` : '';
      const goPanel = () => {
        App.go('dashboard');
        UI.flash(`Sesión guardada · Concentración deducida: ${concentration}/5 🎯${mejora}${idxTxt}`, 'success');
        showXpToast(gamResult.xpEarned, gamResult.newBadges);
      };

      // Tarjeta de recomendaciones antes de volver al panel.
      const inputArea2 = document.querySelector('.chat-input-area');
      if (inputArea2 && recs.length) {
        inputArea2.innerHTML = `
          <div class="session-recs">
            <h3 style="margin:0 0 4px;">✅ ¡Sesión completada!</h3>
            <p class="muted" style="margin:0 0 12px;font-size:13px;">TrackFocus Intelligence te sugiere para continuar:</p>
            ${recs.map(r => `<div class="rec-item"><span class="rec-icon">${r.icon}</span><div><strong>${esc(r.label)}:</strong> ${esc(r.text)}</div></div>`).join('')}
            <button class="primary" id="recContinueBtn" style="margin-top:12px;width:100%;">Ver mi panel →</button>
          </div>`;
        document.getElementById('recContinueBtn')?.addEventListener('click', goPanel);
      } else {
        goPanel();
      }
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
      <p class="muted">Materias disponibles para tu institución. Puedes agregar cursos personalizados.</p>
      <div class="card">
        <h3>Materias predefinidas</h3>
        <div>${base.map(x => `<span class="chip">${esc(x)}</span>`).join('') || '<span class="muted">Ninguna</span>'}</div>
      </div>
      <div class="card">
        <h3>Cursos personalizados</h3>
        <div id="customList">${custom.map(x => `<span class="chip">${esc(x)}<span class="x" data-del="${esc(x)}">✕</span></span>`).join('') || '<span class="muted">Aún no agregaste cursos.</span>'}</div>
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
      try { Subjects.addCustomSubject(userId, name); App.go('subjects'); UI.flash('Curso agregado.', 'success'); }
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

    // Índice de Aprendizaje (Fase 5): última medición + evolución reciente.
    const liSeries = Stats.learningIndexSeries(sessions);
    const liLatest = liSeries.length ? liSeries[liSeries.length - 1].value : null;
    const liRecent = liSeries.slice(-8);
    const liCard = liLatest != null ? `
      <div class="card" style="margin-top:18px;">
        <h3 style="margin:0 0 4px;">📊 Índice de Aprendizaje</h3>
        <p class="muted" style="margin:0 0 14px;font-size:13px;">Combina precisión, coherencia, participación, rapidez y razonamiento (0–100).</p>
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
          <div class="learning-index-badge" style="--li:${liLatest};">
            <span class="li-val">${liLatest}</span>
            <span class="li-lbl">de 100</span>
          </div>
          <div style="flex:1;min-width:200px;">
            <div style="display:flex;align-items:flex-end;gap:6px;height:80px;">
              ${liRecent.map(p => `<div title="${esc(new Date(p.datetime).toLocaleDateString('es-PE'))}: ${p.value}" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;">
                <div style="height:${Math.max(4, p.value)}%;background:linear-gradient(180deg,var(--accent),var(--primary));border-radius:4px 4px 0 0;"></div>
              </div>`).join('')}
            </div>
            <p class="muted" style="font-size:12px;margin:8px 0 0;">Últimas ${liRecent.length} sesiones con Estudio IA.</p>
          </div>
        </div>
      </div>` : '';

    return `
      <h1>Estadísticas</h1>
      <div class="grid cols-4">
        <div class="kpi"><div class="v">${sum.total}</div><div class="l">Sesiones</div></div>
        <div class="kpi"><div class="v">${sum.avgConc}</div><div class="l">Concentración prom.</div></div>
        <div class="kpi"><div class="v">${sum.totalMin}</div><div class="l">Min totales</div></div>
        <div class="kpi"><div class="v">${sum.avgDur}</div><div class="l">Min prom./sesión</div></div>
      </div>

      ${liCard}

      <div class="card" style="margin-top:18px;">
        <h3>Actividad semanal (últimas 52 semanas)</h3>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">Menos →→ Más actividad</div>
        ${Charts.heatmapGrid(sessions)}
      </div>

      <div class="grid cols-2" style="margin-top:18px;">
        <div class="card">
          <h2>Concentración por materia</h2>
          <div class="chart-container">
            <div class="chart-skeleton skeleton"></div>
            <canvas id="chartSubject"></canvas>
          </div>
        </div>
        <div class="card">
          <h2>Distribución Likert</h2>
          <div class="chart-container">
            <div class="chart-skeleton skeleton"></div>
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

    // Recomendaciones de la última sesión IA (Fase 10), si existen (sessionStorage).
    let lastRecHtml = '';
    try {
      const stored = JSON.parse(sessionStorage.getItem('tf-last-recommendations') || 'null');
      if (stored && Array.isArray(stored.recs) && stored.recs.length) {
        lastRecHtml = `
          <div class="card" style="margin-bottom:18px;">
            <h3 style="margin:0 0 4px;">🧠 Basado en tu última sesión${stored.subject ? ' de ' + esc(stored.subject) : ''}</h3>
            <p class="muted" style="margin:0 0 12px;font-size:13px;">Sugerencias de TrackFocus Intelligence.</p>
            ${stored.recs.map(r => `<div class="rec-item"><span class="rec-icon">${r.icon || '•'}</span><div><strong>${esc(r.label || '')}:</strong> ${esc(r.text || '')}</div></div>`).join('')}
          </div>`;
      }
    } catch (_) {}

    return `
      <h1>Recomendaciones personalizadas</h1>
      <p class="muted">Basadas en tus ${sessions.length} sesión${sessions.length === 1 ? '' : 'es'} registrada${sessions.length === 1 ? '' : 's'}.</p>
      ${lastRecHtml}
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

  // ---- Pantalla: Perfil de aprendizaje ----
  function screenProfile() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const sessions = Sessions.listFor(user.id);
    const gam = user.gamification || {};
    const levelInfo = Gamification.getLevelInfo(gam.xp || 0);
    const profile = Analytics.classifyProfile(sessions);
    const patterns = Analytics.detectPatterns(sessions);
    const sum = Stats.summary(sessions);

    // Perfil Cognitivo (Fase 6): 4 dimensiones a partir de las evaluaciones DECO.
    const cog = Stats.cognitiveProfile(sessions);
    const consistency = Math.max(0, Math.min(1, ((gam.streak || 0) / 7) * 0.5 + Math.min(sum.total, 10) / 10 * 0.5));
    const cogDims = [
      { key: 'comprehension', label: 'Comprensión', icon: '🔵', val: cog.comprehension },
      { key: 'application',   label: 'Aplicación',  icon: '🟡', val: cog.application },
      { key: 'analysis',      label: 'Análisis',    icon: '🔴', val: (cog.reasoning != null || cog.analysis != null)
          ? Math.max(0, Math.min(1, ((cog.reasoning ?? 0) + (cog.analysis ?? 0)) / ((cog.reasoning != null ? 1 : 0) + (cog.analysis != null ? 1 : 0) || 1))) : null },
      { key: 'consistency',   label: 'Constancia',  icon: '🟢', val: consistency }
    ];
    const cogBar = (d) => {
      const pct = d.val != null ? Math.round(d.val * 100) : null;
      return `<div class="cog-row">
        <div class="cog-row-head"><span>${d.icon} ${d.label}</span><span class="muted">${pct != null ? pct + '%' : '—'}</span></div>
        <div class="cog-bar-wrap"><div class="cog-bar" style="width:${pct != null ? pct : 0}%;"></div></div>
      </div>`;
    };
    const cognitiveCard = cog.samples > 0 ? `
      <div class="card cognitive-profile" style="margin-top:18px;">
        <h3 style="margin:0 0 4px;">🧠 Tu Perfil Cognitivo</h3>
        <p class="muted" style="margin:0 0 14px;font-size:13px;">Cómo aprendes, no solo cuánto estudias. Basado en tus evaluaciones DECO.</p>
        ${cogDims.map(cogBar).join('')}
      </div>` : `
      <div class="card cognitive-profile" style="margin-top:18px;">
        <h3 style="margin:0 0 4px;">🧠 Tu Perfil Cognitivo</h3>
        <p class="muted" style="margin:0;font-size:13px;">Completa sesiones con la evaluación 🎯 DECO en Estudio IA para descubrir tus dimensiones cognitivas (comprensión, aplicación, análisis y constancia).</p>
      </div>`;

    // Memoria Académica (Fase 7): lo que TrackFocus Intelligence recuerda por materia.
    const memSubjects = (typeof AcademicMemory !== 'undefined') ? AcademicMemory.listSubjects(user.id) : [];
    const memoryCard = memSubjects.length ? `
      <div class="card" style="margin-top:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <h3 style="margin:0;">📚 Memoria de TrackFocus Intelligence</h3>
          <button class="ghost" id="clearMemoryBtn" style="font-size:12px;padding:6px 12px;">Borrar memoria</button>
        </div>
        <p class="muted" style="margin:6px 0 12px;font-size:13px;">El tutor recuerda tu progreso por materia y adapta cada sesión.</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${memSubjects.map(m => `
            <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;">
              <div style="display:flex;justify-content:space-between;font-weight:600;">
                <span>${esc(m.subject)}</span>
                <span class="muted" style="font-weight:400;font-size:12px;">${m.sessionCount} sesión(es)${m.lastIndex != null ? ' · Índice ' + m.lastIndex + '/100' : ''}</span>
              </div>
              ${m.lastTopic ? `<div class="muted" style="font-size:13px;margin-top:4px;">Último tema: ${esc(m.lastTopic)}</div>` : ''}
              ${(m.mastered && m.mastered.length) ? `<div style="font-size:12px;margin-top:4px;">✅ Domina: ${esc(m.mastered.join(', '))}</div>` : ''}
              ${(m.struggling && m.struggling.length) ? `<div style="font-size:12px;margin-top:2px;">📌 Reforzar: ${esc(m.struggling.join(', '))}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>` : '';

    return `
      <h1>👤 Mi Perfil de Aprendizaje</h1>

      ${profile ? `
      <div class="card" style="text-align:center;padding:30px;">
        <div style="font-size:48px;margin-bottom:12px;">${profile.icon}</div>
        <h2 style="margin:0 0 8px;">${esc(profile.label)}</h2>
        <p class="muted">${esc(profile.desc)}</p>
      </div>` : `<div class="card"><p class="muted">Registra al menos 3 sesiones para ver tu perfil de aprendizaje.</p></div>`}

      ${cognitiveCard}

      ${memoryCard}

      <div class="grid cols-3" style="margin-top:18px;">
        <div class="kpi">
          <div class="v" style="font-size:20px;">${esc(levelInfo.current.title)}</div>
          <div class="l">Nivel ${levelInfo.current.level}</div>
        </div>
        <div class="kpi">
          <div class="v">${gam.xp || 0}</div>
          <div class="l">XP total</div>
        </div>
        <div class="kpi">
          <div class="v">🔥 ${gam.streak || 0}</div>
          <div class="l">Días consecutivos</div>
        </div>
        <div class="kpi">
          <div class="v">${sum.total}</div>
          <div class="l">Sesiones totales</div>
        </div>
        <div class="kpi">
          <div class="v">${sum.totalMin}</div>
          <div class="l">Minutos estudiados</div>
        </div>
        <div class="kpi">
          <div class="v">${(gam.badges || []).length}</div>
          <div class="l">Insignias</div>
        </div>
      </div>

      ${patterns ? `
      <div class="card" style="margin-top:18px;">
        <h3>Patrones detectados</h3>
        ${patterns.bestHour !== null ? `<p>⏰ <strong>Mejor hora:</strong> ${patterns.bestHour}:00 — ${patterns.bestHour < 12 ? 'Mañana' : patterns.bestHour < 18 ? 'Tarde' : 'Noche'}</p>` : ''}
        ${patterns.worstSubject ? `<p>📖 <strong>Materia con menor concentración:</strong> ${esc(patterns.worstSubject)} (${patterns.worstSubjectAvg.toFixed(1)}/5)</p>` : ''}
        ${patterns.optimalDuration ? `<p>⏱️ <strong>Duración óptima:</strong> Sesiones ${patterns.optimalDuration}</p>` : ''}
      </div>` : ''}

      <div class="card" style="margin-top:18px;">
        <h3>Mis insignias obtenidas</h3>
        <div class="badges-grid">
          ${Gamification.BADGES.filter(b => (gam.badges || []).includes(b.id)).map(b => `
            <div class="badge-card">
              <span class="badge-icon">${b.icon}</span>
              <div class="badge-name">${esc(b.label)}</div>
            </div>`).join('') || '<p class="muted">Aún no tienes insignias. ¡Empieza a estudiar!</p>'}
        </div>
      </div>

      ${user.classroomId ? `
      <div class="card" style="margin-top:18px;">
        <h3>Cambio de aula</h3>
        <p class="muted" style="font-size:13px;">¿Necesitas cambiarte de aula? Envía una solicitud a tu docente.</p>
        <form id="changeClassroomForm" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-top:12px;">
          <div class="field" style="flex:1;min-width:200px;margin-bottom:0;">
            <label>Código de invitación del aula destino</label>
            <input name="targetCode" placeholder="Ej. ABCD1234" maxlength="8" style="text-transform:uppercase;" required />
          </div>
          <button class="ghost" type="submit" style="flex-shrink:0;">Solicitar cambio</button>
        </form>
      </div>` : ''}

      ${user.schoolId && !user.classroomId ? `
      <div class="card" style="margin-top:18px;">
        <h3>Unirse a un aula</h3>
        <p class="muted" style="font-size:13px;">Ingresa el código de invitación de tu aula.</p>
        <form id="joinClassroomForm" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-top:12px;">
          <div class="field" style="flex:1;min-width:200px;margin-bottom:0;">
            <label>Código de invitación</label>
            <input name="inviteCode" placeholder="Ej. ABCD1234" maxlength="8" style="text-transform:uppercase;" required />
          </div>
          <button class="ghost" type="submit" style="flex-shrink:0;">Enviar solicitud</button>
        </form>
      </div>` : ''}`;
  }

  function wireProfile() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];

    // Memoria Académica (Fase 7): borrar lo que el tutor recuerda.
    document.getElementById('clearMemoryBtn')?.addEventListener('click', () => {
      if (!confirm('¿Borrar la memoria académica? El tutor olvidará tu historial por materia.')) return;
      AcademicMemory.clear(user.id);
      UI.flash('Memoria académica borrada.', 'success');
      App.go('profile');
    });

    document.getElementById('changeClassroomForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = new FormData(e.target).get('targetCode').trim().toUpperCase();
      const cr = Schools.findClassroomByCode(code);
      if (!cr) return UI.flash('Código de aula inválido.', 'error');
      if (cr.id === user.classroomId) return UI.flash('Ya perteneces a esa aula.', 'error');
      Schools.createChangeRequest(user.id, cr.id);
      UI.flash('Solicitud enviada. Tu docente recibirá la notificación.', 'success');
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

  // ---- Pantalla: AI Study (Multimedia) ----
  function screenAIStudy() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const subjects = Subjects.listSubjects(user.institutionType || 'colegio', user.id);
    const sessions = Sessions.listFor(user.id);

    const grades = [
      { id: '1ro', label: '1ro de Secundaria' },
      { id: '2do', label: '2do de Secundaria' },
      { id: '3ro', label: '3ro de Secundaria' },
      { id: '4to', label: '4to de Secundaria' },
      { id: '5to', label: '5to de Secundaria' }
    ];

    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const gam = user.gamification || {};
    const levelInfo = Gamification.getLevelInfo(gam.xp || 0);
    const streak = gam.streak || 0;
    const totalMins = sessions.reduce((sum, s) => sum + (s.durationMin || 0), 0);
    const hoursRound = Math.round(totalMins / 60 * 10) / 10;

    const weekSessions = sessions.filter(s => {
      const sDate = new Date(s.datetime);
      const daysAgo = Math.floor((new Date() - sDate) / (1000 * 60 * 60 * 24));
      return daysAgo < 7;
    }).length;

    const avgConc = sessions.length > 0
      ? (Math.round(sessions.reduce((sum, s) => sum + (s.concentration || 0), 0) / sessions.length * 10) / 10).toFixed(1)
      : 0;

    return `
      <!-- Panel IA Unificado (Fase 3): una sola experiencia de conversación.
           El chat del tutor reemplaza este cuerpo al iniciar la sesión. -->
      <div class="ai-unified-wrap">
        <div id="aiPanelBody">

          <div class="ai-intro">
            <h1>🧠 Estudio con TrackFocus Intelligence</h1>
            <p class="muted">Conversa, adjunta archivos (PDF, imágenes, audio) o habla por voz — todo en una sola conversación continua. TrackFocus Intelligence te guía mientras estudias.</p>
          </div>

          <form id="sessionSetupForm" class="card ai-config-card">
            <div class="row">
              <div class="field">
                <label>Curso / materia</label>
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
            <div class="row">
              <div class="field">
                <label>Duración (minutos)</label>
                <input type="number" name="durationMin" min="5" max="240" value="30" required />
              </div>
              <div class="field">
                <label>Actividad previa</label>
                <select name="previousActivity" required>
                  ${Sessions.PREVIOUS_ACTIVITIES.map(a => `<option value="${a.id}">${esc(a.label)}</option>`).join('')}
                </select>
              </div>
            </div>
            <input type="hidden" name="datetime" value="${local}" />
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
              <button class="primary" type="submit">Comenzar sesión ✨</button>
            </div>
          </form>
          <p class="muted" style="font-size:12px;margin-top:12px;text-align:center;">
            TrackFocus Intelligence evaluará tu concentración y aprendizaje de forma invisible mientras estudias.
          </p>

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

        </div>
      </div>`;
  }

  function wireAIStudy() {
    // Panel IA Unificado (Fase 3): el formulario de configuración inicia el chat
    // del tutor, que ya integra archivos (multimodal) y voz en una sola conversación.
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

    // Mostrar la barra Pomodoro global al entrar a Estudio IA.
    window._showPomBar?.();

    // === Animación de contadores de progreso ===
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
