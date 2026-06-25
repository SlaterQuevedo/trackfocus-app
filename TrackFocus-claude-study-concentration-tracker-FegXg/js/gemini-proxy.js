// Proxy para Gemini API — análisis de archivos educativos.
// Llama exclusivamente al proxy seguro /api/gemini. La clave vive en el servidor.
const GeminiProxy = (() => {

  // Analiza un archivo y devuelve resumen, conceptos, preguntas, ejercicios y retroalimentación
  async function analyzeFile(fileRecord, context = {}) {
    const cached = Files.getBase64(fileRecord.id);
    if (!cached) return _mockAnalysis(fileRecord.fileName);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileRecord.fileName,
          mimeType: cached.mimeType,
          base64:   cached.base64,
          context
        })
      });
      if (res.ok) {
        const json = await res.json();
        return _parseAnalysis(json.text || '', fileRecord.fileName);
      }
    } catch (_) {}

    return _mockAnalysis(fileRecord.fileName);
  }

  // Responde una pregunta del estudiante sobre un archivo (modo socrático)
  async function answerQuestion(fileId, question, existingAnalysis) {
    const cached = Files.getBase64(fileId);
    if (!cached) return 'No encuentro el archivo. Vuelve a subirlo para que pueda ayudarte.';

    try {
      const res = await fetch('/api/gemini/answer-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          mimeType: cached.mimeType,
          base64:   cached.base64,
          analysis: existingAnalysis || null
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.answer || 'Sin respuesta de la IA.';
      }
    } catch (_) {}

    return 'El tutor no está disponible en este momento. Intenta de nuevo.';
  }

  // ── Helpers privados ────────────────────────────────────────────

  function _parseAnalysis(text, fileName) {
    const sections = {
      summary:     _extractSection(text, 'RESUMEN'),
      keyConcepts: _extractSection(text, 'CONCEPTOS CLAVE'),
      questions:   _parseQuestions(_extractSection(text, 'PREGUNTAS DE PRÁCTICA')),
      exercises:   _parseExercises(_extractSection(text, 'EJERCICIOS')),
      feedback:    _extractSection(text, 'RETROALIMENTACIÓN')
    };

    if (!sections.summary && text) {
      sections.summary = text.slice(0, 500) + (text.length > 500 ? '...' : '');
    }

    return sections;
  }

  function _extractSection(text, sectionName) {
    const regex = new RegExp(`##[^#]*${sectionName}[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  function _parseQuestions(text) {
    if (!text) return [];
    const lines  = text.split('\n').filter(l => l.trim());
    const result = [];
    let current  = null;
    for (const line of lines) {
      if (/^\d+[\.\)]\s/.test(line)) {
        if (current) result.push(current);
        current = { text: line.replace(/^\d+[\.\)]\s/, '').trim(), answer: '' };
      } else if (line.startsWith('R:') && current) {
        current.answer = line.slice(2).trim();
      } else if (current && !current.answer) {
        current.text += ' ' + line.trim();
      }
    }
    if (current) result.push(current);
    return result;
  }

  function _parseExercises(text) {
    if (!text) return [];
    const lines  = text.split('\n').filter(l => l.trim());
    const result = [];
    let current  = null;
    for (const line of lines) {
      if (/^\d+[\.\)]\s/.test(line)) {
        if (current) result.push(current);
        current = { title: `Ejercicio ${result.length + 1}`, prompt: line.replace(/^\d+[\.\)]\s/, '').trim() };
      } else if (current) {
        current.prompt += ' ' + line.trim();
      }
    }
    if (current) result.push(current);
    return result;
  }

  function _mockAnalysis(fileName) {
    return {
      summary:     `Vista previa de "${fileName}". Ariven Intelligence no está disponible en este momento.`,
      keyConcepts: 'Ariven Intelligence no está disponible. Intenta de nuevo más tarde.',
      questions:   [{ text: '¿Cuál es el tema principal del material?', answer: 'Analiza el material con Ariven Intelligence.' }],
      exercises:   [{ title: 'Ejercicio 1', prompt: 'Lee el material y resume los puntos principales.' }],
      feedback:    'Ariven Intelligence no está disponible en este momento.'
    };
  }

  return { analyzeFile, answerQuestion };
})();
