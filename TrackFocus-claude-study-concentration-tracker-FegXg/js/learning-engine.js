// Motor de Aprendizaje Personalizado — Ariven Priority 1
// Diagnóstico inicial, Plan de Estudio Adaptativo, Recordatorios Inteligentes,
// Prioridades semanales e Insights personalizados basados en patrones de sesiones.
const LearningEngine = (() => {
  const PFX = 'arv-le-';

  // ── Diagnóstico ──────────────────────────────────────────────────────────────

  function getDiagnosis(userId) {
    try { return JSON.parse(localStorage.getItem(PFX + 'diag-' + userId) || 'null'); }
    catch (_) { return null; }
  }

  function setDiagnosis(userId, data) {
    localStorage.setItem(PFX + 'diag-' + userId, JSON.stringify({ ...data, setAt: Date.now() }));
  }

  function hasDiagnosis(userId) {
    return !!getDiagnosis(userId);
  }

  // ── Recordatorios Inteligentes ───────────────────────────────────────────────

  function getReminderPrefs(userId) {
    try {
      return JSON.parse(localStorage.getItem(PFX + 'remind-' + userId) || 'null') || { enabled: false, hour: 18 };
    } catch (_) { return { enabled: false, hour: 18 }; }
  }

  function setReminderPrefs(userId, prefs) {
    localStorage.setItem(PFX + 'remind-' + userId, JSON.stringify(prefs));
  }

  function getNotificationPermission() {
    if (!('Notification' in window)) return 'unavailable';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return 'unavailable';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try { return await Notification.requestPermission(); }
    catch (_) { return 'denied'; }
  }

  function _showNotification(userName) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification('Hora de estudiar, ' + (userName || 'estudiante') + ' 📚', {
        body: 'Ariven te recuerda que es tu momento de mayor concentración. ¡Un paso hoy!',
        icon: '/assets/logo.svg',
        tag: 'ariven-study-reminder'
      });
    } catch (_) {}
  }

  // Llama esto en cada carga de app (start()) para verificar si hay un recordatorio pendiente.
  function checkAndShowReminder(userId, userName) {
    const prefs = getReminderPrefs(userId);
    if (!prefs.enabled || getNotificationPermission() !== 'granted') return;
    const nowHour = new Date().getHours();
    const shownKey = PFX + 'shown-' + userId + '-' + new Date().toDateString();
    if (localStorage.getItem(shownKey)) return;
    if (nowHour === prefs.hour) {
      _showNotification(userName);
      localStorage.setItem(shownKey, '1');
    }
  }

  // ── Helpers de análisis de sesiones ─────────────────────────────────────────

  function _getBestHour(sessions) {
    if (!sessions || sessions.length < 5) return null;
    const byHour = {};
    sessions.forEach(se => {
      const h = new Date(se.datetime).getHours();
      if (!byHour[h]) byHour[h] = { sum: 0, count: 0 };
      byHour[h].sum += (se.concentration || 0);
      byHour[h].count++;
    });
    let best = null, bestAvg = 0;
    for (const [h, d] of Object.entries(byHour)) {
      if (d.count >= 2) {
        const avg = d.sum / d.count;
        if (avg > bestAvg) { bestAvg = avg; best = Number(h); }
      }
    }
    return best;
  }

  function _subjectStats(sessions, days) {
    const cutoff = Date.now() - days * 86400000;
    const map = {};
    (sessions || []).filter(se => se && new Date(se.datetime).getTime() > cutoff).forEach(se => {
      if (!map[se.subject]) map[se.subject] = { count: 0, totalConc: 0, totalMin: 0, lastStudied: 0 };
      map[se.subject].count++;
      map[se.subject].totalConc += (se.concentration || 0);
      map[se.subject].totalMin += (se.durationMin || 0);
      const t = new Date(se.datetime).getTime();
      if (t > map[se.subject].lastStudied) map[se.subject].lastStudied = t;
    });
    return Object.entries(map).map(([name, d]) => ({
      name,
      avgConc: d.count > 0 ? Math.round(d.totalConc / d.count * 10) / 10 : 0,
      avgMin:  d.count > 0 ? Math.round(d.totalMin / d.count) : 0,
      daysSince: d.lastStudied > 0 ? Math.floor((Date.now() - d.lastStudied) / 86400000) : 999,
      count: d.count
    }));
  }

  // ── Prioridades semanales ────────────────────────────────────────────────────

  function getWeekPriorities(sessions) {
    const stats = _subjectStats(sessions, 30);
    if (!stats.length) return [];
    return stats
      .map(s => ({
        ...s,
        urgency: s.daysSince > 7 ? 'high'
                : s.avgConc < 2.5 ? 'high'
                : s.daysSince > 3 ? 'medium'
                : 'low'
      }))
      .sort((a, b) => {
        const u = { high: 2, medium: 1, low: 0 };
        return (u[b.urgency] - u[a.urgency]) || (b.daysSince - a.daysSince);
      });
  }

  // ── Plan de Estudio Adaptativo ───────────────────────────────────────────────

  function getStudyPlan(sessions, diagnosis) {
    const weeklyHours = (diagnosis?.weeklyHours) || 8;
    const dailyHours  = Math.round(weeklyHours / 5 * 10) / 10;
    const bestHour    = _getBestHour(sessions);
    const priorities  = getWeekPriorities(sessions);
    const diagSubjects = (diagnosis?.subjects) || [];

    // Merge: diagnosis subjects primero, luego los de sesiones
    const allSubjects = [...new Set([...diagSubjects, ...priorities.map(p => p.name)])].slice(0, 8);

    const timeLabel = bestHour !== null
      ? (bestHour < 12 ? bestHour + ':00 AM' : bestHour < 18 ? bestHour + ':00 PM' : bestHour + ':00')
      : null;

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    if (weeklyHours > 8) dayNames.push('Sábado');

    const schedule = dayNames.map(function(name, i) {
      const subj = allSubjects.length > 0 ? allSubjects[i % allSubjects.length] : null;
      const pData = subj ? priorities.find(function(p) { return p.name === subj; }) : null;
      let reason = 'Continuar con la materia';
      let urgency = 'low';
      if (pData) {
        urgency = pData.urgency;
        if (pData.daysSince > 7) reason = 'Sin estudiar hace ' + pData.daysSince + ' días';
        else if (pData.avgConc < 2.5) reason = 'Concentración baja — necesita refuerzo';
        else if (pData.urgency === 'medium') reason = 'Mantener continuidad';
        else reason = 'Buen ritmo — sigue así';
      } else if (diagSubjects.includes(subj)) {
        reason = 'Materia clave de tu diagnóstico';
        urgency = 'medium';
      }
      return { name: name, subject: subj || null, hours: dailyHours, reason: reason, urgency: urgency };
    });

    const insights = [];
    if (timeLabel) insights.push('Estudia a las ' + timeLabel + ' — es tu hora de mayor concentración.');
    if (priorities.length && priorities[0].urgency === 'high') {
      insights.push('Prioriza ' + priorities[0].name + ' esta semana.');
    }
    insights.push('Meta: ' + weeklyHours + 'h semanales (~' + dailyHours + 'h por día).');
    if (diagnosis?.challenge === 'concentracion') insights.push('Usa la técnica Pomodoro para mejorar tu concentración.');
    if (diagnosis?.challenge === 'motivacion') insights.push('Cada sesión te acerca a nuevas insignias y sube tu XP.');
    if (diagnosis?.challenge === 'organizacion') insights.push('Sigue este plan diariamente para construir el hábito.');

    return { weeklyHours, dailyHours, schedule, insights, bestHour, timeLabel };
  }

  // ── Insights inteligentes (para Dashboard) ───────────────────────────────────

  function getSmartInsights(sessions, diagnosis, gam) {
    if (!sessions || sessions.length < 2) {
      return [{ type: 'info', icon: '✦', text: 'Completa más sesiones y Ariven aprenderá tu perfil para darte recomendaciones personalizadas.' }];
    }

    const insights = [];
    const bestHour = _getBestHour(sessions);

    if (bestHour !== null) {
      const label = bestHour < 12 ? bestHour + ':00 AM' : bestHour < 18 ? bestHour + ':00 PM' : bestHour + ':00';
      insights.push({ type: 'time', icon: '⏰', text: 'Tu mejor horario de estudio es a las ' + label + '.' });
    }

    const prios = getWeekPriorities(sessions);
    if (prios.length && prios[0].urgency === 'high') {
      const p = prios[0];
      const reason = p.daysSince > 7
        ? 'hace ' + p.daysSince + ' días sin practicarla'
        : 'concentración promedio ' + p.avgConc + '/5';
      insights.push({ type: 'subject', icon: '📖', text: 'Prioridad esta semana: ' + p.name + ' — ' + reason + '.' });
    }

    // Perfil de aprendizaje desde Analytics (si está disponible)
    const profile = (typeof Analytics !== 'undefined') ? Analytics.classifyProfile(sessions) : null;
    if (profile) {
      insights.push({ type: 'profile', icon: profile.icon, text: 'Perfil: ' + profile.label + ' — ' + profile.desc });
    }

    // Consejo basado en desafío del diagnóstico
    if (diagnosis?.challenge) {
      const tips = {
        concentracion: 'Pomodoro 25+5 min te ayudará a mejorar la concentración sostenida.',
        tiempo:        'Sesiones cortas de alta intensidad son las más eficientes para tu agenda.',
        motivacion:    'Cada sesión completada suma XP y te acerca a nuevas insignias.',
        comprension:   'Al terminar cada sesión, escribe 3 ideas clave que aprendiste.',
        organizacion:  'Tu plan de estudio semanal está listo — úsalo como guía diaria.'
      };
      const tip = tips[diagnosis.challenge];
      if (tip) insights.push({ type: 'tip', icon: '💡', text: tip });
    }

    // Racha
    const streak = gam?.streak || 0;
    if (streak >= 7) {
      insights.push({ type: 'streak', icon: '⚡', text: streak + ' días de racha — estás en tu mejor momento de aprendizaje.' });
    } else if (streak >= 3) {
      insights.push({ type: 'streak', icon: '🔥', text: streak + ' días seguidos — el hábito se está formando. Solo ' + (7 - streak) + ' más para la racha semanal.' });
    }

    return insights.slice(0, 3);
  }

  // ── API pública ──────────────────────────────────────────────────────────────

  return {
    getDiagnosis,
    setDiagnosis,
    hasDiagnosis,
    getReminderPrefs,
    setReminderPrefs,
    getNotificationPermission,
    requestNotifications,
    checkAndShowReminder,
    getWeekPriorities,
    getStudyPlan,
    getSmartInsights
  };
})();
