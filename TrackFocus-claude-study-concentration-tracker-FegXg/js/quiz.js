// Mini-quiz IA (Fase C): 3 preguntas de opción múltiple para medir aprendizaje.
// Se genera UNA vez por sesión y se reutilizan las MISMAS preguntas en el quiz
// inicial (pre) y final (post) → la comparación pre/post es válida.
// Degradación elegante: si la IA no está disponible, devuelve [] y el flujo
// continúa sin bloquear (el piloto registra focus+tiempo aunque no haya quiz).
const Quiz = (() => {

  function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Pide al proxy 3 preguntas sobre la materia/tema. Devuelve un array validado.
  async function generate(metadata, topic) {
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quiz', metadata, topic: topic || metadata?.subject })
      });
      if (!res.ok) return [];
      const json = await res.json();
      const qs = Array.isArray(json.questions) ? json.questions : [];
      // Validación defensiva: pregunta + 2-4 opciones + índice de respuesta válido.
      return qs
        .filter(q => q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length >= 2)
        .map(q => ({
          q: q.q,
          options: q.options.slice(0, 4),
          answer: Math.max(0, Math.min(q.options.length - 1, Number(q.answer) || 0))
        }))
        .slice(0, 3);
    } catch (e) {
      window.Monitor?.log?.('tf-intelligence', 'quiz generate falló', e?.message);
      return [];
    }
  }

  // Muestra las preguntas en un modal y resuelve con el número de aciertos (0..n).
  function present(questions, phaseLabel) {
    return new Promise((resolve) => {
      if (!questions || !questions.length) { resolve(null); return; }

      const modal = document.createElement('div');
      modal.className = 'quiz-modal';
      modal.innerHTML = `
        <div class="quiz-inner card">
          <h2 class="quiz-title">${_esc(phaseLabel)}</h2>
          <p class="muted quiz-sub">Responde estas ${questions.length} preguntas. Sirven para medir tu aprendizaje.</p>
          <form id="quizForm">
            ${questions.map((q, qi) => `
              <div class="quiz-q">
                <div class="quiz-q-text">${qi + 1}. ${_esc(q.q)}</div>
                <div class="quiz-opts">
                  ${q.options.map((opt, oi) => `
                    <label class="quiz-opt">
                      <input type="radio" name="q${qi}" value="${oi}" required>
                      <span>${_esc(opt)}</span>
                    </label>`).join('')}
                </div>
              </div>`).join('')}
            <button class="primary quiz-submit" type="submit">Enviar respuestas</button>
          </form>
        </div>`;
      document.body.appendChild(modal);

      const form = modal.querySelector('#quizForm');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let correct = 0;
        questions.forEach((q, qi) => {
          const sel = modal.querySelector(`input[name="q${qi}"]:checked`);
          if (sel && Number(sel.value) === Number(q.answer)) correct++;
        });
        modal.remove();
        resolve(correct);
      });
    });
  }

  return { generate, present };
})();
