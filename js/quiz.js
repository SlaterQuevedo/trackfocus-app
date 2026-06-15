// Quiz opcional de práctica (refactorizado).
// El quiz YA NO se dispara automáticamente. El estudiante lo activa
// con el botón "📝 Quiz" dentro del chat cuando quiera practicar.
// Usa generateAdvanced (config: count/difficulty/focus) y presentInChat
// (panel integrado en el chat, no modal bloqueante).
const Quiz = (() => {

  function _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function _validateQuestions(arr, maxCount) {
    return (Array.isArray(arr) ? arr : [])
      .filter(q => q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length >= 2)
      .map(q => ({
        q: q.q,
        options: q.options.slice(0, 4),
        answer: Math.max(0, Math.min(q.options.length - 1, Number(q.answer) || 0)),
        explanation_correct: q.explanation_correct || '',
        explanations: Array.isArray(q.explanations) ? q.explanations : []
      }))
      .slice(0, maxCount || 15);
  }

  // Generación básica — compatibilidad con llamadas legacy (sin config).
  async function generate(metadata, topic) {
    return generateAdvanced(metadata, topic, { count: 3 });
  }

  // Generación avanzada: count (3-15), difficulty, focus, con explicaciones pedagógicas.
  async function generateAdvanced(metadata, topic, config = {}) {
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quiz',
          metadata,
          topic: topic || metadata?.subject,
          config
        })
      });
      if (!res.ok) return [];
      const json = await res.json();
      return _validateQuestions(json.questions, config.count || 15);
    } catch (e) {
      window.Monitor?.log?.('arv-intelligence', 'quiz generateAdvanced falló', e?.message);
      return [];
    }
  }

  // Muestra el quiz como panel INTEGRADO en el área de mensajes del chat.
  // No bloquea — el estudiante puede cerrar y volver al chat en cualquier momento.
  // Presenta preguntas una a una con feedback inmediato y explicación pedagógica.
  function presentInChat(container, questions, metadata, onComplete) {
    if (!container || !questions || !questions.length) { onComplete?.(null); return; }

    const panel = document.createElement('div');
    panel.className = 'quiz-chat-panel';
    container.appendChild(panel);

    let score = 0;
    let retryCountForQ = 0;
    const results = [];

    function renderQuestion(qi) {
      retryCountForQ = 0;
      const q = questions[qi];
      const LETTERS = ['A', 'B', 'C', 'D'];
      panel.innerHTML = `
        <div class="quiz-panel-header">
          <span class="quiz-panel-title">📝 Quiz de práctica</span>
          <span class="quiz-panel-progress">${qi + 1} / ${questions.length}</span>
          <button class="ghost quiz-close-inline" style="font-size:12px;padding:4px 10px;">✕ Cerrar</button>
        </div>
        <div class="quiz-q-body">
          <div class="quiz-q-text">${qi + 1}. ${_esc(q.q)}</div>
          <div class="quiz-opts-grid" id="quizOpts${qi}">
            ${q.options.map((opt, oi) => `
              <button class="quiz-opt-btn" data-oi="${oi}">
                <span class="quiz-opt-letter">${LETTERS[oi] || oi}</span>
                <span class="quiz-opt-text">${_esc(opt)}</span>
              </button>`).join('')}
          </div>
          <div class="quiz-feedback-area" id="quizFb${qi}" style="display:none;"></div>
        </div>`;

      panel.querySelector('.quiz-close-inline')?.addEventListener('click', () => {
        panel.remove();
        onComplete?.(null);
      });

      panel.querySelectorAll('.quiz-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => handleAnswer(qi, Number(btn.dataset.oi)));
      });

      container.scrollTop = container.scrollHeight;
    }

    function handleAnswer(qi, chosen) {
      const q = questions[qi];
      const correct = Number(q.answer);
      const isCorrect = chosen === correct;
      retryCountForQ++;

      // Feedback visual en botones
      panel.querySelectorAll('.quiz-opt-btn').forEach((btn, i) => {
        btn.disabled = true;
        if (i === correct) btn.classList.add('quiz-opt-correct');
        else if (i === chosen && !isCorrect) btn.classList.add('quiz-opt-wrong');
      });

      const fbEl = panel.querySelector(`#quizFb${qi}`);
      if (!fbEl) return;
      fbEl.style.display = '';

      if (isCorrect) {
        score++;
        results.push({ qi, correct: true, chosen });
        fbEl.innerHTML = `
          <div class="quiz-fb quiz-fb-ok">
            <div class="quiz-fb-icon">✅</div>
            <div class="quiz-fb-body">
              <strong>¡Correcto!</strong>
              ${q.explanation_correct ? `<p class="quiz-fb-explain">${_esc(q.explanation_correct)}</p>` : ''}
            </div>
          </div>
          <button class="primary quiz-next-btn" style="margin-top:10px;width:100%;">
            ${qi + 1 < questions.length ? 'Siguiente pregunta →' : 'Ver resultados →'}
          </button>`;
        fbEl.querySelector('.quiz-next-btn')?.addEventListener('click', () => goNext(qi));
      } else {
        results.push({ qi, correct: false, chosen });
        const wrongExpl = q.explanations?.[chosen] || '';
        const hint = retryCountForQ <= 2
          ? `<p class="quiz-fb-hint">💡 <em>Observa nuevamente el enunciado. ¿Qué dato te orienta hacia la respuesta correcta?</em></p>`
          : '';
        fbEl.innerHTML = `
          <div class="quiz-fb quiz-fb-err">
            <div class="quiz-fb-icon">❌</div>
            <div class="quiz-fb-body">
              <strong>Incorrecto.</strong>
              ${wrongExpl ? `<p class="quiz-fb-explain">${_esc(wrongExpl)}</p>` : ''}
              ${hint}
            </div>
          </div>
          <div class="quiz-fb-actions">
            ${retryCountForQ <= 2
              ? `<button class="ghost quiz-retry-btn">🔄 Intentar nuevamente</button>`
              : ''}
            <button class="ghost quiz-next-btn">
              ${qi + 1 < questions.length ? 'Siguiente pregunta →' : 'Ver resultados →'}
            </button>
          </div>`;
        fbEl.querySelector('.quiz-retry-btn')?.addEventListener('click', () => {
          results.pop();
          renderQuestion(qi);
        });
        fbEl.querySelector('.quiz-next-btn')?.addEventListener('click', () => goNext(qi));
      }

      container.scrollTop = container.scrollHeight;
    }

    function goNext(qi) {
      if (qi + 1 < questions.length) {
        renderQuestion(qi + 1);
      } else {
        showSummary();
      }
    }

    function showSummary() {
      const total = questions.length;
      const pct = Math.round((score / total) * 100);
      const trend = pct >= 80
        ? { icon: '🌟', label: 'Excelente dominio', color: '#22c55e' }
        : pct >= 60
        ? { icon: '📈', label: 'Buen progreso', color: 'var(--accent)' }
        : { icon: '📌', label: 'Necesita refuerzo', color: '#f59e0b' };

      const wrongQs = results.filter(r => !r.correct).map(r => questions[r.qi].q).slice(0, 3);

      panel.innerHTML = `
        <div class="quiz-panel-header">
          <span class="quiz-panel-title">📝 Resultados del Quiz</span>
          <button class="ghost quiz-close-inline" style="font-size:12px;padding:4px 10px;">✕ Cerrar</button>
        </div>
        <div class="quiz-summary">
          <div class="quiz-score-display">
            <div class="quiz-score-num" style="color:${trend.color};">${score}/${total}</div>
            <div class="quiz-score-pct">${pct}%</div>
            <div class="quiz-score-trend">${trend.icon} ${trend.label}</div>
          </div>
          <div class="quiz-summary-body">
            ${wrongQs.length
              ? `<div class="quiz-summary-section">
                  <strong>📌 Temas a reforzar:</strong>
                  <ul>${wrongQs.map(q => `<li>${_esc(q.length > 80 ? q.slice(0, 80) + '…' : q)}</li>`).join('')}</ul>
                </div>`
              : '<div class="quiz-summary-section" style="color:#22c55e;">✅ ¡Dominas el tema completamente!</div>'}
            <p class="muted" style="font-size:12px;margin-top:8px;">📊 El Índice de Aprendizaje ha sido actualizado con estos resultados.</p>
          </div>
          <div class="quiz-summary-actions">
            <button class="ghost quiz-close-inline">Volver al chat</button>
            <button class="primary quiz-retake-btn">🔄 Nuevo Quiz</button>
          </div>
        </div>`;

      panel.querySelectorAll('.quiz-close-inline').forEach(btn =>
        btn.addEventListener('click', () => { panel.remove(); onComplete?.({ score, total, pct, results }); })
      );
      panel.querySelector('.quiz-retake-btn')?.addEventListener('click', () => {
        panel.remove();
        onComplete?.({ score, total, pct, results, retake: true });
      });

      container.scrollTop = container.scrollHeight;
    }

    // Iniciar con la primera pregunta
    renderQuestion(0);
  }

  // present() legacy — ya no bloquea, retorna null inmediatamente.
  // Mantenido para no romper referencias residuales.
  function present(questions, phaseLabel) {
    return Promise.resolve(null);
  }

  return { generate, generateAdvanced, present, presentInChat };
})();
