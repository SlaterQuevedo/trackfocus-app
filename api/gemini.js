// Vercel Function: proxy seguro a Gemini para análisis de material de estudio.
// La clave vive en process.env.GEMINI_API_KEY (NUNCA en el cliente).
//   POST /api/gemini/analyze          { fileName, mimeType, base64, context }  → { text }
//   POST /api/gemini/answer-question  { question, mimeType, base64, analysis } → { answer }

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';

const ANALYZE_PROMPT = `Eres un tutor educativo para estudiantes de secundaria. Analiza el siguiente material de estudio y proporciona un análisis completo en español con este formato exacto:

## 📋 RESUMEN
Escribe un resumen completo y detallado del contenido del material.

## 💡 CONCEPTOS CLAVE
Lista los 5-7 conceptos más importantes con una explicación breve de cada uno.

## ❓ PREGUNTAS DE PRÁCTICA
Genera 5 preguntas numeradas. Después de cada pregunta agrega la respuesta en una nueva línea que empiece con "R:".

## ✏️ EJERCICIOS
Proporciona 3 ejercicios prácticos numerados con instrucciones claras y el objetivo de aprendizaje.

## 🔄 RETROALIMENTACIÓN
Sugiere estrategias de estudio específicas para este material y menciona las áreas que requieren más atención.`;

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // req.url es relativo en Vercel → usar base ficticia para parsear
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname.endsWith('/analyze'))          return handleAnalyze(req, res);
  if (pathname.endsWith('/answer-question'))  return handleAnswerQuestion(req, res);

  return res.status(404).json({ error: 'Endpoint no encontrado' });
};

async function callGemini(parts, generationConfig) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: 'GEMINI_API_KEY no configurada en el servidor', status: 500 };

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`;
  let geminiRes;
  try {
    geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig })
    });
  } catch (err) {
    return { error: 'Error conectando con Gemini: ' + err.message, status: 502 };
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return { error: 'Gemini error: ' + errText, status: geminiRes.status };
  }

  const json = await geminiRes.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text };
}

async function handleAnalyze(req, res) {
  const { mimeType, base64 } = req.body || {};
  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'base64 y mimeType requeridos' });
  }

  const result = await callGemini(
    [{ text: ANALYZE_PROMPT }, { inlineData: { mimeType, data: base64 } }],
    { temperature: 0.4, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } }
  );

  if (result.error) return res.status(result.status || 500).json({ error: result.error });
  return res.status(200).json({ text: result.text });
}

async function handleAnswerQuestion(req, res) {
  const { question, mimeType, base64 } = req.body || {};
  if (!question || !base64 || !mimeType) {
    return res.status(400).json({ error: 'question, base64 y mimeType requeridos' });
  }

  const instruction = `Actúa como tutor educativo socrático para estudiantes de secundaria.
El estudiante pregunta: "${question}"

REGLAS:
- NUNCA des la respuesta completa directamente.
- Guía con preguntas y pistas progresivas.
- Si el estudiante pide la respuesta directa, responde con una pista clave.
- Verifica comprensión con preguntas de seguimiento.
- Adapta el lenguaje al nivel de secundaria.
- Responde siempre en español.
- Al final plantea al menos una pregunta de seguimiento.`;

  const result = await callGemini(
    [{ text: instruction }, { inlineData: { mimeType, data: base64 } }],
    { temperature: 0.6, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } }
  );

  if (result.error) return res.status(result.status || 500).json({ error: result.error });
  return res.status(200).json({ answer: result.text || 'Sin respuesta de la IA.' });
}
