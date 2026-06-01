// Máquina de estados del timer Pomodoro (persistente entre navegación y recarga).
const Pomodoro = (() => {

  const DEFAULTS = { focus: 25, shortBreak: 5, longBreak: 15 };
  const LS_KEY = 'tf-pomodoro';

  let state = {
    mode: 'idle',       // 'idle' | 'focus' | 'break' | 'paused'
    pausedMode: null,
    focusDuration: DEFAULTS.focus,
    breakDuration: DEFAULTS.shortBreak,
    longBreakDuration: DEFAULTS.longBreak,
    cycleCount: 0,
    remaining: 0,
    intervalId: null,
    subject: null,
    userId: null,
    endsAt: null,       // timestamp (ms) en que termina el ciclo activo
    onTick: null,
    onComplete: null
  };

  // ── Persistencia en localStorage ──────────────────────────────────
  function _persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        mode: state.mode,
        pausedMode: state.pausedMode,
        focusDuration: state.focusDuration,
        breakDuration: state.breakDuration,
        longBreakDuration: state.longBreakDuration,
        cycleCount: state.cycleCount,
        remaining: state.remaining,
        subject: state.subject,
        userId: state.userId,
        endsAt: state.endsAt
      }));
    } catch (_) {}
  }

  // Restaura el estado guardado; descuenta el tiempo transcurrido si estaba corriendo.
  function _restore() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (_) { saved = null; }
    if (!saved) return;

    state.focusDuration     = saved.focusDuration     ?? DEFAULTS.focus;
    state.breakDuration     = saved.breakDuration     ?? DEFAULTS.shortBreak;
    state.longBreakDuration = saved.longBreakDuration ?? DEFAULTS.longBreak;
    state.cycleCount        = saved.cycleCount        ?? 0;
    state.subject           = saved.subject           ?? null;
    state.userId            = saved.userId            ?? null;

    if ((saved.mode === 'focus' || saved.mode === 'break') && saved.endsAt) {
      const remainingSec = Math.round((saved.endsAt - Date.now()) / 1000);
      if (remainingSec > 0) {
        // Seguía corriendo: reanudar
        state.mode = saved.mode;
        state.remaining = remainingSec;
        state.endsAt = saved.endsAt;
        state.intervalId = setInterval(_tick, 1000);
      } else {
        // El ciclo terminó mientras estaba cerrado
        state.mode = 'idle';
        state.remaining = state.focusDuration * 60;
        if (saved.mode === 'focus') state.cycleCount++;
        _persist();
      }
    } else if (saved.mode === 'paused') {
      state.mode = 'paused';
      state.pausedMode = saved.pausedMode || 'focus';
      state.remaining = saved.remaining || state.focusDuration * 60;
    } else {
      state.mode = 'idle';
      state.remaining = saved.remaining || state.focusDuration * 60;
    }
  }

  function setCallbacks(onTick, onComplete) {
    state.onTick = onTick;
    state.onComplete = onComplete;
    // Empujar el estado actual al recién suscrito (sincroniza barra global / página)
    if (onTick) onTick(state.remaining, state.mode);
  }

  function _tick() {
    state.remaining--;
    if (state.onTick) state.onTick(state.remaining, state.mode);
    if (state.remaining % 5 === 0) _persist();
    if (state.remaining <= 0) {
      _complete();
    }
  }

  function _complete() {
    clearInterval(state.intervalId);
    state.intervalId = null;
    state.endsAt = null;
    const completedMode = state.mode;
    if (completedMode === 'focus') {
      state.cycleCount++;
    }
    state.mode = 'idle';
    _persist();
    if (state.onComplete) state.onComplete(completedMode);
  }

  function start(subject, userId) {
    if (state.mode !== 'idle') return;
    state.subject = subject;
    state.userId = userId;
    state.mode = 'focus';
    state.remaining = state.focusDuration * 60;
    state.endsAt = Date.now() + state.remaining * 1000;
    state.intervalId = setInterval(_tick, 1000);
    _persist();
    if (state.onTick) state.onTick(state.remaining, state.mode);
  }

  function startBreak(long) {
    if (state.mode !== 'idle') return;
    state.mode = 'break';
    state.remaining = (long ? state.longBreakDuration : state.breakDuration) * 60;
    state.endsAt = Date.now() + state.remaining * 1000;
    state.intervalId = setInterval(_tick, 1000);
    _persist();
    if (state.onTick) state.onTick(state.remaining, state.mode);
  }

  function pause() {
    if (state.mode === 'focus' || state.mode === 'break') {
      clearInterval(state.intervalId);
      state.intervalId = null;
      state.pausedMode = state.mode;
      state.mode = 'paused';
      state.endsAt = null;
      _persist();
      if (state.onTick) state.onTick(state.remaining, state.mode);
    }
  }

  function resume() {
    if (state.mode !== 'paused') return;
    state.mode = state.pausedMode;
    state.pausedMode = null;
    state.endsAt = Date.now() + state.remaining * 1000;
    state.intervalId = setInterval(_tick, 1000);
    _persist();
    if (state.onTick) state.onTick(state.remaining, state.mode);
  }

  function skip() {
    if (state.mode === 'idle') return;
    clearInterval(state.intervalId);
    state.intervalId = null;
    _complete();
  }

  function reset() {
    clearInterval(state.intervalId);
    state.intervalId = null;
    state.mode = 'idle';
    state.pausedMode = null;
    state.remaining = state.focusDuration * 60;
    state.subject = null;
    state.endsAt = null;
    _persist();
    if (state.onTick) state.onTick(state.remaining, 'idle');
  }

  function getState() {
    return {
      mode: state.mode,
      remaining: state.remaining,
      cycleCount: state.cycleCount,
      subject: state.subject,
      userId: state.userId
    };
  }

  function formatTime(seconds) {
    const m = Math.floor(Math.abs(seconds) / 60).toString().padStart(2, '0');
    const s = (Math.abs(seconds) % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Restaurar al cargar el módulo (sobrevive recarga F5)
  _restore();

  return { DEFAULTS, setCallbacks, start, startBreak, pause, resume, skip, reset, getState, formatTime };
})();
