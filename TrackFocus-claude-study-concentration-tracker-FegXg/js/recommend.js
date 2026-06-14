// Motor de recomendaciones simple basado en promedios.
// Requiere un mínimo de sesiones para emitir consejos confiables.
const Recommend = (() => {

  const MIN_SAMPLES = 3;

  // Recomendaciones post-sesión (Fase 10): combina las sugerencias de la IA
  // (nextTopic/reinforce/related) con una pista local según el desempeño.
  // aiRecs puede ser null (la IA no devolvió nada). Devuelve un array de
  // { icon, label, text } listo para renderizar.
  function fromSession(aiRecs, sessionMetrics, decoResult) {
    const out = [];
    if (aiRecs) {
      if (aiRecs.nextTopic) out.push({ icon: '🎯', label: 'Próximo tema', text: aiRecs.nextTopic });
      if (aiRecs.reinforce) out.push({ icon: '📌', label: 'Refuerza',     text: aiRecs.reinforce });
      if (aiRecs.related)   out.push({ icon: '📚', label: 'Relacionado',  text: aiRecs.related });
    }

    // Pista local de respaldo según métricas (siempre útil, sin depender de la IA).
    if (!out.length) {
      const q = sessionMetrics || {};
      if (decoResult && decoResult.total > 0 && (decoResult.decoScore / decoResult.total) < 0.5) {
        out.push({ icon: '📌', label: 'Refuerza', text: 'Repasa los conceptos base de este tema; tu evaluación DECO muestra que aún hay margen de mejora.' });
      } else if ((q.engagement ?? 1) < 0.5) {
        out.push({ icon: '💬', label: 'Sugerencia', text: 'Intenta participar con respuestas más desarrolladas: explicar con tus palabras refuerza el aprendizaje.' });
      } else {
        out.push({ icon: '🚀', label: 'Sigue así', text: '¡Buen trabajo! Continúa con el siguiente tema o profundiza en lo que más te interesó.' });
      }
    }
    return out;
  }

  return { fromSession, MIN_SAMPLES };
})();
