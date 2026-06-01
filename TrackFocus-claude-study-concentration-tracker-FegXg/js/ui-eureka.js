// Dashboard Eureka (Fase H): vista de exposición de alto impacto para jurados,
// directores y docentes. Agrega métricas de gamificación + sesiones (desde Storage)
// y la mejora de aprendizaje del piloto (Pilot). Gráfico de crecimiento en CSS puro
// (sin Chart.js → ligero, ideal para proyectores/equipos modestos).
const UIEureka = (() => {

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // KPIs derivados del estado local (gamificación + sesiones).
  function _gather() {
    const s = Storage.get();
    const students = Object.values(s.users).filter(u => u.role === 'student');
    const ids = new Set(students.map(u => u.id));
    const sessions = s.sessions.filter(se => ids.has(se.email));
    const totalMin = sessions.reduce((a, b) => a + (b.durationMin || 0), 0);
    const avgConc = sessions.length
      ? (sessions.reduce((a, b) => a + b.concentration, 0) / sessions.length)
      : 0;
    const activeStreaks = students.filter(u => (u.gamification?.streak || 0) >= 1).length;
    const maxStreak = students.reduce((m, u) => Math.max(m, u.gamification?.streak || 0), 0);
    const badges = students.reduce((a, u) => a + ((u.gamification?.badges || []).length), 0);
    return {
      students: students.length,
      sessions: sessions.length,
      totalHours: Math.round(totalMin / 60),
      avgConc: Math.round(avgConc * 10) / 10,
      activeStreaks,
      maxStreak,
      badges,
      weekly: _weeklyCounts(sessions, 6)
    };
  }

  function _weeklyCounts(sessions, weeks) {
    const now = new Date();
    const out = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const end = new Date(now); end.setDate(now.getDate() - i * 7);
      const start = new Date(end); start.setDate(end.getDate() - 7);
      const count = sessions.filter(se => {
        const d = new Date(se.datetime);
        return d > start && d <= end;
      }).length;
      out.push({ label: i === 0 ? 'Esta sem.' : `-${i} sem`, count });
    }
    return out;
  }

  function _kpi(value, label, accent) {
    return `<div class="ek-kpi">
      <div class="ek-kpi-v"${accent ? ` style="color:${accent};"` : ''}>${value}</div>
      <div class="ek-kpi-l">${label}</div>
    </div>`;
  }

  function _barChart(weekly) {
    const max = Math.max(1, ...weekly.map(w => w.count));
    return `<div class="ek-chart">
      ${weekly.map(w => `
        <div class="ek-bar-col">
          <div class="ek-bar-val">${w.count}</div>
          <div class="ek-bar" style="height:${Math.round((w.count / max) * 100)}%"></div>
          <div class="ek-bar-lbl">${esc(w.label)}</div>
        </div>`).join('')}
    </div>`;
  }

  function screenEureka() {
    const g = _gather();
    return `
      <div class="eureka">
        <div class="eureka-hero">
          <div class="ek-badge">🏆 TrackFocus · Resultados del Piloto</div>
          <h1 class="eureka-title">Impacto medible en concentración y aprendizaje</h1>
          <p class="eureka-sub">Datos reales de los estudiantes que usan TrackFocus en su preparación diaria.</p>
        </div>

        <div class="ek-grid">
          ${_kpi(g.students, 'Estudiantes participantes', 'var(--accent)')}
          ${_kpi(g.totalHours + ' h', 'Horas totales estudiadas')}
          ${_kpi(g.sessions, 'Sesiones completadas')}
          ${_kpi('<span id="ekImprove">…</span>', 'Mejora promedio en quiz', 'var(--good)')}
          ${_kpi(g.avgConc + '/5', 'Concentración promedio')}
          ${_kpi(g.activeStreaks, 'Rachas activas')}
          ${_kpi(g.badges, 'Logros desbloqueados')}
          ${_kpi('🔥 ' + g.maxStreak, 'Mejor racha (días)')}
        </div>

        <div class="card ek-card">
          <h2 style="margin:0 0 4px;">Crecimiento semanal</h2>
          <p class="muted" style="margin:0 0 16px;font-size:13px;">Sesiones de estudio registradas por semana.</p>
          ${_barChart(g.weekly)}
        </div>

        <div class="card ek-card" id="ekImpactCard">
          <h2 style="margin:0 0 4px;">📈 Aprendizaje (quiz pre vs post)</h2>
          <p class="muted" id="ekImpactText" style="margin:0;font-size:13px;">Cargando resultados del piloto…</p>
        </div>

        <div style="text-align:center;margin-top:8px;">
          <button class="ghost" id="ekBack">← Volver</button>
        </div>
      </div>`;
  }

  async function wireEureka() {
    document.getElementById('ekBack')?.addEventListener('click', () => {
      const u = Roles.current();
      App.go(u && u.role === 'super_admin' ? 'admin-dashboard' : 'teacher-dashboard');
    });

    // Mejora de aprendizaje del piloto (async).
    if (typeof Pilot === 'undefined') return;
    const rows = await Pilot.fetchRows();
    const sum = Pilot.summarize(rows);
    const impEl = document.getElementById('ekImprove');
    const txtEl = document.getElementById('ekImpactText');
    if (impEl) impEl.textContent = (sum.quizPairs ? (sum.avgImprovement > 0 ? '+' : '') + sum.avgImprovement + ' pts' : '—');
    if (txtEl) {
      txtEl.innerHTML = sum.quizPairs
        ? `Sobre <strong>${sum.quizPairs}</strong> sesiones con quiz, el puntaje promedio pasó de <strong>${sum.avgPre}</strong> a <strong>${sum.avgPost}</strong> (de 3). El <strong>${sum.improvedPct}%</strong> de los estudiantes mejoró su resultado tras estudiar con el tutor socrático.`
        : 'Aún no hay suficientes quizzes completados para mostrar la mejora. Aparecerá cuando los estudiantes completen sesiones de Estudio IA.';
    }
  }

  return {
    screens: {
      'eureka': { render: screenEureka, wire: wireEureka }
    }
  };
})();
