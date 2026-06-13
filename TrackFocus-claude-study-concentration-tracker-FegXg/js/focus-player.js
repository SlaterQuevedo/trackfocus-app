// Focus Player — drag libre, pill de restauración, expand/collapse, sync de modal.
// No modifica la lógica de Pomodoro ni app.js. Solo UI pura.
const FocusPlayer = (() => {

  const LS_POS = 'tf-fp-pos';

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
    const p = _clampPos(x, y, bar.offsetWidth || 340, bar.offsetHeight || 100);
    bar.style.left   = p.x + 'px';
    bar.style.top    = p.y + 'px';
    bar.style.right  = 'auto';
    bar.style.bottom = 'auto';
  }

  function _initDrag(bar) {
    // Posición inicial: guardada o bottom-left por defecto
    const saved = _loadPos();
    if (saved) {
      _applyPos(bar, saved.x, saved.y);
    } else {
      // Defer hasta que el bar tenga dimensiones
      requestAnimationFrame(() => {
        const bh = bar.offsetHeight || 110;
        _applyPos(bar, 24, window.innerHeight - bh - 24);
      });
    }

    const header = bar.querySelector('.fp-header');
    if (!header) return;

    let dragging = false;
    let ox = 0, oy = 0;

    header.style.cursor = 'grab';

    header.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || e.target.closest('select') || e.target.closest('[role="button"]')) return;
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

    header.addEventListener('pointerup', e => {
      if (!dragging) return;
      dragging = false;
      header.style.cursor = 'grab';
      bar.classList.remove('fp-dragging');
      const rect = bar.getBoundingClientRect();
      _savePos(rect.left, rect.top);
    });

    // Re-clamp al cambiar tamaño de ventana
    window.addEventListener('resize', () => {
      const rect = bar.getBoundingClientRect();
      _applyPos(bar, rect.left, rect.top);
    }, { passive: true });
  }

  // ── Pill de restauración ───────────────────────────────────────────────────

  function _initPill(bar) {
    const pill     = document.getElementById('fpPill');
    const pillTime = document.getElementById('fpPillTime');
    if (!pill) return;

    // Sincronizar tiempo en la pill con el reloj del player
    const displayEl = document.getElementById('pomBarDisplay');
    if (displayEl && pillTime) {
      const obs = new MutationObserver(() => {
        pillTime.textContent = displayEl.textContent;
      });
      obs.observe(displayEl, { childList: true, characterData: true, subtree: true });
    }

    // Observar cuando #pomBar gana/pierde 'hidden' para mostrar/ocultar pill
    const classObs = new MutationObserver(() => {
      if (bar.classList.contains('hidden')) {
        pill.classList.remove('hidden');
        if (pillTime) pillTime.textContent = document.getElementById('pomBarDisplay')?.textContent || '25:00';
      } else {
        pill.classList.add('hidden');
      }
    });
    classObs.observe(bar, { attributes: true, attributeFilter: ['class'] });

    // Click en la pill: restaurar el player
    pill.addEventListener('click', () => {
      bar.classList.remove('hidden');
      document.body.classList.add('pom-active');
      pill.classList.add('hidden');
      // Rellenar materias si es necesario
      _fillSubjects();
    });
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
    const bar      = document.getElementById('pomBar');
    const trigger  = document.getElementById('fpExpandTrigger');
    const backdrop = document.getElementById('fpBackdrop');
    const minimize = document.getElementById('fpMinimize');

    if (!bar) return;

    _initDrag(bar);
    _initPill(bar);

    // Rellenar materias cuando el player se hace visible
    const visObs = new MutationObserver(() => {
      if (!bar.classList.contains('hidden')) _fillSubjects();
    });
    visObs.observe(bar, { attributes: true, attributeFilter: ['class'] });

    // Expand/minimize modal
    trigger?.addEventListener('click', _open);
    trigger?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _open(); }
    });
    minimize?.addEventListener('click', _close);
    backdrop?.addEventListener('click', _close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') _close(); });

    // Botones del modal delegan a los reales (que tienen listeners de app.js)
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

    // Selector de materia del modal → select oculto → label mini player
    document.getElementById('fpModalSubjectSel')?.addEventListener('change', e => {
      const hidden = document.getElementById('pomBarSubject');
      if (hidden) hidden.value = e.target.value;
      _updateLabel();
    });

    // Inputs de duración del modal → inputs reales
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
      const obs = new MutationObserver(_syncModal);
      obs.observe(displayEl, { childList: true, characterData: true, subtree: true });
    }

    // Actualizar data-mode en #pomBar para colores CSS por estado
    const modeEl = document.getElementById('pomBarMode');
    if (modeEl && bar) {
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
    }

    // Espacio = pausar/reanudar cuando el modal está abierto
    document.addEventListener('keydown', e => {
      const modal = document.getElementById('fpModal');
      if (!modal || modal.classList.contains('hidden')) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); document.getElementById('pomBarPause')?.click(); }
    });
  }

  window.addEventListener('load', init);

  return { open: _open, close: _close };
})();
