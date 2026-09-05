// Pantalla "Compañeros" (Fase 2 — social): Buscar, Solicitudes, Mis Compañeros.
const UICompanions = (() => {
  const root = () => document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const initials = (name) => String(name || '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  function screenCompanions() {
    return `
      <div class="cp-layout">
        <div class="ph-panel-hdr">
          <div class="ph-panel-hdr-icon">👥</div>
          <div><div class="ph-panel-title">Compañeros</div><div class="ph-panel-sub">Encuentra y conecta con otros estudiantes de TrackNara</div></div>
        </div>
        <nav class="cp-tabs">
          <button class="cp-tab active" data-tab="search">Buscar</button>
          <button class="cp-tab" data-tab="requests">Solicitudes</button>
          <button class="cp-tab" data-tab="mine">Mis Compañeros</button>
        </nav>
        <div class="cp-panel active" data-tab="search">
          <input type="text" id="cpSearchInput" class="cp-search-input" placeholder="Buscar por nombre o apodo (mínimo 2 letras)..." maxlength="40" autocomplete="off">
          <div id="cpSearchResults" class="cp-list"></div>
        </div>
        <div class="cp-panel" data-tab="requests">
          <div id="cpRequestsList" class="cp-list"><div class="cp-empty">Cargando…</div></div>
        </div>
        <div class="cp-panel" data-tab="mine">
          <div id="cpMineList" class="cp-list"><div class="cp-empty">Cargando…</div></div>
        </div>
      </div>`;
  }

  function _rowHtml(profile, photoUrl, actionHtml, subLabel) {
    return `
      <div class="cp-row" data-user-id="${esc(profile.id)}">
        <div class="cp-row-avatar">${photoUrl ? `<img src="${esc(photoUrl)}" alt="">` : esc(initials(profile.name))}</div>
        <div class="cp-row-info">
          <div class="cp-row-name">${esc(profile.name || 'Estudiante')}</div>
          ${profile.nickname ? `<div class="cp-row-nick">@${esc(profile.nickname)}</div>` : ''}
          ${subLabel ? `<div class="cp-row-sub">${subLabel}</div>` : (profile.bio ? `<div class="cp-row-bio">${esc(profile.bio)}</div>` : '')}
        </div>
        <div class="cp-row-action">${actionHtml}</div>
      </div>`;
  }

  function _actionForStatus(status, userId) {
    switch (status) {
      case 'none':             return `<button class="cp-btn cp-btn-primary cp-add-btn" data-id="${esc(userId)}">Agregar compañero</button>`;
      case 'pending_sent':     return `<span class="cp-status-label">Solicitud enviada</span>`;
      case 'pending_received': return `<span class="cp-status-label">Te envió una solicitud</span>`;
      case 'accepted':         return `<span class="cp-status-label cp-status-ok">✓ Compañeros</span>`;
      case 'blocked':          return `<span class="cp-status-label">Bloqueado</span>`;
      default:                 return '';
    }
  }

  async function wireCompanions() {
    const r = () => root();
    const s = Storage.get();
    const myId = s.currentUserId;
    if (!myId) return;

    r().querySelectorAll('.cp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        r().querySelectorAll('.cp-tab').forEach(t => t.classList.remove('active'));
        r().querySelectorAll('.cp-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        r().querySelector(`.cp-panel[data-tab="${tab.dataset.tab}"]`)?.classList.add('active');
      });
    });

    // ── Buscar ──
    const searchInput = r().querySelector('#cpSearchInput');
    const resultsBox = r().querySelector('#cpSearchResults');
    let _searchTimer = null;
    async function _runSearch(q) {
      if (!q || q.trim().length < 2) { resultsBox.innerHTML = '<div class="cp-empty">Escribe al menos 2 letras para buscar.</div>'; return; }
      resultsBox.innerHTML = '<div class="cp-empty">Buscando…</div>';
      const results = await Companions.search(q);
      if (!results.length) { resultsBox.innerHTML = '<div class="cp-empty">No se encontraron estudiantes con ese nombre o apodo.</div>'; return; }
      const photos = await Companions.getPrimaryPhotos(results.map(p => p.id));
      resultsBox.innerHTML = results.map(p => {
        const status = Companions.statusWith(myId, p.id);
        return _rowHtml(p, photos[p.id], _actionForStatus(status, p.id));
      }).join('');
      _wireAddButtons();
    }
    function _wireAddButtons() {
      resultsBox.querySelectorAll('.cp-add-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            await Companions.sendRequest(myId, btn.dataset.id);
            UI.flash('Solicitud enviada.', 'success');
            btn.outerHTML = _actionForStatus('pending_sent');
          } catch (err) {
            UI.flash(err?.message || 'No se pudo enviar la solicitud.', 'error');
            btn.disabled = false;
          }
        });
      });
    }
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(_searchTimer);
      const q = e.target.value;
      _searchTimer = setTimeout(() => _runSearch(q), 350);
    });

    // ── Solicitudes ──
    async function _renderRequests() {
      const box = r().querySelector('#cpRequestsList');
      if (!box) return;
      const pending = Companions.listMine(myId).filter(c => c.status === 'pending');
      const received = pending.filter(c => c.requestedBy !== myId);
      const sent = pending.filter(c => c.requestedBy === myId);
      if (!received.length && !sent.length) { box.innerHTML = '<div class="cp-empty">No tienes solicitudes pendientes.</div>'; return; }

      const otherIds = pending.map(c => Companions.otherIdOf(c, myId));
      const [profiles, photos] = await Promise.all([Companions.getPublicProfiles(otherIds), Companions.getPrimaryPhotos(otherIds)]);

      let html = '';
      if (received.length) {
        html += '<div class="cp-section-label">Recibidas</div>';
        html += received.map(c => {
          const otherId = Companions.otherIdOf(c, myId);
          const p = profiles[otherId] || { id: otherId, name: 'Estudiante' };
          const actions = `
            <button class="cp-btn cp-btn-primary cp-accept-btn" data-conn="${esc(c.id)}">Aceptar</button>
            <button class="cp-btn cp-btn-ghost cp-reject-btn" data-conn="${esc(c.id)}">Rechazar</button>`;
          return _rowHtml(p, photos[otherId], actions);
        }).join('');
      }
      if (sent.length) {
        html += '<div class="cp-section-label">Enviadas</div>';
        html += sent.map(c => {
          const otherId = Companions.otherIdOf(c, myId);
          const p = profiles[otherId] || { id: otherId, name: 'Estudiante' };
          const actions = `<button class="cp-btn cp-btn-ghost cp-cancel-btn" data-conn="${esc(c.id)}">Cancelar</button>`;
          return _rowHtml(p, photos[otherId], actions);
        }).join('');
      }
      box.innerHTML = html;

      box.querySelectorAll('.cp-accept-btn').forEach(btn => btn.addEventListener('click', async () => {
        btn.disabled = true;
        await Companions.respond(btn.dataset.conn, true);
        UI.flash('Ahora son compañeros.', 'success');
        _renderRequests(); _renderMine();
      }));
      box.querySelectorAll('.cp-reject-btn, .cp-cancel-btn').forEach(btn => btn.addEventListener('click', async () => {
        btn.disabled = true;
        await Companions.respond(btn.dataset.conn, false);
        UI.flash('Solicitud eliminada.', 'success');
        _renderRequests();
      }));
    }

    // ── Mis Compañeros ──
    async function _renderMine() {
      const box = r().querySelector('#cpMineList');
      if (!box) return;
      const accepted = Companions.listMine(myId).filter(c => c.status === 'accepted');
      if (!accepted.length) { box.innerHTML = '<div class="cp-empty">Todavía no tienes compañeros. Ve a "Buscar" para encontrar estudiantes.</div>'; return; }

      const otherIds = accepted.map(c => Companions.otherIdOf(c, myId));
      const [profiles, photos] = await Promise.all([Companions.getPublicProfiles(otherIds), Companions.getPrimaryPhotos(otherIds)]);

      box.innerHTML = accepted.map(c => {
        const otherId = Companions.otherIdOf(c, myId);
        const p = profiles[otherId] || { id: otherId, name: 'Estudiante' };
        const actions = `
          <button class="cp-btn cp-btn-ghost cp-remove-btn" data-conn="${esc(c.id)}">Eliminar</button>
          <button class="cp-btn cp-btn-ghost cp-block-btn" data-conn="${esc(c.id)}">Bloquear</button>`;
        return _rowHtml(p, photos[otherId], actions);
      }).join('');

      box.querySelectorAll('.cp-remove-btn').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar a este compañero?')) return;
        btn.disabled = true;
        await Companions.remove(btn.dataset.conn);
        UI.flash('Compañero eliminado.', 'success');
        _renderMine();
      }));
      box.querySelectorAll('.cp-block-btn').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('¿Bloquear a este usuario? Ya no podrá contactarte ni encontrarte en la búsqueda.')) return;
        btn.disabled = true;
        await Companions.block(btn.dataset.conn, myId);
        UI.flash('Usuario bloqueado.', 'success');
        _renderMine();
      }));
    }

    resultsBox.innerHTML = '<div class="cp-empty">Escribe un nombre o apodo para empezar a buscar.</div>';
    _renderRequests();
    _renderMine();
  }

  return { screens: { companions: { render: screenCompanions, wire: wireCompanions } } };
})();
