// youtube-recommender.js — IIFE module
// Recomienda UN solo video de YouTube, únicamente cuando el alumno hace click
// en el botón "📹 Videos" (nunca automático). Usa TODA la conversación
// acumulada hasta ese momento (no solo el último mensaje) para que la
// recomendación entienda el contexto completo de la sesión, y elige el video
// mediante IA entre candidatos reales de YouTube — nunca inventa datos.
// Se autoregistra en window.YoutubeRecommender.

window.YoutubeRecommender = (() => {

  function _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ── Llamada al backend ────────────────────────────────────────────────────

  async function _fetchRecommendation() {
    const ctx = window._trackfocusChatCtx || {};
    const history = window._trackfocusChatHistory || [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recommend-video', metadata: ctx, history }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) return await res.json();
    } catch (_) {
      clearTimeout(timer);
    }
    return { video: null, fallbackQuery: ctx.topicGoal || ctx.subject || '' };
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function _renderResult(bubble, data) {
    const wrap = bubble.closest('.chat-bubble-wrap');
    if (!wrap) return;

    // Evitar duplicar la sección si el alumno pide videos varias veces sobre el mismo mensaje
    const existing = wrap.querySelector('.yt-rec-section');
    if (existing) existing.remove();

    const section = document.createElement('div');
    section.className = 'yt-rec-section';

    if (data && data.video) {
      const v = data.video;
      section.innerHTML =
        '<div class="yt-rec-header"><span class="yt-rec-icon">▶</span><span class="yt-rec-title">Recurso recomendado para ti</span></div>' +
        '<div class="yt-rec-player">' +
          `<iframe src="https://www.youtube-nocookie.com/embed/${_esc(v.videoId)}" ` +
          'title="Video recomendado" frameborder="0" loading="lazy" ' +
          'allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>' +
        '</div>' +
        `<div class="yt-rec-card-title">${_esc(v.title)}</div>` +
        (v.channel ? `<div class="yt-rec-channel">${_esc(v.channel)}${v.durationLabel ? ' · ' + _esc(v.durationLabel) : ''}</div>` : '') +
        (v.reason ? `<div class="yt-rec-reason">${_esc(v.reason)}</div>` : '');
    } else {
      const q = (data && data.fallbackQuery) || '';
      section.innerHTML =
        '<div class="yt-rec-header"><span class="yt-rec-icon">▶</span><span class="yt-rec-title">Recurso recomendado para ti</span></div>' +
        '<div class="yt-rec-empty">No encontramos un video que valga la pena recomendarte con confianza para este momento.' +
        (q ? ` <a class="yt-rec-search-link" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}" target="_blank" rel="noopener">Buscar "${_esc(q)}" en YouTube →</a>` : '') +
        '</div>';
    }

    wrap.appendChild(section);

    const msgs = document.getElementById('chatMessages');
    if (msgs) setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 150);
  }

  // ── API pública ───────────────────────────────────────────────────────────

  function init() {
    // Sin trigger automático: no hay observer, no hay detección de intención
    // en el texto del alumno. La única entrada es requestVideos().
  }

  // Llamar desde el botón "📹 Videos": recomienda en base a toda la sesión.
  async function requestVideos() {
    const iaBubbles = document.querySelectorAll('.chat-bubble.ia');
    const lastBubble = iaBubbles[iaBubbles.length - 1];
    if (!lastBubble) return;

    const btn = document.getElementById('chatVideosBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Buscando...'; }
    const restore = () => { if (btn) { btn.disabled = false; btn.textContent = '📹 Videos'; } };

    try {
      const data = await _fetchRecommendation();
      _renderResult(lastBubble, data);
    } finally {
      restore();
    }
  }

  return { init, requestVideos };

})();

// Auto-arranque (no registra observers, solo deja el módulo listo)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.YoutubeRecommender.init());
} else {
  window.YoutubeRecommender.init();
}
