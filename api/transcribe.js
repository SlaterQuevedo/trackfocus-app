// Vercel Edge Function: transcribir audio a texto
// Usa Deepgram API o similar para convertir audio WebM/Opus a texto

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Parsear multipart form-data (audio + language)
    const contentType = req.headers['content-type'];
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type debe ser multipart/form-data' });
    }

    // Simulación: en prod, usar una biblioteca como 'busboy' para parsear multipart
    // y llamar a API de transcripción (Deepgram, Whisper, etc.)

    // Para MVP: simular transcripción
    const mockTranscription = {
      text: 'Esta es una transcripción simulada del audio grabado. En producción, esto sería el resultado de la API de transcripción.',
      confidence: 0.85,
      language: 'es-ES',
      duration_ms: 5000
    };

    return res.status(200).json(mockTranscription);
  } catch (error) {
    console.error('[transcribe]', error);
    return res.status(500).json({ error: error.message || 'Error en transcripción' });
  }
};
