// Router role-aware + bootstrap.
const App = (() => {

  const ROUTE_ROLES = {
    // Públicas
    'welcome':            null,
    'student-onboarding': null,
    'teacher-promote':    null,
    'admin-promote':      null,
    'consent':            ['student'],

    // Estudiante
    'pending-approval':   ['student'],
    'institution':        ['student'],
    'dashboard':          ['student'],
    'new-session':        ['student'],
    'pomodoro':           ['student'],
    'subjects':           ['student'],
    'history':            ['student'],
    'stats':              ['student'],
    'recommend':          ['student'],
    'achievements':       ['student'],
    'leaderboard':        ['student'],
    'profile':            ['student'],
    'ai-study':           ['student'],

    // Docente
    'teacher-dashboard':  ['teacher'],
    'classroom-manage':   ['teacher'],
    'classroom-stats':    ['teacher'],
    'student-detail':     ['teacher', 'super_admin'],

    // Vista de exposición (Eureka)
    'eureka':             ['teacher', 'super_admin'],

    // Super Admin
    'admin-dashboard':    ['super_admin'],
    'manage-schools':     ['super_admin'],
    'manage-users':       ['super_admin'],
  };

  let _current = null;

  function go(route, params = {}) {
    Charts.destroyAll();

    const user = Roles.current();
    const allowed = ROUTE_ROLES[route];

    if (allowed === undefined) {
      document.getElementById('app').innerHTML = `<div class="alert error">Pantalla desconocida: ${route}</div>`;
      return;
    }

    if (allowed !== null && (!user || !allowed.includes(user.role))) {
      if (!user) return go('welcome');
      if (user.role === 'super_admin') return go('admin-dashboard');
      if (user.role === 'teacher')     return go('teacher-dashboard');
      return go('dashboard');
    }

    _current = route;

    document.getElementById('app').className = route === 'welcome' ? 'lp-main' : 'container';

    const allScreens = {
      welcome:              { render: screenWelcome,           wire: wireWelcome },
      'student-onboarding': { render: screenStudentOnboarding, wire: wireStudentOnboarding },
      'teacher-promote':    { render: screenTeacherPromote,    wire: wireTeacherPromote },
      'admin-promote':      { render: screenAdminPromote,      wire: wireAdminPromote },
      consent:              { render: screenConsent,           wire: wireConsent },
      ...UIStudent.screens,
      ...UITeacher.screens,
      ...UIAdmin.screens,
      ...(typeof UIEureka !== 'undefined' ? UIEureka.screens : {})
    };

    const screen = allScreens[route];
    if (!screen) {
      document.getElementById('app').innerHTML = `<div class="alert error">Pantalla no implementada: ${route}</div>`;
      return;
    }

    document.getElementById('app').innerHTML = screen.render(params);
    screen.wire(params);
    updateChrome();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function updateChrome() {
    const user = Roles.current();
    const nav = document.getElementById('topnav');
    const userbox = document.getElementById('userbox');
    const topbar = document.querySelector('.topbar');
    const footer = document.querySelector('.footer');
    const bottomnav = document.getElementById('bottomnav');

    if (_current === 'welcome') {
      if (topbar) topbar.style.display = 'none';
      if (footer) footer.style.display = 'none';
      nav.classList.add('hidden');
      userbox.classList.add('hidden');
      bottomnav?.classList.add('hidden');
      return;
    }

    // Gate de consentimiento (Fase E): sin menús de navegación (no se puede
    // saltar al panel), pero se mantiene "Salir".
    if (_current === 'consent') {
      if (topbar) topbar.style.display = '';
      if (footer) footer.style.display = 'none';
      nav.classList.add('hidden');
      bottomnav?.classList.add('hidden');
      userbox.classList.remove('hidden');
      if (user) document.getElementById('userLabel').textContent = user.name;
      return;
    }

    if (topbar) topbar.style.display = '';
    if (footer) footer.style.display = '';

    if (!user) {
      nav.classList.add('hidden');
      userbox.classList.add('hidden');
      bottomnav?.classList.add('hidden');
      return;
    }

    nav.classList.remove('hidden');
    userbox.classList.remove('hidden');

    const s = Storage.get();
    let navButtons = '';
    // Items para la nav inferior móvil: { route, icon, label }
    let bottomItems = [];

    if (user.role === 'student') {
      navButtons = `
        <button data-route="dashboard">Panel</button>
        <button data-route="ai-study">Estudio IA</button>
        <button data-route="stats">Estadísticas</button>
        <button data-route="leaderboard">Ranking</button>
        <button data-route="profile">Perfil</button>`;
      bottomItems = [
        { route: 'dashboard',   icon: '🏠', label: 'Inicio' },
        { route: 'ai-study',    icon: '🧠', label: 'IA' },
        { route: 'stats',       icon: '📊', label: 'Progreso' },
        { route: 'leaderboard', icon: '🏆', label: 'Ranking' },
        { route: 'profile',     icon: '👤', label: 'Perfil' }
      ];
    } else if (user.role === 'teacher') {
      navButtons = `
        <button data-route="teacher-dashboard">Mi Panel</button>
        <button data-route="classroom-manage">Aulas</button>
        <button data-route="classroom-stats">Estadísticas</button>`;
      bottomItems = [
        { route: 'teacher-dashboard', icon: '🏠', label: 'Panel' },
        { route: 'classroom-manage',  icon: '🏫', label: 'Aulas' },
        { route: 'classroom-stats',   icon: '📊', label: 'Stats' }
      ];
    } else if (user.role === 'super_admin') {
      navButtons = `
        <button data-route="admin-dashboard">Panel Global</button>
        <button data-route="manage-schools">Colegios</button>
        <button data-route="manage-users">Usuarios</button>`;
      bottomItems = [
        { route: 'admin-dashboard', icon: '🏠', label: 'Global' },
        { route: 'manage-schools',  icon: '🏫', label: 'Colegios' },
        { route: 'manage-users',    icon: '👥', label: 'Usuarios' }
      ];
    }

    nav.innerHTML = navButtons;
    nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.route === _current));

    // Nav inferior (móvil)
    if (bottomnav) {
      bottomnav.innerHTML = bottomItems.map(it => `
        <button data-route="${it.route}" class="${it.route === _current ? 'active' : ''}">
          <span class="bn-icon">${it.icon}</span>
          <span class="bn-label">${it.label}</span>
        </button>`).join('');
      bottomnav.classList.remove('hidden');
    }

    const schoolName = user.schoolId && s.schools[user.schoolId] ? ` · ${s.schools[user.schoolId].name}` : '';
    document.getElementById('userLabel').textContent = `${user.name}${schoolName}`;
  }

  function bindGlobal() {
    document.getElementById('topnav').addEventListener('click', (e) => {
      const r = e.target.closest('button')?.dataset.route;
      if (r) go(r);
    });
    document.getElementById('bottomnav')?.addEventListener('click', (e) => {
      const r = e.target.closest('button')?.dataset.route;
      if (r) go(r);
    });
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await Auth.logout();
      go('welcome');
    });
  }

  function wirePomodoroBar() {
    const bar     = document.getElementById('pomBar');
    const display = document.getElementById('pomBarDisplay');
    const modeEl  = document.getElementById('pomBarMode');
    if (!bar) return;

    const modeLabels = { focus: 'ENFOCADO 🧠', break: 'DESCANSO ☕', paused: 'PAUSADO ⏸', idle: 'LISTO' };

    // Rellenar materias cuando haya usuario activo
    function _refreshSubjects() {
      const s    = Storage.get();
      const user = s.users[s.currentUserId];
      if (!user) return;
      const subs = Subjects.listSubjects(user.institutionType || 'colegio', user.id);
      const sel  = document.getElementById('pomBarSubject');
      if (sel && !sel.options.length) {
        sel.innerHTML = subs.map(x => `<option>${x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</option>`).join('');
      }
    }

    // Restaurar estado del timer
    const pState = Pomodoro.getState();
    if (display) display.textContent = Pomodoro.formatTime(pState.remaining || Pomodoro.DEFAULTS.focus * 60);
    if (modeEl)  modeEl.textContent  = modeLabels[pState.mode] || 'LISTO';
    if (pState.mode !== 'idle') bar.classList.remove('hidden');

    // Modal de ciclo completado (global)
    function _showGlobalPomModal(focusDurationMin) {
      // Reutilizar modal si existe en el DOM actual, o crear uno temporal
      let modal = document.getElementById('pomModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pomModal';
        modal.className = 'pom-modal';
        modal.innerHTML = `<div class="pom-modal-inner card">
          <h2>🍅 ¡Ciclo completado!</h2>
          <p>¿Qué nivel de concentración tuviste?</p>
          <div class="likert" id="pomLikert">
            ${[1,2,3,4,5].map(v => `<label><input type="radio" name="pomConc" value="${v}" ${v===3?'checked':''}/><div class="lk-num">${v}</div></label>`).join('')}
          </div>
          <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
            <button class="ghost" id="pomSkipLog">Saltar</button>
            <button class="primary" id="pomSaveSession">Guardar</button>
          </div>
        </div>`;
        document.body.appendChild(modal);
      }
      modal.classList.remove('hidden');
      modal.style.display = '';

      document.getElementById('pomSaveSession')?.addEventListener('click', () => {
        const s       = Storage.get();
        const userId  = s.currentUserId;
        const conc    = Number(document.querySelector('input[name="pomConc"]:checked')?.value || 3);
        const subject = document.getElementById('pomBarSubject')?.value
          || document.getElementById('pomSubject')?.value
          || 'Sin materia';
        try {
          const { gamResult } = Sessions.addFromPomodoro(userId, subject, focusDurationMin, conc);
          UI.flash?.('Sesión Pomodoro guardada. +' + gamResult.xpEarned + ' XP', 'success');
        } catch(e) { UI.flash?.(e.message, 'error'); }
        modal.classList.add('hidden');
      }, { once: true });

      document.getElementById('pomSkipLog')?.addEventListener('click', () => {
        modal.classList.add('hidden');
      }, { once: true });
    }

    let lastFocus = Pomodoro.DEFAULTS.focus;

    const pageModeLabels = { focus: 'Enfocado 🧠', break: 'Descanso ☕', paused: 'Pausado ⏸', idle: 'Listo para enfocar' };

    Pomodoro.setCallbacks(
      (remaining, mode) => {
        if (display) display.textContent = Pomodoro.formatTime(remaining);
        if (modeEl)  modeEl.textContent  = modeLabels[mode] || '';
        if (mode !== 'idle') {
          bar.classList.remove('hidden');
          document.body.classList.add('pom-active');
        }
        // Sincronizar también la página dedicada de Pomodoro si está visible
        const pageDisplay = document.getElementById('timerDisplay');
        const pageMode    = document.getElementById('timerMode');
        if (pageDisplay) pageDisplay.textContent = Pomodoro.formatTime(remaining);
        if (pageMode)    pageMode.textContent    = pageModeLabels[mode] || '';
      },
      (completedMode) => {
        if (completedMode === 'focus') _showGlobalPomModal(Pomodoro.DEFAULTS.focus);
        if (display) display.textContent = Pomodoro.formatTime(Pomodoro.DEFAULTS.focus * 60);
        if (modeEl)  modeEl.textContent  = 'LISTO';
        const pageDisplay = document.getElementById('timerDisplay');
        const pageMode    = document.getElementById('timerMode');
        if (pageDisplay) pageDisplay.textContent = Pomodoro.formatTime(Pomodoro.DEFAULTS.focus * 60);
        if (pageMode)    pageMode.textContent    = 'Listo para enfocar';
      }
    );

    document.getElementById('pomBarStart')?.addEventListener('click', () => {
      _refreshSubjects();
      const f = Number(document.getElementById('pomBarFocus')?.value || 25);
      const b = Number(document.getElementById('pomBarBreak')?.value || 5);
      Pomodoro.DEFAULTS.focus      = f;
      Pomodoro.DEFAULTS.shortBreak = b;
      lastFocus = f;
      const subj = document.getElementById('pomBarSubject')?.value || 'Sin materia';
      Pomodoro.reset();
      Pomodoro.start(subj, Storage.get().currentUserId);
      bar.classList.remove('hidden');
      document.body.classList.add('pom-active');
    });

    document.getElementById('pomBarPause')?.addEventListener('click', () => {
      const st = Pomodoro.getState();
      if (st.mode === 'paused') Pomodoro.resume(); else Pomodoro.pause();
    });

    document.getElementById('pomBarSkip')?.addEventListener('click', () => Pomodoro.skip());

    document.getElementById('pomBarReset')?.addEventListener('click', () => {
      Pomodoro.reset();
      if (display) display.textContent = Pomodoro.formatTime(Pomodoro.DEFAULTS.focus * 60);
      if (modeEl)  modeEl.textContent  = 'LISTO';
    });

    document.getElementById('pomBarToggle')?.addEventListener('click', () => {
      bar.classList.toggle('hidden');
      if (bar.classList.contains('hidden')) {
        document.body.classList.remove('pom-active');
      } else {
        document.body.classList.add('pom-active');
      }
    });

    // Exponer función para que screenAIStudy pueda mostrar la barra al entrar
    window._showPomBar = () => {
      _refreshSubjects();
      bar.classList.remove('hidden');
      document.body.classList.add('pom-active');
    };
  }

  async function start() {
    bindGlobal();
    wirePomodoroBar();

    // Modo demostración (Fase G): ?demo=1 (docente→Eureka) o ?demo=student.
    // No requiere Supabase ni internet; datos ficticios aislados.
    const _demo = new URLSearchParams(location.search).get('demo');
    if (typeof Demo !== 'undefined' && (_demo === '1' || _demo === 'teacher' || _demo === 'student')) {
      Demo.activate(_demo === 'student' ? 'student' : 'teacher');
      return;
    }

    // En desarrollo (localhost): limpiar sesión para siempre ver el landing desde cero
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      try {
        sessionStorage.clear();
        localStorage.removeItem('supabase.auth.token');
        await Auth.signOut();
      } catch (_) {}
    }

    if (!window.SB_READY) {
      go('welcome');
      // Mostrar aviso amable si supabase-config.js no está configurado
      setTimeout(() => UI.flash?.('Configura supabase-config.js para activar la nube.', 'error'), 200);
      return;
    }

    // 1. ¿Hay sesión Google activa?
    const authSession = await Auth.getSession();
    if (!authSession) return go('welcome');
    console.log('[App] Auth session:', { email: authSession.user?.email, isSuperAdmin: authSession.isSuperAdmin, roles: authSession.availableRoles?.map(r => r.role) });

    // 2. Verificar roles disponibles y multi-rol.
    // NEW: Si es super_admin oficial, auto-seleccionar su rol admin (skip selector)
    if (authSession.isSuperAdmin) {
      const adminRole = authSession.availableRoles?.find(r => r.role === 'super_admin')
        || { role: 'super_admin', email: authSession.user?.email, user_id: authSession.user?.email };
      if (!Auth.getActiveRole()) {
        Auth.setActiveRole(adminRole);
      }
    }

    // Auto-seleccionar el primer rol disponible (sin mostrar selector)
    if (authSession.availableRoles?.length && !Auth.getActiveRole()) {
      Auth.setActiveRole(authSession.availableRoles[0]);
    }

    // 3. Trae todo el estado desde Supabase y monta cache local
    try {
      await Storage.bootstrap();
    } catch (e) {
      console.error('[App] bootstrap error:', e);
      window.Monitor?.log?.('supabase', 'bootstrap de datos falló', e?.message);
      UI.flash?.('No se pudieron cargar tus datos. Reintenta.', 'error');
      return go('welcome');
    }

    Storage.setCurrent((authSession.user?.email || authSession.session?.user?.email || '').toLowerCase());

    // Suscribirse a cambios remotos (multi-dispositivo)
    Storage.bindRealtime(() => {
      // Repintar la pantalla actual cuando llegan cambios, EXCEPTO si interrumpiría
      // al usuario (rendimiento + UX): chat IA en curso o un modal/quiz abierto.
      if (!_current || _current === 'welcome' || _current === 'consent') return;
      if (_current === 'ai-study') return;
      if (document.querySelector('.quiz-modal') || document.querySelector('.pom-modal:not(.hidden)')) return;
      go(_current);
    });

    let user;
    try {
      user = Roles.current();
    } catch (e) {
      console.error('[App] Roles.current() error:', e);
      UI.flash?.('Error de autenticación. Reintenta.', 'error');
      return go('welcome');
    }
    if (!user) {
      console.warn('[App] No user from Roles.current()');
      return go('welcome');
    }
    console.log('[App] Current user:', { email: user.email, role: user.role });

    // 3. ¿Hay intención de rol pendiente del click pre-OAuth?
    const intent = Auth.getRoleIntent();

    // Si es admin pendiente, mostrar pantalla de contraseña (NO para super_admin oficial)
    if (intent === 'admin' && user.role !== 'super_admin') return go('admin-promote');
    if (intent === 'teacher' && user.role === 'student' && !user.schoolId) return go('teacher-promote');

    // 4. Rutado por rol
    if (user.role === 'super_admin') return go('admin-dashboard');
    if (user.role === 'teacher')     return go('teacher-dashboard');
    if (user.schoolId && (user.approvalStatus === 'pending' || user.approvalStatus === 'rejected')) {
      return go('pending-approval');
    }
    if (!user.institutionType && !user.schoolId) return go('student-onboarding');
    if (!user.institutionType) return go('institution');
    // Consentimiento parental obligatorio (Fase E): sin él no se accede al panel
    // (y nunca se registran datos del piloto). Cumplimiento LPDP para menores.
    if (!user.parentalConsent) return go('consent');
    return go('dashboard');
  }

  // ---- Pantalla de bienvenida premium (3 roles) ----
  function screenWelcome() {
    const svgStudent = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
    const svgTeacher = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`;
    const svgAdmin   = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    const svgArrow   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;

    return `
    <div class="lp">
      <div class="lp-glow lp-glow-1"></div>
      <div class="lp-glow lp-glow-2"></div>
      <div class="lp-glow lp-glow-3"></div>

      <header class="lp-header">
        <div class="lp-brand">
          <img src="assets/logo.svg" class="lp-brand-img" alt="TrackFocus">
          <span>TrackFocus</span>
        </div>
      </header>

      <div class="lp-hero">
        <div class="lp-pill">
          <span class="lp-pill-dot"></span>
          Plataforma Educativa Inteligente
        </div>
        <h1 class="lp-title">Convierte tu<br>esfuerzo en resultados</h1>
        <p class="lp-subtitle">Mejora tu concentración, construye disciplina y descubre la mejor forma de estudiar para alcanzar tus objetivos académicos.</p>

        <div class="lp-cards reveal">
          <div class="lp-card lp-card--gold reveal" data-role="student" data-delay="0">
            <div class="lp-icon-ring">${svgStudent}</div>
            <h3>QUIERO MEJORAR MI RENDIMIENTO</h3>
            <p>Registra sesiones, desarrolla hábitos y descubre cuándo estudias mejor.</p>
            <div class="lp-card-foot">
              <span style="font-size:12px;color:#52525B;">Solo Gmail</span>
              <button class="lp-arrow-btn" tabindex="-1">${svgArrow}</button>
            </div>
          </div>

          <div class="lp-card lp-card--purple reveal" data-role="teacher" data-delay="100">
            <div class="lp-icon-ring">${svgTeacher}</div>
            <h3>QUIERO MONITOREAR A MIS ESTUDIANTES</h3>
            <p>Analiza el progreso, detecta riesgos y acompaña el desarrollo académico.</p>
            <div class="lp-card-foot">
              <span style="font-size:12px;color:#52525B;">Requiere código</span>
              <button class="lp-arrow-btn" tabindex="-1">${svgArrow}</button>
            </div>
          </div>

          <div class="lp-card lp-card--blue reveal" data-role="admin" data-delay="200">
            <div class="lp-icon-ring">${svgAdmin}</div>
            <h3>GESTIONAR MI INSTITUCIÓN</h3>
            <p>Centraliza estadísticas, usuarios y rendimiento académico desde un solo lugar.</p>
            <div class="lp-card-foot">
              <span style="font-size:12px;color:#52525B;">Acceso restringido</span>
              <button class="lp-arrow-btn" tabindex="-1">${svgArrow}</button>
            </div>
          </div>
        </div>

        <div id="authForm" class="lp-form-wrap hidden"></div>

        <div class="lp-features reveal">
          <div class="lp-feat reveal" data-delay="0">
            <div class="lp-feat-icon lp-feat-icon--gold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <h4>Gamificación</h4>
            <p>XP, niveles, badges y ranking por aula para mantener la motivación alta.</p>
          </div>
          <div class="lp-feat reveal" data-delay="100">
            <div class="lp-feat-icon lp-feat-icon--purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h4>Analytics</h4>
            <p>Detección automática de patrones y alertas de rendimiento en tiempo real.</p>
          </div>
          <div class="lp-feat reveal" data-delay="200">
            <div class="lp-feat-icon lp-feat-icon--blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h4>Pomodoro</h4>
            <p>Timer con ciclos automáticos y análisis post-sesión de productividad.</p>
          </div>
        </div>

        <div class="lp-ai-demo reveal">
          <div class="lp-ai-demo__header">
            <div class="lp-ai-badge"><span>🧠</span> TrackFocus Intelligence</div>
            <h2 class="lp-ai-demo__title">Así estudias con TrackFocus</h2>
            <p class="lp-ai-demo__subtitle">Aprende paso a paso con ayuda inteligente. La IA te guía, te hace preguntas y te ayuda a comprender mejor los temas que estudias.</p>
          </div>

          <div class="lp-ai-demo__content">
            <div class="lp-ai-chat">
              <div class="lp-ai-chat__bar">
                <span class="lp-ai-dot lp-ai-dot--red"></span>
                <span class="lp-ai-dot lp-ai-dot--yellow"></span>
                <span class="lp-ai-dot lp-ai-dot--green"></span>
                <span class="lp-ai-chat__label">TrackFocus Intelligence · Demo</span>
              </div>
              <div class="lp-ai-chat__body">
                <div class="lp-ai-msg lp-ai-msg--user">
                  <div class="lp-ai-bubble">¿Cómo resuelvo una ecuación cuadrática?</div>
                </div>
                <div class="lp-ai-msg lp-ai-msg--ai">
                  <div class="lp-ai-avatar">🧠</div>
                  <div class="lp-ai-msg__col">
                    <div class="lp-ai-bubble lp-ai-bubble--ai">Primero identifica los coeficientes a, b y c.</div>
                    <div class="lp-ai-bubble lp-ai-bubble--ai">Observa este ejemplo:</div>
                    <div class="lp-ai-code">x² + 5x + 6 = 0</div>
                    <div class="lp-ai-bubble lp-ai-bubble--ai">Ahora intenta resolverlo tú.</div>
                    <div class="lp-ai-bubble lp-ai-bubble--ai lp-ai-bubble--accent">¿Qué dos números multiplicados dan 6 y sumados dan 5?</div>
                  </div>
                </div>
              </div>
              <div class="lp-ai-checks">
                <span class="lp-ai-check">✅ No te da la respuesta completa</span>
                <span class="lp-ai-check">✅ Te guía paso a paso</span>
                <span class="lp-ai-check">✅ Genera ejercicios según tu grado</span>
                <span class="lp-ai-check">✅ Analiza tu progreso y concentración</span>
              </div>
            </div>

            <div class="lp-ai-files">
              <div class="lp-ai-files__title">Sube tus materiales de estudio</div>
              <div class="lp-ai-flow">
                <div class="lp-ai-flow__row">
                  <span class="lp-ai-flow__item">📄 PDF</span>
                  <span class="lp-ai-flow__item">🖼 Imagen</span>
                  <span class="lp-ai-flow__item">🎤 Audio</span>
                  <span class="lp-ai-flow__item">📊 PPT</span>
                  <span class="lp-ai-flow__item">📝 Documento</span>
                </div>
                <div class="lp-ai-flow__arrow">↓</div>
                <div class="lp-ai-flow__brain">🧠 IA de TrackFocus</div>
                <div class="lp-ai-flow__arrow">↓</div>
                <div class="lp-ai-flow__row lp-ai-flow__row--out">
                  <span class="lp-ai-flow__item lp-ai-flow__item--out">📚 Resúmenes</span>
                  <span class="lp-ai-flow__item lp-ai-flow__item--out">❓ Preguntas</span>
                  <span class="lp-ai-flow__item lp-ai-flow__item--out">✏️ Ejercicios</span>
                  <span class="lp-ai-flow__item lp-ai-flow__item--out">📈 Retroalimentación</span>
                </div>
              </div>
              <p class="lp-ai-files__desc">Sube tus materiales de estudio y recibe ayuda personalizada para comprender mejor los temas que estás aprendiendo.</p>
            </div>
          </div>

          <button class="lp-ai-cta" id="lpAICta">Comenzar a estudiar gratis</button>
        </div>

        <footer class="lp-footer">
          <span>© 2026 TrackFocus</span>
          <span class="lp-footer-sep">·</span>
          <span>Datos sincronizados de forma segura en la nube</span>
        </footer>
      </div>
    </div>`;
  }

  function wireWelcome() {
    root().querySelectorAll('.lp-card[data-role]').forEach(card => {
      card.addEventListener('click', () => {
        root().querySelectorAll('.lp-card[data-role]').forEach(c => c.classList.remove('lp-selected'));
        card.classList.add('lp-selected');
        renderAuthForm(card.dataset.role);
        setTimeout(() => {
          const form = document.getElementById('authForm');
          if (form) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
      });
    });

    const scrollBtn = document.getElementById('lpScrollCards');
    if (scrollBtn) {
      scrollBtn.addEventListener('click', () => {
        root().querySelector('.lp-cards')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    const ctaBtn = document.getElementById('lpAICta');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        root().querySelector('.lp-cards')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    wireLandingAnimations();
  }

  function root() { return document.getElementById('app'); }

  const _svgIco = {
    user: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 10-16 0"/></svg>`,
    mail: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>`,
    lock: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
    arrow: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`
  };

  function _lpField(label, inputHTML, optLabel) {
    const opt = optLabel ? ` <span class="lp-opt">${optLabel}</span>` : '';
    return `<div class="lp-field"><label>${label}${opt}</label>${inputHTML}</div>`;
  }

  function _lpInput(ico, attrs) {
    return `<div class="lp-input-row"><span class="lp-input-ico">${_svgIco[ico]}</span><input ${attrs} /></div>`;
  }

  // Logo oficial de Google (Material) para el botón de login
  const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>`;

  function renderAuthForm(role) {
    const container = document.getElementById('authForm');
    if (!container) return;

    container.classList.remove('hidden', 'lp-form--purple', 'lp-form--blue');

    const cfg = {
      student: { cls: 'lp-form-emoji--gold',   emoji: '🎒', title: 'Entrar como Estudiante', subtitle: 'Inicia sesión con tu cuenta de Google. Crearemos tu perfil al instante.' },
      teacher: { cls: 'lp-form-emoji--purple', emoji: '👩‍🏫', title: 'Entrar como Docente',    subtitle: 'Inicia sesión con tu cuenta institucional de Google.' },
      admin:   { cls: 'lp-form-emoji--blue',   emoji: '🛡️', title: 'Acceso Administrador',     subtitle: 'Inicia sesión con Google y luego ingresa la contraseña de administrador.' }
    }[role];

    if (role === 'teacher') container.classList.add('lp-form--purple');
    if (role === 'admin')   container.classList.add('lp-form--blue');

    container.innerHTML = `
      <div class="lp-form-head">
        <div class="lp-form-emoji ${cfg.cls}">${cfg.emoji}</div>
        <div class="lp-form-head-text">
          <h2>${cfg.title}</h2>
          <p>${cfg.subtitle}</p>
        </div>
      </div>
      <button class="lp-btn-google" type="button" id="googleSignInBtn">
        ${GOOGLE_SVG}
        <span>Continuar con Google</span>
      </button>
      <p class="lp-form-foot">Al continuar aceptas que tus datos se sincronicen de forma segura en la nube.</p>
    `;

    document.getElementById('googleSignInBtn').addEventListener('click', async () => {
      try {
        await Auth.signInWithGoogle(role);
      } catch (err) {
        UI.flash(err.message || 'No se pudo iniciar Google. Revisa la configuración.', 'error');
      }
    });
  }

  // ---- Onboarding post-Google para estudiantes (códigos de colegio/aula) ----
  function screenStudentOnboarding() {
    const u = Roles.current();
    if (!u) { return ''; }
    return `
      <div class="card" style="max-width:520px;margin:48px auto;">
        <h2 style="margin:0 0 8px;">¡Bienvenido${u.name ? ', ' + u.name.split(' ')[0] : ''}!</h2>
        <p class="muted" style="margin:0 0 22px;">Para unirte a tu colegio, ingresa los códigos que te dio tu profesor. Puedes saltarlo y agregarlos después.</p>
        <form id="onboardForm">
          <label>Código del colegio <span class="muted">(opcional)</span></label>
          <input name="code" maxlength="6" placeholder="6 caracteres" style="text-transform:uppercase;" />
          <label style="margin-top:14px;">Código del aula <span class="muted">(opcional)</span></label>
          <input name="inviteCode" maxlength="8" placeholder="8 caracteres" style="text-transform:uppercase;" />
          <div style="display:flex;gap:10px;margin-top:18px;">
            <button class="primary" type="submit">Continuar</button>
            <button class="ghost" type="button" id="skipOnboard">Saltar por ahora</button>
          </div>
        </form>
      </div>`;
  }
  function wireStudentOnboarding() {
    document.getElementById('onboardForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const u = Roles.current();
        await Auth.applyStudentCodes(u.id, fd.get('code'), fd.get('inviteCode'));
        await Storage.flush();
        const fresh = Roles.current();
        if (fresh.schoolId && fresh.approvalStatus === 'pending') return go('pending-approval');
        return go('institution');
      } catch (err) { UI.flash(err.message, 'error'); }
    });
    document.getElementById('skipOnboard')?.addEventListener('click', () => go('institution'));
  }

  // ---- Pantalla: Consentimiento parental (Fase E — LPDP Perú, menores) ----
  function screenConsent() {
    const u = Roles.current();
    const nombre = u?.name ? u.name.split(' ')[0] : '';
    return `
      <div class="card consent-card" style="max-width:600px;margin:40px auto;">
        <h2 style="margin:0 0 8px;">Consentimiento de privacidad</h2>
        <p class="muted" style="margin:0 0 16px;">Hola${nombre ? ', ' + nombre : ''}. Antes de empezar necesitamos la autorización de tu padre, madre o tutor, como exige la Ley de Protección de Datos Personales del Perú para personas menores de edad.</p>
        <div class="consent-box">
          <p><strong>¿Qué datos registra TrackFocus?</strong></p>
          <ul>
            <li>Tus sesiones de estudio (materia, duración y nivel de concentración).</li>
            <li>Tu progreso de aprendizaje (logros, XP y rachas).</li>
            <li>Métricas <strong>anónimas</strong> del piloto educativo (sin tu nombre ni correo) para medir el impacto del proyecto.</li>
          </ul>
          <p><strong>¿Cómo los protegemos?</strong></p>
          <ul>
            <li>Tus datos personales solo los ves tú (y tu docente, si tu colegio participa).</li>
            <li>Los datos del piloto se guardan <strong>anonimizados</strong>.</li>
            <li>Nunca compartimos ni vendemos tu información.</li>
          </ul>
        </div>
        <form id="consentForm" style="margin-top:18px;">
          <label class="consent-check">
            <input type="checkbox" id="consentCheck" required>
            <span>Confirmo que mi padre, madre o tutor leyó esta información y <strong>autoriza</strong> mi uso de TrackFocus y el registro de estos datos.</span>
          </label>
          <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">
            <button class="primary" type="submit">Acepto y continúo</button>
            <button class="ghost" type="button" id="consentDecline">Ahora no</button>
          </div>
        </form>
      </div>`;
  }

  function wireConsent() {
    document.getElementById('consentForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!document.getElementById('consentCheck')?.checked) {
        UI.flash('Debes confirmar la autorización para continuar.', 'error');
        return;
      }
      const u = Roles.current();
      if (!u) return go('welcome');
      Storage.set(st => {
        if (st.users[u.id]) {
          st.users[u.id].parentalConsent = true;
          st.users[u.id].consentAt = new Date().toISOString();
        }
      });
      try { await Storage.flush(); } catch (_) {}
      UI.flash('¡Listo! Gracias. Ya puedes empezar a estudiar. 🎓', 'success');
      go('dashboard');
    });
    document.getElementById('consentDecline')?.addEventListener('click', async () => {
      await Auth.logout();
      go('welcome');
    });
  }

  // ---- Pantalla para promover a docente (post-Google) ----
  function screenTeacherPromote() {
    return `
      <div class="card" style="max-width:520px;margin:48px auto;">
        <h2 style="margin:0 0 8px;">Verificación de docente</h2>
        <p class="muted" style="margin:0 0 22px;">Ingresa el código del colegio que te dio el administrador.</p>
        <form id="teacherPromoteForm">
          <label>Código del colegio</label>
          <input name="code" maxlength="6" required placeholder="6 caracteres" style="text-transform:uppercase;" />
          <div style="display:flex;gap:10px;margin-top:18px;">
            <button class="primary" type="submit">Continuar</button>
            <button class="ghost" type="button" id="cancelTeacherPromote">Cancelar</button>
          </div>
        </form>
      </div>`;
  }
  function wireTeacherPromote() {
    document.getElementById('teacherPromoteForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const u = Roles.current();
        await Auth.promoteToTeacher(u.id, fd.get('code'));
        await Storage.flush();
        go('teacher-dashboard');
      } catch (err) { UI.flash(err.message, 'error'); }
    });
    document.getElementById('cancelTeacherPromote')?.addEventListener('click', async () => {
      await Auth.logout();
      go('welcome');
    });
  }

  // ---- Pantalla para promover a super admin ----
  function screenAdminPromote() {
    return `
      <div class="card" style="max-width:520px;margin:48px auto;">
        <h2 style="margin:0 0 8px;">Acceso de administrador</h2>
        <p class="muted" style="margin:0 0 22px;">Ingresa la contraseña maestra para acceder al panel global.</p>
        <form id="adminPromoteForm">
          <label>Contraseña</label>
          <input name="password" type="password" required placeholder="Contraseña secreta" />
          <div style="display:flex;gap:10px;margin-top:18px;">
            <button class="primary" type="submit">Entrar al panel</button>
            <button class="ghost" type="button" id="cancelAdminPromote">Cancelar</button>
          </div>
        </form>
      </div>`;
  }
  function wireAdminPromote() {
    document.getElementById('adminPromoteForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const u = Roles.current();
        await Auth.promoteToSuperAdmin(u.id, fd.get('password'));
        await Storage.flush();
        go('admin-dashboard');
      } catch (err) { UI.flash(err.message, 'error'); }
    });
    document.getElementById('cancelAdminPromote')?.addEventListener('click', async () => {
      await Auth.logout();
      go('welcome');
    });
  }

  function wireLandingAnimations() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Scroll reveal ---
    const reveals = root().querySelectorAll('.reveal');
    if (reveals.length) {
      if (reduced) {
        reveals.forEach(el => el.classList.add('visible'));
      } else {
        const ro = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            ro.unobserve(entry.target);
            const delay = parseInt(entry.target.dataset.delay || '0', 10);
            setTimeout(() => entry.target.classList.add('visible'), delay);
          });
        }, { threshold: 0.12 });
        reveals.forEach(el => ro.observe(el));
      }
    }

    // --- Parallax on scroll ---
    if (!reduced) {
      const glows = [
        root().querySelector('.lp-glow-1'),
        root().querySelector('.lp-glow-2'),
        root().querySelector('.lp-glow-3'),
      ].filter(Boolean);
      function onScroll() {
        const y = window.scrollY;
        if (glows[0]) glows[0].style.transform = 'translateX(-50%) translateY(' + (y * 0.15) + 'px)';
        if (glows[1]) glows[1].style.transform = 'translateY(' + (y * -0.08) + 'px)';
        if (glows[2]) glows[2].style.transform = 'translateY(' + (y * 0.06) + 'px)';
      }
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  return {
    go,
    start,
    _historyFilters: {},
    _lbScope: 'classroom',
    _lbPeriod: 'week',
    _classroomId: null,
    _studentDetailId: null,
    _editSchoolId: null,
    _userFilterRole: '',
    _userFilterSchool: ''
  };
})();

window.addEventListener('DOMContentLoaded', App.start);
