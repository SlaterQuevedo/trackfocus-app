// Modo DECO (Fase 5 V2): evaluación inteligente en 4 niveles cognitivos
// (Comprensión, Aplicación, Razonamiento, Análisis crítico). Genera 12 preguntas
// de opción múltiple vía el proxy /api/ai-chat (action 'deco'), las presenta como
// tarjetas expandibles DENTRO del chat (no modal, no interrumpe el flujo) y calcula
// el puntaje por nivel + el Índice de Aprendizaje (0-100).
// Degradación elegante: si la IA falla, generate() devuelve null y el flujo sigue.
const Deco = (() => {

  const LEVELS = [
    { key: 'comprehension', label: 'Comprensión',      icon: '🔵', desc: '¿Qué significa?' },
    { key: 'application',   label: 'Aplicación',       icon: '🟡', desc: '¿Cómo lo usarías?' },
    { key: 'reasoning',     label: 'Razonamiento',     icon: '🟠', desc: '¿Por qué ocurre?' },
    { key: 'analysis',      label: 'Análisis crítico', icon: '🔴', desc: '¿Qué limitaciones tiene?' }
  ];

  function _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // Valida un array de preguntas (mismo contrato que el quiz).
  function _validate(arr) {
    return (Array.isArray(arr) ? arr : [])
      .filter(q => q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length >= 2)
      .map(q => ({
        q: q.q,
        options: q.options.slice(0, 4),
        answer: Math.max(0, Math.min(q.options.length - 1, Number(q.answer) || 0))
      }))
      .slice(0, 3);
  }

  // Pide al proxy las 12 preguntas (4 niveles × 3). Devuelve el objeto por nivel
  // o null si no hay ninguna pregunta utilizable.
  async function generate(metadata, topic) {
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deco', metadata, topic: topic || metadata?.subject })
      });
      if (!res.ok) return null;
      const json = await res.json();
      const blocks = {
        comprehension: _validate(json.comprehension),
        application:   _validate(json.application),
        reasoning:     _validate(json.reasoning),
        analysis:      _validate(json.analysis)
      };
      const total = LEVELS.reduce((n, l) => n + blocks[l.key].length, 0);
      return total > 0 ? blocks : null;
    } catch (e) {
      window.Monitor?.log?.('arv-intelligence', 'DECO generate falló', e?.message);
      return null;
    }
  }

  // Inserta la tarjeta DECO en el contenedor del chat (parentEl). Cuando el alumno
  // pulsa "Calificar", llama onComplete(result). result = {
  //   decoScore (0-12), total, byLevel: {comprehension, application, reasoning, analysis} }
  function renderInto(parentEl, blocks, onComplete) {
    if (!parentEl || !blocks) return;

    const card = document.createElement('div');
    card.className = 'deco-card';

    const levelsHtml = LEVELS.map(l => {
      const qs = blocks[l.key] || [];
      if (!qs.length) return '';
      const qHtml = qs.map((q, qi) => `
        <div class="deco-q" data-level="${l.key}" data-qi="${qi}" data-answer="${q.answer}">
          <p class="deco-q-text">${_esc(q.q)}</p>
          <div class="deco-opts">
            ${q.options.map((op, oi) => `
              <label class="deco-opt">
                <input type="radio" name="deco-${l.key}-${qi}" value="${oi}">
                <span>${_esc(op)}</span>
              </label>`).join('')}
          </div>
        </div>`).join('');
      return `
        <details class="deco-level deco-${l.key}">
          <summary><span class="deco-level-badge">${l.icon} ${l.label}</span> <span class="muted">${_esc(l.desc)}</span></summary>
          <div class="deco-level-body">${qHtml}</div>
        </details>`;
    }).join('');

    card.innerHTML = `
      <div class="deco-head">
        <span class="deco-title">🎯 Evaluación DECO</span>
        <span class="muted" style="font-size:12px;">Responde para medir tu comprensión real. ¡Expande cada nivel!</span>
      </div>
      ${levelsHtml}
      <div class="deco-actions">
        <button class="primary" data-deco-grade>Calificar evaluación</button>
      </div>
      <div class="deco-result" hidden></div>`;

    parentEl.appendChild(card);
    parentEl.scrollTop = parentEl.scrollHeight;

    const gradeBtn = card.querySelector('[data-deco-grade]');
    gradeBtn?.addEventListener('click', () => {
      const byLevel = { comprehension: 0, application: 0, reasoning: 0, analysis: 0 };
      card.querySelectorAll('.deco-q').forEach(qEl => {
        const lvl = qEl.dataset.level;
        const correct = Number(qEl.dataset.answer);
        const sel = qEl.querySelector('input[type="radio"]:checked');
        const chosen = sel ? Number(sel.value) : -1;
        // Feedback visual por pregunta
        qEl.querySelectorAll('.deco-opt').forEach((optEl, oi) => {
          optEl.classList.remove('correct', 'wrong');
          if (oi === correct) optEl.classList.add('correct');
          else if (oi === chosen) optEl.classList.add('wrong');
        });
        if (chosen === correct) byLevel[lvl] = (byLevel[lvl] || 0) + 1;
      });

      const decoScore = byLevel.comprehension + byLevel.application + byLevel.reasoning + byLevel.analysis;
      const total = card.querySelectorAll('.deco-q').length;

      const resEl = card.querySelector('.deco-result');
      if (resEl) {
        resEl.hidden = false;
        resEl.innerHTML = `
          <strong>Resultado:</strong> ${decoScore}/${total} respuestas correctas.
          <div class="deco-result-levels">
            ${LEVELS.map(l => (blocks[l.key] || []).length
              ? `<span class="deco-result-chip">${l.icon} ${l.label}: ${byLevel[l.key]}/${(blocks[l.key]||[]).length}</span>`
              : '').join('')}
          </div>`;
      }
      gradeBtn.disabled = true;
      gradeBtn.textContent = '✓ Evaluación calificada';

      try { onComplete?.({ decoScore, total, byLevel }); } catch (_) {}
    });
  }

  // Índice de Aprendizaje (0-100). Combina las métricas de la sesión (de
  // AiChatProxy.finalizeSession) con la evaluación DECO si existe.
  // Fórmula: precisión 35% + coherencia 25% + participación 20% + velocidad 10% + razonamiento 10%.
  function learningIndex(metrics, decoResult) {
    metrics = metrics || {};
    const clamp01 = v => Math.max(0, Math.min(1, Number(v) || 0));

    // precisión: aciertos DECO / total si hay DECO; si no, calidad de respuesta.
    let precision;
    if (decoResult && decoResult.total > 0) {
      precision = decoResult.decoScore / decoResult.total;
    } else {
      precision = clamp01(metrics.response_quality ?? metrics.learning_score ?? 0.5);
    }

    const coherencia    = clamp01(metrics.coherence ?? 0.5);
    const participacion = clamp01(metrics.engagement ?? 0.5);
    const velocidad     = clamp01(metrics.response_time_score ?? 0.5);

    // razonamiento: niveles superiores de DECO (razonamiento + análisis) / 6;
    // si no hay DECO, usa coherencia como proxy.
    let razonamiento;
    if (decoResult && decoResult.byLevel) {
      const sup = (decoResult.byLevel.reasoning || 0) + (decoResult.byLevel.analysis || 0);
      razonamiento = clamp01(sup / 6);
    } else {
      razonamiento = coherencia;
    }

    const idx = precision * 0.35 + coherencia * 0.25 + participacion * 0.20
              + velocidad * 0.10 + razonamiento * 0.10;
    return Math.round(Math.max(0, Math.min(1, idx)) * 100);
  }

  return { LEVELS, generate, renderInto, learningIndex };
})();
