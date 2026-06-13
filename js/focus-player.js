// Focus Player — expand/collapse, sync de modal, selector de materia en modal.
// No modifica la lógica de Pomodoro ni app.js. Solo UI pura.
const FocusPlayer = (() => {

  // Llena el selector oculto #pomBarSubject y el del modal.
  // Solo actúa si hay usuario activo en Storage.
  function _fillSubjects() {
    try {
      const s    = typeof Storage !== 'undefined' ? Storage.get() : null;
      const user = s?.users?.[s.currentUserId];
      if (!user) return;

      const subs = Subjects.listSubjects(user.institutionType || 'colegio', user.id);
      const opts = subs.map(x =>
        `<option>${x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</option>`
      ).join('');

      // Select oculto (lo lee app.js)
      const hidden = document.getElementById('pomBarSubject');
      if (hidden && !hidden.options.length) {
        hidden.innerHTML = opts;
        const pState = typeof Pomodoro !== 'undefined' ? Pomodoro.getState() : null;
        if (pState?.subject) {
          const opt = [...hidden.options].find(o => o.value === pState.subject);
          if (opt) hidden.value = opt.value;
        }
      }

      // Select del modal
      const modalSel = document.getElementById('fpModalSubjectSel');
      if (modalSel && !modalSel.options.length) {
        modalSel.innerHTML = opts;
        const hidden2 = document.getElementById('pomBarSubject');
        if (hidden2?.value) modalSel.value = hidden2.value;
      }

      // Actualizar etiqueta de texto en el mini player
      _updateLabel();
    } catch (_) {}
  }

  function _updateLabel() {
    const label = document.getElementById('fpSubjectLabel');
    const sel   = document.getElementById('pomBarSubject');
    if (label) label.textContent = sel?.value || '—';
  }

  function _syncModal() {
    const modal = document.getElementById('fpModal');
    if (!modal || modal.classList.contains('hidden')) return;

    const clock = document.getElementById('fpModalClock');
    const mode  = document.getElementById('fpModalMode');
    const subj  = document.getElementById('fpModalSubj');
    const foc   = document.getElementById('fpModalFocus');
    const brk   = document.getElementById('fpModalBreak');

    const srcClock = document.getElementById('pomBarDisplay');
    const srcMode  = document.getElementById('pomBarMode');
    const srcSubj  = document.getElementById('pomBarSubject');
    const srcFoc   = document.getElementById('pomBarFocus');
    const srcBrk   = document.getElementById('pomBarBreak');

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

  function init() {
    const bar      = document.getElementById('pomBar');
    const trigger  = document.getElementById('fpExpandTrigger');
    const backdrop = document.getElementById('fpBackdrop');
    const minimize = document.getElementById('fpMinimize');

    if (!bar) return;

    // Observar cuando el player se hace visible para llenar materias
    const barObs = new MutationObserver(() => {
      if (!bar.classList.contains('hidden')) _fillSubjects();
    });
    barObs.observe(bar, { attributes: true, attributeFilter: ['class'] });

    // Expand al hacer clic en el bloque reloj/modo
    trigger?.addEventListener('click', _open);
    trigger?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _open(); }
    });

    // Cerrar modal
    minimize?.addEventListener('click', _close);
    backdrop?.addEventListener('click', _close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') _close();
    });

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

    // MutationObserver: mantener el modal sincronizado con el reloj en tiempo real
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
      if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('pomBarPause')?.click();
      }
    });
  }

  // Esperar a que todos los scripts defer (Storage, Subjects, Pomodoro, app.js) hayan cargado
  window.addEventListener('load', init);

  return { open: _open, close: _close };
})();
