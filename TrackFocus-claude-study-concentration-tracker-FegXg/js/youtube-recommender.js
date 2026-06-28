// youtube-recommender.js — IIFE module
// Detecta burbujas IA terminadas y sugiere videos de YouTube relevantes.
// Se autoregistra en window.YoutubeRecommender.

window.YoutubeRecommender = (() => {

  // ── Estado del módulo ─────────────────────────────────────────────────────────
  const _shownVideoIds    = new Set();    // deduplicación en sesión
  const _processedBubbles = new WeakSet();// evita reprocesar el mismo bubble
  const _debounceMap      = new Map();    // timers por bubble element
  let   _observer         = null;         // MutationObserver activo
  let   _lastChatMessages = null;         // referencia al #chatMessages actual
  let   _pendingExplicit  = false;        // usuario pidió videos explícitamente

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ── Detección de solicitud explícita de videos ───────────────────────────────

  function _isVideoRequest(text) {
    const t = (text || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    return /\b(videos?|recursos?|canales?|youtube|recomiend|muestr[ae]me|buscame|dame videos?|ver videos?)\b/.test(t);
  }

  // ── Lógica de filtrado ────────────────────────────────────────────────────────

  function _shouldRecommend(iaText, userText) {
    if (iaText.length < 120) return false;
    if (/^(Hola|De nada|Claro,)/.test(iaText.trim())) return false;
    if (!userText || userText.trim().length < 8) return false;
    return true;
  }

  // ── Extracción de tema ────────────────────────────────────────────────────────

  function _extractTopic(userMsg, iaMsg) {
    const cleanUser = (userMsg || '')
      .replace(/[¿?¡!]/g, '')
      .trim()
      .slice(0, 80);

    if (cleanUser.length >= 6) return cleanUser;

    // Fallback: primera línea de iaMsg sin markdown
    const firstLine = (iaMsg || '')
      .split('\n')
      .find(l => l.trim().length > 0) || '';
    return firstLine
      .replace(/^#+\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/[*_`]/g, '')
      .trim()
      .slice(0, 80);
  }

  // Para solicitudes explícitas: extraer tema del contexto o del AI response
  function _extractTopicFromCtx(ctx, iaText) {
    if (ctx.topicGoal && ctx.topicGoal.trim().length > 3) return ctx.topicGoal.trim().slice(0, 80);
    if (ctx.subject && ctx.subject.trim().length > 2) return ctx.subject.trim();
    const firstLine = (iaText || '').split('\n').find(l => l.trim().length > 0) || '';
    return firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/[*_`]/g, '').trim().slice(0, 80);
  }

  // ── Construcción de queries ───────────────────────────────────────────────────

  function _buildQueries(ctx, topic) {
    const { grade = '', subject = '', studyMode = '' } = ctx;

    const gradeMap = {
      '1°': '1ro secundaria',
      '2°': '2do secundaria',
      '3°': '3ro secundaria',
      '4°': '4to secundaria',
      '5°': '5to secundaria'
    };
    const gradeLabel = gradeMap[grade] || grade || 'secundaria';

    switch (studyMode) {
      case 'exam-prep':
        return [
          `${topic} ${subject} ejercicios resueltos`,
          `${topic} examen preparación ${gradeLabel}`,
          `${topic} problemas resueltos paso a paso`
        ];
      case 'topic-mastery':
        return [
          `${topic} ${subject} explicación completa`,
          `${topic} ${gradeLabel} desde cero`,
          `${topic} tutorial`
        ];
      case 'practice':
        return [
          `${topic} ejercicios resueltos ${subject}`,
          `${topic} problemas paso a paso`,
          `${topic} ${gradeLabel}`
        ];
      default:
        return [
          `${topic} ${subject} ${gradeLabel}`,
          `${topic} explicación fácil`,
          `${topic} ejemplos`
        ];
    }
  }

  // ── Fetch de videos ───────────────────────────────────────────────────────────

  async function _fetchVideos(queries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('/api/youtube-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries, maxResults: 3, language: 'es' }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const videos = Array.isArray(data.videos) ? data.videos : [];
        if (videos.length > 0) return videos;
      }
    } catch (_) {
      clearTimeout(timer);
    }
    // Fallback local: siempre retorna búsquedas de YouTube aunque el API falle o dé 429
    return queries.slice(0, 3).map(q => ({
      title: `Buscar en YouTube: ${q}`,
      channel: 'YouTube',
      description: 'Haz clic para buscar este tema en YouTube',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      isSearch: true
    }));
  }

  // ── Render de recomendaciones ─────────────────────────────────────────────────

  function _renderRecommendations(bubble, videos, isExplicit) {
    let fresh;
    if (isExplicit) {
      fresh = videos; // click explícito: mostrar sin deduplicar
    } else {
      fresh = videos.filter(v => {
        const key = v.videoId || v.url;
        if (_shownVideoIds.has(key)) return false;
        _shownVideoIds.add(key);
        return true;
      });
    }

    const msgs = _lastChatMessages || document.getElementById('chatMessages');

    if (fresh.length === 0) {
      if (isExplicit) {
        const notice = document.createElement('div');
        notice.className = 'yt-rec-empty';
        notice.textContent = 'No se encontraron videos para este tema. Intenta preguntar sobre un concepto específico.';
        const wrap = bubble.closest('.chat-bubble-wrap');
        if (wrap) wrap.appendChild(notice);
        if (msgs) setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 100);
      }
      return;
    }

    // Construir sección
    const section = document.createElement('div');
    section.className = 'yt-rec-section';

    // Header con toggle
    const header = document.createElement('div');
    header.className = 'yt-rec-header';
    header.innerHTML =
      '<span class="yt-rec-icon">▶</span>' +
      '<span class="yt-rec-title">Recursos recomendados</span>';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'yt-rec-toggle';
    toggleBtn.textContent = '▲';
    header.appendChild(toggleBtn);
    section.appendChild(header);

    // Lista de cards
    const list = document.createElement('div');
    list.className = 'yt-rec-list';

    for (const v of fresh) {
      const card = document.createElement('a');
      card.className = 'yt-rec-card' + (v.isSearch ? ' yt-rec-search' : '');
      card.href = _esc(v.url);
      card.target = '_blank';
      card.rel = 'noopener';

      let inner = '';

      if (v.thumbnail) {
        inner += `<img class="yt-rec-thumb" src="${_esc(v.thumbnail)}" loading="lazy" alt="">`;
      }

      inner += '<div class="yt-rec-info">';
      inner += `<div class="yt-rec-card-title">${_esc(v.title)}</div>`;
      if (v.channel) inner += `<div class="yt-rec-channel">${_esc(v.channel)}</div>`;
      if (v.description) inner += `<div class="yt-rec-desc">${_esc(v.description)}</div>`;
      inner += '</div>';

      inner += '<div class="yt-rec-arrow">→</div>';

      card.innerHTML = inner;
      list.appendChild(card);
    }

    section.appendChild(list);

    // Toggle comportamiento
    header.addEventListener('click', () => {
      const collapsed = list.classList.toggle('yt-rec-collapsed');
      toggleBtn.textContent = collapsed ? '▼' : '▲';
    });

    // Insertar en el wrap del bubble
    const wrap = bubble.closest('.chat-bubble-wrap');
    if (wrap) wrap.appendChild(section);

    // Scroll suave
    if (msgs) setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 150);
  }

  // ── Procesamiento de un bubble ────────────────────────────────────────────────

  async function _processBubble(bubble, forceExplicit) {
    if (_processedBubbles.has(bubble)) return;
    _processedBubbles.add(bubble);

    const isExplicit = forceExplicit || _pendingExplicit;
    if (isExplicit) _pendingExplicit = false;

    const iaText = bubble.textContent || '';
    const ctx = window._arivenChatCtx || {};

    // Último mensaje del usuario
    const userBubbles = document.querySelectorAll('.chat-bubble.user');
    const lastUserBubble = userBubbles[userBubbles.length - 1];
    const lastUserMsg = lastUserBubble ? (lastUserBubble.textContent || '') : '';

    if (!isExplicit && !_shouldRecommend(iaText, lastUserMsg)) return;

    // Para solicitudes explícitas, el tema viene del contexto; para automáticas, del mensaje del usuario
    const topic   = isExplicit
      ? _extractTopicFromCtx(ctx, iaText)
      : _extractTopic(lastUserMsg, iaText);
    const queries = _buildQueries(ctx, topic);
    const videos  = await _fetchVideos(queries);

    if (videos.length > 0 || isExplicit) {
      _renderRecommendations(bubble, videos, isExplicit);
    }
  }

  // ── Debounce de procesamiento ─────────────────────────────────────────────────

  function _scheduleBubbleProcess(bubble) {
    if (_debounceMap.has(bubble)) {
      clearTimeout(_debounceMap.get(bubble));
    }
    const timer = setTimeout(() => {
      _debounceMap.delete(bubble);
      _processBubble(bubble);
    }, 2500);
    _debounceMap.set(bubble, timer);
  }

  // ── MutationObserver callback ─────────────────────────────────────────────────

  function _onMutation(mutations) {
    for (const m of mutations) {
      if (m.type !== 'childList') continue;

      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.id === 'chatTyping') continue;

        if (node.classList && node.classList.contains('chat-bubble-wrap')) {
          if (node.classList.contains('ia')) {
            // Nueva burbuja IA: programar procesamiento
            const bub = node.querySelector('.chat-bubble.ia');
            if (bub) _scheduleBubbleProcess(bub);
          } else if (node.classList.contains('user')) {
            // Nueva burbuja usuario: detectar solicitud explícita de videos
            const userBub = node.querySelector('.chat-bubble.user');
            if (userBub && _isVideoRequest(userBub.textContent)) {
              _pendingExplicit = true;
            }
          }
        }
      }

      // Streaming: mutaciones dentro de un bubble IA ya existente
      if (m.target && m.target.classList &&
          m.target.classList.contains('chat-bubble') &&
          m.target.classList.contains('ia')) {
        _scheduleBubbleProcess(m.target);
      }
    }
  }

  // ── Setup del observer ────────────────────────────────────────────────────────

  function _setupChatObserver() {
    const messages = document.getElementById('chatMessages');
    if (!messages || messages === _lastChatMessages) return;

    _lastChatMessages = messages;
    _shownVideoIds.clear(); // nueva sesión de chat

    if (_observer) _observer.disconnect();

    _observer = new MutationObserver(_onMutation);
    _observer.observe(messages, {
      childList: true,
      subtree: true,
      characterData: false
    });
  }

  // ── API pública ───────────────────────────────────────────────────────────────

  function init() {
    _setupChatObserver();
    setInterval(_setupChatObserver, 800);
  }

  // Llamar desde el botón "📹 Videos": fuerza recomendaciones sobre el último bubble IA
  function requestVideos() {
    const iaBubbles = document.querySelectorAll('.chat-bubble.ia');
    const lastBubble = iaBubbles[iaBubbles.length - 1];
    if (!lastBubble) return;

    const btn = document.getElementById('chatVideosBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Buscando...'; }
    const restore = () => { if (btn) { btn.disabled = false; btn.textContent = '📹 Videos'; } };

    _processedBubbles.delete(lastBubble);
    _processBubble(lastBubble, true).finally(restore);
  }

  return { init, requestVideos };

})();

// Auto-arranque
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.YoutubeRecommender.init());
} else {
  window.YoutubeRecommender.init();
}
