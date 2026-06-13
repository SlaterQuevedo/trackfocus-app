// Focus Player — expand/collapse y sincronización del modal.
// No modifica la lógica de Pomodoro ni app.js. Solo UI pura.
const FocusPlayer = (() => {

  function _syncModal() {
    const clock  = document.getElementById('fpModalClock');
    const mode   = document.getElementById('fpModalMode');
    const subj   = document.getElementById('fpModalSubj');
    const foc    = document.getElementById('fpModalFocus');
    const brk    = document.getElementById('fpModalBreak');

    const srcClock  = document.getElementById('pomBarDisplay');
    const srcMode   = document.getElementById('pomBarMode');
    const srcSubj   = document.getElementById('pomBarSubject');
    const srcFoc    = document.getElementById('pomBarFocus');
    const srcBrk    = document.getElementById('pomBarBreak');

    if (clock && srcClock) clock.textContent = srcClock.textContent;
    if (mode  && srcMode)  mode.textContent  = srcMode.textContent;
    if (subj  && srcSubj)  subj.textContent  = srcSubj.value || '—';
    if (foc   && srcFoc && foc !== document.activeElement) foc.value = srcFoc.value;
    if (brk   && srcBrk && brk !== document.activeElement) brk.value = srcBrk.value;
  }

  function _open() {
    const modal = document.getElementById('fpModal');
    if (!modal) return;
    _syncModal();
    modal.classList.remove('hidden');
  }

  function _close() {
    document.getElementById('fpModal')?.classList.add('hidden');
  }

  function init() {
    const bar     = document.getElementById('pomBar');
    const trigger = document.getElementById('fpExpandTrigger');
    const backdrop = document.getElementById('fpBackdrop');
    const minimize = document.getElementById('fpMinimize');

    if (!bar) return;

    // Expand al hacer clic en el bloque reloj/modo
    trigger?.addEventListener('click', _open);
    trigger?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _open(); } });

    // Cerrar modal
    minimize?.addEventListener('click', _close);
    backdrop?.addEventListener('click', _close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') _close();
    });

    // Botones del modal delegan a los botones reales (que tienen los listeners de app.js)
    const delegate = (fromId, toId) => {
      document.getElementById(fromId)?.addEventListener('click', () => {
        document.getElementById(toId)?.click();
        setTimeout(_syncModal, 50);
      });
    };
    delegate('fpModalStart', 'pomBarStart');
    delegate('fpModalPause', 'pomBarPause');
    delegate('fpModalSkip',  'pomBarSkip');
    delegate('fpModalReset', 'pomBarReset');

    // Sincronizar inputs del modal de vuelta a los inputs reales
    document.getElementById('fpModalFocus')?.addEventListener('input', e => {
      const t = document.getElementById('pomBarFocus');
      if (t) t.value = e.target.value;
    });
    document.getElementById('fpModalBreak')?.addEventListener('input', e => {
      const t = document.getElementById('pomBarBreak');
      if (t) t.value = e.target.value;
    });

    // MutationObserver para mantener el modal sincronizado con el reloj en tiempo real
    const displayEl = document.getElementById('pomBarDisplay');
    if (displayEl) {
      const obs = new MutationObserver(() => {
        const modal = document.getElementById('fpModal');
        if (modal && !modal.classList.contains('hidden')) _syncModal();
      });
      obs.observe(displayEl, { childList: true, characterData: true, subtree: true });
    }

    // Actualizar data-mode en #pomBar para los colores CSS por estado
    const modeEl = document.getElementById('pomBarMode');
    if (modeEl && bar) {
      const modeObs = new MutationObserver(() => {
        const txt  = modeEl.textContent.toLowerCase();
        const mode = txt.includes('enfocado') ? 'focus'
          : txt.includes('descanso') ? 'break'
          : txt.includes('pausado')  ? 'paused'
          : 'idle';
        bar.setAttribute('data-mode', mode);
      });
      modeObs.observe(modeEl, { childList: true, characterData: true, subtree: true });
      // Aplicar estado inicial
      modeEl.dispatchEvent(new Event('change'));
    }

    // Atajo de teclado: Espacio = pausar/reanudar cuando el modal está abierto
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

  // Esperar a que todos los scripts defer hayan cargado (incluye app.js)
  window.addEventListener('load', init);

  return { open: _open, close: _close };
})();
