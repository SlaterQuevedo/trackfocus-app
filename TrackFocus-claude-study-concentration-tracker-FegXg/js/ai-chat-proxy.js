// Cliente del Tutor IA — llama exclusivamente al proxy seguro /api/ai-chat.
// La clave de Gemini vive en el servidor (Vercel env) y nunca llega al navegador.
const AiChatProxy = (() => {

  // ── API pública ───────────────────────────────────────────────────

  // Respuestas pre-escritas para ?demo=guided — sin API, 100% offline
  const _DEMO_SCRIPT = [
    `¡Hola, Lucía! Estoy listo para esta sesión de **Matemática** sobre ecuaciones cuadráticas. 🧠

Antes de comenzar, dime: cuando ves una ecuación como **ax² + bx + c = 0**, ¿qué es lo primero que piensas?

📝 Pregunta: ¿Recuerdas qué significa cada letra (a, b, c) en esa expresión?`,

    `Bien, a, b y c son los coeficientes — ¡correcto! Ahora veamos si puedes aplicarlo.

Tenemos la ecuación: **2x² + 5x − 3 = 0**

Antes de resolverla, ¿puedes identificar cuánto vale *a*, cuánto vale *b* y cuánto vale *c* en esta ecuación?

📝 Pregunta: ¿Qué pasa si *a* = 0? ¿Sigue siendo cuadrática?`,

    `Exacto, si *a* = 0 deja de ser cuadrática porque desaparece el término x².

Ahora, ¿conoces la **fórmula general** para resolver ecuaciones cuadráticas? Te doy una pista: tiene una raíz cuadrada de algo que se llama *discriminante*.

📝 Pregunta: ¿Qué crees que nos indica el discriminante sobre las soluciones de la ecuación?`,

    `¡Excelente razonamiento! El discriminante **b² − 4ac** nos dice:
- Si es **positivo** → dos soluciones reales distintas
- Si es **cero** → una sola solución (raíz doble)
- Si es **negativo** → sin soluciones reales

Calculemos el discriminante para nuestra ecuación **2x² + 5x − 3 = 0**.

📝 Pregunta: Con a=2, b=5, c=−3, ¿cuánto da b² − 4ac? Intenta calcularlo tú primero.`
  ];

  async function sendMessage(metadata, history, userMessage, onChunk, files = []) {
    const recentHistory = (history || []).slice(-12);
    const fileParts = (files || [])
      .filter(f => f.base64 && f.mimeType)
      .map(f => ({ base64: f.base64, mimeType: f.mimeType }));

    // Demo guiada: respuestas pre-escritas sin API
    if (window.__TF_DEMO_GUIDED_META) {
      const turnIndex = (recentHistory || []).filter(m => m.role === 'model').length;
      const scriptReply = _DEMO_SCRIPT[Math.min(turnIndex, _DEMO_SCRIPT.length - 1)];
      for (const char of scriptReply) { onChunk(char); await _sleep(8); }
      return scriptReply;
    }

    // Proxy seguro
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          metadata,
          history: recentHistory,
          userMessage,
          files: fileParts
        })
      });

      if (res.ok && res.body) {
        return await _readSSE(res, onChunk);
      }
      if (res.status !== 404) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
    } catch (_) {
      // proxy no disponible → respuesta offline
    }

    // Sin proxy disponible: respuesta offline
    const fallback = _buildFallback(userMessage, metadata);
    for (const char of fallback) { onChunk(char); await _sleep(2); }
    return fallback;
  }

  async function finalizeSession(metadata, history) {
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize', metadata, history })
      });
      if (res.ok) return await res.json();
      if (res.status !== 404) return _defaultMetrics();
    } catch (_) { /* sin proxy */ }

    return _defaultMetrics();
  }

  // ── Lectura de SSE del proxy ───────────────────────────────────────
  async function _readSSE(res, onChunk) {
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = '';
    let buffer    = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]' || !data) continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.text
            || parsed.candidates?.[0]?.content?.parts?.[0]?.text
            || '';
          if (text) { fullText += text; onChunk(text); }
        } catch (_) {}
      }
    }
    return fullText;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  function _defaultMetrics() {
    return {
      concentration: 3,
      metrics: {
        learning_score: 0.6, avg_response_time_sec: 10, response_time_score: 0.6,
        response_quality: 0.6, engagement: 0.5, avg_words_per_message: 15,
        questions_attempted: 2, questions_correct: 1, coherence: 0.6
      }
    };
  }

  function _buildFallback(userMessage, metadata) {
    const msg = (userMessage || '').toLowerCase();
    let r = '';
    if (msg.includes('hola') || msg.includes('hi'))
      r = `¡Hola! Soy tu tutor de ${metadata.subject}. ¿Qué tema quieres explorar hoy?`;
    else if (msg.includes('?'))
      r = `Buena pregunta. Antes de responder: ¿qué crees tú que podría ser la respuesta basándote en lo que ya sabes?`;
    else if (msg.includes('no entiendo') || msg.includes('difícil'))
      r = `Entiendo tu duda. Desglosemos el tema. ¿Cuál es específicamente la parte que te confunde?`;
    else
      r = `Para ayudarte mejor con ${metadata.subject}: ¿qué parte específica te cuesta más entender?`;
    return r + '\n\n📝 Pregunta: ¿Cuál sería tu primer paso para resolver esto?';
  }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { sendMessage, finalizeSession };
})();
