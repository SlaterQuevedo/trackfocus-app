import { GEMINI_MODEL, GEMINI_BASE, geminiHeaders } from './_lib.js';

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  if (action === 'message')  return handleMessage(req, res);
  if (action === 'finalize') return handleFinalize(req, res);

  return res.status(400).json({ error: 'action debe ser "message" o "finalize"' });
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(metadata) {
  const { subject, grade, durationMin, previousActivity } = metadata;
  return `Eres TrackTutor, el tutor de IA de TrackFocus para estudiantes de secundaria.

CONTEXTO DE LA SESIÓN:
- Grado: ${grade}
- Materia: ${subject}
- Duración planificada: ${durationMin} minutos
- Actividad previa del alumno: ${previousActivity}

REGLAS OBLIGATORIAS:
1. Adapta el lenguaje y la complejidad exactamente al nivel de ${grade} de secundaria.
2. Explica con claridad cualquier tema que el alumno pregunte.
3. Al final de CADA respuesta tuya (sin excepción), plantea entre 1 y 3 preguntas cortas o ejercicios para que el alumno resuelva en el chat. Etiquétalos claramente como "📝 Pregunta:" o "📝 Ejercicio:".
4. Cuando el alumno responda una pregunta, evalúa sin decirlo explícitamente si fue correcta. Si falló, guíalo con una pista sin dar la respuesta directa.
5. Mantén un tono motivador y cercano.
6. Responde siempre en español.
7. NUNCA resuelvas un ejercicio o problema completo de forma directa. Siempre guía al alumno paso a paso para que llegue a la respuesta por sí mismo.
8. Usa el método socrático: haz preguntas clave que ayuden al alumno a pensar críticamente y descubrir la solución.
9. Si el alumno pide "dame la respuesta" o "dímelo directamente", responde con una pista estratégica en lugar de la solución completa.
10. Detecta si el alumno copia, responde sin razonar o da respuestas muy vagas. En ese caso, solicita que explique su razonamiento antes de proseguir.`.trim();
}

function buildEvaluationPrompt(history, metadata) {
  const transcript = history
    .map(m => `[${m.role === 'user' ? 'ALUMNO' : 'TUTOR'}]: ${m.content}`)
    .join('\n');

  return `Analiza la siguiente sesión de estudio y devuelve SOLO un JSON válido (sin markdown, sin texto extra).

SESIÓN:
Materia: ${metadata.subject}
Grado: ${metadata.grade}
Duración: ${metadata.durationMin} minutos

TRANSCRIPCIÓN:
${transcript}

Devuelve exactamente este JSON:
{
  "questions_attempted": <número de preguntas/ejercicios que planteó el tutor>,
  "questions_correct": <número que el alumno respondió correctamente>,
  "coherence": <decimal 0-1 que refleja la coherencia y relevancia de las respuestas del alumno>,
  "engagement_notes": "<frase breve sobre el nivel de participación>"
}`;
}

// ── Handler fallback (sin Gemini API) ───────────────────────────────────────

