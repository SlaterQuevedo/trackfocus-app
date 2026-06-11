// TRACKY (Fase 8 V2): mascota virtual minimalista y no invasiva. Vive en
// #tracky-root (fuera de #app, por lo que sobrevive al re-render del router).
// Aparece en la esquina inferior derecha con mensajes contextuales de motivación,
// se puede ocultar (preferencia persistida) y recuerda no ser molesta.
const Tracky = (() => {

  const LS_HIDDEN = 'tf-tracky-hidden';
  const IDLE_MS = 25 * 60 * 1000;       // 25 min sin interacción → sugerir descanso
  const BUBBLE_MS = 8000;               // el globo se autooculta tras 8s
  const NO_TRACKY_ROUTES = ['welcome', 'consent', 'role-selector', 'student-onboarding',
                            'teacher-promote', 'admin-promote', 'pending-approval'];

  let _root = null;
  let _lastRoute = null;
  let _bubbleTimer = null;
  let _idleTimer = null;
  let _idleBound = false;

  function _isHidden() {
    try { return localStorage.getItem(LS_HIDDEN) === '1'; } catch (_) { return false; }
  }
  function _setHidden(v) {
    try { v ? localStorage.setItem(LS_HIDDEN, '1') : localStorage.removeItem(LS_HIDDEN); } catch (_) {}
  }

  // SVG minimalista: cuerpo ovalado + ojos + brillo. Usa los tokens de color.
  function _avatarSVG() {
    return `
      <svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true">
        <defs>
          <linearGradient id="tk-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="var(--accent-2, #A78BFA)"/>
            <stop offset="1" stop-color="var(--primary, #C89B6D)"/>
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="34" rx="22" ry="24" fill="url(#tk-g)"/>
        <ellipse cx="24" cy="30" rx="5" ry="6" fill="#0E1117"/>
        <ellipse cx="40" cy="30" rx="5" ry="6" fill="#0E1117"/>
        <circle cx="25.5" cy="28" r="1.6" fill="#fff"/>
        <circle cx="41.5" cy="28" r="1.6" fill="#fff"/>
        <path d="M26 42 Q32 47 38 42" stroke="#0E1117" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      </svg>`;
  }

  function _ensureRoot() {
    if (_root) return _root;
    _root = document.getElementById('tracky-root');
    if (!_root) {
      _root = document.createElement('div');
      _root.id = 'tracky-root';
      document.body.appendChild(_root);
    }
    return _root;
  }

  function _renderHiddenState() {
    const root = _ensureRoot();
    root.innerHTML = `<button class="tracky-revive-btn" title="Mostrar a Tracky" aria-label="Mostrar a Tracky">◉</button>`;
    root.querySelector('.tracky-revive-btn')?.addEventListener('click', () => {
      _setHidden(false);
      _renderVisibleState();
      show('¡Hola de nuevo! 👋 Aquí estoy si me necesitas.');
    });
  }

  function _renderVisibleState() {
    const root = _ensureRoot();
    root.innerHTML = `
      <div class="tracky-container">
        <div class="tracky-bubble" id="trackyBubble" hidden></div>
        <button class="tracky-avatar" id="trackyAvatar" title="Tracky · clic para ocultar" aria-label="Tracky">
          ${_avatarSVG()}
        </button>
      </div>`;
    root.querySelector('#trackyAvatar')?.addEventListener('click', () => {
      _setHidden(true);
      _clearBubbleTimer();
      _renderHiddenState();
    });
  }

  function _clearBubbleTimer() {
    if (_bubbleTimer) { clearTimeout(_bubbleTimer); _bubbleTimer = null; }
  }

  // Muestra un mensaje en el globo (si Tracky está visible).
  function show(message, opts = {}) {
    if (_isHidden() || !message) return;
    const root = _ensureRoot();
    if (!root.querySelector('.tracky-container')) _renderVisibleState();
    const bubble = root.querySelector('#trackyBubble');
    const avatar = root.querySelector('#trackyAvatar');
    if (!bubble) return;
    bubble.textContent = message;
    bubble.hidden = false;
    avatar?.classList.remove('tracky-anim');
    void avatar?.offsetWidth;            // reinicia la animación
    avatar?.classList.add('tracky-anim');
    _clearBubbleTimer();
    if (opts.sticky !== true) {
      _bubbleTimer = setTimeout(() => { if (bubble) bubble.hidden = true; }, BUBBLE_MS);
    }
  }

  function hide() {
    _setHidden(true);
    _clearBubbleTimer();
    _renderHiddenState();
  }

  // Elige un mensaje pedagógico según la ruta y los datos del usuario.
  function _pickMessage(route, user) {
    const gam = user?.gamification || {};
    const streak = gam.streak || 0;
    const name = (user?.name || '').split(' ')[0];

    // Pantalla de estudio IA — recordar materia anterior si existe memoria
    if (route === 'ai-study' || route === 'new-session') {
      try {
        const uid = user?.id;
        if (uid && typeof AcademicMemory !== 'undefined') {
          const subjects = AcademicMemory.listSubjects(uid);
          if (subjects.length > 0) {
            const last = subjects[0];
            const topic = last.lastTopic ? ` en "${last.lastTopic}"` : '';
            return `📚 ¿Seguimos con ${last.subject}? La última vez avanzaste${topic}. ¡Vamos!`;
          }
        }
      } catch (_) {}
      return '📚 ¿Qué estudias hoy? La IA te guiará paso a paso.';
    }

    if (route === 'achievements') return '🏆 Cada logro desbloqueado es una habilidad que ya dominas.';

    // Estadísticas: si no ha estudiado esta semana, recordarlo
    if (route === 'stats' || route === 'profile') {
      try {
        const uid = user?.id;
        const s = typeof Storage !== 'undefined' ? Storage.get() : null;
        const sessions = s?.users?.[uid]?.sessions || [];
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const thisWeek = sessions.filter(s => new Date(s.date).getTime() > weekAgo).length;
        if (thisWeek === 0) return '📊 Esta semana aún no has estudiado. ¿Empezamos con 25 minutos?';
      } catch (_) {}
      return '📊 Aquí puedes ver cómo evoluciona tu aprendizaje.';
    }

    if (route === 'leaderboard') return '🥇 Cada sesión te acerca más al tope del ranking.';

    // Recomendaciones: refuerzo pedagógico
    if (route === 'recommend') return '💡 Estas recomendaciones están basadas en tu historial real de aprendizaje.';

    // Dashboard: prioriza racha, luego nivel próximo, luego sesiones acumuladas.
    if (streak >= 3) return `🔥 ¡${streak} días seguidos! La constancia es la base del aprendizaje.`;
    try {
      const info = Gamification.getLevelInfo(gam.xp || 0);
      if (info?.next) {
        const gap = info.next.xpRequired - (gam.xp || 0);
        if (gap > 0 && gap <= 10) return `🎓 Solo ${gap} XP para "${info.next.title}". ¡Eso significa que ya entiendes más!`;
      }
    } catch (_) {}
    try {
      const uid = user?.id;
      const s = typeof Storage !== 'undefined' ? Storage.get() : null;
      const count = s?.users?.[uid]?.sessions?.length || 0;
      if (count >= 3) return `📈 Llevas ${count} sesiones registradas. Tu Índice de Aprendizaje está creciendo.`;
    } catch (_) {}
    return name ? `¡Hola, ${name}! ¿List@ para aprender algo nuevo hoy? 🚀` : '¡Hola! ¿List@ para concentrarte? 🚀';
  }

  function _armIdle() {
    if (_idleTimer) clearTimeout(_idleTimer);
    _idleTimer = setTimeout(() => {
      show('⏱ ¿Un descanso? El Pomodoro te espera cuando quieras.');
    }, IDLE_MS);
  }

  function _bindIdleResets() {
    if (_idleBound) return;
    _idleBound = true;
    ['click', 'keydown', 'touchstart'].forEach(ev =>
      document.addEventListener(ev, () => _armIdle(), { passive: true }));
  }

  // Llamado por el router tras cada navegación. Decide visibilidad y mensaje.
  function checkContext(route, user) {
    const root = _ensureRoot();

    // Pantallas de autenticación / sin sesión → Tracky no aparece.
    if (!user || NO_TRACKY_ROUTES.includes(route)) {
      root.innerHTML = '';
      _clearBubbleTimer();
      if (_idleTimer) { clearTimeout(_idleTimer); _idleTimer = null; }
      _lastRoute = null;
      return;
    }

    if (_isHidden()) { _renderHiddenState(); return; }

    if (!root.querySelector('.tracky-container')) _renderVisibleState();
    _bindIdleResets();
    _armIdle();

    // Solo saluda con un mensaje nuevo al cambiar de ruta (no es invasivo).
    if (route !== _lastRoute) {
      _lastRoute = route;
      const msg = _pickMessage(route, user);
      // pequeño retraso para que entre tras el render de la pantalla
      setTimeout(() => show(msg), 350);
    }
  }

  return { checkContext, show, hide };
})();
