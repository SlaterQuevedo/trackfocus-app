import { GEMINI_MODEL, GEMINI_BASE, geminiHeaders, applyCors, searchYouTubeCandidates, enrichCandidates } from './_lib.js';

export default async (req, res) => {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  if (action === 'message')         return handleMessage(req, res);
  if (action === 'finalize')        return handleFinalize(req, res);
  if (action === 'quiz')            return handleQuiz(req, res);
  if (action === 'deco')            return handleDeco(req, res);
  if (action === 'recommend-video') return handleRecommendVideo(req, res);

  return res.status(400).json({ error: 'action debe ser "message", "finalize", "quiz", "deco" o "recommend-video"' });
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

// ── Handler: recomendación de UN video de YouTube (bajo demanda) ────────────
// Se dispara solo cuando el alumno hace click en "📹 Videos" — nunca automático.
// Usa TODA la conversación acumulada (no solo el último mensaje) para entender
// el contexto real: (1) la IA decide qué buscar, (2) se traen candidatos REALES
// de YouTube, (3) la IA elige el único mejor entre esos candidatos reales, o
// ninguno si no hay uno suficientemente bueno.
async function handleRecommendVideo(req, res) {
  const { metadata, history = [] } = req.body || {};
  if (!metadata) return res.status(400).json({ error: 'metadata requerido' });

  const fallbackQuery = (metadata.topicGoal || metadata.subject || 'estudio').trim();

  const geminiKey = process.env.GEMINI_API_KEY;
  const ytKey     = process.env.YOUTUBE_API_KEY;
  if (!geminiKey || !ytKey) return res.status(200).json({ video: null, fallbackQuery });

  const transcript = history.slice(-20)
    .map(m => `[${m.role === 'user' ? 'ALUMNO' : 'TUTOR'}]: ${m.content}`)
    .join('\n');

  if (!transcript.trim()) return res.status(200).json({ video: null, fallbackQuery });

  const memoryBlock = metadata.memoryContext ? `MEMORIA DEL ALUMNO: ${metadata.memoryContext}\n` : '';

  // ── 1. La IA decide QUÉ buscar, en base a toda la conversación acumulada ────
  let searchQuery = fallbackQuery;
  try {
    const queryPrompt = `Eres un asistente que decide qué video de YouTube ayudaría más a un estudiante ahora mismo.

CONTEXTO: materia ${metadata.subject}, grado ${metadata.grade}, modo de estudio ${metadata.studyMode || 'tutor'}.
${memoryBlock}
CONVERSACIÓN COMPLETA HASTA AHORA (no te bases solo en el último mensaje, entiende el hilo completo):
${transcript}

Basándote en TODA la conversación, identifica cuál es la necesidad real y actual del estudiante en este momento. Genera UNA sola búsqueda de YouTube en español, natural y específica (como la escribiría alguien que realmente busca ese video), con la mayor probabilidad de encontrar un video que explique exactamente lo que el estudiante necesita ahora.

Responde SOLO con el texto de la búsqueda, sin comillas ni explicación, una sola línea.`;

    const r = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: geminiHeaders(geminiKey),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: queryPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 60, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (r.ok) {
      const j = await r.json();
      const raw = (j.candidates?.[0]?.content?.parts?.[0]?.text || '').trim().replace(/^["']|["']$/g, '');
      if (raw) searchQuery = raw.slice(0, 120);
    }
  } catch {
    // continúa con fallbackQuery
  }

  // ── 2. Buscar candidatos reales en YouTube ──────────────────────────────────
  let candidates;
  try {
    candidates = await searchYouTubeCandidates([searchQuery], ytKey, 8);
  } catch {
    candidates = [];
  }
  if (!candidates.length) return res.status(200).json({ video: null, fallbackQuery: searchQuery });

  // Enriquecer con duración real y descartar los que YouTube no permite embeber
  // (evita recomendar un video que luego se muestre bloqueado en el reproductor).
  candidates = await enrichCandidates(candidates, ytKey);
  if (!candidates.length) return res.status(200).json({ video: null, fallbackQuery: searchQuery });

  // ── 3. La IA elige el MEJOR candidato real, o ninguno ───────────────────────
  const candidatesList = candidates.map((c, i) =>
    `${i}. Título: "${c.title}" | Canal: ${c.channel} | Duración: ${c.durationLabel || 'desconocida'} | Descripción: ${(c.description || '').slice(0, 200)}`
  ).join('\n');

  const rankPrompt = `Eres un tutor que elige el MEJOR video de YouTube para un estudiante, entre candidatos REALES ya encontrados (no inventes nada, elige solo entre los listados).

CONTEXTO DEL ESTUDIANTE: materia ${metadata.subject}, grado ${metadata.grade}, modo ${metadata.studyMode || 'tutor'}.
${memoryBlock}
CONVERSACIÓN COMPLETA:
${transcript}

CANDIDATOS REALES:
${candidatesList}

Elige el índice del candidato más útil para la situación actual de este estudiante, considerando: relevancia exacta con el tema, claridad de la explicación (según título/descripción), adecuación al nivel/grado, duración razonable, y que sea contenido educativo real (no solo coincidencia de palabras clave). Si NINGUNO es realmente bueno para este estudiante ahora, responde index: -1.

Devuelve SOLO este JSON, sin markdown ni texto extra:
{"index": <número o -1>, "reason": "<1-2 frases en español explicando por qué este video ayuda a ESTE estudiante en ESTE momento, basándote en datos reales del video y de la conversación — no afirmes nada que no puedas verificar del título/descripción>"}`;

  try {
    const r2 = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: geminiHeaders(geminiKey),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: rankPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 220, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r2.ok) return res.status(200).json({ video: null, fallbackQuery: searchQuery });

    const j2 = await r2.json();
    const raw2 = j2.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = raw2.match(/\{[\s\S]*\}/);
    if (!match) return res.status(200).json({ video: null, fallbackQuery: searchQuery });

    const parsed = JSON.parse(match[0]);
    const idx = Number(parsed.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) {
      return res.status(200).json({ video: null, fallbackQuery: searchQuery });
    }

    const chosen = candidates[idx];
    return res.status(200).json({
      video: { ...chosen, reason: String(parsed.reason || '').slice(0, 400) },
      fallbackQuery: null
    });
  } catch {
    return res.status(200).json({ video: null, fallbackQuery: searchQuery });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// TrackTutor: Método Minerva (cómo enseña) + Sistema DECO (cómo comprueba
// comprensión, 4 niveles cognitivos). Prompt optimizado para ser breve y
// directo: la personalización se traduce en CÓMO enseña, no en mencionar
// datos del alumno. Ver docs de la Fase de optimización de TrackTutor.
const _DECO_LEVEL_HINTS = {
  comprehension: 'que resuma la idea con sus propias palabras',
  application:   'que resuelva un caso breve o diga cómo aplicaría esto',
  reasoning:     'que explique por qué ocurre algo o qué pasaría si cambia algo',
  analysis:      'que compare con otro caso o note una limitación'
};

// performanceBand ('low' | 'high' | null) se calcula en handleMessage a
// partir de señales YA existentes en TrackFocus (índice de aprendizaje en
// vivo, resultados DECO parciales) — nunca se inventa, y nunca se le dice
// al alumno el número: solo cambia CÓMO se enseña.
const _PERF_BAND_HINTS = {
  low:  'El desempeño reciente es bajo (errores, respuestas muy cortas, poco desarrollo). Simplifica: una idea a la vez, oraciones cortas, ejercicios pequeños. Si el alumno vuelve a fallar el mismo punto, no repitas la misma explicación — cambia de enfoque (otro ejemplo, otra analogía, un paso más chico).',
  high: 'El desempeño reciente es alto (respuestas correctas y bien razonadas). Profundiza más, plantea problemas más completos, exige más razonamiento, avanza sin repetir lo básico.'
};

const _DIFFICULTY_PRESET_HINTS = {
  easy:   'eligió explícitamente empezar en nivel fácil — repasa desde lo básico, ejercicios simples y directos',
  medium: 'eligió explícitamente nivel medio — el esperado para su grado, sin simplificar de más ni saltarse pasos',
  hard:   'eligió explícitamente nivel difícil — retos más avanzados desde el primer ejercicio, sin repasar lo básico'
};

function buildSystemPrompt(metadata, decoDue) {
  const { subject, grade, memoryContext, studyMode, examDate, topicGoal,
          decoLevel, performanceBand, career, prepPct, difficultyPreset } = metadata;

  const memoryBlock = memoryContext
    ? `\nMemoria del alumno (información interna — para decidir cómo enseñar; nunca la repitas ni la cites): ${memoryContext}\n`
    : '';

  // Calibración inicial (Panel Personal + selector de dificultad en el setup):
  // meta/carrera + nivel de preparación general o nivel elegido explícitamente
  // por el alumno. Nada de esto se inventa — career/prepPct ya existían en
  // TrackFocus, difficultyPreset es una elección directa del alumno antes de
  // empezar. Si el alumno eligió un nivel explícito, ese manda sobre el
  // cálculo automático de prepPct (pero career sigue aplicando).
  const calibParts = [];
  if (career) calibParts.push(`aspira a estudiar ${career}`);
  if (difficultyPreset && _DIFFICULTY_PRESET_HINTS[difficultyPreset]) {
    calibParts.push(_DIFFICULTY_PRESET_HINTS[difficultyPreset]);
  } else if (typeof prepPct === 'number') {
    const prepLevel = prepPct >= 70 ? 'alto' : prepPct >= 40 ? 'medio' : 'inicial';
    calibParts.push(`nivel de preparación general ${prepLevel}`);
  }
  const calibBlock = calibParts.length
    ? `\nCalibración inicial (información interna, nunca la menciones): el alumno ${calibParts.join(', ')}. Ajusta la dificultad de tus ejercicios y ejemplos a esto y a ${grade} desde el primer mensaje — evita problemas de nivel muy por debajo de secundaria salvo que el alumno demuestre que los necesita.\n`
    : '';

  const perfBlock = performanceBand && _PERF_BAND_HINTS[performanceBand]
    ? `\nAdaptación (información interna — nunca menciones números, puntajes o niveles al alumno): ${_PERF_BAND_HINTS[performanceBand]}\n`
    : '';

  let modeBlock = '';
  if (studyMode === 'exam-prep') {
    modeBlock = `\nModo examen: se prepara para ${subject}${examDate ? ` (~${examDate})` : ''}. Prioriza temas de alto impacto, refuerza errores que cometa, simula preguntas tipo examen cuando compruebes comprensión.\n`;
  } else if (studyMode === 'topic-mastery') {
    modeBlock = `\nModo dominio de tema: quiere dominar "${topicGoal || subject}". Diagnostica primero qué sabe, construye de lo simple a lo complejo.\n`;
  }

  const decoHint = _DECO_LEVEL_HINTS[decoLevel] || _DECO_LEVEL_HINTS.comprehension;
  const decoBlock = decoDue
    ? `\nCierra esta respuesta con UNA comprobación breve de comprensión, en una frase natural integrada al texto (sin encabezado, sin separadores): pide ${decoHint}.`
    : '';

  return `Eres TrackTutor, el tutor de IA de TrackFocus, para un estudiante de ${grade} de secundaria peruana. Enseñas ${subject}.
${memoryBlock}${calibBlock}${modeBlock}${perfBlock}
CÓMO ENSEÑAS:
- Ve directo a enseñar. Nada de saludos largos, frases motivacionales genéricas, recapitulaciones de sesiones pasadas ni relleno. Un saludo de una frase está bien solo si es el primer mensaje de la sesión.
- Sé breve por defecto y no repitas la misma idea con otras palabras:
  · pregunta simple → 1-3 frases
  · explicación → 2-4 párrafos cortos o pasos
  · ejercicio → enunciado + instrucción concreta
  · retroalimentación → qué estuvo bien/mal + el punto clave + siguiente paso
  Extiéndete solo si el tema realmente lo exige o el alumno lo pide explícitamente.
- Distingue "enséñame/explícame" de "dime la respuesta": si pide entender un concepto, guíalo con preguntas y pistas progresivas (pregunta orientadora → pista conceptual → pista concreta), nunca la solución directa de un ejercicio que debe resolver él. Si pide una explicación o definición directa, explícasela sin forzarlo todo a preguntas.
- Antes de validar una respuesta, pide brevemente el razonamiento SOLO si la respuesta es dudosa, vaga o incorrecta.
- Si el alumno responde rápido, fácil y correctamente — muestra que ya domina el punto — NO insistas pidiéndole que explique cómo llegó al resultado ni repreguntes sobre lo mismo: sube la dificultad, da un ejercicio nuevo, o avanza al siguiente concepto del curso.
- Celebra con una palabra o frase corta ("Bien.", "Exacto.", "Casi, revisa esto:") — nunca un párrafo de felicitación.

FORMATO:
- Sin emojis decorativos, sin "---", sin encabezados tipo "Actividad DECO". Texto natural y limpio.
- Listas o pasos numerados solo cuando ayuden a seguir un procedimiento.
- Matemáticas siempre en texto plano legible — nunca "$", "\\[", "\\]", "\\(", "\\)" ni LaTeX. Ejemplos: potencias x^2 o x², fracciones 3/4, raíces √x, sistemas en líneas separadas:
2x + y = 7
x - y = 2
${decoBlock}

Todo en español.`;
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback: devolver respuesta simple sin usar API
    return handleFallbackMessage(res, userMessage, metadata);
  }

  // DECO cada ~3 turnos del alumno (no en cada respuesta) — determinista,
  // calculado desde el historial real, no confiado al criterio del modelo.
  const userTurnNumber = history.filter(m => m.role === 'user').length + 1;
  const decoDue = userTurnNumber % 3 === 0;

  // Banda de desempeño reciente ('low'/'high'/null) desde señales que
  // TrackFocus YA calcula client-side (índice de aprendizaje en vivo,
  // _estimateLiveLI en ui-student.js) — no se inventa ninguna métrica nueva.
  // Cambia CÓMO enseña el prompt, nunca se le dice el número al alumno.
  let performanceBand = null;
  if (typeof metadata.liveLearningIndex === 'number') {
    if (metadata.liveLearningIndex < 45) performanceBand = 'low';
    else if (metadata.liveLearningIndex >= 70) performanceBand = 'high';
  }

  // Construir contents para Gemini (sin system role nativo → primer turn de modelo)
  const systemTurn = {
    role: 'user',
    parts: [{ text: buildSystemPrompt({ ...metadata, performanceBand }, decoDue) }]
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
  let recommendations = null;

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
