import { GEMINI_MODEL, GEMINI_BASE, geminiHeaders, applyCors } from './_lib.js';

export default async (req, res) => {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audio, mimeType } = req.body || {};
  if (!audio || !mimeType) {
    return res.status(400).json({ error: 'audio (base64) y mimeType son requeridos' });
  }
  const MAX_AUDIO_BASE64 = 5 * 1024 * 1024; // 5 MB en base64 ≈ 3.75 MB de audio real
  if (audio.length > MAX_AUDIO_BASE64) {
    return res.status(413).json({ error: 'Audio demasiado grande (máx 3.75 MB)' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ text: '' });
  }

  try {
    const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`;
    const r = await fetch(url, {
      method: 'POST',
      headers: geminiHeaders(apiKey),
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: 'Transcribe exactamente el audio adjunto. Devuelve solo el texto transcrito, sin explicaciones ni formato extra. Si no hay voz clara, devuelve una cadena vacía.' },
            { inlineData: { mimeType, data: audio } }
          ]
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } }
      })
    });

    if (!r.ok) return res.status(200).json({ text: '' });

    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text: text.trim() });
  } catch {
    return res.status(200).json({ text: '' });
  }
};
