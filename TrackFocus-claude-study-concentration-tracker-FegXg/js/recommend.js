// Motor de recomendaciones simple basado en promedios.
// Requiere un mínimo de sesiones para emitir consejos confiables.
const Recommend = (() => {

  const MIN_SAMPLES = 3;

  function build(sessions) {
    const tips = [];

    if (sessions.length < MIN_SAMPLES) {
      tips.push({
        type: 'info',
        text: `Registra al menos ${MIN_SAMPLES} sesiones para obtener recomendaciones personalizadas. Llevas ${sessions.length}.`
      });
      return tips;
    }

    // Mejor franja horaria.
    const buckets = Stats.byHourBucket(sessions).filter(b => b.count >= 2);
    if (buckets.length) {
      const best = buckets[0];
      tips.push({
        type: 'success',
        text: `Tu mejor franja horaria es "${best.bucket}" con un promedio de concentración de ${best.avgConcentration}/5 (${best.count} sesiones). Intenta priorizar tu estudio en esta franja.`
      });
      if (buckets.length > 1) {
        const worst = buckets[buckets.length - 1];
        if (worst.bucket !== best.bucket && worst.avgConcentration < best.avgConcentration - 0.5) {
          tips.push({
            type: 'info',
            text: `Tu franja más floja es "${worst.bucket}" (${worst.avgConcentration}/5). Considera usar ese tiempo para repaso ligero o descanso, no para temas nuevos.`
          });
        }
      }
    }

    // Mejor actividad previa.
    const acts = Stats.byPreviousActivity(sessions).filter(a => a.count >= 2);
    if (acts.length) {
      const best = acts[0];
      tips.push({
        type: 'success',
        text: `Tu hábito previo más efectivo es "${best.activity}" (promedio ${best.avgConcentration}/5). Mantenlo como rutina antes de estudiar.`
      });
      const worst = acts[acts.length - 1];
      if (worst.activity !== best.activity && worst.avgConcentration < 3) {
        tips.push({
          type: 'error',
          text: `Tras "${worst.activity}" tu concentración cae a ${worst.avgConcentration}/5. Evítalo justo antes de sesiones importantes.`
        });
      }
    }

    // Materias problemáticas.
    const subs = Stats.bySubject(sessions);
    const weak = subs.filter(s => s.count >= 2 && s.avgConcentration < 3);
    for (const s of weak) {
      tips.push({
        type: 'info',
        text: `En "${s.subject}" tu concentración promedio es ${s.avgConcentration}/5. Prueba sesiones más cortas (25–30 min) con descansos cortos.`
      });
    }

    // Duración óptima.
    const longSessions = sessions.filter(s => s.durationMin >= 60);
    const shortSessions = sessions.filter(s => s.durationMin < 60);
    if (longSessions.length >= 2 && shortSessions.length >= 2) {
      const longAvg = longSessions.reduce((a, s) => a + s.concentration, 0) / longSessions.length;
      const shortAvg = shortSessions.reduce((a, s) => a + s.concentration, 0) / shortSessions.length;
      if (Math.abs(longAvg - shortAvg) >= 0.5) {
        if (shortAvg > longAvg) {
          tips.push({
            type: 'success',
            text: `Rindes mejor en sesiones cortas (<60 min): ${shortAvg.toFixed(2)}/5 vs ${longAvg.toFixed(2)}/5. Considera la técnica Pomodoro.`
          });
        } else {
          tips.push({
            type: 'success',
            text: `Rindes mejor en sesiones largas (≥60 min): ${longAvg.toFixed(2)}/5 vs ${shortAvg.toFixed(2)}/5. Bloquea tiempo en calendario para concentración profunda.`
          });
        }
      }
    }

    return tips;
  }

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

  return { build, fromSession, MIN_SAMPLES };
})();
