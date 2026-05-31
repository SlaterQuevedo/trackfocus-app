// Fallback simple para tutor IA cuando no hay Gemini configurado
export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  if (action === 'message') {
    const { metadata, history = [], userMessage } = req.body;

    if (!metadata || !userMessage) {
      return res.status(400).json({ error: 'metadata y userMessage son requeridos' });
    }

    // Respuestas básicas del tutor
    const basicResponses = {
      default: `Entendido. Veo que estás estudiando ${metadata.subject || 'un tema'}. ¿Puedes decirme específicamente qué parte del tema te cuesta más entender?`,
      confused: `No es problema no entender algo a la primera. ¿Qué parte específica te confunde? Podemos desglosarl paso a paso.`,
      asking: `Excelente pregunta. Piensa en esto: ¿Cuál crees que es la respuesta basándote en lo que ya sabes?`,
      struggling: `Te veo haciendo un esfuerzo. Eso es lo más importante. Cuéntame dónde sientes que atasca tu razonamiento.`
    };

    let response = basicResponses.default;
    const msg = userMessage.toLowerCase();

    if (msg.includes('no entiendo') || msg.includes('confundido')) {
      response = basicResponses.confused;
    } else if (msg.includes('?')) {
      response = basicResponses.asking;
    } else if (msg.includes('difícil') || msg.includes('complicado')) {
      response = basicResponses.struggling;
    }

    response += '\n\n📝 Pregunta: ¿Qué has intentado hasta ahora?';

    // Simular streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Enviar respuesta en chunks
    for (const char of response) {
      res.write(`data: ${JSON.stringify({ text: char })}\n\n`);
      await new Promise(r => setTimeout(r, 10));
    }

    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  if (action === 'finalize') {
    return res.json({
      concentration: 3,
      metrics: {
        questions_attempted: 2,
        questions_correct: 1,
        coherence: 0.7,
        engagement: 'Buena participación'
      }
    });
  }

  return res.status(400).json({ error: 'action debe ser "message" o "finalize"' });
};
