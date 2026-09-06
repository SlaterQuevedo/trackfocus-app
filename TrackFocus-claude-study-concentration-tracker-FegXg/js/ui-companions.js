// Pantalla "Compañeros" (Fase 2 — social): Buscar, Solicitudes, Mis Compañeros.
const UICompanions = (() => {
  const root = () => document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const initials = (name) => String(name || '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const AVATAR_COLORS = ['#D6A66B','#C8CDD3','#7E8792','#9B7044'];
  const _colorFor = (id) => {
    let h = 0;
    for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  };
  let _chatChannel = null;
  let _roomChannel = null;
  let _roomMsgChannel = null;

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
          <button class="cp-tab" data-tab="messages">Mensajes</button>
          <button class="cp-tab" data-tab="rooms">Salas</button>
          <button class="cp-tab" data-tab="following">Siguiendo</button>
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
        <div class="cp-panel" data-tab="messages">
          <div id="cpMessagesList" class="cp-list"><div class="cp-empty">Cargando…</div></div>
        </div>
        <div class="cp-panel" data-tab="rooms">
          <div id="cpRoomsList" class="cp-list"><div class="cp-empty">Cargando…</div></div>
        </div>
        <div class="cp-panel" data-tab="following">
          <div id="cpFollowingList" class="cp-list"><div class="cp-empty">Cargando…</div></div>
        </div>
      </div>`;
  }

  function _rowHtml(profile, photoUrl, actionHtml, subLabel, followHtml) {
    return `
      <div class="cp-row" data-user-id="${esc(profile.id)}">
        <div class="cp-row-avatar">${photoUrl ? `<img src="${esc(photoUrl)}" alt="">` : esc(initials(profile.name))}</div>
        <div class="cp-row-info">
          <div class="cp-row-name">${esc(profile.name || 'Estudiante')}</div>
          ${profile.nickname ? `<div class="cp-row-nick">@${esc(profile.nickname)}</div>` : ''}
          ${subLabel ? `<div class="cp-row-sub">${subLabel}</div>` : (profile.bio ? `<div class="cp-row-bio">${esc(profile.bio)}</div>` : '')}
        </div>
        <div class="cp-row-action">${actionHtml}${followHtml || ''}</div>
      </div>`;
  }

  // "Siguiendo": seguimiento unidireccional, sin aceptación — inspirarte en
  // el progreso público de alguien sin que sea tu compañero de estudio.
  // Independiente del estado de compañero (se puede seguir a cualquiera).
  function _followBtnHtml(otherId, following) {
    return `<button class="cp-btn cp-btn-ghost cp-follow-btn${following ? ' cp-following' : ''}" data-id="${esc(otherId)}">${following ? 'Siguiendo ✓' : 'Seguir'}</button>`;
  }

  function _wireFollowButtons(container, myId, onToggle) {
    container.querySelectorAll('.cp-follow-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const otherId = btn.dataset.id;
        const wasFollowing = btn.classList.contains('cp-following');
        btn.disabled = true;
        try {
          if (wasFollowing) await Companions.unfollow(myId, otherId);
          else await Companions.follow(myId, otherId);
          if (onToggle) { onToggle(); return; }
          btn.textContent = wasFollowing ? 'Seguir' : 'Siguiendo ✓';
          btn.classList.toggle('cp-following', !wasFollowing);
        } catch (err) {
          UI.flash(err?.message || 'No se pudo actualizar el seguimiento.', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  function _actionForStatus(status, userId) {
    switch (status) {
      case 'none':             return `<button class="cp-btn cp-btn-primary cp-add-btn" data-id="${esc(userId)}">Agregar compañero</button>`;
      case 'pending_sent':     return `<span class="cp-status-label">Solicitud enviada</span>`;
      case 'pending_received': return `<span class="cp-status-label">Te envió una solicitud</span>`;
      case 'accepted':         return `<span class="cp-status-label cp-status-ok">✓ Compañeros</span><button class="cp-btn cp-btn-primary cp-msg-btn" data-id="${esc(userId)}">Mensaje</button><button class="cp-btn cp-btn-ghost cp-room-btn" data-id="${esc(userId)}">Estudiar juntos</button>`;
      case 'blocked':          return `<span class="cp-status-label">Bloqueado</span>`;
      default:                 return '';
    }
  }

  // Click en cualquier fila (búsqueda, solicitudes, mis compañeros) abre el
  // perfil público de esa persona — excepto si el click fue sobre un botón
  // de acción (Agregar/Aceptar/Rechazar/Eliminar/Bloquear), que ya tiene su
  // propio comportamiento.
  function _wireRowClicks(container, myId) {
    container.querySelectorAll('.cp-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.cp-row-action')) return;
        _openPublicProfileModal(row.dataset.userId, myId);
      });
    });
  }

  // Página de perfil público: foto, nombre, apodo, bio y progreso público
  // (nivel/XP/racha) de otro usuario, con el mismo estilo de tarjeta que el
  // propio "Mi Perfil" (ph2-hero + ph2-kpi-bar), no una ventana suelta vacía.
  // Incluye la misma acción de compañero que ya se muestra en las listas.
  async function _openPublicProfileModal(userId, myId) {
    const existing = document.getElementById('cp-profile-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'cp-profile-modal';
    modal.className = 'cp-profile-page';
    modal.innerHTML = `
      <div class="cp-profile-page-topbar">
        <button id="cp-profile-modal-back" class="cp-profile-back-btn">← Volver</button>
      </div>
      <div class="cp-profile-page-inner"><div class="cp-empty">Cargando…</div></div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#cp-profile-modal-back').onclick = () => modal.remove();

    const [profiles, photos, isFollowingNow] = await Promise.all([
      Companions.getPublicProfiles([userId]),
      Companions.getPrimaryPhotos([userId]),
      Companions.isFollowing(myId, userId)
    ]);
    if (!document.body.contains(modal)) return; // se cerró mientras cargaba
    const p = profiles[userId] || { id: userId, name: 'Estudiante' };
    const photoUrl = photos[userId] || null;
    const status = Companions.statusWith(myId, userId);

    const inner = modal.querySelector('.cp-profile-page-inner');
    inner.innerHTML = `
      <div class="ph2-hero cp-profile-hero">
        <div class="ph2-hero-main">
          <div class="ph2-avatar-wrap">
            <div class="pp-avatar-big ph2-avatar" style="background:${esc(_colorFor(p.id))};">${photoUrl ? `<img src="${esc(photoUrl)}" alt="" class="pp-avatar-img">` : esc(initials(p.name))}</div>
          </div>
          <div class="ph2-hero-info">
            <div class="ph2-hero-name">${esc(p.name)}</div>
            ${p.nickname ? `<div class="pp-nick-text">@${esc(p.nickname)}</div>` : ''}
            <div class="ph2-hero-msg">
              <span class="ph2-motto">${p.bio ? esc(p.bio) : 'Este usuario aún no escribió una biografía.'}</span>
            </div>
            <div class="cp-profile-social-stats">
              <span class="cp-social-stat">${p.companion_count ?? 0}<span class="cp-social-stat-lbl">Compañeros</span></span>
              <span class="cp-social-stat">${p.following_count ?? 0}<span class="cp-social-stat-lbl">Siguiendo</span></span>
              <span class="cp-social-stat">${p.follower_count ?? 0}<span class="cp-social-stat-lbl">Seguidores</span></span>
            </div>
          </div>
        </div>
        <div class="ph2-kpi-bar cp-profile-kpi-bar">
          <div class="ph2-kpi-card"><div class="ph2-kpi-icon">🎓</div><div class="ph2-kpi-lbl">Nivel</div><div class="ph2-kpi-val">${p.level ?? 1}</div></div>
          <div class="ph2-kpi-card"><div class="ph2-kpi-icon">⭐</div><div class="ph2-kpi-lbl">XP Total</div><div class="ph2-kpi-val">${(p.xp ?? 0).toLocaleString()}</div></div>
          <div class="ph2-kpi-card"><div class="ph2-kpi-icon">🔥</div><div class="ph2-kpi-lbl">Racha Actual</div><div class="ph2-kpi-val">${p.streak ?? 0} días</div></div>
        </div>
      </div>
      <div class="cp-profile-actions" id="cpProfileActionSlot">${_actionForStatus(status, userId)}${_followBtnHtml(userId, isFollowingNow)}</div>
    `;
    _wireFollowButtons(inner, myId);
    inner.querySelector('.cp-add-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await Companions.sendRequest(myId, userId);
        UI.flash('Solicitud enviada.', 'success');
        document.getElementById('cpProfileActionSlot').innerHTML = _actionForStatus('pending_sent', userId);
      } catch (err) {
        UI.flash(err?.message || 'No se pudo enviar la solicitud.', 'error');
        btn.disabled = false;
      }
    });
    _wireMsgButtons(inner, myId);
    _wireRoomButtons(inner, myId);
  }

  // Wire del botón "Mensaje" en filas/perfil (solo aparece con status
  // 'accepted'): obtiene o crea la conversación 1:1 con esa persona y abre
  // la ventana de chat.
  function _wireMsgButtons(container, myId) {
    container.querySelectorAll('.cp-msg-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const otherId = btn.dataset.id;
        btn.disabled = true;
        try {
          const convId = await Chat.getOrCreateConversation(otherId);
          _openChatWindow(convId, otherId, myId);
        } catch (err) {
          UI.flash(err?.message || 'No se pudo abrir el chat.', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  function _appendMessageBubble(listEl, m, myId) {
    const bubble = document.createElement('div');
    bubble.className = 'cp-msg-bubble ' + (m.sender_id === myId ? 'cp-msg-mine' : 'cp-msg-theirs');
    bubble.textContent = m.body;
    listEl.appendChild(bubble);
    return bubble;
  }

  // Ventana de chat 1:1 en tiempo real: historial + canal Realtime dedicado
  // filtrado por conversation_id (no el canal global 'tracknara-sync').
  // "blocked": si viene de la pestaña Mensajes con una conversación cuyo otro
  // participante está bloqueado (en cualquier dirección), deshabilita el
  // envío en vez de dejar que el usuario escriba y falle recién al enviar
  // (el server ya lo rechaza vía RLS, pero esto evita la sorpresa).
  async function _openChatWindow(conversationId, otherId, myId, blocked = false) {
    const existing = document.getElementById('cp-chat-page');
    if (existing) existing.remove();
    if (_chatChannel) { Chat.unsubscribe(_chatChannel); _chatChannel = null; }

    const page = document.createElement('div');
    page.id = 'cp-chat-page';
    page.className = 'cp-chat-page';
    page.innerHTML = `
      <div class="cp-chat-topbar">
        <button id="cp-chat-back" class="cp-profile-back-btn">← Volver</button>
        <div class="cp-chat-avatar" id="cpChatAvatar">?</div>
        <div class="cp-chat-name" id="cpChatName">Cargando…</div>
      </div>
      <div class="cp-chat-messages" id="cpChatMessages"><div class="cp-empty">Cargando…</div></div>
      <div class="cp-chat-inputbar">
        <input type="text" id="cpChatInput" class="cp-chat-input" maxlength="2000" placeholder="Escribe un mensaje..." autocomplete="off">
        <button id="cpChatSendBtn" class="cp-btn cp-btn-primary cp-chat-send-btn">Enviar</button>
      </div>
    `;
    document.body.appendChild(page);

    const closeChat = () => {
      page.remove();
      if (_chatChannel) { Chat.unsubscribe(_chatChannel); _chatChannel = null; }
    };
    page.querySelector('#cp-chat-back').onclick = closeChat;

    let profiles, photos, messages;
    try {
      [profiles, photos, messages] = await Promise.all([
        Companions.getPublicProfiles([otherId]),
        Companions.getPrimaryPhotos([otherId]),
        Chat.listMessages(conversationId)
      ]);
    } catch (err) {
      if (!document.body.contains(page)) return; // se cerró mientras cargaba
      page.querySelector('#cpChatMessages').innerHTML = `<div class="cp-empty">No se pudo cargar la conversación. Intenta de nuevo.</div>`;
      UI.flash(err?.message || 'No se pudo cargar la conversación.', 'error');
      return;
    }
    if (!document.body.contains(page)) return; // se cerró mientras cargaba

    const other = profiles[otherId] || { id: otherId, name: 'Estudiante' };
    const photoUrl = photos[otherId] || null;

    const avatarEl = page.querySelector('#cpChatAvatar');
    avatarEl.style.background = _colorFor(other.id);
    avatarEl.innerHTML = photoUrl ? `<img src="${esc(photoUrl)}" alt="" class="pp-avatar-img">` : esc(initials(other.name));
    page.querySelector('#cpChatName').textContent = other.name || 'Estudiante';

    const listEl = page.querySelector('#cpChatMessages');
    listEl.innerHTML = messages.length ? '' : '<div class="cp-empty">Aún no hay mensajes. ¡Escribe el primero!</div>';
    messages.forEach(m => _appendMessageBubble(listEl, m, myId));
    listEl.scrollTop = listEl.scrollHeight;

    _chatChannel = Chat.subscribe(conversationId, (payload) => {
      const m = payload.new;
      if (m.sender_id === myId) return; // ya se agregó de forma optimista al enviar
      listEl.querySelector('.cp-empty')?.remove();
      _appendMessageBubble(listEl, m, myId);
      listEl.scrollTop = listEl.scrollHeight;
    });

    const input = page.querySelector('#cpChatInput');
    const sendBtn = page.querySelector('#cpChatSendBtn');

    if (blocked) {
      input.disabled = true;
      sendBtn.disabled = true;
      input.placeholder = 'Ya no pueden enviarse mensajes.';
    }

    async function doSend() {
      const body = input.value.trim();
      if (!body) return;
      input.value = '';
      listEl.querySelector('.cp-empty')?.remove();
      const optimistic = { id: 'tmp-' + Date.now(), sender_id: myId, body, created_at: new Date().toISOString() };
      const bubble = _appendMessageBubble(listEl, optimistic, myId);
      listEl.scrollTop = listEl.scrollHeight;
      try {
        await Chat.sendMessage(conversationId, myId, body);
      } catch (err) {
        // El envío falló (bloqueado, red caída, etc.) — quitar la burbuja
        // optimista para no mostrar como enviado algo que no se guardó, y
        // devolver el texto al campo para que se pueda reintentar.
        bubble.remove();
        input.value = body;
        UI.flash(err?.message || 'No se pudo enviar el mensaje.', 'error');
      }
    }
    sendBtn.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
  }

  // Wire del botón "Estudiar juntos" (solo status 'accepted'): obtiene o crea
  // la sala compartida con esa persona y abre la ventana de sala.
  function _wireRoomButtons(container, myId) {
    container.querySelectorAll('.cp-room-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const otherId = btn.dataset.id;
        btn.disabled = true;
        try {
          const roomId = await StudyRooms.getOrCreateRoom(otherId);
          _openStudyRoom(roomId, otherId, myId);
        } catch (err) {
          UI.flash(err?.message || 'No se pudo abrir la sala.', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  // Tarjeta de un participante dentro de la sala, con punto de presencia
  // (verde = conectado ahora, gris = desconectado). El estado de presencia es
  // efímero (Supabase Realtime Presence) — no se persiste en ninguna tabla.
  function _roomParticipantCard(profile, photoUrl, online, isMe) {
    return `
      <div class="cp-room-card">
        <div class="cp-room-avatar-wrap">
          <div class="pp-avatar-big ph2-avatar cp-room-avatar" style="background:${esc(_colorFor(profile.id))};">${photoUrl ? `<img src="${esc(photoUrl)}" alt="" class="pp-avatar-img">` : esc(initials(profile.name))}</div>
          <span class="cp-room-presence-dot ${online ? 'cp-room-online' : 'cp-room-offline'}"></span>
        </div>
        <div class="cp-room-card-name">${esc(profile.name || 'Estudiante')}${isMe ? ' (tú)' : ''}</div>
        <div class="cp-room-card-status">${online ? 'En línea' : 'Desconectado'}</div>
      </div>`;
  }

  // Ventana de sala de estudio: dos tarjetas de participantes con presencia en
  // vivo (Supabase Realtime Presence, canal dedicado por sala). Sin chat ni
  // mensajería propia todavía (eso ya existe por separado en "Mensajes"); la
  // Fase 5 agrega TrackTutor compartido dentro de esta misma ventana.
  // "blocked": igual criterio que el chat — si el otro participante está
  // bloqueado, no se une a la presencia (no tiene sentido mostrar "en línea"
  // para una relación bloqueada) y se explica en vez de abrir la sala igual.
  async function _openStudyRoom(roomId, otherId, myId, blocked = false) {
    if (blocked) {
      UI.flash('Esta sala ya no está disponible: bloqueaste a este usuario o te bloqueó a ti.', 'error');
      return;
    }
    const existing = document.getElementById('cp-room-page');
    if (existing) existing.remove();
    if (_roomChannel) { StudyRooms.leavePresence(_roomChannel); _roomChannel = null; }
    if (_roomMsgChannel) { StudyRooms.unsubscribeRoomMessages(_roomMsgChannel); _roomMsgChannel = null; }

    const page = document.createElement('div');
    page.id = 'cp-room-page';
    page.className = 'cp-profile-page';
    page.innerHTML = `
      <div class="cp-profile-page-topbar">
        <button id="cp-room-back" class="cp-profile-back-btn">← Volver</button>
      </div>
      <div class="cp-profile-page-inner">
        <div class="ph-panel-hdr" style="margin-bottom:16px;">
          <div class="ph-panel-hdr-icon">📚</div>
          <div><div class="ph-panel-title">Sala de estudio</div><div class="ph-panel-sub">La presencia se actualiza en vivo mientras ambos tengan la sala abierta</div></div>
        </div>
        <div class="cp-room-cards" id="cpRoomCards"><div class="cp-empty">Cargando…</div></div>

        <div class="ph-panel-hdr" style="margin:24px 0 12px;">
          <div class="ph-panel-hdr-icon">🤖</div>
          <div><div class="ph-panel-title">TrackTutor compartido</div><div class="ph-panel-sub">Ambos ven la misma conversación con el tutor</div></div>
        </div>
        <div class="cp-room-tutor">
          <div class="cp-chat-messages cp-room-tutor-messages" id="cpRoomTutorMessages"><div class="cp-empty">Cargando…</div></div>
          <div class="cp-chat-inputbar cp-room-tutor-inputbar">
            <input type="text" id="cpRoomTutorInput" class="cp-chat-input" maxlength="2000" placeholder="Pregúntale algo a TrackTutor..." autocomplete="off">
            <button id="cpRoomTutorSendBtn" class="cp-btn cp-btn-primary cp-chat-send-btn">Enviar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(page);

    const closeRoom = () => {
      page.remove();
      if (_roomChannel) { StudyRooms.leavePresence(_roomChannel); _roomChannel = null; }
      if (_roomMsgChannel) { StudyRooms.unsubscribeRoomMessages(_roomMsgChannel); _roomMsgChannel = null; }
    };
    page.querySelector('#cp-room-back').onclick = closeRoom;

    let profiles, photos;
    try {
      [profiles, photos] = await Promise.all([
        Companions.getPublicProfiles([otherId, myId]),
        Companions.getPrimaryPhotos([otherId, myId])
      ]);
    } catch (err) {
      if (!document.body.contains(page)) return;
      page.querySelector('#cpRoomCards').innerHTML = '<div class="cp-empty">No se pudo cargar la sala. Intenta de nuevo.</div>';
      UI.flash(err?.message || 'No se pudo cargar la sala.', 'error');
      return;
    }
    if (!document.body.contains(page)) return; // se cerró mientras cargaba

    const other = profiles[otherId] || { id: otherId, name: 'Estudiante' };
    const me = profiles[myId] || { id: myId, name: 'Tú' };
    const cardsEl = page.querySelector('#cpRoomCards');

    const renderCards = (onlineSet) => {
      cardsEl.innerHTML =
        _roomParticipantCard(me, photos[myId], onlineSet.has(myId), true) +
        _roomParticipantCard(other, photos[otherId], onlineSet.has(otherId), false);
    };
    renderCards(new Set());

    _roomChannel = StudyRooms.joinPresence(roomId, myId, (onlineSet) => {
      if (!document.body.contains(page)) return;
      renderCards(onlineSet);
    });

    // ── TrackTutor compartido ──
    // Reutiliza AiChatProxy (mismo cliente que las sesiones individuales de
    // TrackTutor) sin tocar el _chatState individual: aquí el "historial" es
    // room_messages, una tabla propia, visible para ambos participantes.
    const tutorListEl = page.querySelector('#cpRoomTutorMessages');
    const tutorInput = page.querySelector('#cpRoomTutorInput');
    const tutorSendBtn = page.querySelector('#cpRoomTutorSendBtn');
    const seenMsgIds = new Set();
    let roomHistory = [];

    try {
      const msgs = await StudyRooms.listRoomMessages(roomId);
      if (!document.body.contains(page)) return;
      roomHistory = msgs;
      tutorListEl.innerHTML = msgs.length ? '' : '<div class="cp-empty">Escríbanle algo a TrackTutor para empezar a estudiar juntos.</div>';
      msgs.forEach(m => { seenMsgIds.add(m.id); _appendRoomBubble(tutorListEl, m, myId); });
      tutorListEl.scrollTop = tutorListEl.scrollHeight;
    } catch (err) {
      if (!document.body.contains(page)) return;
      tutorListEl.innerHTML = '<div class="cp-empty">No se pudo cargar la conversación con TrackTutor.</div>';
    }

    _roomMsgChannel = StudyRooms.subscribeRoomMessages(roomId, (payload) => {
      if (!document.body.contains(page)) return;
      const m = payload.new;
      if (seenMsgIds.has(m.id)) return; // ya renderizado (propio o eco de nuestra propia inserción)
      seenMsgIds.add(m.id);
      roomHistory.push(m);
      tutorListEl.querySelector('.cp-empty')?.remove();
      _appendRoomBubble(tutorListEl, m, myId);
      tutorListEl.scrollTop = tutorListEl.scrollHeight;
    });

    async function doSendTutor() {
      const body = tutorInput.value.trim();
      if (!body) return;
      tutorInput.value = '';
      tutorListEl.querySelector('.cp-empty')?.remove();

      let ownMsg;
      try {
        ownMsg = await StudyRooms.sendRoomMessage(roomId, myId, body);
      } catch (err) {
        tutorInput.value = body;
        UI.flash(err?.message || 'No se pudo enviar el mensaje.', 'error');
        return;
      }
      seenMsgIds.add(ownMsg.id);
      roomHistory.push(ownMsg);
      _appendRoomBubble(tutorListEl, ownMsg, myId);
      tutorListEl.scrollTop = tutorListEl.scrollHeight;

      const thinking = document.createElement('div');
      thinking.className = 'cp-msg-bubble cp-msg-assistant cp-msg-thinking';
      thinking.textContent = 'TrackTutor está escribiendo…';
      tutorListEl.appendChild(thinking);
      tutorListEl.scrollTop = tutorListEl.scrollHeight;

      const historyForAI = roomHistory.slice(0, -1).map(m => ({
        role: m.sender === 'assistant' ? 'model' : 'user',
        content: m.body
      }));
      // buildSystemPrompt (api/ai-chat.js) arma la frase fija
      // "para un estudiante de ${grade} de secundaria peruana. Enseñas ${subject}."
      // — grade='secundaria' duplicaba "secundaria de secundaria" y un subject
      // narrativo quedaba raro después de "Enseñas". Estos valores calzan en
      // esa plantilla sin sonar absurdos.
      const metadata = { subject: 'temas de estudio en general (sesión compartida entre dos compañeros)', grade: 'cualquier grado' };
      let fullText = '';
      let firstChunk = true;
      try {
        fullText = await AiChatProxy.sendMessage(metadata, historyForAI, body, (chunk) => {
          if (firstChunk) { thinking.textContent = ''; firstChunk = false; }
          thinking.textContent += chunk;
          tutorListEl.scrollTop = tutorListEl.scrollHeight;
        });
      } catch (err) {
        thinking.remove();
        UI.flash('TrackTutor no pudo responder. Intenta de nuevo.', 'error');
        return;
      }
      thinking.classList.remove('cp-msg-thinking');
      thinking.textContent = fullText;

      try {
        const savedAssistant = await StudyRooms.sendRoomMessage(roomId, 'assistant', fullText);
        seenMsgIds.add(savedAssistant.id);
        roomHistory.push(savedAssistant);
      } catch (err) {
        // La respuesta ya se ve localmente aunque falle el guardado; el otro
        // participante no la verá hasta que alguien vuelva a preguntar algo.
        window.Monitor?.log?.('study-rooms', 'No se pudo guardar respuesta de TrackTutor', err?.message);
      }
    }
    tutorSendBtn.addEventListener('click', doSendTutor);
    tutorInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSendTutor(); });
  }

  function _appendRoomBubble(listEl, m, myId) {
    const bubble = document.createElement('div');
    bubble.className = 'cp-msg-bubble ' + (m.sender === 'assistant' ? 'cp-msg-assistant' : (m.sender === myId ? 'cp-msg-mine' : 'cp-msg-theirs'));
    bubble.textContent = m.body;
    listEl.appendChild(bubble);
    return bubble;
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
      const [photos, followingRows] = await Promise.all([
        Companions.getPrimaryPhotos(results.map(p => p.id)),
        Companions.listFollowing(myId)
      ]);
      const followSet = new Set(followingRows.map(f => f.followed_id));
      resultsBox.innerHTML = results.map(p => {
        const status = Companions.statusWith(myId, p.id);
        return _rowHtml(p, photos[p.id], _actionForStatus(status, p.id), null, _followBtnHtml(p.id, followSet.has(p.id)));
      }).join('');
      _wireAddButtons();
      _wireRowClicks(resultsBox, myId);
      _wireMsgButtons(resultsBox, myId);
      _wireRoomButtons(resultsBox, myId);
      _wireFollowButtons(resultsBox, myId);
    }
    function _wireAddButtons() {
      resultsBox.querySelectorAll('.cp-add-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
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
      _wireRowClicks(box, myId);

      box.querySelectorAll('.cp-accept-btn').forEach(btn => btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        btn.disabled = true;
        await Companions.respond(btn.dataset.conn, true);
        UI.flash('Ahora son compañeros.', 'success');
        _renderRequests(); _renderMine();
      }));
      box.querySelectorAll('.cp-reject-btn, .cp-cancel-btn').forEach(btn => btn.addEventListener('click', async (e) => {
        e.stopPropagation();
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
          <button class="cp-btn cp-btn-primary cp-msg-btn" data-id="${esc(otherId)}">Mensaje</button>
          <button class="cp-btn cp-btn-ghost cp-room-btn" data-id="${esc(otherId)}">Estudiar juntos</button>
          <button class="cp-btn cp-btn-ghost cp-remove-btn" data-conn="${esc(c.id)}">Eliminar</button>
          <button class="cp-btn cp-btn-ghost cp-block-btn" data-conn="${esc(c.id)}">Bloquear</button>`;
        return _rowHtml(p, photos[otherId], actions);
      }).join('');
      _wireRowClicks(box, myId);
      _wireMsgButtons(box, myId);
      _wireRoomButtons(box, myId);

      box.querySelectorAll('.cp-remove-btn').forEach(btn => btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar a este compañero?')) return;
        btn.disabled = true;
        await Companions.remove(btn.dataset.conn);
        UI.flash('Compañero eliminado.', 'success');
        _renderMine();
      }));
      box.querySelectorAll('.cp-block-btn').forEach(btn => btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('¿Bloquear a este usuario? Ya no podrá contactarte ni encontrarte en la búsqueda.')) return;
        btn.disabled = true;
        await Companions.block(btn.dataset.conn, myId);
        UI.flash('Usuario bloqueado.', 'success');
        _renderMine();
      }));
    }

    // ── Mensajes ──
    async function _renderMessages() {
      const box = r().querySelector('#cpMessagesList');
      if (!box) return;
      let convs = [];
      try { convs = await Chat.listConversations(); } catch (_) { convs = []; }
      if (!convs.length) { box.innerHTML = '<div class="cp-empty">Todavía no tienes conversaciones. Escríbele a un compañero desde "Mis Compañeros".</div>'; return; }

      const photos = await Companions.getPrimaryPhotos(convs.map(c => c.other_id));
      box.innerHTML = convs.map(c => {
        const photoUrl = photos[c.other_id];
        return `
          <div class="cp-row cp-conv-row" data-conv-id="${esc(c.conversation_id)}" data-other-id="${esc(c.other_id)}" data-blocked="${c.blocked ? '1' : ''}">
            <div class="cp-row-avatar" style="background:${esc(_colorFor(c.other_id))};">${photoUrl ? `<img src="${esc(photoUrl)}" alt="">` : esc(initials(c.other_name))}</div>
            <div class="cp-row-info">
              <div class="cp-row-name">${esc(c.other_name || 'Estudiante')}</div>
              <div class="cp-row-sub">${c.blocked ? 'Bloqueado' : (c.last_body ? esc(c.last_body).slice(0, 60) : 'Sin mensajes todavía')}</div>
            </div>
          </div>`;
      }).join('');
      box.querySelectorAll('.cp-conv-row').forEach(row => {
        row.addEventListener('click', () => _openChatWindow(row.dataset.convId, row.dataset.otherId, myId, row.dataset.blocked === '1'));
      });
    }

    // ── Salas ──
    async function _renderRooms() {
      const box = r().querySelector('#cpRoomsList');
      if (!box) return;
      let rooms = [];
      try { rooms = await StudyRooms.listRooms(); } catch (_) { rooms = []; }
      if (!rooms.length) { box.innerHTML = '<div class="cp-empty">Todavía no tienes salas. Ábrele una a un compañero desde "Mis Compañeros".</div>'; return; }

      const photos = await Companions.getPrimaryPhotos(rooms.map(r => r.other_id));
      box.innerHTML = rooms.map(rm => {
        const photoUrl = photos[rm.other_id];
        return `
          <div class="cp-row cp-room-row" data-room-id="${esc(rm.room_id)}" data-other-id="${esc(rm.other_id)}" data-blocked="${rm.blocked ? '1' : ''}">
            <div class="cp-row-avatar" style="background:${esc(_colorFor(rm.other_id))};">${photoUrl ? `<img src="${esc(photoUrl)}" alt="">` : esc(initials(rm.other_name))}</div>
            <div class="cp-row-info">
              <div class="cp-row-name">${esc(rm.other_name || 'Estudiante')}</div>
              <div class="cp-row-sub">${rm.blocked ? 'Bloqueado' : 'Sala de estudio'}</div>
            </div>
          </div>`;
      }).join('');
      box.querySelectorAll('.cp-room-row').forEach(row => {
        row.addEventListener('click', () => _openStudyRoom(row.dataset.roomId, row.dataset.otherId, myId, row.dataset.blocked === '1'));
      });
    }

    // ── Siguiendo ──
    async function _renderFollowing() {
      const box = r().querySelector('#cpFollowingList');
      if (!box) return;
      const rows = await Companions.listFollowing(myId).catch(() => []);
      if (!rows.length) { box.innerHTML = '<div class="cp-empty">Todavía no sigues a nadie. Busca estudiantes que te inspiren por su experiencia, materias o carrera.</div>'; return; }

      const otherIds = rows.map(r => r.followed_id);
      const [profiles, photos] = await Promise.all([Companions.getPublicProfiles(otherIds), Companions.getPrimaryPhotos(otherIds)]);
      box.innerHTML = rows.map(r => {
        const p = profiles[r.followed_id] || { id: r.followed_id, name: 'Estudiante' };
        return _rowHtml(p, photos[r.followed_id], '', null, _followBtnHtml(r.followed_id, true));
      }).join('');
      _wireRowClicks(box, myId);
      _wireFollowButtons(box, myId, _renderFollowing);
    }

    resultsBox.innerHTML = '<div class="cp-empty">Escribe un nombre o apodo para empezar a buscar.</div>';
    _renderRequests();
    _renderMine();
    _renderMessages();
    _renderRooms();
    _renderFollowing();

    // Expuesto para refresco en tiempo real (ver app.js): Storage ya trae
    // datos frescos vía el bootstrap de Realtime aunque esta pantalla esté
    // en _REALTIME_SKIP (ese set solo bloquea el re-render completo de
    // pantalla, no el refetch). Re-renderiza solo las listas de abajo —
    // nunca el buscador — para no perder lo que el usuario esté escribiendo.
    _liveRefreshers = { requests: _renderRequests, mine: _renderMine, messages: _renderMessages, rooms: _renderRooms, following: _renderFollowing };
  }

  let _liveRefreshers = null;
  function liveRefresh() {
    if (!_liveRefreshers || !document.getElementById('cpRequestsList')) return; // no estamos en Compañeros
    Object.values(_liveRefreshers).forEach(fn => fn());
  }

  // Cierra cualquier overlay de Compañeros (perfil público / chat) que haya
  // quedado abierto. Estos overlays se agregan a document.body (no dentro de
  // #app) para poder cubrir toda la pantalla, así que el router NO los limpia
  // al navegar — App.go() debe llamar esto en cada navegación, o si el
  // usuario sale de "Compañeros" tocando otro botón del menú en vez de
  // "← Volver", el overlay queda atascado sobre toda la app y el canal
  // Realtime del chat sigue suscrito para siempre.
  function closeOverlays() {
    document.getElementById('cp-chat-page')?.remove();
    document.getElementById('cp-profile-modal')?.remove();
    document.getElementById('cp-room-page')?.remove();
    if (_chatChannel) { Chat.unsubscribe(_chatChannel); _chatChannel = null; }
    if (_roomChannel) { StudyRooms.leavePresence(_roomChannel); _roomChannel = null; }
    if (_roomMsgChannel) { StudyRooms.unsubscribeRoomMessages(_roomMsgChannel); _roomMsgChannel = null; }
  }

  // Compañeros pendientes que ME enviaron la solicitud — usado por el badge
  // de la barra de navegación (visible en cualquier pantalla, no solo en
  // Compañeros), calculado desde el estado ya sincronizado localmente.
  function pendingReceivedCount(myId) {
    if (!myId) return 0;
    return Companions.listMine(myId).filter(c => c.status === 'pending' && c.requestedBy !== myId).length;
  }

  return {
    screens: { companions: { render: screenCompanions, wire: wireCompanions } },
    closeOverlays, liveRefresh, pendingReceivedCount
  };
})();
