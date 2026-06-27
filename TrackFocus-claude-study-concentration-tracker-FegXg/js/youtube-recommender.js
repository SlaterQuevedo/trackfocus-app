// youtube-recommender.js — IIFE module
// Detecta burbujas IA terminadas y sugiere videos de YouTube relevantes.
// Se autoregistra en window.YoutubeRecommender.

const YoutubeRecommender = (() => {

  // ── Estado del módulo ─────────────────────────────────────────────────────────
  const _shownVideoIds    = new Set();    // deduplicación en sesión
  const _processedBubbles = new WeakSet();// evita reprocesar el mismo bubble
  const _debounceMap      = new Map();    // timers por bubble element
  let   _observer         = null;         // MutationObserver activo
  let   _lastChatMessages = null;         // referencia al #chatMessages actual

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

  // ── Construcción de queries ───────────────────────────────────────────────────

  function _buildQueries(ctx, topic) {
    const { grade = '', subject = '', studyMode = '' } = ctx;

    const gradeMap = {
      '1ro': '1ro secundaria',
      '2do': '2do secundaria',
      '3ro': '3ro secundaria',
      '4to': '4to secundaria',
      '5to': '5to secundaria'
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
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.videos) ? data.videos : [];
    } catch (_) {
      clearTimeout(timer);
      return [];
    }
  }

  // ── Render de recomendaciones ─────────────────────────────────────────────────

  function _renderRecommendations(bubble, videos) {
    // Filtrar videos ya mostrados esta sesión
    const fresh = videos.filter(v => {
      const key = v.videoId || v.url;
      if (_shownVideoIds.has(key)) return false;
      _shownVideoIds.add(key);
      return true;
    });

    if (fresh.length === 0) return;

    const msgs = _lastChatMessages || document.getElementById('chatMessages');

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

  async function _processBubble(bubble) {
    if (_processedBubbles.has(bubble)) return;
    _processedBubbles.add(bubble);

    const iaText = bubble.textContent || '';
    const ctx = window._arivenChatCtx || {};

    // Último mensaje del usuario
    const userBubbles = document.querySelectorAll('.chat-bubble.user');
    const lastUserBubble = userBubbles[userBubbles.length - 1];
    const lastUserMsg = lastUserBubble ? (lastUserBubble.textContent || '') : '';

    if (!_shouldRecommend(iaText, lastUserMsg)) return;

    const topic   = _extractTopic(lastUserMsg, iaText);
    const queries = _buildQueries(ctx, topic);
    const videos  = await _fetchVideos(queries);

    if (videos.length > 0) {
      _renderRecommendations(bubble, videos);
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
      // childList: nodos añadidos
      if (m.type === 'childList') {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.id === 'chatTyping') continue;

          // Si es el wrap completo de IA
          if (node.classList && node.classList.contains('chat-bubble-wrap') &&
              node.classList.contains('ia')) {
            const bub = node.querySelector('.chat-bubble.ia');
            if (bub) _scheduleBubbleProcess(bub);
            continue;
          }
        }

        // Si la mutación ocurrió dentro de un bubble IA (streaming)
        if (m.target && m.target.classList &&
            m.target.classList.contains('chat-bubble') &&
            m.target.classList.contains('ia')) {
          _scheduleBubbleProcess(m.target);
        }
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

  // ── Punto de entrada público ──────────────────────────────────────────────────

  function init() {
    _setupChatObserver();
    setInterval(_setupChatObserver, 800);
  }

  return { init };

})();

// Auto-arranque
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => YoutubeRecommender.init());
} else {
  YoutubeRecommender.init();
}
