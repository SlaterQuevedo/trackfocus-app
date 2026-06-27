// Router role-aware + bootstrap.
const App = (() => {

  const ROUTE_ROLES = {
    // Públicas
    'welcome':            null,
    'student-onboarding': null,
    'teacher-promote':    null,
    'admin-promote':      null,
    'consent':            ['student'],
    'privacy-policy':     null,  // Accesible por todos los roles autenticados
    'legal':              null,  // Hub de información legal (PP + T&C)

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

  let _current              = null;
  let _landingScrollHandler = null; // referencia para limpiar el listener en navegación

  function _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function _debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // Ejecuta fn en tiempo libre del navegador; fallback para Safari (sin requestIdleCallback).
  function _ric(fn) {
    return 'requestIdleCallback' in window
      ? requestIdleCallback(fn, { timeout: 2000 })
      : setTimeout(fn, 200);
  }

  function go(route, params = {}) {
    performance.mark?.('go:' + route + ':start');
    Charts.destroyAll();
    if (_landingScrollHandler) {
      window.removeEventListener('scroll', _landingScrollHandler);
      _landingScrollHandler = null;
    }

    const user = Roles.current();
    const allowed = ROUTE_ROLES[route];

    if (allowed === undefined) {
      document.getElementById('app').innerHTML = `<div class="alert error">Pantalla desconocida: ${_esc(route)}</div>`;
      return;
    }

    // Gate legal: redirige si el usuario no ha aceptado la PP o los T&C
    // 'legal' se excluye para permitir navegación libre al hub antes de aceptar
    if (user && route !== 'privacy-policy' && route !== 'welcome' && route !== 'legal' && (!user.privacyPolicyAcceptedAt || !user.termsAcceptedAt || !user.transparencyAcceptedAt)) {
      return go('privacy-policy');
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
      'privacy-policy':     { render: screenPrivacyPolicy,     wire: wirePrivacyPolicy },
      'legal':              { render: screenLegal,             wire: wireLegal },
      ...UIStudent.screens,
      ...UITeacher.screens,
      ...UIAdmin.screens,
      ...(typeof UIEureka !== 'undefined' ? UIEureka.screens : {})
    };

    const screen = allScreens[route];
    if (!screen) {
      document.getElementById('app').innerHTML = `<div class="alert error">Pantalla no implementada: ${_esc(route)}</div>`;
      return;
    }

    document.getElementById('app').innerHTML = screen.render(params);
    screen.wire(params);
    updateChrome();
    // TRACKY (Fase 8): mascota contextual. Vive fuera de #app y sobrevive al re-render.
    // Diferido a tiempo libre del navegador: no bloquea el render de la pantalla.
    if (typeof Tracky !== 'undefined') _ric(() => Tracky.checkContext(_current, Roles.current()));
    window.scrollTo({ top: 0, behavior: 'instant' });
    performance.measure?.('go:' + route, 'go:' + route + ':start');
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

    // Gate de Política de Privacidad: igual que consent, sin menús laterales
    if (_current === 'privacy-policy') {
      if (topbar) topbar.style.display = '';
      if (footer) footer.style.display = 'none';
      nav.classList.add('hidden');
      bottomnav?.classList.add('hidden');
      userbox.classList.remove('hidden');
      if (user) document.getElementById('userLabel').textContent = user.name;
      return;
    }

    // Hub legal: pantalla browsable (no gate), muestra nav completa
    if (_current === 'legal') {
      if (topbar) topbar.style.display = '';
      if (footer) footer.style.display = 'none';
      if (user) {
        nav.classList.remove('hidden');
        bottomnav?.classList.remove('hidden');
        userbox.classList.remove('hidden');
        document.getElementById('userLabel').textContent = user.name;
      } else {
        nav.classList.add('hidden');
        bottomnav?.classList.add('hidden');
        userbox.classList.remove('hidden');
      }
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
        <button data-route="classroom-manage">Aula</button>
        <button data-route="classroom-stats">Estadísticas</button>`;
      bottomItems = [
        { route: 'teacher-dashboard', icon: '🏠', label: 'Panel' },
        { route: 'classroom-manage',  icon: '🏫', label: 'Aula' },
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
      sessionStorage.removeItem('tf.loginInProgress');
      go('welcome');
    });
    document.getElementById('legalNavBtn')?.addEventListener('click', () => go('legal'));
    document.getElementById('changeAccountBtn')?.addEventListener('click', async () => {
      await Auth.logout();
      sessionStorage.clear(); // limpia preferencias de sesión para no auto-loguear
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
          Subjects.saveLastSubject(userId, subject);
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

    // Page Visibility API: pausar trabajo no crítico cuando la pestaña está oculta.
    // Ahorra CPU y batería en iPhone/MacBook cuando el usuario cambia de pestaña.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (typeof Connectivity !== 'undefined' && Connectivity.pausePoll) Connectivity.pausePoll();
        if (typeof Tracky      !== 'undefined' && Tracky.suspend)          Tracky.suspend();
      } else {
        if (typeof Connectivity !== 'undefined' && Connectivity.resumePoll) Connectivity.resumePoll();
        if (typeof Tracky       !== 'undefined' && Tracky.resume)           Tracky.resume();
      }
    }, { passive: true });

    // Modo demostración (Fase G): ?demo=1 (docente→Eureka), ?demo=student (dashboard),
    // o ?demo=guided (chat directo). No requiere Supabase ni internet; datos ficticios aislados.
    const _demo = new URLSearchParams(location.search).get('demo');
    if (typeof Demo !== 'undefined' && (_demo === '1' || _demo === 'teacher' || _demo === 'student' || _demo === 'guided')) {
      const mode = _demo === 'guided' ? 'guided' : (_demo === 'student' ? 'student' : 'teacher');
      Demo.activate(mode);
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

    // 1. ¿Hay sesión activa? (persistida desde la última visita)
    const _isAutoLogin = !sessionStorage.getItem('tf.loginInProgress');
    const authSession = await Auth.getSession();
    if (!authSession) return go('welcome');
    sessionStorage.removeItem('tf.loginInProgress'); // consumir el flag

    // Nombre pendiente: si el usuario eligió un nombre manual en el modal de conflicto
    // antes de ser redirigido a Google OAuth, aplicarlo ahora.
    const _pendingDisplay = sessionStorage.getItem('tf.pendingDisplayUpdate');
    if (_pendingDisplay) {
      sessionStorage.removeItem('tf.pendingDisplayUpdate');
      try {
        const { firstName, lastName } = JSON.parse(_pendingDisplay);
        const email = (authSession.user?.email || authSession.session?.user?.email || '').toLowerCase();
        if (email && firstName) {
          await Auth.updateDisplayName(email, firstName, lastName || '');
        }
      } catch (_) {}
    }
    console.log('[App] Auth session:', { isSuperAdmin: authSession.isSuperAdmin, roles: authSession.availableRoles?.map(r => r.role), autoLogin: _isAutoLogin });

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
    const _debouncedRefresh = _debounce(() => go(_current), 300);
    Storage.bindRealtime(() => {
      // Repintar la pantalla actual cuando llegan cambios, EXCEPTO si interrumpiría
      // al usuario (rendimiento + UX): chat IA en curso o un modal/quiz abierto.
      if (!_current || _current === 'welcome' || _current === 'consent' || _current === 'privacy-policy' || _current === 'legal') return;
      if (_current === 'ai-study') return;
      if (document.querySelector('.quiz-modal') || document.querySelector('.pom-modal:not(.hidden)')) return;
      _debouncedRefresh();
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
    console.log('[App] Current user:', { role: user.role });

    // Auto-login: sesión restaurada automáticamente → saludo de bienvenida
    if (_isAutoLogin) {
      const firstName = (user.name || '').split(' ')[0] || 'de nuevo';
      setTimeout(() => UI.flash?.(`Bienvenido de nuevo, ${firstName} 👋`, 'success'), 300);
    }

    // 3. ¿Hay intención de rol pendiente del click pre-OAuth?
    const intent = Auth.getRoleIntent();

    // Uso Personal: mismo usuario, sin escuela asociada → salta onboarding institucional
    const accessType = sessionStorage.getItem('tf.accessType');
    if (accessType === 'personal' && user.role === 'student' && !user.schoolId) {
      if (!user.institutionType) {
        Storage.set(s => {
          if (s.users[user.id]) s.users[user.id].institutionType = 'personal';
        });
      }
      if (!user.parentalConsent) return go('consent');
      return go('dashboard');
    }

    // Director pendiente de validar código de colegio
    if (intent === 'admin' && user.role !== 'super_admin' && !user.schoolId) return go('admin-promote');
    // Director ya validado → ir directo al panel docente
    if (intent === 'admin' && user.role === 'teacher') return go('teacher-dashboard');
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

  // ---- Pantalla de bienvenida rediseñada (institucional) ----
  function screenWelcome() {
    // --- Tarjeta preview del hero (siempre anónima — esta es una página pública) ---
    // IMPORTANTE: nunca leer localStorage aquí. Cualquier visitante vería los datos
    // del propietario del dispositivo. Siempre mostrar contenido genérico/aspiracional.
    const _previewHtml = (() => {
      const DAY = new Date().getDay();
      const DAYS_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
      const dayName = DAYS_ES[DAY].charAt(0).toUpperCase() + DAYS_ES[DAY].slice(1);

      // No leer Storage ni Sessions en la landing page pública.
      const user = null, sessions = [];

      // --- ESTADO: usuario con sesiones guardadas ---
      if (user && sessions.length > 0) {
        const firstName = (user.name || user.firstName || 'tú').split(' ')[0];
        const apro = user.academicProfile || {};
        const uni    = apro.targetUniversity || apro.university || user.university || '';
        const career = apro.targetCareer || apro.career || user.career || '';
        const goal   = (uni || career)
          ? '🎓 ' + [uni, career].filter(Boolean).join(' · ')
          : '🎓 Tu meta universitaria';

        const totalMins = sessions.reduce(function(a, s){ return a + (Number(s.duration)||0); }, 0);
        const totalConc = sessions.reduce(function(a, s){ return a + (Number(s.concentration)||0); }, 0);
        const avgConc   = (totalConc / sessions.length).toFixed(1);
        const hours     = (totalMins / 60).toFixed(1);

        // Racha de días consecutivos
        const daySet = new Set(sessions.map(function(s){
          return new Date(s.date || s.startTime || 0).toDateString();
        }));
        let streak = 0, d = new Date(); d.setHours(0,0,0,0);
        while (daySet.has(d.toDateString())) { streak++; d = new Date(d.getTime() - 86400000); }

        // Materia sugerida: la más frecuente esta semana
        const weekAgo = Date.now() - 7 * 86400000;
        const recentSubs = sessions
          .filter(function(s){ return new Date(s.date||s.startTime||0).getTime() > weekAgo; })
          .map(function(s){ return s.subject; })
          .filter(Boolean);
        const subCount = recentSubs.reduce(function(acc,sub){ acc[sub]=(acc[sub]||0)+1; return acc; }, {});
        const topEntry = Object.entries(subCount).sort(function(a,b){ return b[1]-a[1]; })[0];
        const mission  = (topEntry && topEntry[0]) || (sessions[sessions.length-1]||{}).subject || 'Tu materia principal';

        const pct = Math.min(94, streak * 6 + Math.min(40, sessions.length * 2));

        const AI_TIPS = [
          'La constancia es tu mayor ventaja. Sigue apareciendo.',
          'Cada sesión registrada te acerca más a tu meta.',
          'Tu patrón de estudio mejora semana a semana.',
          'La comprensión profunda llega con la práctica constante.',
          'Un día difícil no borra una semana de progreso.',
          'Ariven detecta tus mejores horas. Confía en el proceso.',
          'Tu futuro se construye con cada sesión de hoy.'
        ];

        return '<div class="lp-preview">'
          + '<div class="lp-prev-topbar">'
          + '<span class="lp-prev-dot lp-prev-dot--r"></span>'
          + '<span class="lp-prev-dot lp-prev-dot--y"></span>'
          + '<span class="lp-prev-dot lp-prev-dot--g"></span>'
          + '<span class="lp-prev-label">Ariven · Panel Personal</span>'
          + '</div>'
          + '<div class="lp-prev-body">'
          + '<div class="lp-prev-hero-row">'
          + '<div>'
          + '<div class="lp-prev-greeting">Hola, ' + firstName + ' 👋</div>'
          + '<div class="lp-prev-goal">' + goal + '</div>'
          + '</div>'
          + '<div class="lp-prev-pct">' + pct + '%</div>'
          + '</div>'
          + '<div class="lp-prev-bar-wrap"><div class="lp-prev-bar" style="width:' + pct + '%"></div></div>'
          + '<div class="lp-prev-mission">'
          + '<div class="lp-prev-mission-label">MISIÓN DEL DÍA</div>'
          + '<div class="lp-prev-mission-sub">' + mission + '</div>'
          + '<div class="lp-prev-mission-reason">Concentración promedio: ' + avgConc + '/5</div>'
          + '<div class="lp-prev-mission-btn">Comenzar a estudiar →</div>'
          + '</div>'
          + '<div class="lp-prev-chips">'
          + '<span class="lp-prev-chip lp-prev-chip--fire">🔥 ' + streak + ' día' + (streak !== 1 ? 's' : '') + '</span>'
          + '<span class="lp-prev-chip lp-prev-chip--time">⏱ ' + hours + 'h</span>'
          + '<span class="lp-prev-chip lp-prev-chip--conc">🧠 ' + avgConc + '/5</span>'
          + '</div>'
          + '<div class="lp-prev-ai">'
          + '<span class="lp-prev-ai-badge">✶ Ariven Intelligence</span>'
          + '<p class="lp-prev-ai-text">' + AI_TIPS[DAY] + '</p>'
          + '</div>'
          + '</div></div>';
      }

      // --- ESTADO: usuario registrado pero sin sesiones aún ---
      if (user) {
        const firstName = (user.name || user.firstName || 'estudiante').split(' ')[0];
        const NEW_TIPS = [
          'La primera sesión es la más importante. Empieza hoy.',
          'Define tu meta y Ariven hará el resto.',
          'El primer paso siempre es el más difícil. Tú ya lo diste.',
          'Una sesión registrada ya te pone por delante de ayer.',
          'Tu concentración mejora cada vez que la practicas.',
          'Los grandes estudiantes empezaron donde tú estás ahora.',
          'El hábito se construye con una sesión a la vez.'
        ];
        return '<div class="lp-preview">'
          + '<div class="lp-prev-topbar">'
          + '<span class="lp-prev-dot lp-prev-dot--r"></span>'
          + '<span class="lp-prev-dot lp-prev-dot--y"></span>'
          + '<span class="lp-prev-dot lp-prev-dot--g"></span>'
          + '<span class="lp-prev-label">Ariven · ' + firstName + '\'s Panel</span>'
          + '</div>'
          + '<div class="lp-prev-body">'
          + '<div class="lp-prev-hero-row">'
          + '<div>'
          + '<div class="lp-prev-greeting">Hola, ' + firstName + ' 👋</div>'
          + '<div class="lp-prev-goal">📍 Listo para empezar</div>'
          + '</div>'
          + '<div class="lp-prev-pct" style="font-size:15px;color:var(--muted)">Día 1</div>'
          + '</div>'
          + '<div class="lp-prev-bar-wrap"><div class="lp-prev-bar" style="width:3%"></div></div>'
          + '<div class="lp-prev-mission">'
          + '<div class="lp-prev-mission-label">PRIMER PASO</div>'
          + '<div class="lp-prev-mission-sub">Tu primera sesión</div>'
          + '<div class="lp-prev-mission-reason">Registra hoy y Ariven empieza a aprender contigo.</div>'
          + '<div class="lp-prev-mission-btn">Iniciar primera sesión →</div>'
          + '</div>'
          + '<div class="lp-prev-chips">'
          + '<span class="lp-prev-chip lp-prev-chip--fire">🔥 Empieza hoy</span>'
          + '<span class="lp-prev-chip lp-prev-chip--time">⏱ 0h</span>'
          + '<span class="lp-prev-chip lp-prev-chip--conc">🧠 Sin límites</span>'
          + '</div>'
          + '<div class="lp-prev-ai">'
          + '<span class="lp-prev-ai-badge">✶ Ariven Intelligence</span>'
          + '<p class="lp-prev-ai-text">' + NEW_TIPS[DAY] + '</p>'
          + '</div>'
          + '</div></div>';
      }

      // --- ESTADO: visitante nuevo (sin cuenta) ---
      const TIPS = [
        'La concentración no se improvisa. Se entrena sesión a sesión.',
        'Estudiar 30 min con foco vale más que 3 horas con distracción.',
        'Tu mejor hora para estudiar es la que descubrirás con Ariven.',
        'Cada sesión registrada es evidencia real de que estás avanzando.',
        'La constancia supera al talento. Empieza hoy.',
        'Un objetivo claro convierte el esfuerzo en progreso medible.',
        'El aprendizaje profundo no es acumulación. Es comprensión.'
      ];
      const AI_INTROS = [
        'La constancia supera al talento. Una sesión a la vez.',
        'Cada sesión registrada es evidencia real de que estás avanzando.',
        'El aprendizaje profundo no es acumulación. Es comprensión.',
        'Tu mejor hora para estudiar es la que descubrirás con Ariven.',
        'No hay dos estudiantes iguales. Ariven se adapta a ti.',
        'El progreso se construye en silencio, sesión a sesión.',
        'El foco no se improvisa. Se entrena.'
      ];
      return '<div class="lp-preview lp-preview--guest">'
        + '<div class="lp-prev-topbar">'
        + '<span class="lp-prev-dot lp-prev-dot--r"></span>'
        + '<span class="lp-prev-dot lp-prev-dot--y"></span>'
        + '<span class="lp-prev-dot lp-prev-dot--g"></span>'
        + '<span class="lp-prev-label">Ariven · Vista previa</span>'
        + '</div>'
        + '<div class="lp-prev-body">'
        + '<div class="lp-prev-hero-row">'
        + '<div>'
        + '<div class="lp-prev-greeting">Hola, futuro estudiante 👋</div>'
        + '<div class="lp-prev-goal">🎓 Tu universidad · Tu carrera</div>'
        + '</div>'
        + '<div class="lp-prev-pct lp-prev-pct--ghost">—%</div>'
        + '</div>'
        + '<div class="lp-prev-bar-wrap lp-prev-bar-wrap--ghost">'
        + '<div class="lp-prev-bar lp-prev-bar--ghost" style="width:0%"></div>'
        + '</div>'
        + '<div class="lp-prev-mission">'
        + '<div class="lp-prev-mission-label">CONSEJO DEL ' + dayName.toUpperCase() + '</div>'
        + '<div class="lp-prev-tip-text">' + TIPS[DAY] + '</div>'
        + '</div>'
        + '<div class="lp-prev-chips">'
        + '<span class="lp-prev-chip lp-prev-chip--fire lp-prev-chip--ghost">🔥 Tu racha</span>'
        + '<span class="lp-prev-chip lp-prev-chip--time lp-prev-chip--ghost">⏱ Tu tiempo</span>'
        + '<span class="lp-prev-chip lp-prev-chip--conc lp-prev-chip--ghost">🧠 Tu foco</span>'
        + '</div>'
        + '<div class="lp-prev-ai">'
        + '<span class="lp-prev-ai-badge">✶ Ariven Intelligence</span>'
        + '<p class="lp-prev-ai-text">' + AI_INTROS[DAY] + '</p>'
        + '</div>'
        + '</div></div>';
    })();

    return `
    <div class="lp">
      <div class="lp-glow lp-glow-1"></div>
      <div class="lp-glow lp-glow-2"></div>
      <div class="lp-glow lp-glow-3"></div>

      <!-- ── HEADER ── -->
      <header class="lp-header">
        <div class="lp-brand">
          <img src="assets/logo.svg" class="lp-brand-img" alt="Ariven">
          <span>Ariven</span>
        </div>
        <nav class="lp-nav" aria-label="Navegación principal">
          <a class="lp-nav-link" href="#lpSolutions">Soluciones</a>
          <a class="lp-nav-link" href="#lpHow">Cómo funciona</a>
          <a class="lp-nav-link" href="#lpEcosystem">Instituciones</a>
        </nav>
        <div class="lp-header-actions">
          <button class="lp-header-btn" id="lpScrollCards">Iniciar sesión</button>
          <button class="lp-header-btn lp-header-btn--primary" id="lpScrollCards2">Probar Ariven</button>
        </div>
      </header>

      <!-- ── HERO ── -->
      <section class="lp-hero-split">
        <div class="lp-hero-left">
          <div class="lp-pill">
            <span class="lp-pill-dot"></span>
            Plataforma educativa con IA · Perú
          </div>
          <h1 class="lp-hero-title">No estudies más.<br><span class="lp-hero-title-accent">Estudia mejor.</span></h1>
          <p class="lp-hero-sub">Ariven convierte cada hora de estudio en evidencia real de aprendizaje mediante inteligencia artificial, ayudándote a demostrar que realmente estás avanzando.</p>
          <div class="lp-hero-actions">
            <button class="lp-btn-main" id="lpHeroCta">Probar Ariven</button>
            <a href="?demo=1" class="lp-btn-ghost-main">🎯 Ver demostración</a>
          </div>
        </div>
        <div class="lp-hero-right" aria-hidden="true">
          ${_previewHtml}
        </div>
      </section>

      <!-- ── PROBLEMA ── -->
      <section class="lp-section lp-prob-section" id="lpSolutions">
        <div class="lp-section-label">El problema</div>
        <h2 class="lp-section-title">Estudiar duro no siempre significa aprender.</h2>
        <p class="lp-section-sub">Cada perfil enfrenta su propio obstáculo. Ariven los resuelve a todos.</p>
        <div class="lp-prob-grid">
          <div class="lp-prob-card">
            <div class="lp-prob-tag lp-prob-tag--gold">Uso Personal</div>
            <div class="lp-prob-icon">🎯</div>
            <h4>Sin ruta hacia la universidad</h4>
            <p>Estudias solo y no sabes si lo que haces te acerca realmente a la carrera que quieres.</p>
          </div>
          <div class="lp-prob-card">
            <div class="lp-prob-tag lp-prob-tag--blue">Estudiante</div>
            <div class="lp-prob-icon">📚</div>
            <h4>Horas de estudio sin evidencia</h4>
            <p>Estudias durante horas pero no puedes demostrar cuánto avanzas ni en qué fallaste.</p>
          </div>
          <div class="lp-prob-card">
            <div class="lp-prob-tag lp-prob-tag--purple">Docente</div>
            <div class="lp-prob-icon">👥</div>
            <h4>Imposible acompañar a todos</h4>
            <p>Con 30 estudiantes en el aula, detectar quién necesita ayuda antes del examen es muy difícil.</p>
          </div>
          <div class="lp-prob-card">
            <div class="lp-prob-tag lp-prob-tag--green">Director</div>
            <div class="lp-prob-icon">📊</div>
            <h4>Cero evidencia de impacto</h4>
            <p>Los informes llegan tarde y no reflejan lo que realmente pasa en el aprendizaje diario.</p>
          </div>
        </div>
      </section>

      <!-- ── SOLUCIÓN EN 3 PASOS ── -->
      <section class="lp-section lp-steps-section" id="lpHow">
        <div class="lp-section-label">La solución</div>
        <h2 class="lp-section-title">Ariven transforma cómo aprendes en 3 pasos simples.</h2>
        <div class="lp-steps-v2">
          <div class="lp-step-v2">
            <div class="lp-step-v2-num">1</div>
            <div class="lp-step-v2-icon">🎯</div>
            <h4>Define tu meta</h4>
            <p>Universidad, curso o objetivo institucional. Ariven construye tu ruta desde el primer día.</p>
            <div class="lp-step-v2-chips">
              <span>🎓 Universidad</span><span>📐 Carrera</span><span>🏫 Institución</span>
            </div>
          </div>
          <div class="lp-step-v2-arrow">→</div>
          <div class="lp-step-v2">
            <div class="lp-step-v2-num">2</div>
            <div class="lp-step-v2-icon">🧠</div>
            <h4>Estudia con acompañamiento inteligente</h4>
            <p>La IA analiza tu sesión en tiempo real, genera preguntas personalizadas y detecta tus hábitos.</p>
            <div class="lp-step-v2-chips">
              <span>🤖 IA Mentor</span><span>⏱ Pomodoro</span><span>📈 Hábitos</span>
            </div>
          </div>
          <div class="lp-step-v2-arrow">→</div>
          <div class="lp-step-v2">
            <div class="lp-step-v2-num">3</div>
            <div class="lp-step-v2-icon">🏆</div>
            <h4>Demuestra tu progreso</h4>
            <p>Genera reportes con evidencia real: sesiones, concentración, comprensión y constancia.</p>
            <div class="lp-step-v2-chips">
              <span>📄 PDF</span><span>🔥 Rachas</span><span>💎 XP</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── ECOSISTEMA ── -->
      <section class="lp-section lp-ecosystem" id="lpEcosystem">
        <div class="lp-section-label">Un solo ecosistema</div>
        <h2 class="lp-section-title">Ariven acompaña a todos en el proceso educativo.</h2>
        <p class="lp-section-sub">No es una app para un perfil. Es una plataforma para todo el ecosistema.</p>
        <div class="lp-eco-grid">
          <div class="lp-eco-card lp-eco-card--gold">
            <div class="lp-eco-icon">🎯</div>
            <div class="lp-eco-label">Uso Personal</div>
            <p>Prepárate para la universidad a tu ritmo, con IA como mentor.</p>
          </div>
          <div class="lp-eco-card lp-eco-card--blue">
            <div class="lp-eco-icon">🎓</div>
            <div class="lp-eco-label">Estudiante</div>
            <p>Estudia con enfoque, mide tu comprensión y demuestra tu avance.</p>
          </div>
          <div class="lp-eco-card lp-eco-card--purple">
            <div class="lp-eco-icon">👩‍🏫</div>
            <div class="lp-eco-label">Docente</div>
            <p>Monitorea tu aula, detecta riesgos y acompaña individualmente.</p>
          </div>
          <div class="lp-eco-card lp-eco-card--green">
            <div class="lp-eco-icon">🏫</div>
            <div class="lp-eco-label">Director</div>
            <p>Evidencia del impacto educativo en tiempo real, sin esperar informes.</p>
          </div>
        </div>
      </section>

      <!-- ── DIFERENCIADOR ── -->
      <section class="lp-section lp-differ">
        <div class="lp-section-label">La diferencia</div>
        <h2 class="lp-section-title">Lo que no se mide, no se puede mejorar.</h2>
        <p class="lp-section-sub">Ariven no mide solo cuánto tiempo estudias. Mide evidencia real de aprendizaje.</p>
        <div class="lp-differ-grid">
          <div class="lp-differ-item">
            <div class="lp-differ-icon">⏱</div>
            <div class="lp-differ-name">Hábitos</div>
            <div class="lp-differ-desc">Rachas, frecuencia y horario óptimo detectado por la IA.</div>
          </div>
          <div class="lp-differ-item">
            <div class="lp-differ-icon">🧠</div>
            <div class="lp-differ-name">Comprensión</div>
            <div class="lp-differ-desc">Evaluaciones DECO que miden profundidad real, no memorización.</div>
          </div>
          <div class="lp-differ-item">
            <div class="lp-differ-icon">🎯</div>
            <div class="lp-differ-name">Concentración</div>
            <div class="lp-differ-desc">Métrica por sesión para saber cuándo y cómo estudias mejor.</div>
          </div>
          <div class="lp-differ-item">
            <div class="lp-differ-icon">📈</div>
            <div class="lp-differ-name">Constancia</div>
            <div class="lp-differ-desc">Progreso semanal visible que construye motivación real.</div>
          </div>
          <div class="lp-differ-item">
            <div class="lp-differ-icon">🏆</div>
            <div class="lp-differ-name">Preparación</div>
            <div class="lp-differ-desc">Porcentaje de avance hacia tu meta universitaria o académica.</div>
          </div>
        </div>
      </section>

      <!-- ── WIZARD DE ACCESO (inalterado — wireWelcome() lo llena) ── -->
      <section class="lp-section lp-roles-section" id="lpRolesSection">
        <div id="lpAccessWizard"></div>
        <div id="authForm" class="lp-form-wrap hidden"></div>
      </section>

      <!-- ── CTA FINAL ── -->
      <section class="lp-section lp-cta-v2">
        <div class="lp-cta-v2-inner">
          <p class="lp-cta-v2-lead">Tu futuro no se construye en un solo día.</p>
          <h2 class="lp-cta-v2-title">Se construye <span class="lp-cta-v2-accent">hoy.</span></h2>
          <p class="lp-cta-v2-sub">Empieza a demostrar tu progreso desde tu próxima sesión de estudio.</p>
          <button class="lp-btn-main lp-btn-main--lg" id="lpCtaFinal">Comenzar</button>
        </div>
      </section>

      <footer class="lp-footer">
        <span>© 2026 Ariven</span>
        <span class="lp-footer-sep">·</span>
        <span>Datos sincronizados de forma segura en la nube</span>
      </footer>
    </div>`;
  }

  // ── Wizard de acceso ─────────────────────────────────────────────────────
  // Genera cada paso del wizard reutilizando EXACTAMENTE las mismas clases CSS
  // de las cards originales. Sin CSS nuevo para los cards.

  function _wizardStep0() {
    const svgPersonal = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 10-16 0"/></svg>`;
    const svgInst     = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>`;
    const svgArrow    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    return `
      <div class="lp-section-label">Elige tu acceso</div>
      <h2 class="lp-section-title">¿Cómo utilizarás Ariven?</h2>
      <p class="lp-wizard-sub">Elige la experiencia que mejor se adapte a tu forma de aprender o gestionar el aprendizaje.</p>
      <div class="lp-cards lp-cards--2col">
        <div class="lp-card lp-card--gold" data-access="personal">
          <div class="lp-icon-ring">${svgPersonal}</div>
          <h3>USO PERSONAL</h3>
          <p>Estudia a tu ritmo, desarrolla hábitos y mejora tu comprensión.</p>
          <div class="lp-card-foot">
            <span style="font-size:12px;color:#52525B;">Continuar →</span>
            <button class="lp-arrow-btn" tabindex="-1">${svgArrow}</button>
          </div>
        </div>
        <div class="lp-card lp-card--blue" data-access="institutional">
          <div class="lp-icon-ring">${svgInst}</div>
          <h3>USO INSTITUCIONAL</h3>
          <p>Gestiona estudiantes, aulas y el progreso académico.</p>
          <div class="lp-card-foot">
            <span style="font-size:12px;color:#52525B;">Continuar →</span>
            <button class="lp-arrow-btn" tabindex="-1">${svgArrow}</button>
          </div>
        </div>
      </div>`;
  }

  function _wizardStep2B() {
    const svgStudent = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
    const svgTeacher = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`;
    const svgAdmin   = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    const svgArrow   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    return `
      <button class="lp-wizard-back" id="lpWizardBack">← Volver</button>
      <div class="lp-section-label">Uso Institucional</div>
      <h2 class="lp-section-title">¿Quién eres en tu institución?</h2>
      <p class="lp-wizard-sub">Selecciona el rol con el que ingresarás hoy.</p>
      <div class="lp-cards">
        <div class="lp-card lp-card--gold" data-role="student">
          <div class="lp-icon-ring">${svgStudent}</div>
          <h3>ESTUDIANTE</h3>
          <p>Aprende, practica y mejora tu comprensión con orientación paso a paso.</p>
          <div class="lp-card-foot">
            <span style="font-size:12px;color:#52525B;">Solo Gmail</span>
            <button class="lp-arrow-btn" tabindex="-1">${svgArrow}</button>
          </div>
        </div>
        <div class="lp-card lp-card--purple" data-role="teacher">
          <div class="lp-icon-ring">${svgTeacher}</div>
          <h3>PROFESOR</h3>
          <p>Monitorea aulas, detecta riesgos y acompaña el aprendizaje.</p>
          <div class="lp-card-foot">
            <span style="font-size:12px;color:#52525B;">Requiere código</span>
            <button class="lp-arrow-btn" tabindex="-1">${svgArrow}</button>
          </div>
        </div>
        <div class="lp-card lp-card--blue" data-role="admin">
          <div class="lp-icon-ring">${svgAdmin}</div>
          <h3>DIRECTOR</h3>
          <p>Gestiona el rendimiento institucional desde un solo lugar.</p>
          <div class="lp-card-foot">
            <span style="font-size:12px;color:#52525B;">Acceso restringido</span>
            <button class="lp-arrow-btn" tabindex="-1">${svgArrow}</button>
          </div>
        </div>
      </div>`;
  }

  function wireWelcome() {
    const wizard = root().querySelector('#lpAccessWizard');
    const authForm = root().querySelector('#authForm');

    // Función para renderizar un paso en el wizard y reconectar eventos
    function renderStep(html) {
      wizard.innerHTML = html;
      wireWizardStep();
    }

    function wireWizardStep() {
      // Botón volver → regresa al paso 0
      wizard.querySelector('#lpWizardBack')?.addEventListener('click', () => {
        authForm.classList.add('hidden');
        renderStep(_wizardStep0());
        root().querySelector('#lpRolesSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      // Click en tarjeta de acceso (paso 0):
      // Personal → login directo como 'student' (sin paso intermedio)
      // Institucional → paso 2B con selección de rol
      wizard.querySelectorAll('.lp-card[data-access]').forEach(card => {
        card.addEventListener('click', () => {
          authForm.classList.add('hidden');
          if (card.dataset.access === 'personal') {
            sessionStorage.setItem('tf.accessType', 'personal');
            renderAuthForm('student');
            root().querySelector('#lpRolesSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            sessionStorage.setItem('tf.accessType', 'institutional');
            renderStep(_wizardStep2B());
            root().querySelector('#lpRolesSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });

      // Click en tarjeta de rol (paso 2A o 2B) → mostrar formulario de acceso
      wizard.querySelectorAll('.lp-card[data-role]').forEach(card => {
        card.addEventListener('click', () => {
          wizard.querySelectorAll('.lp-card[data-role]').forEach(c => c.classList.remove('lp-selected'));
          card.classList.add('lp-selected');
          renderAuthForm(card.dataset.role);
        });
      });
    }

    // Renderizar paso inicial
    renderStep(_wizardStep0());

    // Botones del hero que scrollean a la sección de acceso
    ['lpScrollCards', 'lpScrollCards2', 'lpHeroCta', 'lpHeroHow', 'lpCtaFinal'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        root().querySelector('#lpRolesSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    // Botón "Gestionar mi institución" de la sección institucional
    root().querySelector('.lp-btn-inst[data-role="admin"]')?.addEventListener('click', () => {
      authForm.classList.add('hidden');
      renderStep(_wizardStep2B());
      root().querySelector('#lpRolesSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Auto-seleccionar la card de admin
      setTimeout(() => {
        const adminCard = wizard.querySelector('.lp-card[data-role="admin"]');
        adminCard?.click();
      }, 50);
    });

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

  // Modal de conflicto de nombre: Escenario B (Google primero, luego intento manual)
  // existingName: nombre actual en el perfil (de Google)
  // newName: nombre que el usuario ingresó en el formulario
  // email: correo del usuario
  // role: rol seleccionado en el wizard
  function _showNameConflictModal(existingName, newName, email, role) {
    // Parsear el nombre nuevo en first/last para poder guardarlo después
    const newParts     = (newName || '').trim().split(' ');
    const newFirstName = newParts[0] || '';
    const newLastName  = newParts.slice(1).join(' ') || '';

    // Crear overlay del modal
    const overlay = document.createElement('div');
    overlay.id = 'tfNameConflictOverlay';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;
      align-items:center;justify-content:center;z-index:9999;padding:16px;`;

    overlay.innerHTML = `
      <div style="background:var(--card-bg,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));
                  border-radius:16px;padding:28px;max-width:440px;width:100%;">
        <h3 style="margin:0 0 8px;font-size:18px;">Ya tienes una cuenta</h3>
        <p style="margin:0 0 20px;color:var(--muted-2,#71717a);font-size:14px;line-height:1.5;">
          El correo <strong>${email}</strong> ya está registrado con Google.<br>
          ¿Cómo quieres que te llamemos en Ariven?
        </p>

        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
          <label style="display:flex;align-items:center;gap:10px;padding:12px 14px;
                        border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;
                        cursor:pointer;font-size:14px;" id="tfNameOptExisting">
            <input type="radio" name="tfNameChoice" value="existing" checked style="accent-color:var(--accent,#a78bfa);" />
            <span>Mantener: <strong>${existingName || 'nombre de Google'}</strong></span>
          </label>
          ${newName ? `
          <label style="display:flex;align-items:center;gap:10px;padding:12px 14px;
                        border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;
                        cursor:pointer;font-size:14px;" id="tfNameOptNew">
            <input type="radio" name="tfNameChoice" value="new" style="accent-color:var(--accent,#a78bfa);" />
            <span>Actualizar a: <strong>${newName}</strong></span>
          </label>` : ''}
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <button id="tfNameConflictContinue" style="
            display:flex;align-items:center;justify-content:center;gap:10px;
            padding:12px 20px;border-radius:10px;border:none;cursor:pointer;
            background:rgba(255,255,255,0.08);color:inherit;font-size:14px;font-weight:500;">
            ${GOOGLE_SVG} <span>Continuar con Google</span>
          </button>
          <button id="tfNameConflictCancel" style="
            background:none;border:none;color:var(--muted-2,#71717a);
            cursor:pointer;font-size:13px;padding:8px;">
            Cancelar
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    document.getElementById('tfNameConflictContinue').addEventListener('click', async () => {
      const choice = overlay.querySelector('input[name="tfNameChoice"]:checked')?.value;
      if (choice === 'new' && newFirstName) {
        // Guardar la elección: se aplicará en App.start() después del redirect OAuth
        sessionStorage.setItem('tf.pendingDisplayUpdate', JSON.stringify({
          firstName: newFirstName,
          lastName:  newLastName
        }));
      }
      overlay.remove();
      // Autenticar con Google (la cuenta ya existe ahí)
      sessionStorage.setItem('tf.loginInProgress', '1');
      sessionStorage.setItem('tf.accessType', role === 'student'
        ? (sessionStorage.getItem('tf.accessType') || 'institutional')
        : 'institutional');
      try {
        await Auth.signInWithGoogle(role);
      } catch (err) {
        UI.flash(err.message || 'No se pudo iniciar Google.', 'error');
      }
    });

    document.getElementById('tfNameConflictCancel').addEventListener('click', () => {
      overlay.remove();
    });

    // Resaltar el label seleccionado al cambiar radio
    const continueBtn = document.getElementById('tfNameConflictContinue');
    overlay.querySelectorAll('input[name="tfNameChoice"]').forEach(radio => {
      radio.addEventListener('change', () => {
        overlay.querySelectorAll('label[id^="tfNameOpt"]').forEach(l => l.style.borderColor = '');
        if (radio.checked) {
          radio.closest('label').style.borderColor = 'var(--accent,#a78bfa)';
        }
      });
    });
    // Resaltar el default
    const checkedRadio = overlay.querySelector('input[name="tfNameChoice"]:checked');
    if (checkedRadio) checkedRadio.closest('label').style.borderColor = 'var(--accent,#a78bfa)';
  }

  function renderAuthForm(role) {
    const container = document.getElementById('authForm');
    if (!container) return;

    container.classList.remove('hidden', 'lp-form--purple', 'lp-form--blue');

    const cfg = {
      student: { cls: 'lp-form-emoji--gold',   emoji: '🎒', title: 'Comenzar a estudiar',
                 subtitle: 'Crea tu cuenta o inicia sesión para empezar.',
                 btnCls: '' },
      teacher: { cls: 'lp-form-emoji--purple', emoji: '👩‍🏫', title: 'Entrar como Profesor',
                 subtitle: 'Necesitarás el código de tu colegio para acceder. El código de aula es opcional.',
                 btnCls: 'lp-btn-submit--purple' },
      admin:   { cls: 'lp-form-emoji--blue',   emoji: '🏫', title: 'Acceso Director',
                 subtitle: 'Necesitarás el código de tu institución al ingresar.',
                 btnCls: 'lp-btn-submit--blue' }
    }[role];

    if (!cfg) return;
    if (role === 'teacher') container.classList.add('lp-form--purple');
    if (role === 'admin')   container.classList.add('lp-form--blue');

    const calSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

    container.innerHTML = `
      <div class="lp-form-head">
        <div class="lp-form-emoji ${cfg.cls}">${cfg.emoji}</div>
        <div class="lp-form-head-text">
          <h2>${cfg.title}</h2>
          <p>${cfg.subtitle}</p>
        </div>
      </div>

      <form id="emailAuthForm" autocomplete="on" novalidate>
        <div class="lp-fields-row">
          ${_lpField('Nombres', _lpInput('user', 'name="firstName" autocomplete="given-name" placeholder="Tus nombres"'))}
          ${_lpField('Apellidos', _lpInput('user', 'name="lastName" autocomplete="family-name" placeholder="Tus apellidos"'))}
        </div>
        ${_lpField('Correo electrónico', _lpInput('mail', 'type="email" name="email" autocomplete="email" placeholder="tucorreo@gmail.com" required'))}
        ${_lpField('Contraseña', _lpInput('lock', 'type="password" name="password" autocomplete="current-password" placeholder="Mínimo 6 caracteres" required minlength="6"'))}
        ${_lpField('Confirmar contraseña', _lpInput('lock', 'type="password" name="confirmPassword" autocomplete="new-password" placeholder="Repite tu contraseña" required'))}
        ${_lpField('Fecha de nacimiento',
          `<div class="lp-input-row"><span class="lp-input-ico">${calSvg}</span><input type="date" name="birthdate" style="padding-left:40px;" /></div>`,
          'opcional')}
        <button class="lp-btn-submit ${cfg.btnCls}" type="submit" id="emailAuthBtn">
          Crear cuenta / Ingresar ${_svgIco.arrow}
        </button>
      </form>

      <div class="lp-or-sep"><span>o</span></div>

      <button class="lp-btn-google" type="button" id="googleSignInBtn">
        ${GOOGLE_SVG}
        <span>Continuar con Google</span>
      </button>
      <p class="lp-form-foot">Al continuar aceptas que tus datos se sincronicen de forma segura en la nube.</p>
    `;

    // Formulario email/contraseña
    document.getElementById('emailAuthForm').addEventListener('submit', async e => {
      e.preventDefault();
      const fd       = new FormData(e.target);
      const email    = (fd.get('email') || '').trim();
      const password = fd.get('password') || '';
      const confirm  = fd.get('confirmPassword') || '';
      const nombre   = `${(fd.get('firstName') || '').trim()} ${(fd.get('lastName') || '').trim()}`.trim();
      const birth    = fd.get('birthdate') || '';

      if (!email || !password) { UI.flash('Ingresa tu correo y contraseña.', 'error'); return; }
      if (password.length < 6) { UI.flash('La contraseña debe tener al menos 6 caracteres.', 'error'); return; }
      if (password !== confirm) { UI.flash('Las contraseñas no coinciden.', 'error'); return; }

      const btn = document.getElementById('emailAuthBtn');
      btn.disabled = true;
      btn.innerHTML = 'Ingresando…';

      try {
        sessionStorage.setItem('tf.accessType', role === 'student'
          ? (sessionStorage.getItem('tf.accessType') || 'institutional')
          : 'institutional');
        sessionStorage.setItem('tf.loginInProgress', '1');

        await Auth.signInOrRegisterWithEmail(email, password, nombre, birth, role);
        // Recargar para que App.start() arranque limpio (igual que el flujo OAuth)
        window.location.reload();
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `Crear cuenta / Ingresar ${_svgIco.arrow}`;

        // Escenario B: el correo ya existe con Google → mostrar modal de elección de nombre
        if (err.type === 'name_conflict') {
          _showNameConflictModal(err.existingName, nombre, email, role);
          return;
        }

        UI.flash(err.message || 'Error de autenticación. Inténtalo de nuevo.', 'error');
      }
    });

    // Google OAuth
    document.getElementById('googleSignInBtn').addEventListener('click', async () => {
      sessionStorage.setItem('tf.accessType', role === 'student'
        ? (sessionStorage.getItem('tf.accessType') || 'institutional')
        : 'institutional');
      sessionStorage.setItem('tf.loginInProgress', '1');
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
          <p><strong>¿Qué datos registra Ariven?</strong></p>
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
            <span>Confirmo que mi padre, madre o tutor leyó esta información y <strong>autoriza</strong> mi uso de Ariven y el registro de estos datos.</span>
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

  // ---- Pantalla: Aceptación obligatoria de documentos legales (PP + T&C) ----
  function screenPrivacyPolicy() {
    const u = Roles.current();
    const nombre = u?.name ? u.name.split(' ')[0] : '';
    const ppOk  = !!u?.privacyPolicyAcceptedAt;
    const tcOk  = !!u?.termsAcceptedAt;
    const dtOk  = !!u?.transparencyAcceptedAt;
    return `
      <div class="card" style="max-width:700px;margin:20px auto;padding:0;">
        <div style="padding:20px;border-bottom:1px solid rgba(255,255,255,0.1);position:sticky;top:0;background:var(--card-bg,#1a1a2e);z-index:1;">
          <h2 style="margin:0;">Documentos legales — Ariven</h2>
          <p class="muted" style="margin:8px 0 0;">Hola${nombre ? ', ' + nombre : ''}. Antes de continuar debes leer y aceptar los siguientes documentos.</p>
        </div>
        <div id="legalAcceptContent" style="max-height:420px;overflow-y:auto;padding:20px;font-size:14px;line-height:1.7;">

          <div style="border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:16px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <span style="font-size:22px;">🔒</span>
              <strong style="font-size:15px;">Política de Privacidad</strong>
            </div>
            <p style="margin:0 0 10px;color:var(--muted);">Cómo recopilamos, usamos y protegemos tus datos personales (correo, sesiones de estudio, gamificación). Incluye el uso de Google Gemini como tutor de IA y tus derechos ARCO conforme a la Ley N.° 29733 del Perú.</p>
            <a href="privacy.html" target="_blank" style="font-size:13px;font-weight:600;color:var(--accent,#6c63ff);text-decoration:none;">Leer política completa →</a>
          </div>

          <div style="border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:16px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <span style="font-size:22px;">📋</span>
              <strong style="font-size:15px;">Términos y Condiciones</strong>
            </div>
            <p style="margin:0 0 10px;color:var(--muted);">Reglas de uso, limitaciones de responsabilidad académica (Ariven no garantiza calificaciones, admisiones ni becas), uso adecuado de la IA, propiedad intelectual y condiciones de la plataforma. Actualmente gratuita; sin pagos activos.</p>
            <a href="terms.html" target="_blank" style="font-size:13px;font-weight:600;color:var(--accent,#6c63ff);text-decoration:none;">Leer términos completos →</a>
          </div>

          <div style="border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:16px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <span style="font-size:22px;">📊</span>
              <strong style="font-size:15px;">Cumplimiento y Transparencia de Datos</strong>
            </div>
            <p style="margin:0 0 10px;color:var(--muted);">Qué datos recopilamos, qué NO recopilamos, cómo los protegemos, cómo funciona la IA con tus datos y cuáles son tus derechos. Explicado en lenguaje simple.</p>
            <a href="data-transparency.html" target="_blank" style="font-size:13px;font-weight:600;color:var(--accent,#6c63ff);text-decoration:none;">Leer documento completo →</a>
          </div>

        </div>
        <div style="padding:20px;border-top:1px solid rgba(255,255,255,0.1);">
          <form id="legalAcceptForm">
            <label class="consent-check" style="margin-bottom:14px;display:flex;align-items:flex-start;gap:10px;">
              <input type="checkbox" id="checkPP" ${ppOk ? 'checked' : ''} style="margin-top:3px;flex-shrink:0;">
              <span>He leído y acepto la <strong>Política de Privacidad</strong> de Ariven</span>
            </label>
            <label class="consent-check" style="margin-bottom:14px;display:flex;align-items:flex-start;gap:10px;">
              <input type="checkbox" id="checkTC" ${tcOk ? 'checked' : ''} style="margin-top:3px;flex-shrink:0;">
              <span>He leído y acepto los <strong>Términos y Condiciones</strong> de Ariven</span>
            </label>
            <label class="consent-check" style="margin-bottom:20px;display:flex;align-items:flex-start;gap:10px;">
              <input type="checkbox" id="checkDT" ${dtOk ? 'checked' : ''} style="margin-top:3px;flex-shrink:0;">
              <span>He leído y acepto el documento de <strong>Cumplimiento y Transparencia de Datos</strong> de Ariven</span>
            </label>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="primary" type="submit">Aceptar y continuar</button>
              <button class="ghost" type="button" id="legalDeclineBtn">Rechazar y salir</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  function wirePrivacyPolicy() {
    document.getElementById('legalAcceptForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ppChecked = document.getElementById('checkPP')?.checked;
      const tcChecked = document.getElementById('checkTC')?.checked;
      const dtChecked = document.getElementById('checkDT')?.checked;
      if (!ppChecked || !tcChecked || !dtChecked) {
        UI.flash('Debes aceptar los tres documentos para continuar.', 'error');
        return;
      }
      const u = Roles.current();
      if (!u) return go('welcome');
      const now = new Date().toISOString();
      Storage.set(st => {
        if (st.users[u.id]) {
          st.users[u.id].privacyPolicyAcceptedAt = st.users[u.id].privacyPolicyAcceptedAt || now;
          st.users[u.id].termsAcceptedAt         = st.users[u.id].termsAcceptedAt         || now;
          st.users[u.id].transparencyAcceptedAt  = st.users[u.id].transparencyAcceptedAt  || now;
        }
      });
      try { await Storage.flush(); } catch (_) {}
      UI.flash('¡Gracias! Documentos aceptados.', 'success');
      if (u.role === 'super_admin') return go('admin-dashboard');
      if (u.role === 'teacher')     return go('teacher-dashboard');
      return go('dashboard');
    });

    document.getElementById('legalDeclineBtn')?.addEventListener('click', async () => {
      if (window.confirm('Si rechazas los documentos legales, no podrás usar Ariven. ¿Deseas salir?')) {
        await Auth.logout();
        go('welcome');
      }
    });
  }

  // ---- Pantalla: Centro Legal (Política de Privacidad + T&C + Cumplimiento) ----
  function screenLegal() {
    const u = Roles.current();
    const nombre = u?.name ? u.name.split(' ')[0] : '';
    return `
      <div style="max-width:680px;margin:32px auto;padding:0 16px;">
        <div style="margin-bottom:24px;">
          <h2 style="margin:0 0 6px;">Centro Legal</h2>
          <p class="muted" style="margin:0;">${nombre ? 'Hola, ' + nombre + '. Aquí' : 'Aquí'} encontrarás los documentos legales de Ariven.</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px;">

          <div class="card" style="padding:24px;cursor:pointer;transition:transform .15s,box-shadow .15s;" id="legalCardPP"
               onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.18)'"
               onmouseleave="this.style.transform='';this.style.boxShadow=''"
               role="button" tabindex="0" aria-label="Ver Política de Privacidad">
            <div style="font-size:36px;margin-bottom:12px;">🔒</div>
            <h3 style="margin:0 0 8px;font-size:16px;">Política de Privacidad</h3>
            <p class="muted" style="font-size:13px;margin:0 0 16px;line-height:1.5;">Cómo recopilamos, usamos y protegemos tus datos personales. Incluye tus derechos ARCO y el uso de IA.</p>
            <span style="font-size:13px;font-weight:600;color:var(--accent,#6c63ff);">Ver política →</span>
          </div>

          <div class="card" style="padding:24px;cursor:pointer;transition:transform .15s,box-shadow .15s;" id="legalCardTC"
               onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.18)'"
               onmouseleave="this.style.transform='';this.style.boxShadow=''"
               role="button" tabindex="0" aria-label="Ver Términos y Condiciones">
            <div style="font-size:36px;margin-bottom:12px;">📋</div>
            <h3 style="margin:0 0 8px;font-size:16px;">Términos y Condiciones</h3>
            <p class="muted" style="font-size:13px;margin:0 0 16px;line-height:1.5;">Reglas de uso, limitaciones de responsabilidad, propiedad intelectual y futuras funciones de pago.</p>
            <span style="font-size:13px;font-weight:600;color:var(--accent,#6c63ff);">Ver términos →</span>
          </div>

          <div class="card" style="padding:24px;cursor:pointer;transition:transform .15s,box-shadow .15s;" id="legalCardDT"
               onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.18)'"
               onmouseleave="this.style.transform='';this.style.boxShadow=''"
               role="button" tabindex="0" aria-label="Ver Cumplimiento y Transparencia de Datos">
            <div style="font-size:36px;margin-bottom:12px;">🛡️</div>
            <h3 style="margin:0 0 8px;font-size:16px;">Cumplimiento y Transparencia de Datos</h3>
            <p class="muted" style="font-size:13px;margin:0 0 16px;line-height:1.5;">Qué datos recopilamos, qué no recopilamos, cómo los protegemos y cómo funciona la IA con tus datos.</p>
            <span style="font-size:13px;font-weight:600;color:var(--accent,#6c63ff);">Ver transparencia →</span>
          </div>

        </div>
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;" class="muted">
          Vigencia: 24/06/2026 &nbsp;·&nbsp; Responsable: Slater Quevedo &nbsp;·&nbsp; Contacto: trackfocus.support@gmail.com
        </div>
        <button class="ghost" id="legalBackBtn" style="margin-top:16px;">← Volver</button>
      </div>
      <style>
        @media (max-width: 520px) {
          #legalCardPP, #legalCardTC, #legalCardDT { grid-column: 1 / -1; }
        }
      </style>`;
  }

  function wireLegal() {
    const _open = (url) => window.open(url, '_blank');
    const _kbOpen = (el, url) => {
      el?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _open(url); } });
    };

    const pp = document.getElementById('legalCardPP');
    const tc = document.getElementById('legalCardTC');
    const dt = document.getElementById('legalCardDT');

    pp?.addEventListener('click', () => _open('privacy.html'));
    tc?.addEventListener('click', () => _open('terms.html'));
    dt?.addEventListener('click', () => _open('data-transparency.html'));

    _kbOpen(pp, 'privacy.html');
    _kbOpen(tc, 'terms.html');
    _kbOpen(dt, 'data-transparency.html');

    document.getElementById('legalBackBtn')?.addEventListener('click', () => {
      const u = Roles.current();
      if (!u) return go('welcome');
      if (u.role === 'super_admin') return go('admin-dashboard');
      if (u.role === 'teacher')     return go('teacher-dashboard');
      return go('profile');
    });
  }

  // ---- Pantalla para promover a docente (post-Google) ----
  function screenTeacherPromote() {
    return `
      <div class="card" style="max-width:520px;margin:48px auto;">
        <h2 style="margin:0 0 8px;">Verificación de docente</h2>
        <p class="muted" style="margin:0 0 22px;">Ingresa el código del colegio que te dio el administrador. Si ya tienes un código de aula, también puedes ingresarlo ahora.</p>
        <form id="teacherPromoteForm">
          <label>Código del colegio</label>
          <input name="code" maxlength="6" required placeholder="6 caracteres" style="text-transform:uppercase;" />
          <label style="margin-top:14px;">Código del aula <span class="muted" style="font-size:12px;">(opcional)</span></label>
          <input name="inviteCode" maxlength="8" placeholder="8 caracteres" style="text-transform:uppercase;" />
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
        // Vinculación opcional al aula si se ingresó código de aula
        const inviteCode = (fd.get('inviteCode') || '').trim().toUpperCase();
        if (inviteCode) {
          const fresh = Storage.get().users[u.id];
          const cr = Schools.findClassroomByCode(inviteCode);
          if (cr && fresh && cr.schoolId === fresh.schoolId) {
            Storage.set(st => {
              if (!st.classrooms[cr.id].teacherIds.includes(u.id)) st.classrooms[cr.id].teacherIds.push(u.id);
              if (!st.users[u.id].classroomIds) st.users[u.id].classroomIds = [];
              if (!st.users[u.id].classroomIds.includes(cr.id)) st.users[u.id].classroomIds.push(cr.id);
            });
            App._classroomId = cr.id;
          }
        }
        await Storage.flush();
        go('teacher-dashboard');
      } catch (err) { UI.flash(err.message, 'error'); }
    });
    document.getElementById('cancelTeacherPromote')?.addEventListener('click', async () => {
      await Auth.logout();
      go('welcome');
    });
  }

  // ---- Pantalla para verificar director (código de colegio) ----
  function screenAdminPromote() {
    const u = Roles.current();
    return `
      <div class="card" style="max-width:520px;margin:48px auto;">
        <h2 style="margin:0 0 8px;">Verificación de director</h2>
        <p class="muted" style="margin:0 0 22px;">Ingresa el código de tu colegio para acceder como director. Si no lo tienes, contáctate con el administrador de Ariven.</p>
        <form id="adminPromoteForm">
          <label>Código del colegio</label>
          <input name="schoolCode" maxlength="6" required placeholder="6 caracteres" style="text-transform:uppercase;" />
          <div style="display:flex;gap:10px;margin-top:18px;">
            <button class="primary" type="submit">Verificar y entrar</button>
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
        await Auth.promoteToDirector(u.id, fd.get('schoolCode'));
        await Storage.flush();
        go('teacher-dashboard');
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
      } else if (typeof IntersectionObserver === 'undefined') {
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
      _landingScrollHandler = onScroll;
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