async function handleFallbackMessage(res, userMessage, metadata) {
  const msg = userMessage.toLowerCase();
  let responseText = '';

  if (msg.includes('hola') || msg.includes('hi') || msg.includes('buenos')) {
    responseText = `¡Hola! Soy tu tutor de ${metadata.subject}. Estoy aquí para guiarte a través de conceptos, ejercicios y preguntas de práctica. ¿Por dónde empezamos?`;
  } else if (msg.includes('ayuda') || msg.includes('help') || msg.includes('qué')) {
    responseText = `Puedo ayudarte de varias formas:\n1. Explicar conceptos de forma clara\n2. Ayudarte a resolver ejercicios paso a paso\n3. Hacerte preguntas para que pienses críticamente\n\n¿Cuál necesitas ahora?`;
  } else if (msg.includes('?')) {
    responseText = `Excelente pregunta. Antes de responderte, déjame hacerte esto: ¿Qué crees que podría ser la respuesta basándote en lo que ya conoces?`;
  } else if (msg.includes('no entiendo') || msg.includes('confundido') || msg.includes('difícil')) {
    responseText = `Entiendo que te sientas confundido. Eso es completamente normal. Desglosemos esto en partes más pequeñas.\n\n¿Cuál es específicamente la parte que te confunde?`;
  } else if (msg.includes('correcto') || msg.includes('si') || msg.includes('sí')) {
    responseText = `¡Muy bien! Tu razonamiento es sólido. Ahora déjame hacerte una pregunta más profunda: ¿Por qué crees que esa es la respuesta?`;
  } else {
    responseText = `Interesante. Para ayudarte mejor con ${metadata.subject}, cuéntame:\n\n1. ¿Qué es lo que NO entiendes?\n2. ¿Qué parte específica te causa duda?\n\nCon eso podré guiarte mejor.`;
  }

  responseText += '\n\n📝 Pregunta: ¿Cuál crees que es el siguiente paso?';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  for (const char of responseText) {
    res.write(`data: ${JSON.stringify({ text: char })}\n\n`);
    await new Promise(r => setTimeout(r, 2));
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

// ── Handler: mensaje en streaming ────────────────────────────────────────────

async function handleMessage(req, res) {
  const { metadata, history = [], userMessage, files = [] } = req.body;

  if (!metadata || !userMessage) {
    return res.status(400).json({ error: 'metadata y userMessage son requeridos' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback: devolver respuesta simple sin usar API
    return handleFallbackMessage(res, userMessage, metadata);
  }

  // Construir contents para Gemini (sin system role nativo → primer turn de modelo)
  const systemTurn = {
    role: 'user',
    parts: [{ text: buildSystemPrompt(metadata) }]
  };
  const systemAck = {
    role: 'model',
    parts: [{ text: 'Entendido. Estoy listo para ser el tutor de esta sesión.' }]
  };

  // Recortar historial a los últimos 12 turnos para reducir latencia
  const priorTurns = history.slice(-12).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  // Turno del usuario: texto + archivos adjuntos (multimodal)
  const userParts = [{ text: userMessage }];
  for (const f of files) {
    if (f && f.base64 && f.mimeType) {
      userParts.push({ inlineData: { mimeType: f.mimeType, data: f.base64 } });
    }
  }

  const contents = [systemTurn, systemAck, ...priorTurns, {
    role: 'user',
    parts: userParts
  }];

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

  let geminiRes;
  try {
    geminiRes = await fetch(url, {
      method: 'POST',
      headers: geminiHeaders(apiKey),
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
  } catch (err) {
    return res.status(502).json({ error: 'Error conectando con Gemini: ' + err.message });
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return res.status(geminiRes.status).json({ error: 'Gemini error: ' + errText });
  }

  // Relay SSE al cliente
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  const reader = geminiRes.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Cada chunk puede tener múltiples líneas SSE
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch {
          // línea SSE incompleta o no JSON — ignorar
        }
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

// ── Handler: finalizar sesión y calcular métricas ────────────────────────────

async function handleFinalize(req, res) {
  const { metadata, history = [] } = req.body;

  if (!metadata || !history.length) {
    return res.status(400).json({ error: 'metadata e history son requeridos' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada' });

  // ── A. Tiempo de respuesta (mediana entre turnos del alumno) ──────────────
  const userTurns = history.filter(m => m.role === 'user' && m.timestamp);
  const modelTurns = history.filter(m => m.role === 'model' && m.timestamp);

  const responseDelays = [];
  for (let i = 0; i < userTurns.length; i++) {
    const prevModel = modelTurns.filter(m => m.timestamp < userTurns[i].timestamp).pop();
    if (prevModel) {
      responseDelays.push((userTurns[i].timestamp - prevModel.timestamp) / 1000);
    }
  }

  let avgResponseSec = 60;
  if (responseDelays.length) {
    const sorted = [...responseDelays].sort((a, b) => a - b);
    avgResponseSec = Math.round(sorted[Math.floor(sorted.length / 2)]);
  }

  function responseTimeScore(sec) {
    if (sec < 30)  return 1.0;
    if (sec < 60)  return 0.8;
    if (sec < 120) return 0.6;
    if (sec < 300) return 0.3;
    return 0.1;
  }
  const scoreA = responseTimeScore(avgResponseSec);

  // ── B. Calidad de respuestas (Gemini evalúa el historial) ─────────────────
  let scoreB = 0.5;
  let questionsAttempted = 0;
  let questionsCorrect = 0;
  let coherence = 0.5;

  try {
    const evalUrl = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`;
    const evalRes = await fetch(evalUrl, {
      method: 'POST',
      headers: geminiHeaders(apiKey),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildEvaluationPrompt(history, metadata) }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256, thinkingConfig: { thinkingBudget: 0 } }
      })
    });

    if (evalRes.ok) {
      const evalJson = await evalRes.json();
      const raw = evalJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      // Extraer JSON aunque haya texto extra
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        questionsAttempted = parsed.questions_attempted || 0;
        questionsCorrect   = parsed.questions_correct   || 0;
        coherence          = Math.min(1, Math.max(0, parsed.coherence || 0.5));
        const accuracy = questionsAttempted > 0
          ? questionsCorrect / questionsAttempted
          : 0.5;
        scoreB = (accuracy * 0.7) + (coherence * 0.3);
      }
    }
  } catch {
    // Mantener scoreB = 0.5 si falla la evaluación
  }

  // ── C. Engagement (longitud promedio de mensajes del alumno) ──────────────
  const wordCounts = userTurns.map(m => m.content.trim().split(/\s+/).length);
  const avgWords = wordCounts.length
    ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
    : 0;

  function engagementScore(words) {
    if (words < 5)  return 0.2;
    if (words < 15) return 0.5;
    if (words < 30) return 0.8;
    return 1.0;
  }
  const scoreC = engagementScore(avgWords);

  // ── Fórmula final ─────────────────────────────────────────────────────────
  const concentrationRaw = (scoreA * 0.35) + (scoreB * 0.45) + (scoreC * 0.20);
  const concentration = Math.min(5, Math.max(1, Math.round(concentrationRaw * 4) + 1));

  return res.status(200).json({
    concentration,
    metrics: {
      learning_score:       Math.round(scoreB * 100) / 100,
      avg_response_time_sec: avgResponseSec,
      response_time_score:  Math.round(scoreA * 100) / 100,
      response_quality:     Math.round(scoreB * 100) / 100,
      engagement:           Math.round(scoreC * 100) / 100,
      avg_words_per_message: Math.round(avgWords),
      questions_attempted:  questionsAttempted,
      questions_correct:    questionsCorrect,
      coherence:            Math.round(coherence * 100) / 100
    }
  });
}
