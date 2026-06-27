// Focus Player — drag libre, pill de restauración, expand/collapse, sync modal.
// No modifica app.js. Usa clase propia 'fp-minimized' para evitar conflicto con
// el tick del Pomodoro (que en app.js hace bar.classList.remove('hidden') cada segundo).
const FocusPlayer = (() => {

  const LS_POS = 'arv-fp-pos';

  // Registro central de MutationObservers para hacer disconnect en unload.
  const _observers = [];

  // Dimensiones cacheadas del bar (evita leer offsetWidth/offsetHeight en cada frame).
  let _cachedW = 340;
  let _cachedH = 100;

  // ── Posicionamiento y drag ─────────────────────────────────────────────────

  function _loadPos() {
    try { return JSON.parse(localStorage.getItem(LS_POS) || 'null'); } catch (_) { return null; }
  }
  function _savePos(x, y) {
    try { localStorage.setItem(LS_POS, JSON.stringify({ x, y })); } catch (_) {}
  }
  function _clampPos(x, y, w, h) {
    const pad = 8;
    return {
      x: Math.max(pad, Math.min(x, window.innerWidth  - w - pad)),
      y: Math.max(pad, Math.min(y, window.innerHeight - h - pad))
    };
  }
  function _applyPos(bar, x, y) {
    const p = _clampPos(x, y, _cachedW, _cachedH);
    bar.style.transform = `translate(${p.x}px, ${p.y}px)`;
    bar.style.left   = '0';
    bar.style.top    = '0';
    bar.style.right  = 'auto';
    bar.style.bottom = 'auto';
  }

  function _initDrag(bar) {
    const saved = _loadPos();
    if (saved) {
      _applyPos(bar, saved.x, saved.y);
    } else {
      requestAnimationFrame(() => {
        const bh = bar.offsetHeight || 110;
        _applyPos(bar, 24, window.innerHeight - bh - 24);
      });
    }

    const header = bar.querySelector('.fp-header');
    if (!header) return;

    let dragging = false, ox = 0, oy = 0;
    header.style.cursor = 'grab';

    header.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || e.target.closest('[role="button"]')) return;
      dragging = true;
      const rect = bar.getBoundingClientRect();
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
      bar.classList.add('fp-dragging');
      header.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    header.addEventListener('pointermove', e => {
      if (!dragging) return;
      _applyPos(bar, e.clientX - ox, e.clientY - oy);
    });

    header.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      header.style.cursor = 'grab';
      bar.classList.remove('fp-dragging');
      const rect = bar.getBoundingClientRect();
      _savePos(rect.left, rect.top);
    });

    let _resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(_resizeT);
      _resizeT = setTimeout(() => {
        _cachedW = bar.offsetWidth || _cachedW;
        _cachedH = bar.offsetHeight || _cachedH;
        const rect = bar.getBoundingClientRect();
        _applyPos(bar, rect.left, rect.top);
      }, 150);
    }, { passive: true });
  }

  // ── Minimizar/restaurar con clase propia (no 'hidden') ────────────────────
  // El tick de Pomodoro en app.js llama bar.classList.remove('hidden') cada segundo.
  // Usar 'fp-minimized' evita ese conflicto: el tick nunca la toca.

  function _minimize(bar, pill) {
    bar.classList.add('fp-minimized');
    if (pill) {
      pill.classList.remove('hidden');
      const t = document.getElementById('fpPillTime');
      if (t) t.textContent = document.getElementById('pomBarDisplay')?.textContent || '25:00';
    }
  }

  function _restore(bar, pill) {
    bar.classList.remove('fp-minimized');
    if (pill) pill.classList.add('hidden');
    _fillSubjects();
  }

  function _initToggle(bar) {
    const pill = document.getElementById('fpPill');

    // Interceptar el click del botón — antes que app.js (capture phase).
    // app.js hace toggle('hidden'); nosotros lo bloqueamos y usamos 'fp-minimized'.
    const toggleBtn = document.getElementById('pomBarToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', e => {
        e.stopImmediatePropagation();   // bloquea el listener de app.js
        if (bar.classList.contains('fp-minimized')) {
          _restore(bar, pill);
        } else {
          _minimize(bar, pill);
        }
      }, { capture: true });
    }

    // Pill: click para restaurar
    pill?.addEventListener('click', () => _restore(bar, pill));

    // Sincronizar el tiempo en la pill mientras el timer corre
    const displayEl = document.getElementById('pomBarDisplay');
    if (displayEl && pill) {
      const obs = new MutationObserver(() => {
        if (!pill.classList.contains('hidden')) {
          const t = document.getElementById('fpPillTime');
          if (t) t.textContent = displayEl.textContent;
        }
      });
      obs.observe(displayEl, { childList: true, characterData: true, subtree: true });
      _observers.push(obs);
    }

    // Cuando app.js llama window._showPomBar() (desde Estudio IA), también restaurar
    const orig = window._showPomBar;
    window._showPomBar = (...args) => {
      orig?.(...args);
      _restore(bar, pill);
    };
  }

  // ── Materias ───────────────────────────────────────────────────────────────

  function _fillSubjects() {
    try {
      const s    = typeof Storage !== 'undefined' ? Storage.get() : null;
      const user = s?.users?.[s.currentUserId];
      if (!user) return;

      const subs = Subjects.listSubjects(user.institutionType || 'colegio', user.id);
      const opts = subs.map(x =>
        `<option>${x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</option>`
      ).join('');

      const hidden = document.getElementById('pomBarSubject');
      if (hidden && !hidden.options.length) {
        hidden.innerHTML = opts;
        const pState = typeof Pomodoro !== 'undefined' ? Pomodoro.getState() : null;
        if (pState?.subject) {
          const opt = [...hidden.options].find(o => o.value === pState.subject);
          if (opt) hidden.value = opt.value;
        }
      }

      const modalSel = document.getElementById('fpModalSubjectSel');
      if (modalSel && !modalSel.options.length) {
        modalSel.innerHTML = opts;
        const v = document.getElementById('pomBarSubject')?.value;
        if (v) modalSel.value = v;
      }

      _updateLabel();
    } catch (_) {}
  }

  function _updateLabel() {
    const label = document.getElementById('fpSubjectLabel');
    const sel   = document.getElementById('pomBarSubject');
    if (label) label.textContent = sel?.value || '—';
  }

  // ── Modal expandido ────────────────────────────────────────────────────────

  function _syncModal() {
    const modal = document.getElementById('fpModal');
    if (!modal || modal.classList.contains('hidden')) return;

    const srcClock = document.getElementById('pomBarDisplay');
    const srcMode  = document.getElementById('pomBarMode');
    const srcSubj  = document.getElementById('pomBarSubject');
    const srcFoc   = document.getElementById('pomBarFocus');
    const srcBrk   = document.getElementById('pomBarBreak');

    const clock = document.getElementById('fpModalClock');
    const mode  = document.getElementById('fpModalMode');
    const subj  = document.getElementById('fpModalSubj');
    const foc   = document.getElementById('fpModalFocus');
    const brk   = document.getElementById('fpModalBreak');

    if (clock && srcClock) clock.textContent = srcClock.textContent;
    if (mode  && srcMode)  mode.textContent  = srcMode.textContent;
    if (subj  && srcSubj)  subj.textContent  = srcSubj.value || '—';
    if (foc   && srcFoc && foc !== document.activeElement) foc.value = srcFoc.value;
    if (brk   && srcBrk && brk !== document.activeElement) brk.value = srcBrk.value;
  }

  function _open() {
    const modal = document.getElementById('fpModal');
    if (!modal) return;
    _fillSubjects();
    _syncModal();
    modal.classList.remove('hidden');
  }

  function _close() {
    document.getElementById('fpModal')?.classList.add('hidden');
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    const bar = document.getElementById('pomBar');
    if (!bar) return;

    // Cachear dimensiones una sola vez (el bar tiene tamaño fijo)
    _cachedW = bar.offsetWidth || 340;
    _cachedH = bar.offsetHeight || 100;

    _initDrag(bar);
    _initToggle(bar);

    // Rellenar materias cuando el player se hace visible
    const visObs = new MutationObserver(() => {
      if (!bar.classList.contains('hidden') && !bar.classList.contains('fp-minimized')) {
        _fillSubjects();
      }
    });
    visObs.observe(bar, { attributes: true, attributeFilter: ['class'] });
    _observers.push(visObs);

    // Expand/minimize modal
    const trigger  = document.getElementById('fpExpandTrigger');
    const backdrop = document.getElementById('fpBackdrop');
    const minimize = document.getElementById('fpMinimize');

    trigger?.addEventListener('click', _open);
    trigger?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _open(); }
    });
    minimize?.addEventListener('click', _close);
    backdrop?.addEventListener('click', _close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') _close(); });

    // Botones del modal delegan a los reales (listeners de app.js)
    const delegate = (fromId, toId) => {
      document.getElementById(fromId)?.addEventListener('click', () => {
        document.getElementById(toId)?.click();
        setTimeout(() => { _syncModal(); _updateLabel(); }, 60);
      });
    };
    delegate('fpModalStart', 'pomBarStart');
    delegate('fpModalPause', 'pomBarPause');
    delegate('fpModalSkip',  'pomBarSkip');
    delegate('fpModalReset', 'pomBarReset');

    document.getElementById('fpModalSubjectSel')?.addEventListener('change', e => {
      const hidden = document.getElementById('pomBarSubject');
      if (hidden) hidden.value = e.target.value;
      _updateLabel();
    });
    document.getElementById('fpModalFocus')?.addEventListener('input', e => {
      const t = document.getElementById('pomBarFocus');
      if (t) t.value = e.target.value;
    });
    document.getElementById('fpModalBreak')?.addEventListener('input', e => {
      const t = document.getElementById('pomBarBreak');
      if (t) t.value = e.target.value;
    });

    // MutationObserver: sincronizar modal con el reloj en tiempo real
    const displayEl = document.getElementById('pomBarDisplay');
    if (displayEl) {
      const clockObs = new MutationObserver(_syncModal);
      clockObs.observe(displayEl, { childList: true, characterData: true, subtree: true });
      _observers.push(clockObs);
    }

    // data-mode en #pomBar para colores CSS
    const modeEl = document.getElementById('pomBarMode');
    if (modeEl) {
      const modeObs = new MutationObserver(() => {
        const txt  = modeEl.textContent.toLowerCase();
        const mode = txt.includes('enfocado') ? 'focus'
          : txt.includes('descanso') ? 'break'
          : txt.includes('pausado')  ? 'paused'
          : 'idle';
        bar.setAttribute('data-mode', mode);
        _syncModal();
      });
      modeObs.observe(modeEl, { childList: true, characterData: true, subtree: true });
      _observers.push(modeObs);
    }

    // Espacio = pausar/reanudar cuando el modal está abierto
    document.addEventListener('keydown', e => {
      const modal = document.getElementById('fpModal');
      if (!modal || modal.classList.contains('hidden')) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); document.getElementById('pomBarPause')?.click(); }
    });
  }

  function _disconnectObservers() {
    _observers.forEach(o => o.disconnect());
    _observers.length = 0;
  }

  window.addEventListener('load', init);
  window.addEventListener('beforeunload', _disconnectObservers, { once: true });
  window.addEventListener('pagehide',     _disconnectObservers, { once: true });

  return { open: _open, close: _close };
})();
