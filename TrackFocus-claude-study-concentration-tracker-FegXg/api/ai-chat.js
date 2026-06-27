import { GEMINI_MODEL, GEMINI_BASE, geminiHeaders, applyCors } from './_lib.js';

export default async (req, res) => {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  if (action === 'message')  return handleMessage(req, res);
  if (action === 'finalize') return handleFinalize(req, res);
  if (action === 'quiz')     return handleQuiz(req, res);
  if (action === 'deco')     return handleDeco(req, res);

  return res.status(400).json({ error: 'action debe ser "message", "finalize", "quiz" o "deco"' });
};

// ── Handler: evaluación DECO (Fase 5) ─────────────────────────────────────────
// Genera 12 preguntas de opción múltiple en 4 niveles cognitivos (3 c/u):
// comprensión, aplicación, razonamiento y análisis crítico. Ante cualquier fallo
// devuelve la estructura vacía (200) para degradar con elegancia.
async function handleDeco(req, res) {
  const empty = { comprehension: [], application: [], reasoning: [], analysis: [] };
  const { metadata, topic } = req.body || {};
  if (!metadata) return res.status(400).json({ error: 'metadata requerido' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(200).json(empty);

  const tema = topic || metadata.subject;
  const prompt = `Genera una evaluación DECO para un estudiante de ${metadata.grade} de secundaria sobre "${tema}" (materia: ${metadata.subject}).
Crea exactamente 12 preguntas de opción múltiple, 3 por cada nivel cognitivo:
- "comprehension" (Comprensión: qué significa, definiciones, identificar)
- "application" (Aplicación: cómo usar el concepto, resolver casos)
- "reasoning" (Razonamiento: por qué ocurre, causa-efecto, qué pasaría si)
- "analysis" (Análisis crítico: limitaciones, comparar, evaluar)
Devuelve SOLO un JSON válido, sin markdown ni texto extra, con esta forma exacta:
{"comprehension":[{"q":"texto","options":["a","b","c","d"],"answer":0}],"application":[...],"reasoning":[...],"analysis":[...]}
Reglas: 3 preguntas por nivel; 4 opciones cada una; "answer" es el índice (0-3) de la correcta; preguntas claras y breves; nivel adecuado a ${metadata.grade}; en español.`;

  try {
    const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`;
    const r = await fetch(url, {
      method: 'POST',
      headers: geminiHeaders(apiKey),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1600, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r.ok) return res.status(200).json(empty);
    const j = await r.json();
    const raw = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(200).json(empty);
    const parsed = JSON.parse(match[0]);
    const pick = (arr) => (Array.isArray(arr) ? arr.slice(0, 3) : []);
    return res.status(200).json({
      comprehension: pick(parsed.comprehension),
      application:   pick(parsed.application),
      reasoning:     pick(parsed.reasoning),
      analysis:      pick(parsed.analysis)
    });
  } catch (err) {
    return res.status(200).json(empty);
  }
}

// ── Handler: quiz de práctica opcional (configurable) ────────────────────────
// Genera preguntas con explicaciones pedagógicas para cada opción.
// Acepta config: { count, difficulty, focus }. Ante cualquier fallo → { questions: [] }.
async function handleQuiz(req, res) {
  const { metadata, topic, config = {} } = req.body || {};
  if (!metadata) return res.status(400).json({ error: 'metadata requerido' });

  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback: sin API key, generar preguntas locales de demostración
  if (!apiKey) {
    return res.status(200).json({
      questions: [
        {
          q: `¿Cuál es la definición principal de ${topic || metadata.subject}?`,
          options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
          answer: 0,
          explanation_correct: 'Esta es la definición correcta según el currículo estándar.',
          explanations: ['', 'Confunde este concepto con otro relacionado', 'Esta es parcialmente correcta pero incompleta', 'Esta opción aplica a un contexto diferente']
        },
        {
          q: `¿Cómo se aplica ${topic || metadata.subject} en la vida cotidiana?`,
          options: ['Caso práctico A', 'Caso práctico B', 'Caso práctico C', 'Caso práctico D'],
          answer: 1,
          explanation_correct: 'Este es el ejemplo más relevante que demuestra la aplicación real del concepto.',
          explanations: ['Es un ejemplo teórico sin aplicación práctica', '', 'Este es un ejemplo pero menos directo', 'Este caso aplica a una rama diferente']
        },
        {
          q: `¿Por qué es importante ${topic || metadata.subject}?`,
          options: ['Razón 1', 'Razón 2', 'Razón 3', 'Razón 4'],
          answer: 2,
          explanation_correct: 'Porque es fundamental para entender los conceptos avanzados posteriores.',
          explanations: ['Es importante pero solo en contextos específicos', 'Esta razón es secundaria', '', 'Esta razón no está fundamentada en el currículo']
        }
      ]
    });
  }

  const count      = Math.min(15, Math.max(3, Number(config.count) || 5));
  const difficulty = config.difficulty || 'intermedia';
  const focus      = config.focus      || 'mixto';

  const difficultyDesc = {
    basica:      'preguntas directas de definición y reconocimiento, conceptos básicos',
    intermedia:  'preguntas de comprensión y aplicación de nivel secundaria peruana',
    avanzada:    'preguntas de análisis, razonamiento complejo y casos prácticos',
    adaptativa:  'mezcla balanceada de todos los niveles, desde básico hasta análisis crítico'
  }[difficulty] || 'preguntas de comprensión y aplicación';

  const focusDesc = {
    comprehension: 'comprensión: definiciones, identificar, describir el concepto',
    application:   'aplicación: resolver ejercicios, usar el concepto en casos concretos',
    reasoning:     'razonamiento: causa-efecto, ¿por qué ocurre?, ¿qué pasaría si…?',
    analysis:      'análisis crítico: comparar, evaluar, identificar limitaciones',
    mixto:         'variedad: comprensión, aplicación, razonamiento y análisis crítico'
  }[focus] || 'variedad de tipos de pregunta';

  const prompt = `Genera un quiz de práctica para un estudiante de ${metadata.grade} de secundaria sobre "${topic || metadata.subject}" (materia: ${metadata.subject}).

CONFIGURACIÓN:
- Cantidad exacta: ${count} preguntas
- Dificultad: ${difficulty} — ${difficultyDesc}
- Enfoque: ${focus} — ${focusDesc}

Devuelve SOLO un JSON válido, sin markdown ni texto extra, con esta estructura exacta:
{"questions":[{"q":"texto de la pregunta","options":["opción A","opción B","opción C","opción D"],"answer":0,"explanation_correct":"Explicación pedagógica detallada: por qué la opción correcta es correcta, qué concepto aplica, qué razonamiento usó el alumno al elegirla (2-3 líneas, no solo 'es correcto').","explanations":["Por qué la opción A es incorrecta si A no es la correcta (o string vacío si A es la correcta)","Por qué B...","Por qué C...","Por qué D..."]}]}

REGLAS:
- Exactamente ${count} preguntas, no más ni menos
- 4 opciones por pregunta, letras A-D
- "answer" = índice 0-3 de la opción correcta
- "explanation_correct": mínimo 2 líneas pedagógicas que expliquen el razonamiento y el concepto clave
- "explanations": 4 strings; el string del índice correcto debe ser string vacío; los incorrectos explican el error específico del alumno (ej: "Confundiste X con Y porque…")
- Nivel apropiado para ${metadata.grade} de secundaria peruana
- Todo en español`;

  try {
    const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`;
    const r = await fetch(url, {
      method: 'POST',
      headers: geminiHeaders(apiKey),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 3200, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r.ok) return res.status(200).json({ questions: [] });
    const j = await r.json();
    const raw = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(200).json({ questions: [] });
    const parsed = JSON.parse(match[0]);
    const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, count) : [];
    return res.status(200).json({ questions });
  } catch (err) {
    return res.status(200).json({ questions: [] });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Ariven Intelligence: Método Minerva + Sistema DECO (siempre integrados).
// Minerva = CÓMO enseña la IA (socrático estricto).
// DECO    = CÓMO evalúa y entrena la comprensión (4 niveles cognitivos).
// Ambos están activos en TODA conversación — no son opcionales.
function buildSystemPrompt(metadata) {
  const { subject, grade, durationMin, previousActivity, memoryContext,
          studyMode, examDate, topicGoal, decoLevel } = metadata;

  const memoryBlock = memoryContext
    ? `MEMORIA DEL ALUMNO (úsala para personalizar, reconocer su progreso y continuar donde quedó): ${memoryContext}\n\n`
    : '';

  // Instrucción específica para el nivel DECO actual (rota cada 3 mensajes)
  const DECO_LEVEL_MAP = {
    comprehension: { name: 'Comprensión 🔵',  hint: 'pide que el alumno resuma el concepto con sus propias palabras o identifique la idea principal' },
    application:   { name: 'Aplicación 🟡',   hint: 'pide que el alumno resuelva un ejercicio similar o explique cómo aplicaría el concepto en un caso real' },
    reasoning:     { name: 'Razonamiento 🟠', hint: 'pide que el alumno explique por qué ocurre algo, explore causa-efecto, o responda qué pasaría si se cambia una variable' },
    analysis:      { name: 'Análisis crítico 🔴', hint: 'pide que el alumno compare con otro escenario, identifique limitaciones del concepto o evalúe distintas alternativas' }
  };
  const deco = DECO_LEVEL_MAP[decoLevel] || DECO_LEVEL_MAP.comprehension;

  // Bloque de modo especial
  let modeBlock = '';
  if (studyMode === 'exam-prep') {
    modeBlock = `\nMODO ESPECIAL — PREPARACIÓN PARA EXAMEN:
El alumno se prepara para un examen de ${subject}${examDate ? ` aproximadamente el ${examDate}` : ''}.
Además del Método Minerva, debes: (1) identificar activamente las debilidades en los temas que el alumno toca, (2) priorizar conceptos de alto impacto para el examen, (3) adaptar la dificultad según sus respuestas, (4) reforzar explícitamente los errores que cometa, (5) simular preguntas de examen tipo universitario en las actividades DECO.\n`;
  } else if (studyMode === 'topic-mastery') {
    modeBlock = `\nMODO ESPECIAL — DOMINIO DE TEMA ESPECÍFICO:
El alumno quiere dominar: "${topicGoal || subject}".
Además del Método Minerva, debes: (1) diagnosticar conocimientos previos con preguntas directas al inicio, (2) construir el aprendizaje paso a paso desde lo básico hacia lo complejo, (3) medir el progreso explícitamente cada ciertos turnos, (4) celebrar avances específicos en comprensión.\n`;
  }

  return `Eres Ariven Intelligence, el tutor de IA de Ariven para estudiantes de secundaria peruanos.

${memoryBlock}CONTEXTO DE LA SESIÓN:
- Grado: ${grade}
- Materia: ${subject}
- Duración planificada: ${durationMin} minutos
- Actividad previa del alumno: ${previousActivity}
${modeBlock}
═══ MÉTODO MINERVA + SISTEMA DECO — SIEMPRE ACTIVOS, SIN EXCEPCIÓN ═══

CÓMO ENSEÑAS (Método Minerva — reglas absolutas):
M1. JAMÁS entregues la respuesta final, ni siquiera parcialmente o "como ejemplo". Tu única herramienta son preguntas y pistas mínimas.
M2. Responde SIEMPRE con preguntas que hagan avanzar el razonamiento. Nunca cierres un tema sin abrir el siguiente paso con una pregunta.
M3. Pide que el alumno explique su razonamiento ANTES de validar cualquier cosa. Si responde, pregunta "¿por qué?" o "¿cómo llegaste a eso?".
M4. Si la respuesta es vaga, de una sola palabra, o parece copiada o sin reflexión: NO avances, pídele que la desarrolle con sus propias palabras.
M5. Pistas progresivas en 3 niveles: primero pregunta orientadora → luego pista conceptual → luego pista concreta. NUNCA la solución directa.
M6. Felicita el esfuerzo y el proceso de pensar, no solo el acierto.
M7. Si el alumno insiste en pedir la respuesta directa, ofrécele una pista más simple, nunca la solución.
M8. Detecta respuestas muy cortas, respuestas copiadas o sin razonamiento. Solicita siempre que el alumno explique con sus palabras antes de proseguir.

CÓMO EVALÚAS (Sistema DECO — obligatorio en CADA respuesta):
Al final de CADA respuesta tuya, debes incluir exactamente este bloque con una actividad breve:

---
🎯 Actividad DECO · ${deco.name}
[Actividad: ${deco.hint}. Máximo 2-3 líneas, directa y clara.]
---

TIPOS DE ACTIVIDAD DECO según nivel (usa el nivel indicado arriba):
- Comprensión: "Resume este concepto con tus propias palabras." / "¿Cuál es la idea central de lo que acabamos de ver?"
- Aplicación: "Resuelve un ejercicio similar al que discutimos." / "¿Cómo aplicarías esto en [situación concreta]?"
- Razonamiento: "¿Por qué esta alternativa sería incorrecta?" / "¿Qué pasaría si cambiáramos [variable]?"
- Análisis: "Compara este caso con [otro escenario]." / "¿Qué limitaciones tiene este enfoque?"

REGLAS GENERALES:
- Adapta el lenguaje al nivel de ${grade} de secundaria.
- Tono: motivador, cercano, en español siempre.
- NUNCA respondas solo con texto explicativo. Toda respuesta termina con la Actividad DECO.
- Nunca resuelvas un ejercicio completo. Guía siempre paso a paso.`;
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
  "engagement_notes": "<frase breve sobre el nivel de participación>",
  "next_topic": "<próximo tema sugerido para la siguiente sesión, breve>",
  "reinforce": "<concepto específico que el alumno debería reforzar, breve>",
  "related": "<tema o área relacionada que podría explorar, breve>"
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
  if (userMessage.length > 10000) {
    return res.status(400).json({ error: 'Mensaje demasiado largo (máx 10 000 caracteres)' });
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
  let sseBuffer = '';

  const safeWrite = (chunk) => {
    if (!res.writableEnded) res.write(chunk);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop(); // retener línea incompleta para el próximo chunk

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) safeWrite(`data: ${JSON.stringify({ text })}\n\n`);
        } catch {
          // línea SSE incompleta o no JSON — ignorar
        }
      }
    }
  } catch (err) {
    safeWrite(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    safeWrite('data: [DONE]\n\n');
    if (!res.writableEnded) res.end();
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
  let recommendations = null;   // Fase 10: sugerencias post-sesión

  try {
    const evalUrl = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`;
    const evalRes = await fetch(evalUrl, {
      method: 'POST',
      headers: geminiHeaders(apiKey),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildEvaluationPrompt(history, metadata) }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 320, thinkingConfig: { thinkingBudget: 0 } }
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
        if (parsed.next_topic || parsed.reinforce || parsed.related) {
          recommendations = {
            nextTopic: parsed.next_topic || '',
            reinforce: parsed.reinforce || '',
            related:   parsed.related   || ''
          };
        }
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
    },
    recommendations
  });
}

