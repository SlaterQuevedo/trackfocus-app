// Pantallas del rol Docente.
const UITeacher = (() => {

  const root = () => document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // --- Helper: panel de solicitudes pendientes ---
  function _pendingRequestsPanel(schoolId, teacherId) {
    const s = Storage.get();
    const requests = Schools.listRequestsForSchool(schoolId).filter(r => r.status === 'pending');
    if (requests.length === 0) return '';
    const classrooms = Schools.listClassrooms(schoolId);

    return `
      <div class="card" style="border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.03);margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <span style="font-size:20px;">🔔</span>
          <h2 style="margin:0;">Solicitudes pendientes <span style="background:rgba(245,158,11,0.2);color:var(--warn);border-radius:999px;padding:2px 10px;font-size:13px;">${requests.length}</span></h2>
        </div>
        ${requests.map(req => {
          const targetCr = req.classroomId && s.classrooms[req.classroomId] ? s.classrooms[req.classroomId].name : null;
          const fromCr = req.fromClassroomId && s.classrooms[req.fromClassroomId] ? s.classrooms[req.fromClassroomId].name : null;
          const typeLabel = req.type === 'change'
            ? `Cambio de aula${fromCr ? ': ' + esc(fromCr) + ' →' : ''} ${targetCr ? esc(targetCr) : 'Sin especificar'}`
            : `Solicitud de ingreso${targetCr ? ' · Aula: ' + esc(targetCr) : ''}`;
          return `
            <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div>
                  <div style="font-weight:600;font-size:14px;">${esc(req.studentName)}</div>
                  <div class="muted" style="font-size:12px;margin-top:2px;">${esc(req.studentEmail)}</div>
                  <div class="muted" style="font-size:12px;margin-top:2px;">${typeLabel} · ${new Date(req.createdAt).toLocaleDateString('es-PE')}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  ${classrooms.length > 0 ? `
                  <select class="req-cr-sel" data-req="${req.id}" style="padding:7px 30px 7px 10px;font-size:12px;border-radius:8px;">
                    <option value="">— Asignar aula —</option>
                    ${classrooms.map(c => `<option value="${c.id}"${req.classroomId === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
                  </select>` : ''}
                  <button class="primary" data-approve="${req.id}" style="padding:7px 14px;font-size:12px;">✓ Aprobar</button>
                  <button class="danger" data-reject="${req.id}" style="padding:7px 14px;font-size:12px;">✕ Rechazar</button>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ---- Pantalla: Dashboard del Docente ----
  function screenTeacherDashboard() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const school = user.schoolId ? s.schools[user.schoolId] : null;
    const classrooms = school ? Schools.listClassrooms(school.id) : [];
    const primaryCr = classrooms.find(cr => cr.tutorId === user.id) || classrooms[0] || null;

    const students = primaryCr ? Schools.listStudentsInClassroom(primaryCr.id) : [];
    const from7 = new Date(); from7.setDate(from7.getDate() - 7);
    const from7Iso = from7.toISOString();
    const weekSessions = primaryCr ? Sessions.listForClassroom(primaryCr.id, { from: from7Iso }) : [];
    const allCrSessions = primaryCr ? Sessions.listForClassroom(primaryCr.id) : [];

    const avgConcRaw = weekSessions.length ? weekSessions.reduce((a, b) => a + b.concentration, 0) / weekSessions.length : 0;
    const avgConcDisplay = weekSessions.length ? avgConcRaw.toFixed(1) : '—';
    const avgConcPct = Math.min(100, Math.round((avgConcRaw / 5) * 100));
    const activeStudentIds = new Set(weekSessions.map(se => se.email));
    const activeCount = activeStudentIds.size;
    const totalMinWeek = weekSessions.reduce((a, b) => a + b.durationMin, 0);
    const timeDisplay = totalMinWeek >= 60 ? `${Math.floor(totalMinWeek / 60)}h ${totalMinWeek % 60}m` : `${totalMinWeek}m`;
    const avgStreak = students.length ? Math.round(students.reduce((a, st) => a + ((st.gamification || {}).streak || 0), 0) / students.length) : 0;
    const participationPct = students.length ? Math.round((activeCount / students.length) * 100) : 0;

    const schoolStudentIds = new Set();
    classrooms.forEach(cr => Schools.listStudentsInClassroom(cr.id).forEach(st => schoolStudentIds.add(st.id)));
    const allIndices = s.sessions.filter(se => schoolStudentIds.has(se.email))
      .map(se => Stats.parseMetrics(se).learning_index).filter(v => typeof v === 'number' && !isNaN(v));
    const avgLearningIndex = allIndices.length ? Math.round(allIndices.reduce((a, b) => a + b, 0) / allIndices.length) : null;

    const atRiskList = students.filter(st => {
      const last5 = s.sessions.filter(se => se.email === st.id).slice(-5);
      if (last5.length < 3) return false;
      return last5.reduce((a, b) => a + b.concentration, 0) / last5.length < 2.5;
    });

    const nowMs = Date.now();
    const inactiveStudents = students.filter(st => {
      const stSess = s.sessions.filter(se => se.email === st.id);
      if (!stSess.length) return true;
      const lastMs = new Date(stSess.reduce((a, b) => a.datetime > b.datetime ? a : b).datetime).getTime();
      return (nowMs - lastMs) > 3 * 86400000;
    });

    const weeklyConc = [], weeklySessionCounts = [];
    for (let w = 5; w >= 0; w--) {
      const to = new Date(); to.setDate(to.getDate() - w * 7);
      const fr = new Date(to); fr.setDate(to.getDate() - 7);
      const wS = allCrSessions.filter(se => { const d = new Date(se.datetime); return d >= fr && d < to; });
      weeklyConc.push(wS.length ? parseFloat((wS.reduce((a, b) => a + b.concentration, 0) / wS.length).toFixed(2)) : 0);
      weeklySessionCounts.push(wS.length);
    }

    const lb = primaryCr ? Gamification.getLeaderboard('classroom', primaryCr.id, 'week') : [];
    const top5 = lb.slice(0, 5);
    const recentSessions = allCrSessions.slice().sort((a, b) => b.datetime.localeCompare(a.datetime)).slice(0, 6);
    const pendingCount = school ? Schools.getPendingCount(school.id) : 0;
    const weeklyGoalSessions = Math.max(1, students.length * 3);
    const weeklyGoalPct = Math.min(100, Math.round((weekSessions.length / weeklyGoalSessions) * 100));
    const noRiskPct = students.length ? Math.round(((students.length - atRiskList.length) / students.length) * 100) : 100;

    // Insights IA (rule-based from real data)
    const insights = [];
    if (inactiveStudents.length > 0) {
      const names = inactiveStudents.slice(0, 2).map(st => st.name.split(' ')[0]).join(' y ');
      const extra = inactiveStudents.length > 2 ? ` +${inactiveStudents.length - 2} más` : '';
      insights.push({ icon: '⚠️', type: 'warn', text: `${names}${extra} llevan más de 3 días sin estudiar.` });
    }
    if (atRiskList.length > 0) insights.push({ icon: '🔴', type: 'bad', text: `${atRiskList.length} alumno${atRiskList.length > 1 ? 's' : ''} con concentración crítica. Considera intervenir.` });
    if (activeCount < students.length * 0.6 && students.length > 1) insights.push({ icon: '📊', type: 'info', text: `Solo el ${participationPct}% del aula tuvo sesiones esta semana.` });
    const bySub = {};
    weekSessions.forEach(se => {
      if (!bySub[se.subject]) bySub[se.subject] = { sum: 0, count: 0 };
      bySub[se.subject].sum += se.concentration; bySub[se.subject].count++;
    });
    const subEntries = Object.entries(bySub).map(([k, v]) => ({ subject: k, avg: v.sum / v.count }));
    if (subEntries.length > 1) {
      const lowest = [...subEntries].sort((a, b) => a.avg - b.avg)[0];
      if (lowest.avg < 3.0) insights.push({ icon: '📚', type: 'info', text: `${lowest.subject} muestra la concentración más baja (${lowest.avg.toFixed(1)}/5). Considera reforzar.` });
    }
    if (avgConcRaw >= 3.5 && weekSessions.length >= 3) insights.push({ icon: '🌟', type: 'good', text: `Concentración promedio excelente del aula: ${avgConcRaw.toFixed(1)}/5.` });
    if (top5.length > 0) insights.push({ icon: '🏆', type: 'good', text: `Destacado esta semana: ${top5[0].name} con ${top5[0].xp} XP y racha de ${top5[0].streak} días.` });
    if (!insights.length) insights.push({ icon: '✅', type: 'good', text: 'Todo en orden. Continúa monitoreando el progreso del aula.' });

    // Helpers
    function _spark(data, w, h, color) {
      w = w || 72; h = h || 26; color = color || 'currentColor';
      const valid = data.filter(v => v > 0);
      if (valid.length < 2) return `<svg width="${w}" height="${h}"></svg>`;
      const mn = Math.min(...valid) * 0.85, mx = Math.max(...valid) * 1.05, rng = (mx - mn) || 1;
      const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * (w - 4) + 2;
        const y = h - 2 - (((v || mn) - mn) / rng) * (h - 6);
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible;"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/></svg>`;
    }
    function _trend(data) {
      const v = data.filter(x => x > 0);
      if (v.length < 2) return '';
      const d = v[v.length - 1] - v[v.length - 2];
      if (Math.abs(d) < 0.05) return '<span class="td-tr td-tr-flat">→</span>';
      return d > 0 ? `<span class="td-tr td-tr-up">↑ ${d.toFixed(1)}</span>` : `<span class="td-tr td-tr-dn">↓ ${Math.abs(d).toFixed(1)}</span>`;
    }
    function _ago(iso) {
      const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
      if (m < 1) return 'Ahora'; if (m < 60) return `${m}m`; if (m < 1440) return `${Math.round(m/60)}h`; return `${Math.round(m/1440)}d`;
    }
    const _ini = n => (n || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const _clr = n => ['#C89B6D','#8B5CF6','#3B82F6','#10B981','#F59E0B'][(n || '').length % 5];
    const teacherIni = user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
    const dateStr = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    const inviteCode = primaryCr ? (primaryCr.inviteCode || '—') : '—';

    // Concentration ring
    const rr = 30, cx = 36, cy = 36, circ = 2 * Math.PI * rr;
    const ringOff = circ * (1 - avgConcPct / 100);

    return `
    <div class="td-header">
      <div class="td-hdr-left">
        <div class="td-teacher-av" style="background:${_clr(user.name)};">${esc(teacherIni)}</div>
        <div class="td-teacher-inf">
          <div class="td-teacher-nm">${esc(user.name)}</div>
          <div class="td-teacher-mt">${school ? esc(school.name) : 'Sin colegio'}${primaryCr ? ' · ' + esc(primaryCr.name) : ''}</div>
        </div>
      </div>
      <div class="td-hdr-center">
        ${primaryCr ? `<div class="td-cr-pill">
          <span class="td-cr-nm">${esc(primaryCr.name)}</span>
          <span class="td-cr-sep"></span>
          <span class="td-cr-inf">Código: <strong>${esc(inviteCode)}</strong></span>
          <span class="td-cr-sep"></span>
          <span class="td-cr-cnt">${students.length} alumnos</span>
          ${pendingCount > 0 ? `<span class="td-cr-pend">${pendingCount}</span>` : ''}
        </div>` : ''}
        <div class="td-hdr-date">${dateStr}</div>
      </div>
      <div class="td-hdr-right">
        ${primaryCr ? `<button class="ghost td-hdr-btn" data-go="classroom-stats" data-id="${primaryCr.id}">📊 Estadísticas</button>
        <button class="primary td-hdr-btn" data-go="classroom-manage" data-id="${primaryCr.id}">⚙️ Gestionar</button>` : `<button class="primary td-hdr-btn" data-go="classroom-manage" data-id="new">+ Nueva aula</button>`}
      </div>
    </div>

    ${school ? _pendingRequestsPanel(school.id, user.id) : ''}

    <div class="td-kpi-strip">
      <div class="td-kpi">
        <div class="td-kpi-top"><span class="td-kpi-ico">👨‍🎓</span><div class="td-kpi-sp td-sp-muted">${_spark(weeklySessionCounts)}</div></div>
        <div class="td-kpi-v" data-count="${activeCount}">${activeCount}</div>
        <div class="td-kpi-l">Activos esta semana</div>
        <div class="td-kpi-s">${students.length} total · ${participationPct}%</div>
      </div>
      <div class="td-kpi">
        <div class="td-kpi-top"><span class="td-kpi-ico">📚</span><div class="td-kpi-sp td-sp-muted">${_spark(weeklySessionCounts)}</div></div>
        <div class="td-kpi-v" data-count="${weekSessions.length}">${weekSessions.length}</div>
        <div class="td-kpi-l">Sesiones esta semana</div>
        <div class="td-kpi-s">${_trend(weeklySessionCounts)}</div>
      </div>
      <div class="td-kpi">
        <div class="td-kpi-top"><span class="td-kpi-ico">🧠</span><div class="td-kpi-sp td-sp-gold">${_spark(weeklyConc)}</div></div>
        <div class="td-kpi-v">${avgConcDisplay}</div>
        <div class="td-kpi-l">Concentración prom.</div>
        <div class="td-kpi-s">${_trend(weeklyConc)}</div>
      </div>
      <div class="td-kpi${atRiskList.length > 0 ? ' td-kpi-alert' : ''}">
        <div class="td-kpi-top"><span class="td-kpi-ico">${atRiskList.length > 0 ? '⚠️' : '✅'}</span></div>
        <div class="td-kpi-v${atRiskList.length > 0 ? ' td-v-bad' : ' td-v-good'}" data-count="${atRiskList.length}">${atRiskList.length}</div>
        <div class="td-kpi-l">En riesgo</div>
        <div class="td-kpi-s">${atRiskList.length === 0 ? 'Ningún alumno crítico' : 'Requieren atención'}</div>
      </div>
      <div class="td-kpi">
        <div class="td-kpi-top"><span class="td-kpi-ico">🔥</span></div>
        <div class="td-kpi-v">${avgStreak}</div>
        <div class="td-kpi-l">Racha promedio</div>
        <div class="td-kpi-s">días consecutivos</div>
      </div>
      <div class="td-kpi">
        <div class="td-kpi-top"><span class="td-kpi-ico">⏱️</span></div>
        <div class="td-kpi-v">${timeDisplay || '0m'}</div>
        <div class="td-kpi-l">Tiempo estudiado</div>
        <div class="td-kpi-s">esta semana</div>
      </div>
    </div>

    <div class="td-main-grid">

      <div class="td-card td-estado">
        <div class="td-sh"><div class="td-sh-l"><span class="td-sh-ico">🏫</span><span class="td-sh-ttl">Estado del Aula</span></div>${primaryCr ? `<span class="td-sh-badge">${esc(primaryCr.name)}</span>` : ''}</div>
        <div class="td-estado-body">
          <div class="td-ring-wrap">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="7"/>
              <circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="url(#tdG)" stroke-width="7"
                stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${ringOff.toFixed(1)}"
                stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})" class="td-ring-prog"/>
              <defs><linearGradient id="tdG" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#C89B6D"/><stop offset="100%" stop-color="#8B5CF6"/>
              </linearGradient></defs>
            </svg>
            <div class="td-ring-ctr"><div class="td-ring-pct">${avgConcPct}%</div><div class="td-ring-sub">Conc.</div></div>
          </div>
          <div class="td-metrics">
            <div class="td-met"><span class="td-met-l">Participación</span><div class="td-mbar"><div class="td-mf td-mf-gold" style="width:${participationPct}%"></div></div><span class="td-met-v">${participationPct}%</span></div>
            <div class="td-met"><span class="td-met-l">Meta semanal</span><div class="td-mbar"><div class="td-mf td-mf-purple" style="width:${weeklyGoalPct}%"></div></div><span class="td-met-v">${weeklyGoalPct}%</span></div>
            <div class="td-met"><span class="td-met-l">Sin riesgo</span><div class="td-mbar"><div class="td-mf td-mf-green" style="width:${noRiskPct}%"></div></div><span class="td-met-v">${noRiskPct}%</span></div>
            <div class="td-met"><span class="td-met-l">Índice aprendizaje</span><div class="td-mbar"><div class="td-mf td-mf-gold" style="width:${avgLearningIndex || 0}%"></div></div><span class="td-met-v">${avgLearningIndex != null ? avgLearningIndex + '/100' : '—'}</span></div>
          </div>
        </div>
        ${allCrSessions.length >= 3 ? `<div class="td-spark-row"><span class="td-spark-lbl">Concentración · 6 semanas</span><div class="td-sp-gold">${_spark(weeklyConc, 180, 30, '#C89B6D')}</div></div>` : ''}
      </div>

      <div class="td-card td-attention">
        <div class="td-sh"><div class="td-sh-l"><span class="td-sh-ico">🎯</span><span class="td-sh-ttl">Atención del Docente</span></div>${atRiskList.length + inactiveStudents.length > 0 ? `<span class="td-sh-warn">${atRiskList.length + inactiveStudents.filter(x => !atRiskList.find(r => r.id === x.id)).length}</span>` : ''}</div>
        ${atRiskList.length === 0 && inactiveStudents.length === 0 ? `<div class="td-empty"><span class="td-empty-ico">🎉</span><span>Todos los alumnos están al día</span></div>` : ''}
        ${atRiskList.slice(0, 3).map(st => {
          const stSess = s.sessions.filter(se => se.email === st.id).sort((a, b) => b.datetime.localeCompare(a.datetime));
          const gam = st.gamification || {};
          return `<div class="td-stcard td-stc-risk">
            <div class="td-stav" style="background:${_clr(st.name)};">${esc(_ini(st.name))}</div>
            <div class="td-stinf">
              <div class="td-stnm">${esc(st.name)}</div>
              <div class="td-stbadge td-b-risk">⚠️ Concentración crítica</div>
              <div class="td-stmeta">Última: ${stSess.length ? _ago(stSess[0].datetime) : 'Nunca'} · Nv.${gam.level || 1}</div>
            </div>
            <button class="ghost td-stbtn" data-go="student-detail" data-sid="${esc(st.id)}">Ver</button>
          </div>`;
        }).join('')}
        ${inactiveStudents.filter(st => !atRiskList.find(r => r.id === st.id)).slice(0, 2).map(st => {
          const stSess = s.sessions.filter(se => se.email === st.id).sort((a, b) => b.datetime.localeCompare(a.datetime));
          return `<div class="td-stcard td-stc-inactive">
            <div class="td-stav" style="background:${_clr(st.name)};">${esc(_ini(st.name))}</div>
            <div class="td-stinf">
              <div class="td-stnm">${esc(st.name)}</div>
              <div class="td-stbadge td-b-inactive">😴 Sin sesiones recientes</div>
              <div class="td-stmeta">Última: ${stSess.length ? _ago(stSess[0].datetime) : 'Nunca'}</div>
            </div>
            <button class="ghost td-stbtn" data-go="student-detail" data-sid="${esc(st.id)}">Ver</button>
          </div>`;
        }).join('')}
      </div>

      <div class="td-right-col">
        <div class="td-card td-top-stud">
          <div class="td-sh"><div class="td-sh-l"><span class="td-sh-ico">🏆</span><span class="td-sh-ttl">Top Estudiantes</span></div><span class="td-sh-meta">esta semana</span></div>
          ${top5.length === 0 ? `<div class="td-empty"><span>Sin sesiones esta semana</span></div>` :
          top5.map((e, i) => `<div class="td-top-row${i === 0 ? ' td-top-1st' : ''}">
            <span class="td-top-rnk">${['🥇','🥈','🥉'][i] || '#'+(i+1)}</span>
            <div class="td-top-av" style="background:${_clr(e.name)};">${esc(_ini(e.name))}</div>
            <div class="td-top-inf"><div class="td-top-nm">${esc(e.name)}</div><div class="td-top-mt">${e.xp} XP · 🔥 ${e.streak}d</div></div>
            <div class="td-top-conc">${e.avgConcentration}/5</div>
          </div>`).join('')}
        </div>
        <div class="td-card td-activity">
          <div class="td-sh"><div class="td-sh-l"><span class="td-sh-ico">⚡</span><span class="td-sh-ttl">Actividad Reciente</span></div></div>
          ${recentSessions.length === 0 ? `<div class="td-empty"><span>Sin actividad reciente</span></div>` :
          recentSessions.map(se => {
            const st = students.find(x => x.id === se.email);
            const nm = st ? st.name.split(' ')[0] : 'Alumno';
            return `<div class="td-tl-item">
              <div class="td-tl-dot" style="background:${_clr(nm)};"></div>
              <div class="td-tl-body"><span class="td-tl-nm">${esc(nm)}</span><span class="td-tl-txt"> · ${esc(se.subject)}</span><div class="td-tl-mt">${_ago(se.datetime)} · ${se.concentration}/5 ⭐</div></div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="td-sec-grid">
      <div class="td-card td-insights">
        <div class="td-sh" style="margin-bottom:12px;"><div class="td-sh-l"><span class="td-sh-ico">✨</span><span class="td-sh-ttl">Ariven Intelligence</span></div></div>
        ${insights.map(ins => `<div class="td-insight td-ins-${ins.type}"><span class="td-ins-ico">${ins.icon}</span><span class="td-ins-txt">${esc(ins.text)}</span></div>`).join('')}
      </div>
      <div class="td-card td-quick">
        <div class="td-sh" style="margin-bottom:12px;"><div class="td-sh-l"><span class="td-sh-ico">⚡</span><span class="td-sh-ttl">Acciones Rápidas</span></div></div>
        <div class="td-qa-grid">
          ${primaryCr ? `<button class="td-qa" data-go="classroom-manage" data-id="${primaryCr.id}"><span class="td-qa-ico">⚙️</span><span class="td-qa-lbl">Gestionar</span></button>` : ''}
          ${primaryCr ? `<button class="td-qa" data-go="classroom-stats" data-id="${primaryCr.id}"><span class="td-qa-ico">📊</span><span class="td-qa-lbl">Stats</span></button>` : ''}
          <button class="td-qa" id="tdWeeklyBtn"><span class="td-qa-ico">🖨️</span><span class="td-qa-lbl">Reporte</span></button>
          <button class="td-qa" id="tdCsvBtn"><span class="td-qa-ico">⬇️</span><span class="td-qa-lbl">CSV</span></button>
          <button class="td-qa" id="tdBkpBtn"><span class="td-qa-ico">💾</span><span class="td-qa-lbl">Backup</span></button>
          <button class="td-qa" data-go="eureka"><span class="td-qa-ico">🏆</span><span class="td-qa-lbl">Eureka</span></button>
        </div>
      </div>
      <div class="td-card" id="pilotCard">
        <div class="td-sh" style="margin-bottom:10px;">
          <div class="td-sh-l"><span class="td-sh-ico">🔬</span><span class="td-sh-ttl">Piloto Científico</span></div>
          <div class="td-pilot-btns">
            <button class="ghost" id="btnWeeklyReport" style="font-size:11px;padding:4px 8px;">Reporte</button>
            <button class="ghost" id="btnPilotCsv" style="font-size:11px;padding:4px 8px;">CSV</button>
            <button class="ghost" id="btnBackup" style="font-size:11px;padding:4px 8px;">💾</button>
            <button class="ghost" id="btnRestore" style="font-size:11px;padding:4px 8px;">♻️</button>
            <button class="ghost" id="btnDiagLog" style="font-size:11px;padding:4px 8px;">🩺</button>
            <input type="file" id="restoreFile" accept=".json,application/json" style="display:none">
          </div>
        </div>
        <div id="pilotCardBody">
          <div class="grid cols-3" style="gap:8px;margin-top:8px;">
            <div class="skeleton skeleton-kpi"></div><div class="skeleton skeleton-kpi"></div><div class="skeleton skeleton-kpi"></div>
          </div>
        </div>
      </div>
    </div>

    ${classrooms.length > 1 ? `
    <div class="td-card" style="margin-top:16px;">
      <div class="td-sh" style="margin-bottom:12px;"><div class="td-sh-l"><span class="td-sh-ico">🏫</span><span class="td-sh-ttl">Otras Aulas</span></div><button class="primary" data-go="classroom-manage" data-id="new" style="font-size:12px;padding:5px 12px;">+ Nueva</button></div>
      <div class="grid cols-2">${classrooms.filter(cr => cr.id !== (primaryCr && primaryCr.id)).map(cr => {
        const crS = Schools.listStudentsInClassroom(cr.id);
        const crW = Sessions.listForClassroom(cr.id, { from: from7Iso });
        return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><h3 style="margin:0;">${esc(cr.name)}</h3></div><div class="grid cols-2" style="gap:6px;margin-bottom:10px;"><div class="kpi" style="padding:8px;"><div class="v" style="font-size:17px;">${crS.length}</div><div class="l">Alumnos</div></div><div class="kpi" style="padding:8px;"><div class="v" style="font-size:17px;">${crW.length}</div><div class="l">Ses. sem.</div></div></div><div style="display:flex;gap:6px;"><button class="ghost" data-go="classroom-stats" data-id="${cr.id}" style="font-size:12px;">Estadísticas</button><button class="ghost" data-go="classroom-manage" data-id="${cr.id}" style="font-size:12px;">Gestionar</button></div></div>`;
      }).join('')}</div>
    </div>` : ''}

    <div style="margin-top:20px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <button class="ghost" id="teacherLegalBtn" style="font-size:13px;padding:6px 14px;">⚖️ Centro Legal</button>
      <span class="muted" style="font-size:12px;">Política de Privacidad · Términos · Transparencia de Datos</span>
    </div>`;
  }

  function _wireApprovalButtons(teacherId) {
    root().querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => {
        const reqId = btn.dataset.approve;
        const sel = root().querySelector(`.req-cr-sel[data-req="${reqId}"]`);
        const targetCr = sel ? sel.value || null : null;
        Schools.approveRequest(reqId, teacherId, targetCr);
        UI.flash('Solicitud aprobada. El alumno ya puede acceder al sistema.', 'success');
        App.go('teacher-dashboard');
      });
    });
    root().querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('¿Rechazar esta solicitud?')) return;
        Schools.rejectRequest(btn.dataset.reject, teacherId);
        UI.flash('Solicitud rechazada.', 'success');
        App.go('teacher-dashboard');
      });
    });
  }

  function wireTeacherDashboard() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];

    root().querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => {
        const go = btn.dataset.go;
        const id = btn.dataset.id;
        const sid = btn.dataset.sid;
        if (id) App._classroomId = id;
        if (sid) App._studentDetailId = sid;
        App.go(go);
      });
    });
    _wireApprovalButtons(user.id);

    // Counter animation for KPI values
    root().querySelectorAll('.td-kpi-v[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10) || 0;
      if (target === 0) return;
      let cur = 0;
      const step = Math.max(1, Math.ceil(target / 18));
      const t = setInterval(() => { cur = Math.min(cur + step, target); el.textContent = cur; if (cur >= target) clearInterval(t); }, 35);
    });

    _loadPilotCard();
    document.getElementById('btnWeeklyReport')?.addEventListener('click', () => _weeklyReport(user));
    document.getElementById('btnPilotCsv')?.addEventListener('click', () => _exportPilotCsv());

    // Quick action aliases
    document.getElementById('tdWeeklyBtn')?.addEventListener('click', () => _weeklyReport(user));
    document.getElementById('tdCsvBtn')?.addEventListener('click', () => _exportPilotCsv());
    document.getElementById('tdBkpBtn')?.addEventListener('click', () => Exporter.backupJSON());

    document.getElementById('btnDiagLog')?.addEventListener('click', () => {
      try { window.Monitor?.exportLog?.(); UI.flash('Registro de errores exportado.', 'success'); }
      catch (_) { UI.flash('No se pudo exportar el registro.', 'error'); }
    });
    document.getElementById('teacherLegalBtn')?.addEventListener('click', () => App.go('legal'));
    document.getElementById('btnBackup')?.addEventListener('click', () => Exporter.backupJSON());
    const restoreInput = document.getElementById('restoreFile');
    document.getElementById('btnRestore')?.addEventListener('click', () => restoreInput?.click());
    restoreInput?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const state = await Exporter.readBackupFile(file);
        if (confirm('¿Cargar este respaldo? Se mostrará como vista local (no se sobrescribe la nube).')) {
          state.currentUserId = Storage.get().currentUserId || state.currentUserId;
          Storage.hydrate(state);
          UI.flash('Respaldo cargado (vista local). Recarga la página para volver a los datos en vivo.', 'success');
          App.go('teacher-dashboard');
        }
      } catch (err) { UI.flash(err.message, 'error'); }
      e.target.value = '';
    });
  }

  // Carga las métricas del piloto en la tarjeta (RLS limita lo visible al docente).
  async function _loadPilotCard() {
    const body = document.getElementById('pilotCardBody');
    if (!body || typeof Pilot === 'undefined') return;
    const rows = await Pilot.fetchRows();
    const sum  = Pilot.summarize(rows);
    if (!sum.sessions) {
      body.innerHTML = '<p class="muted" style="margin:12px 0 0;">Aún no hay datos del piloto. Aparecerán cuando los alumnos completen sesiones de Estudio IA con quiz.</p>';
      return;
    }
    const impColor = sum.avgImprovement > 0 ? 'var(--good)' : 'var(--muted)';
    body.innerHTML = `
      <div class="grid cols-3" style="gap:8px;margin-top:12px;">
        <div class="kpi" style="padding:10px;"><div class="v" style="font-size:20px;">${sum.students}</div><div class="l">Participantes</div></div>
        <div class="kpi" style="padding:10px;"><div class="v" style="font-size:20px;">${sum.sessions}</div><div class="l">Sesiones piloto</div></div>
        <div class="kpi" style="padding:10px;"><div class="v" style="font-size:20px;">${sum.avgFocus}/5</div><div class="l">Concentración prom.</div></div>
        <div class="kpi" style="padding:10px;"><div class="v" style="font-size:20px;">${sum.totalMinutes}</div><div class="l">Minutos totales</div></div>
        <div class="kpi" style="padding:10px;"><div class="v" style="font-size:20px;color:${impColor};">${sum.avgImprovement > 0 ? '+' : ''}${sum.avgImprovement}</div><div class="l">Mejora quiz</div></div>
        <div class="kpi" style="padding:10px;"><div class="v" style="font-size:20px;">${sum.improvedPct}%</div><div class="l">Mejoraron</div></div>
      </div>`;
  }

  // Reporte semanal imprimible (docentes / padres / directivos).
  async function _weeklyReport(user) {
    const s = Storage.get();
    const school = user.schoolId ? s.schools[user.schoolId] : null;
    const since = new Date(); since.setDate(since.getDate() - 7);
    const rows = (typeof Pilot !== 'undefined') ? await Pilot.fetchRows({ since: since.toISOString() }) : [];
    const sum  = (typeof Pilot !== 'undefined') ? Pilot.summarize(rows) : {};
    const classrooms = school ? Schools.listClassrooms(school.id) : [];

    let body = `<h1>Reporte semanal · Ariven</h1>
      <p class="sub">${school ? esc(school.name) + ' · ' : ''}Docente: ${esc(user.name)} · Semana al ${new Date().toLocaleDateString('es-PE')}</p>
      <h2>Resumen del piloto (últimos 7 días)</h2>
      <div class="kpis">
        <div class="kpi"><div class="v">${sum.students || 0}</div><div class="l">Participantes</div></div>
        <div class="kpi"><div class="v">${sum.sessions || 0}</div><div class="l">Sesiones</div></div>
        <div class="kpi"><div class="v">${sum.avgFocus || 0}/5</div><div class="l">Concentración prom.</div></div>
        <div class="kpi"><div class="v">${sum.totalMinutes || 0}</div><div class="l">Minutos de estudio</div></div>
        <div class="kpi"><div class="v">${sum.avgPre || 0} → ${sum.avgPost || 0}</div><div class="l">Quiz pre → post</div></div>
        <div class="kpi"><div class="v">${sum.improvedPct || 0}%</div><div class="l">Mejoraron</div></div>
      </div>`;

    if (classrooms.length) {
      body += `<h2>Aulas</h2><table><tr><th>Aula</th><th>Alumnos</th><th>Sesiones (7d)</th><th>Concentración prom.</th></tr>`;
      classrooms.forEach(cr => {
        const students = Schools.listStudentsInClassroom(cr.id);
        const crSessions = Sessions.listForClassroom(cr.id, { from: since.toISOString() });
        const avg = crSessions.length ? (crSessions.reduce((a, b) => a + b.concentration, 0) / crSessions.length).toFixed(1) : '—';
        body += `<tr><td>${esc(cr.name)}</td><td>${students.length}</td><td>${crSessions.length}</td><td>${avg}</td></tr>`;
      });
      body += `</table>`;
    }

    body += `<h2>Lectura pedagógica</h2><p>${(sum.avgImprovement > 0)
      ? `En promedio los estudiantes mejoraron <strong>${sum.avgImprovement} puntos</strong> entre el quiz inicial y el final, lo que sugiere un efecto positivo del acompañamiento del tutor IA. El ${sum.improvedPct}% de los participantes mejoró su puntaje.`
      : `Aún no hay suficiente mejora medible. Se recomienda ampliar la muestra y la duración del piloto para obtener resultados concluyentes.`}</p>`;

    Exporter.printHTML('Reporte semanal Ariven', body);
  }

  // Exporta las filas del piloto (anónimas) a CSV.
  async function _exportPilotCsv() {
    if (typeof Pilot === 'undefined') return;
    const rows = await Pilot.fetchRows();
    if (!rows.length) { UI.flash('Aún no hay datos del piloto para exportar.', 'info'); return; }
    const cols = ['student_hash', 'classroom_id', 'focus_score', 'time_spent_seconds', 'pre_quiz_score', 'post_quiz_score', 'created_at'];
    const head = cols.join(';');
    const esc2 = v => (v == null ? '' : (/[",;\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v)));
    const lines = rows.map(r => cols.map(c => esc2(r[c])).join(';'));
    Exporter.download(`Ariven-piloto-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + [head, ...lines].join('\n'));
  }

  // ---- Pantalla: Gestión de Aula ----
  function screenClassroomManage() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const school = user.schoolId ? s.schools[user.schoolId] : null;

    // Auto-resolve primary classroom when navigating from nav (no _classroomId set)
    if (!App._classroomId || App._classroomId === 'new' || !s.classrooms[App._classroomId]) {
      const allCrs = school ? Schools.listClassrooms(school.id) : [];
      const primary = allCrs.find(cr => cr.tutorId === user.id) || allCrs.find(cr => cr.teacherIds && cr.teacherIds.includes(user.id)) || allCrs[0] || null;
      if (primary) App._classroomId = primary.id;
    }

    const classroomId = App._classroomId;
    const isNew = !classroomId || classroomId === 'new' || !s.classrooms[classroomId];

    // ── helpers ──
    function _ini(n) { return Math.max(0, Math.min(100, Math.round(n))); }
    function _clr(n) { return n >= 70 ? '#22c55e' : n >= 45 ? '#f59e0b' : '#ef4444'; }
    function _spark(data, w, h, color) {
      if (!data || data.length < 2) return '';
      const vals = data.map(v => v ?? 0);
      const mn = Math.min(...vals), mx = Math.max(...vals);
      const rng = mx - mn || 1;
      const pts = vals.map((v, i) =>
        `${(i / (vals.length - 1) * w).toFixed(1)},${(h - ((v - mn) / rng * h * 0.85 + h * 0.08)).toFixed(1)}`
      ).join(' ');
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="${pts}" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    function _ago(iso) {
      if (!iso) return '—';
      const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
      return d === 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d}d`;
    }
    function _statusColor(key) {
      return key === 'ok' ? '#22c55e' : key === 'risk' ? '#ef4444' : '#f59e0b';
    }
    function _status(st) {
      const stSessions = s.sessions.filter(se => se.email === st.id);
      const last5 = stSessions.slice(-5);
      if (last5.length < 3) return { key: 'new', label: 'Nuevo' };
      const avg5 = last5.reduce((a, b) => a + b.concentration, 0) / last5.length;
      if (avg5 < 2.5) return { key: 'risk', label: 'En riesgo' };
      const daysSince = stSessions.length
        ? Math.floor((Date.now() - new Date(stSessions[stSessions.length - 1].datetime)) / 86400000)
        : 99;
      if (daysSince > 3) return { key: 'inactive', label: 'Inactivo' };
      return { key: 'ok', label: 'Activo' };
    }

    // ── EMPTY STATE ──
    if (isNew) {
      return `
        <div class="cm-layout">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
            <button class="ghost" data-go="teacher-dashboard">← Volver</button>
            <h1 style="margin:0;">Mi Aula</h1>
          </div>
          <div class="cm-empty">
            <div class="cm-empty-ico">🏫</div>
            <h2>Aún no tienes un aula</h2>
            <p class="muted">Crea tu primera aula para invitar a tus alumnos y comenzar a hacer seguimiento de su aprendizaje.</p>
            <div class="card" style="max-width:420px;margin-top:24px;">
              <h3 style="margin-top:0;">Crear mi primera aula</h3>
              <form id="createClassroomForm">
                <div class="field" style="margin-bottom:12px;">
                  <label>Grado</label>
                  <select name="grade" style="width:100%;">
                    <option>1ro</option><option>2do</option><option>3ro</option><option>4to</option><option>5to</option>
                  </select>
                </div>
                <div class="field" style="margin-bottom:16px;">
                  <label>Sección</label>
                  <input name="section" placeholder="A, B, C…" maxlength="5" required style="width:100%;" />
                </div>
                <button class="primary" type="submit" style="width:100%;">Crear aula</button>
              </form>
            </div>
          </div>
        </div>`;
    }

    // ── FULL DASHBOARD ──
    const cr = s.classrooms[classroomId];
    const crName = cr.name;
    const students = Schools.listStudentsInClassroom(classroomId);
    const allCrSessions = Sessions.listForClassroom(classroomId);
    const from7 = new Date(); from7.setDate(from7.getDate() - 7);
    const from7Iso = from7.toISOString();
    const weekSessions = allCrSessions.filter(se => se.datetime >= from7Iso);
    const allClassrooms = school ? Schools.listClassrooms(school.id) : [];
    const schoolId = school ? school.id : null;

    // KPIs
    const totalStudents = students.length;
    const activeStudents = students.filter(st => {
      const last = s.sessions.filter(se => se.email === st.id).slice(-1)[0];
      return last && new Date(last.datetime) >= from7;
    }).length;
    const avgConc7 = weekSessions.length
      ? weekSessions.reduce((a, b) => a + b.concentration, 0) / weekSessions.length
      : 0;
    const totalMin7 = weekSessions.reduce((a, b) => a + (b.durationMin || 0), 0);
    const atRiskCount = students.filter(st => {
      const last5 = s.sessions.filter(se => se.email === st.id).slice(-5);
      return last5.length >= 3 && last5.reduce((a, b) => a + b.concentration, 0) / last5.length < 2.5;
    }).length;
    const crIndices = allCrSessions
      .map(se => Stats.parseMetrics(se).learning_index)
      .filter(v => typeof v === 'number' && !isNaN(v));
    const avgIndex = crIndices.length ? Math.round(crIndices.reduce((a, b) => a + b, 0) / crIndices.length) : null;
    const weekActs = weekSessions.length;
    const completionRate = totalStudents ? Math.round((activeStudents / totalStudents) * 100) : 0;

    // Weekly trend sparkline data (last 7 days)
    const dailyConc = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(); day.setDate(day.getDate() - (6 - i));
      const dayStr = day.toISOString().slice(0, 10);
      const daySessions = allCrSessions.filter(se => se.datetime.slice(0, 10) === dayStr);
      return daySessions.length ? daySessions.reduce((a, b) => a + b.concentration, 0) / daySessions.length : null;
    });

    // At-risk students list
    const atRiskList = students.filter(st => {
      const last5 = s.sessions.filter(se => se.email === st.id).slice(-5);
      return last5.length >= 3 && last5.reduce((a, b) => a + b.concentration, 0) / last5.length < 2.5;
    }).slice(0, 5);

    // Pending
    const pendingForCr = schoolId ? Schools.listRequestsForSchool(schoolId)
      .filter(r => r.status === 'pending' && (r.classroomId === classroomId || !r.classroomId)) : [];

    // Unassigned students
    const unassigned = school
      ? Schools.listStudentsInSchool(school.id).filter(u => !u.classroomId && u.approvalStatus !== 'pending')
      : [];

    // Insights IA (rule-based)
    const insights = [];
    if (atRiskCount > 0) insights.push({ type: 'warn', text: `${atRiskCount} alumno${atRiskCount > 1 ? 's' : ''} con concentración en riesgo esta semana.` });
    const inactive = students.filter(st => {
      const last = s.sessions.filter(se => se.email === st.id).slice(-1)[0];
      return !last || (Date.now() - new Date(last.datetime)) > 3 * 86400000;
    });
    if (inactive.length > 0) insights.push({ type: 'warn', text: `${inactive.length} alumno${inactive.length > 1 ? 's' : ''} sin sesión en los últimos 3 días.` });
    if (avgConc7 >= 3.5) insights.push({ type: 'good', text: `Concentración media excelente esta semana: ${avgConc7.toFixed(1)}/5.` });
    if (completionRate < 40 && totalStudents > 3) insights.push({ type: 'bad', text: `Solo el ${completionRate}% del aula estuvo activo esta semana.` });
    if (insights.length === 0) insights.push({ type: 'info', text: 'El aula muestra un rendimiento estable. ¡Buen trabajo!' });

    // Alerts
    const alertsList = [];
    atRiskList.forEach(st => alertsList.push({ color: '#ef4444', text: `${esc(st.name.split(' ')[0])} — concentración baja en sus últimas sesiones.` }));
    if (inactive.length > 0) alertsList.push({ color: '#f59e0b', text: `${inactive.length} alumno${inactive.length > 1 ? 's' : ''} sin actividad reciente.` });

    // Trends (last 4 weeks avg concentration)
    const trendWeeks = Array.from({ length: 4 }, (_, i) => {
      const to = new Date(); to.setDate(to.getDate() - i * 7);
      const fr = new Date(to); fr.setDate(fr.getDate() - 7);
      const ws = allCrSessions.filter(se => { const d = new Date(se.datetime); return d >= fr && d < to; });
      return ws.length ? parseFloat((ws.reduce((a, b) => a + b.concentration, 0) / ws.length).toFixed(2)) : null;
    }).reverse();

    // Goals (objectives)
    const goalParticipation = { label: 'Participación semanal', value: completionRate, target: 80 };
    const goalConc = { label: 'Concentración media', value: avgConc7 ? parseFloat((avgConc7 / 5 * 100).toFixed(0)) : 0, target: 70 };

    // Recent activity (last 6 sessions across classroom)
    const recentSessions = allCrSessions
      .slice().sort((a, b) => b.datetime.localeCompare(a.datetime))
      .slice(0, 6);

    // Students data with computations
    const studentsData = students.map(st => {
      const gam = st.gamification || {};
      const li = Gamification.getLevelInfo(gam.xp || 0);
      const stSessions = s.sessions.filter(se => se.email === st.id);
      const recent7 = stSessions.filter(se => se.datetime >= from7Iso);
      const avgC7 = recent7.length ? recent7.reduce((a, b) => a + b.concentration, 0) / recent7.length : null;
      const last5 = stSessions.slice(-5);
      const weeklyConc = Array.from({ length: 5 }, (_, i) => {
        const day = new Date(); day.setDate(day.getDate() - (4 - i));
        const dayStr = day.toISOString().slice(0, 10);
        const ds = stSessions.filter(se => se.datetime.slice(0, 10) === dayStr);
        return ds.length ? ds.reduce((a, b) => a + b.concentration, 0) / ds.length : null;
      });
      const prev5 = stSessions.slice(-10, -5);
      const avgNow = last5.length ? last5.reduce((a, b) => a + b.concentration, 0) / last5.length : null;
      const avgPrev = prev5.length ? prev5.reduce((a, b) => a + b.concentration, 0) / prev5.length : null;
      const trend = avgNow !== null && avgPrev !== null
        ? (avgNow > avgPrev + 0.2 ? '↑' : avgNow < avgPrev - 0.2 ? '↓' : '→')
        : '→';
      const stIndices = stSessions.map(se => Stats.parseMetrics(se).learning_index).filter(v => typeof v === 'number' && !isNaN(v));
      const stAvgIdx = stIndices.length ? Math.round(stIndices.reduce((a, b) => a + b, 0) / stIndices.length) : null;
      const lastS = stSessions.slice(-1)[0];
      const st_status = _status(st);
      return { st, gam, li, avgC7, weeklyConc, trend, stAvgIdx, lastS, st_status };
    });

    // ── HTML ──
    const qrCells = Array.from({ length: 25 }, (_, i) => `<div class="cm-qr-cell${[0,2,4,10,12,14,20,22,24].includes(i) ? ' cm-qr-dark' : ''}"></div>`).join('');

    return `
      <div class="cm-layout">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <button class="ghost" data-go="teacher-dashboard">← Volver</button>
          <h1 style="margin:0;">Mi Aula</h1>
        </div>

        <div class="cm-two-col">
          <!-- ── MAIN COLUMN ── -->
          <div class="cm-main-col">

            <!-- Classroom header -->
            <div class="cm-cr-hdr">
              <div class="cm-cr-hero">
                <div class="cm-cr-av">${(crName[0] || 'A').toUpperCase()}</div>
                <div class="cm-cr-info">
                  <div class="cm-cr-title">${esc(crName)}</div>
                  <div class="cm-cr-sub">${esc(school ? school.name : '')} · ${totalStudents} alumnos</div>
                  <div class="cm-cr-meta-pills">
                    <span class="cm-cr-pill">📚 ${esc(cr.grade || '')}</span>
                    <span class="cm-cr-pill">🏷 ${esc(cr.section || '')}</span>
                    <span class="cm-cr-pill" style="color:${atRiskCount > 0 ? '#f59e0b' : '#22c55e'};">${atRiskCount > 0 ? '⚠ ' + atRiskCount + ' en riesgo' : '✓ Sin riesgos'}</span>
                  </div>
                </div>
              </div>
              <div class="cm-code-block">
                <div class="cm-code-label">Código de invitación</div>
                <div class="cm-code-badge" id="cmInviteCode">${esc(cr.inviteCode || '—')}</div>
                <div class="cm-code-actions">
                  <button class="cm-code-btn" id="cmCopyCodeBtn" title="Copiar">📋 Copiar</button>
                  <button class="cm-code-btn" id="cmShareCodeBtn" title="Compartir">↗ Compartir</button>
                  <button class="cm-code-btn" id="regenCodeBtn" data-cr="${esc(classroomId)}" title="Regenerar código">↻ Nuevo</button>
                </div>
                <div class="cm-qr-ph">
                  <div class="cm-qr-inner">${qrCells}</div>
                  <div class="cm-qr-lbl">QR</div>
                </div>
              </div>
            </div>

            <!-- KPI summary grid -->
            <div class="cm-sum-grid">
              <div class="cm-sum-card">
                <div class="cm-sum-top">
                  <span class="cm-sum-ico">👥</span>
                  ${_spark(Array(7).fill(totalStudents), 44, 22, '#c8a06e')}
                </div>
                <div class="cm-sum-v">${totalStudents}</div>
                <div class="cm-sum-l">Alumnos</div>
              </div>
              <div class="cm-sum-card">
                <div class="cm-sum-top">
                  <span class="cm-sum-ico">⚡</span>
                  ${_spark(Array(7).fill(activeStudents), 44, 22, '#22c55e')}
                </div>
                <div class="cm-sum-v ${activeStudents < totalStudents * 0.5 ? 'cm-v-bad' : 'cm-v-good'}">${activeStudents}</div>
                <div class="cm-sum-l">Activos (7d)</div>
              </div>
              <div class="cm-sum-card">
                <div class="cm-sum-top">
                  <span class="cm-sum-ico">🎯</span>
                  ${_spark(dailyConc, 44, 22, _clr(_ini(avgConc7 / 5 * 100)))}
                </div>
                <div class="cm-sum-v ${avgConc7 < 2.5 ? 'cm-v-bad' : avgConc7 >= 3.5 ? 'cm-v-good' : ''}">${avgConc7 ? avgConc7.toFixed(1) : '—'}</div>
                <div class="cm-sum-l">Conc. media (7d)</div>
              </div>
              <div class="cm-sum-card">
                <div class="cm-sum-top">
                  <span class="cm-sum-ico">⏱</span>
                  ${_spark(dailyConc, 44, 22, '#a78bfa')}
                </div>
                <div class="cm-sum-v">${totalMin7 >= 60 ? Math.round(totalMin7 / 60) + 'h' : totalMin7 + 'm'}</div>
                <div class="cm-sum-l">Tiempo (7d)</div>
              </div>
              <div class="cm-sum-card ${atRiskCount > 0 ? 'cm-sum-alert' : ''}">
                <div class="cm-sum-top">
                  <span class="cm-sum-ico">⚠</span>
                  ${_spark(Array(7).fill(atRiskCount), 44, 22, '#ef4444')}
                </div>
                <div class="cm-sum-v ${atRiskCount > 0 ? 'cm-v-bad' : 'cm-v-good'}">${atRiskCount}</div>
                <div class="cm-sum-l">En riesgo</div>
              </div>
              <div class="cm-sum-card">
                <div class="cm-sum-top">
                  <span class="cm-sum-ico">📈</span>
                  ${_spark(trendWeeks, 44, 22, '#38bdf8')}
                </div>
                <div class="cm-sum-v">${avgIndex != null ? avgIndex : '—'}</div>
                <div class="cm-sum-l">Índice apr.</div>
              </div>
              <div class="cm-sum-card">
                <div class="cm-sum-top">
                  <span class="cm-sum-ico">📝</span>
                  ${_spark(dailyConc.map((_, i) => weekSessions.filter(se => se.datetime.slice(0, 10) === (() => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10); })()).length), 44, 22, '#c8a06e')}
                </div>
                <div class="cm-sum-v">${weekActs}</div>
                <div class="cm-sum-l">Sesiones (7d)</div>
              </div>
              <div class="cm-sum-card">
                <div class="cm-sum-top">
                  <span class="cm-sum-ico">✅</span>
                  ${_spark(Array(7).fill(completionRate), 44, 22, completionRate >= 60 ? '#22c55e' : '#f59e0b')}
                </div>
                <div class="cm-sum-v ${completionRate < 40 ? 'cm-v-bad' : completionRate >= 70 ? 'cm-v-good' : ''}">${completionRate}%</div>
                <div class="cm-sum-l">Participación</div>
              </div>
            </div>

            <!-- Student section -->
            <div class="cm-students-section">
              <div class="cm-sh">Alumnos <span style="color:var(--muted);font-size:13px;font-weight:400;">${totalStudents}</span></div>
              <div class="cm-toolbar">
                <div class="cm-filters">
                  <button class="cm-chip cm-chip-active" data-filter="all">Todos</button>
                  <button class="cm-chip" data-filter="ok">Activos</button>
                  <button class="cm-chip" data-filter="risk">En riesgo</button>
                  <button class="cm-chip" data-filter="inactive">Inactivos</button>
                </div>
                <div class="cm-toolbar-right">
                  <div class="cm-search-wrap">
                    <input class="cm-search" id="cmSearch" placeholder="Buscar alumno…" />
                  </div>
                  <select class="cm-sort" id="cmSort">
                    <option value="name">Nombre</option>
                    <option value="conc">Concentración</option>
                    <option value="xp">XP</option>
                    <option value="streak">Racha</option>
                    <option value="last">Última sesión</option>
                  </select>
                  <div class="cm-view-btns">
                    <button class="cm-view-btn cm-view-active" id="cmViewList" title="Vista lista">☰</button>
                    <button class="cm-view-btn" id="cmViewCards" title="Vista tarjetas">⊞</button>
                  </div>
                </div>
              </div>

              ${students.length === 0 ? `
              <div style="padding:40px;text-align:center;color:var(--muted);">
                <div style="font-size:36px;margin-bottom:12px;">👤</div>
                <div>Aún no hay alumnos en esta aula.</div>
                <div style="font-size:13px;margin-top:6px;">Los estudiantes se unen con el código de invitación.</div>
              </div>` : ''}

              <!-- LIST VIEW -->
              <div id="cmStudentList" class="cm-student-list">
                ${studentsData.map(({ st, gam, li, avgC7, weeklyConc, trend, stAvgIdx, lastS, st_status }) => `
                  <div class="cm-st-row" data-student-id="${esc(st.id)}" data-status="${st_status.key}" data-name="${esc(st.name.toLowerCase())}">
                    <div class="cm-st-av" style="background:linear-gradient(135deg,${_statusColor(st_status.key)}33,${_statusColor(st_status.key)}11);border-color:${_statusColor(st_status.key)}55;">
                      ${(st.name[0] || '?').toUpperCase()}
                    </div>
                    <div class="cm-st-main">
                      <div class="cm-st-nm">${esc(st.name)}</div>
                      <span class="cm-st-level-badge">Nv.${gam.level || 1}</span>
                    </div>
                    <div class="cm-st-xp-block">
                      <div class="cm-st-xpv">${(gam.xp || 0).toLocaleString('es-PE')} XP</div>
                      <div class="cm-st-xpbar"><div class="cm-st-xpfill" style="width:${li ? _ini((li.xpInLevel / li.xpForLevel) * 100) : 0}%;background:${_statusColor(st_status.key)};"></div></div>
                    </div>
                    <div class="cm-st-streak">🔥 ${gam.streak || 0}</div>
                    <div class="cm-st-conc-block">
                      <div class="cm-st-concv" style="color:${avgC7 != null ? _clr(_ini(avgC7 / 5 * 100)) : 'var(--muted)'};">${avgC7 != null ? avgC7.toFixed(1) : '—'}</div>
                      <div class="cm-st-trend">${trend}</div>
                    </div>
                    <div class="cm-st-idx">${stAvgIdx != null ? stAvgIdx + '/100' : '—'}</div>
                    <div class="cm-st-last">${_ago(lastS?.datetime)}</div>
                    <div class="cm-st-acts">
                      ${_spark(weeklyConc, 52, 22, _statusColor(st_status.key))}
                    </div>
                    <span class="cm-st-badge" style="background:${_statusColor(st_status.key)}22;color:${_statusColor(st_status.key)};border:1px solid ${_statusColor(st_status.key)}44;">${st_status.label}</span>
                    <button class="cm-code-btn" data-remove="${esc(st.id)}" style="color:#ef4444;margin-left:4px;" title="Quitar alumno">✕</button>
                  </div>`).join('')}
              </div>

              <!-- CARDS VIEW (hidden by default) -->
              <div id="cmStudentCards" class="cm-student-cards" style="display:none;">
                ${studentsData.map(({ st, gam, li, avgC7, weeklyConc, trend, st_status }) => `
                  <div class="cm-st-card-item" data-student-id="${esc(st.id)}" data-status="${st_status.key}" data-name="${esc(st.name.toLowerCase())}">
                    <div class="cm-st-av" style="width:44px;height:44px;font-size:18px;margin:0 auto 10px;background:linear-gradient(135deg,${_statusColor(st_status.key)}33,${_statusColor(st_status.key)}11);border-color:${_statusColor(st_status.key)}55;">
                      ${(st.name[0] || '?').toUpperCase()}
                    </div>
                    <div style="font-weight:600;font-size:13px;text-align:center;margin-bottom:4px;">${esc(st.name)}</div>
                    <span class="cm-st-badge" style="display:block;text-align:center;margin:0 auto 10px;background:${_statusColor(st_status.key)}22;color:${_statusColor(st_status.key)};border:1px solid ${_statusColor(st_status.key)}44;">${st_status.label}</span>
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px;">
                      <span>Nv.${gam.level || 1}</span><span>🔥 ${gam.streak || 0}</span><span>${avgC7 != null ? avgC7.toFixed(1) + '/5' : '—'}</span>
                    </div>
                    <div class="cm-st-xpbar" style="margin-bottom:6px;"><div class="cm-st-xpfill" style="width:${li ? _ini((li.xpInLevel / li.xpForLevel) * 100) : 0}%;background:${_statusColor(st_status.key)};"></div></div>
                    <div style="text-align:center;">${_spark(weeklyConc, 80, 26, _statusColor(st_status.key))}</div>
                  </div>`).join('')}
              </div>
            </div>

            <!-- Pending requests (preserved) -->
            ${pendingForCr.length > 0 && school ? _pendingRequestsPanel(school.id, user.id) : ''}

            <!-- Unassigned students (preserved) -->
            ${unassigned.length > 0 ? `
            <div class="cm-rc-card" style="margin-top:16px;">
              <div class="cm-sh">Sin aula asignada <span style="color:var(--muted);font-size:13px;font-weight:400;">${unassigned.length}</span></div>
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
                ${unassigned.map(st => `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,.04);border-radius:8px;border:1px solid var(--border);">
                    <div>
                      <div style="font-weight:500;font-size:14px;">${esc(st.name)}</div>
                      <div class="muted" style="font-size:12px;">${esc(st.email)}</div>
                    </div>
                    <button class="ghost" style="font-size:13px;" data-add-student="${esc(st.id)}">+ Añadir</button>
                  </div>`).join('')}
              </div>
            </div>` : ''}

            <!-- Move student (preserved, hidden if single classroom) -->
            ${allClassrooms.length > 1 ? `
            <div class="cm-rc-card" style="margin-top:16px;">
              <div class="cm-sh">Mover alumno</div>
              <div class="row" style="margin-top:12px;">
                <div class="field">
                  <label>ID alumno (email)</label>
                  <input id="moveStudentId" placeholder="email@gmail.com" />
                </div>
                <div class="field">
                  <label>Destino</label>
                  <select id="moveTargetCr">
                    ${allClassrooms.filter(c => c.id !== classroomId).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
                  </select>
                </div>
                <div class="field" style="justify-content:flex-end;">
                  <label style="opacity:0;">.</label>
                  <button class="primary" id="moveStudentBtn">Mover</button>
                </div>
              </div>
            </div>` : ''}

          </div><!-- /cm-main-col -->

          <!-- ── RIGHT SIDEBAR ── -->
          <div class="cm-right-col">

            <div class="cm-rc-card">
              <div class="cm-sh">Insights IA</div>
              <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                ${insights.map(ins => `<div class="cm-insight cm-ins-${ins.type}">${ins.text}</div>`).join('')}
              </div>
            </div>

            <div class="cm-rc-card">
              <div class="cm-sh">Alertas</div>
              <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                ${alertsList.length > 0
                  ? alertsList.map(a => `<div class="cm-alert-item" style="border-left-color:${a.color};">${a.text}</div>`).join('')
                  : '<div style="color:var(--muted);font-size:13px;">Sin alertas activas.</div>'}
              </div>
            </div>

            <div class="cm-rc-card">
              <div class="cm-sh">Tendencias (4 sem.)</div>
              <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
                ${trendWeeks.map((v, i) => `
                  <div class="cm-trend-row">
                    <span style="font-size:12px;color:var(--muted);width:60px;">Sem. -${3 - i}</span>
                    <div style="flex:1;height:6px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden;">
                      <div style="height:100%;width:${v != null ? _ini(v / 5 * 100) : 0}%;background:${v != null ? _clr(_ini(v / 5 * 100)) : 'transparent'};border-radius:3px;transition:width .4s;"></div>
                    </div>
                    <span style="font-size:12px;color:var(--muted);width:28px;text-align:right;">${v != null ? v.toFixed(1) : '—'}</span>
                  </div>`).join('')}
              </div>
            </div>

            <div class="cm-rc-card">
              <div class="cm-sh">Objetivos</div>
              <div style="margin-top:14px;display:flex;flex-direction:column;gap:14px;">
                ${[goalParticipation, goalConc].map(g => `
                  <div class="cm-goal-row">
                    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
                      <span>${g.label}</span>
                      <span style="color:${g.value >= g.target ? '#22c55e' : '#f59e0b'};">${g.value}% / ${g.target}%</span>
                    </div>
                    <div style="height:6px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden;">
                      <div style="height:100%;width:${Math.min(100, g.value)}%;background:${g.value >= g.target ? '#22c55e' : '#f59e0b'};border-radius:3px;transition:width .4s;"></div>
                    </div>
                  </div>`).join('')}
              </div>
            </div>

            <div class="cm-rc-card">
              <div class="cm-sh">Actividad reciente</div>
              <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                ${recentSessions.length === 0
                  ? '<div style="color:var(--muted);font-size:13px;">Sin sesiones recientes.</div>'
                  : recentSessions.map(se => {
                      const stName = s.users[se.email]?.name || se.email;
                      return `<div class="cm-act-item">
                        <div class="cm-act-av">${(stName[0] || '?').toUpperCase()}</div>
                        <div style="flex:1;min-width:0;">
                          <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(stName.split(' ')[0])}</div>
                          <div style="font-size:11px;color:var(--muted);">${esc(se.subject || '—')} · ${_ago(se.datetime)}</div>
                        </div>
                        <div style="font-size:13px;color:${_clr(_ini(se.concentration / 5 * 100))};font-weight:600;">${se.concentration.toFixed(1)}</div>
                      </div>`;
                    }).join('')}
              </div>
            </div>

          </div><!-- /cm-right-col -->
        </div><!-- /cm-two-col -->

        <!-- Side panel -->
        <div class="cm-sp-overlay" id="cmSPOverlay"></div>
        <div class="cm-sp-panel" id="cmSidePanel"></div>

      </div><!-- /cm-layout -->`;
  }

  function wireClassroomManage() {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    const classroomId = App._classroomId;

    // ── data-go navigation ──
    root().querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => {
        const go = btn.dataset.go;
        const id = btn.dataset.id;
        const sid = btn.dataset.sid;
        if (id) App._classroomId = id;
        if (sid) App._studentDetailId = sid;
        App.go(go);
      });
    });

    // ── create classroom form ──
    document.getElementById('createClassroomForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (!user.schoolId) return UI.flash('No estás asignado a un colegio.', 'error');
      try {
        const cr = Schools.createClassroom(user.schoolId, fd.get('grade'), fd.get('section'));
        Storage.set(st => {
          if (!st.classrooms[cr.id].teacherIds.includes(user.id)) st.classrooms[cr.id].teacherIds.push(user.id);
          if (!st.users[user.id].classroomIds) st.users[user.id].classroomIds = [];
          if (!st.users[user.id].classroomIds.includes(cr.id)) st.users[user.id].classroomIds.push(cr.id);
        });
        App._classroomId = cr.id;
        App.go('classroom-manage');
        UI.flash(`Aula "${cr.name}" creada correctamente.`, 'success');
      } catch (err) { UI.flash(err.message, 'error'); }
    });

    // ── remove student ──
    root().querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('¿Quitar este alumno del aula?')) return;
        Schools.removeStudentFromClassroom(btn.dataset.remove, classroomId);
        App.go('classroom-manage');
      });
    });

    // ── move student ──
    document.getElementById('moveStudentBtn')?.addEventListener('click', () => {
      const studentId = document.getElementById('moveStudentId')?.value.trim();
      const targetCr = document.getElementById('moveTargetCr')?.value;
      if (!studentId || !targetCr) return UI.flash('Completa los campos.', 'error');
      Schools.moveStudent(studentId, targetCr);
      UI.flash('Alumno movido correctamente.', 'success');
      App.go('classroom-manage');
    });

    // ── regenerate invite code ──
    document.getElementById('regenCodeBtn')?.addEventListener('click', () => {
      const crId = document.getElementById('regenCodeBtn').dataset.cr;
      const newCode = Schools.regenerateInviteCode(crId);
      const badge = document.getElementById('cmInviteCode');
      if (badge) badge.textContent = newCode;
      UI.flash(`Nuevo código generado: ${newCode}`, 'success');
    });

    // ── copy invite code ──
    document.getElementById('cmCopyCodeBtn')?.addEventListener('click', () => {
      const code = document.getElementById('cmInviteCode')?.textContent || '';
      if (!code || code === '—') return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => UI.flash('Código copiado al portapapeles.', 'success'));
      } else {
        UI.flash('Código: ' + code, 'success');
      }
    });

    // ── share invite code ──
    document.getElementById('cmShareCodeBtn')?.addEventListener('click', () => {
      const code = document.getElementById('cmInviteCode')?.textContent || '';
      const st = Storage.get();
      const cr = st.classrooms[classroomId];
      const text = `Únete a mi aula "${cr ? cr.name : ''}" en Ariven usando el código: ${code}`;
      if (navigator.share) {
        navigator.share({ title: 'Código de aula Ariven', text }).catch(() => {});
      } else {
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => UI.flash('Texto copiado para compartir.', 'success'));
      }
    });

    _wireApprovalButtons(user.id);

    // ── add unassigned student ──
    root().querySelectorAll('[data-add-student]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const studentId = btn.dataset.addStudent;
        if (!classroomId || classroomId === 'new') return;
        Schools.addStudentToClassroom(studentId, classroomId);
        try { await Storage.flush(); } catch (_) {}
        UI.flash('Estudiante añadido al aula correctamente.', 'success');
        App.go('classroom-manage');
      });
    });

    // ── filter chips ──
    let _activeFilter = 'all';
    root().querySelectorAll('.cm-chip[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        root().querySelectorAll('.cm-chip[data-filter]').forEach(c => c.classList.remove('cm-chip-active'));
        chip.classList.add('cm-chip-active');
        _activeFilter = chip.dataset.filter;
        _applyFilters();
      });
    });

    // ── search ──
    document.getElementById('cmSearch')?.addEventListener('input', _applyFilters);

    function _applyFilters() {
      const query = (document.getElementById('cmSearch')?.value || '').toLowerCase().trim();
      const rows = root().querySelectorAll('.cm-st-row, .cm-st-card-item');
      rows.forEach(row => {
        const status = row.dataset.status || 'ok';
        const name = row.dataset.name || '';
        const matchFilter = _activeFilter === 'all' || status === _activeFilter;
        const matchSearch = !query || name.includes(query);
        row.style.display = (matchFilter && matchSearch) ? '' : 'none';
      });
    }

    // ── sort ──
    document.getElementById('cmSort')?.addEventListener('change', (e) => {
      const key = e.target.value;
      const list = document.getElementById('cmStudentList');
      const cards = document.getElementById('cmStudentCards');
      const sortRows = (container) => {
        if (!container) return;
        const items = Array.from(container.children);
        items.sort((a, b) => {
          const idA = a.dataset.studentId;
          const idB = b.dataset.studentId;
          const st_s = Storage.get();
          const userA = st_s.users[idA] || {};
          const userB = st_s.users[idB] || {};
          const gamA = userA.gamification || {};
          const gamB = userB.gamification || {};
          if (key === 'name') return (userA.name || '').localeCompare(userB.name || '');
          if (key === 'xp') return (gamB.xp || 0) - (gamA.xp || 0);
          if (key === 'streak') return (gamB.streak || 0) - (gamA.streak || 0);
          if (key === 'conc') {
            const sA = st_s.sessions.filter(se => se.email === idA).slice(-7);
            const sB = st_s.sessions.filter(se => se.email === idB).slice(-7);
            const cA = sA.length ? sA.reduce((acc, s) => acc + s.concentration, 0) / sA.length : 0;
            const cB = sB.length ? sB.reduce((acc, s) => acc + s.concentration, 0) / sB.length : 0;
            return cB - cA;
          }
          if (key === 'last') {
            const lA = st_s.sessions.filter(se => se.email === idA).slice(-1)[0]?.datetime || '';
            const lB = st_s.sessions.filter(se => se.email === idB).slice(-1)[0]?.datetime || '';
            return lB.localeCompare(lA);
          }
          return 0;
        });
        items.forEach(item => container.appendChild(item));
      };
      sortRows(list);
      sortRows(cards);
    });

    // ── view toggle ──
    const listEl = document.getElementById('cmStudentList');
    const cardsEl = document.getElementById('cmStudentCards');
    document.getElementById('cmViewList')?.addEventListener('click', () => {
      if (listEl) listEl.style.display = '';
      if (cardsEl) cardsEl.style.display = 'none';
      document.getElementById('cmViewList')?.classList.add('cm-view-active');
      document.getElementById('cmViewCards')?.classList.remove('cm-view-active');
    });
    document.getElementById('cmViewCards')?.addEventListener('click', () => {
      if (listEl) listEl.style.display = 'none';
      if (cardsEl) cardsEl.style.display = 'grid';
      document.getElementById('cmViewCards')?.classList.add('cm-view-active');
      document.getElementById('cmViewList')?.classList.remove('cm-view-active');
    });

    // ── side panel ──
    function _sidePanelHtml(studentId) {
      const st_s = Storage.get();
      const st = st_s.users[studentId];
      if (!st) return '<div style="padding:20px;color:var(--muted);">Alumno no encontrado.</div>';
      const gam = st.gamification || {};
      const li = Gamification.getLevelInfo(gam.xp || 0);
      const stSessions = st_s.sessions.filter(se => se.email === studentId);
      const last5 = stSessions.slice(-5);
      const avgC = last5.length ? last5.reduce((a, b) => a + b.concentration, 0) / last5.length : null;
      const lastS = stSessions.slice(-1)[0];
      const bySub = {};
      stSessions.forEach(se => {
        if (!bySub[se.subject]) bySub[se.subject] = { sum: 0, count: 0 };
        bySub[se.subject].sum += se.concentration;
        bySub[se.subject].count++;
      });
      const subList = Object.entries(bySub).sort((a, b) => b[1].count - a[1].count).slice(0, 4);
      const recentS = stSessions.slice().sort((a, b) => b.datetime.localeCompare(a.datetime)).slice(0, 5);
      const clr = avgC != null ? (avgC >= 3.5 ? '#22c55e' : avgC >= 2.5 ? '#f59e0b' : '#ef4444') : 'var(--muted)';
      return `
        <div class="cm-sp-inner">
          <div class="cm-sp-hero">
            <div class="cm-st-av" style="width:56px;height:56px;font-size:22px;background:linear-gradient(135deg,${clr}33,${clr}11);border-color:${clr}55;">${(st.name[0] || '?').toUpperCase()}</div>
            <div class="cm-sp-info">
              <div style="font-size:17px;font-weight:700;">${esc(st.name)}</div>
              <div style="font-size:12px;color:var(--muted);">${esc(st.email || '')}</div>
              <div style="font-size:12px;margin-top:4px;">Nv.${gam.level || 1} · 🔥 ${gam.streak || 0} · ${(gam.xp || 0).toLocaleString('es-PE')} XP</div>
            </div>
          </div>
          <div class="cm-sp-stats">
            <div class="cm-sp-stat">
              <div style="font-size:20px;font-weight:700;color:${clr};">${avgC != null ? avgC.toFixed(1) : '—'}</div>
              <div style="font-size:11px;color:var(--muted);">Conc. (últ. 5)</div>
            </div>
            <div class="cm-sp-stat">
              <div style="font-size:20px;font-weight:700;">${stSessions.length}</div>
              <div style="font-size:11px;color:var(--muted);">Sesiones</div>
            </div>
            <div class="cm-sp-stat">
              <div style="font-size:20px;font-weight:700;">${lastS ? Math.floor((Date.now() - new Date(lastS.datetime)) / 86400000) + 'd' : '—'}</div>
              <div style="font-size:11px;color:var(--muted);">Días sin sesión</div>
            </div>
          </div>
          ${subList.length > 0 ? `
          <div class="cm-sp-section">
            <div class="cm-sh" style="font-size:13px;margin-bottom:10px;">Materias</div>
            ${subList.map(([sub, data]) => `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:13px;">
                <span style="flex:1;color:var(--text);">${esc(sub)}</span>
                <div style="width:80px;height:5px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden;">
                  <div style="height:100%;width:${(data.sum / data.count / 5 * 100).toFixed(0)}%;background:${clr};border-radius:3px;"></div>
                </div>
                <span style="color:var(--muted);width:28px;text-align:right;">${(data.sum / data.count).toFixed(1)}</span>
              </div>`).join('')}
          </div>` : ''}
          ${recentS.length > 0 ? `
          <div class="cm-sp-section">
            <div class="cm-sh" style="font-size:13px;margin-bottom:10px;">Últimas sesiones</div>
            ${recentS.map(se => `
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);">
                <span style="color:var(--muted);">${new Date(se.datetime).toLocaleDateString('es-PE')}</span>
                <span>${esc(se.subject || '—')}</span>
                <span style="color:${se.concentration >= 3.5 ? '#22c55e' : se.concentration >= 2.5 ? '#f59e0b' : '#ef4444'};font-weight:600;">${se.concentration.toFixed(1)}</span>
              </div>`).join('')}
          </div>` : ''}
          <div style="margin-top:16px;">
            <button class="primary" style="width:100%;" data-go="student-detail" data-sid="${esc(studentId)}">Ver perfil completo →</button>
          </div>
        </div>`;
    }

    function _openSidePanel(studentId) {
      const panel = document.getElementById('cmSidePanel');
      const overlay = document.getElementById('cmSPOverlay');
      if (!panel || !overlay) return;
      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="font-weight:600;">Detalle alumno</div>
          <button class="ghost" id="cmSPClose" style="padding:6px 10px;">✕</button>
        </div>
        ${_sidePanelHtml(studentId)}`;
      panel.classList.add('cm-sp-open');
      overlay.classList.add('cm-overlay-show');
      document.getElementById('cmSPClose')?.addEventListener('click', _closeSidePanel);
      panel.querySelectorAll('[data-go]').forEach(btn => {
        btn.addEventListener('click', () => {
          const go = btn.dataset.go;
          const sid = btn.dataset.sid;
          if (sid) App._studentDetailId = sid;
          _closeSidePanel();
          App.go(go);
        });
      });
    }

    function _closeSidePanel() {
      document.getElementById('cmSidePanel')?.classList.remove('cm-sp-open');
      document.getElementById('cmSPOverlay')?.classList.remove('cm-overlay-show');
    }

    document.getElementById('cmSPOverlay')?.addEventListener('click', _closeSidePanel);

    // ── student row click → side panel ──
    root().querySelectorAll('.cm-st-row, .cm-st-card-item').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove]')) return;
        const studentId = row.dataset.studentId;
        if (studentId) _openSidePanel(studentId);
      });
    });
  }

  // ---- Pantalla: Estadísticas del Aula ----
  function screenClassroomStats() {
    const classroomId = App._classroomId;
    const s = Storage.get();
    const cr = s.classrooms[classroomId];
    if (!cr) return '<div class="card empty">Aula no encontrada.</div>';

    const students = Schools.listStudentsInClassroom(classroomId);
    const allCrSessions = Sessions.listForClassroom(classroomId);

    // KPIs
    const avgConc = allCrSessions.length
      ? (allCrSessions.reduce((a, b) => a + b.concentration, 0) / allCrSessions.length).toFixed(1)
      : '—';
    const totalMin = allCrSessions.reduce((a, b) => a + b.durationMin, 0);

    // Índice de Aprendizaje promedio del aula (Fase 11).
    const crIndices = allCrSessions
      .map(se => Stats.parseMetrics(se).learning_index)
      .filter(v => typeof v === 'number' && !isNaN(v));
    const avgIndex = crIndices.length
      ? Math.round(crIndices.reduce((a, b) => a + b, 0) / crIndices.length)
      : null;

    // Semanas (8 últimas)
    const weekLabels = [];
    const weekAvgs = [];
    for (let w = 7; w >= 0; w--) {
      const to = new Date(); to.setDate(to.getDate() - w * 7);
      const from = new Date(to); from.setDate(to.getDate() - 7);
      const wSessions = allCrSessions.filter(se => {
        const d = new Date(se.datetime);
        return d >= from && d < to;
      });
      weekLabels.push(`Sem. -${w}`);
      weekAvgs.push(wSessions.length ? parseFloat((wSessions.reduce((a, b) => a + b.concentration, 0) / wSessions.length).toFixed(2)) : null);
    }

    // Promedio por materia
    const bySub = {};
    allCrSessions.forEach(se => {
      if (!bySub[se.subject]) bySub[se.subject] = { sum: 0, count: 0 };
      bySub[se.subject].sum += se.concentration;
      bySub[se.subject].count++;
    });
    const subLabels = Object.keys(bySub);
    const subAvgs = subLabels.map(k => parseFloat((bySub[k].sum / bySub[k].count).toFixed(2)));

    // Ranking del aula
    const lb = Gamification.getLeaderboard('classroom', classroomId, 'all').slice(0, 10);

    // Alumnos en riesgo
    const atRisk = students.filter(st => {
      const last5 = s.sessions.filter(se => se.email === st.id).slice(-5);
      if (last5.length < 5) return false;
      return last5.reduce((a, b) => a + b.concentration, 0) / last5.length < 2.5;
    });

    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <button class="ghost" data-go="teacher-dashboard">← Volver</button>
        <h1 style="margin:0;">Aula: ${esc(cr.name)}</h1>
      </div>

      <div class="grid cols-4" style="margin-bottom:18px;">
        <div class="kpi"><div class="v">${students.length}</div><div class="l">Alumnos</div></div>
        <div class="kpi"><div class="v">${avgConc}</div><div class="l">Conc. prom. total</div></div>
        <div class="kpi"><div class="v" style="color:var(--accent);">${avgIndex != null ? avgIndex + '/100' : '—'}</div><div class="l">Índice apr. prom.</div></div>
        <div class="kpi"><div class="v">${allCrSessions.length}</div><div class="l">Sesiones totales</div></div>
        <div class="kpi"><div class="v">${totalMin}</div><div class="l">Minutos estudiados</div></div>
      </div>

      <div class="grid cols-2" style="margin-bottom:18px;">
        <div class="card">
          <h3>Concentración semanal (últimas 8 semanas)</h3>
          <div class="chart-container">
            <div class="chart-skeleton skeleton"></div>
            <canvas id="chartWeekly"></canvas>
          </div>
        </div>
        <div class="card">
          <h3>Concentración por materia</h3>
          <div class="chart-container">
            <div class="chart-skeleton skeleton"></div>
            <canvas id="chartSubject"></canvas>
          </div>
        </div>
      </div>

      ${atRisk.length > 0 ? `
      <div class="card" style="border-color:var(--bad);margin-bottom:18px;">
        <h3 style="color:var(--bad);">⚠️ Alumnos en riesgo (${atRisk.length})</h3>
        <p class="muted">Concentración promedio menor a 2.5 en sus últimas 5 sesiones.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${atRisk.map(st => `<span class="chip" style="border-color:var(--bad);cursor:pointer;" data-go="student-detail" data-sid="${esc(st.id)}">${esc(st.name)}</span>`).join('')}
        </div>
      </div>` : `<div class="alert success" style="margin-bottom:18px;">✓ Ningún alumno en situación de riesgo esta semana.</div>`}

      <div class="card" style="padding:0;overflow:auto;">
        <div style="padding:16px;border-bottom:1px solid var(--border);">
          <h3 style="margin:0;">Ranking del aula</h3>
        </div>
        ${lb.length === 0 ? '<div class="empty">Sin datos todavía.</div>' : `
        <table class="leaderboard-table">
          <thead><tr>
            <th style="padding:10px 14px;">#</th>
            <th style="padding:10px 8px;">Estudiante</th>
            <th style="padding:10px 8px;">XP</th>
            <th style="padding:10px 8px;">Racha</th>
            <th style="padding:10px 8px;">Sesiones</th>
            <th style="padding:10px 8px;">Conc. prom.</th>
            <th style="padding:10px 8px;"></th>
          </tr></thead>
          <tbody>
            ${lb.map(e => `<tr>
              <td style="padding:10px 14px;" class="rank-medal-${e.rank}">${e.rank <= 3 ? ['🥇','🥈','🥉'][e.rank-1] : e.rank}</td>
              <td style="padding:10px 8px;">${esc(e.name)}</td>
              <td style="padding:10px 8px;"><strong>${e.xp}</strong></td>
              <td style="padding:10px 8px;">🔥 ${e.streak}</td>
              <td style="padding:10px 8px;">${e.sessionCount}</td>
              <td style="padding:10px 8px;">${e.avgConcentration}/5</td>
              <td style="padding:10px 8px;"><button class="ghost" data-go="student-detail" data-sid="${e.userId}">Ver</button></td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>`;
  }

  function wireClassroomStats() {
    root().querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.sid;
        if (id) App._studentDetailId = id;
        App.go(btn.dataset.go);
      });
    });

    const classroomId = App._classroomId;
    const allCrSessions = Sessions.listForClassroom(classroomId);

    // Gráfica semanal
    const weekLabels = [];
    const weekAvgs = [];
    for (let w = 7; w >= 0; w--) {
      const to = new Date(); to.setDate(to.getDate() - w * 7);
      const from = new Date(to); from.setDate(to.getDate() - 7);
      const wSessions = allCrSessions.filter(se => {
        const d = new Date(se.datetime);
        return d >= from && d < to;
      });
      weekLabels.push(`Sem. -${w}`);
      weekAvgs.push(wSessions.length ? parseFloat((wSessions.reduce((a, b) => a + b.concentration, 0) / wSessions.length).toFixed(2)) : null);
    }

    Charts.create('chartWeekly', Charts.lineConfig(
      weekLabels,
      [{ label: 'Concentración promedio', data: weekAvgs }]
    ));

    // Gráfica por materia
    const bySub = {};
    allCrSessions.forEach(se => {
      if (!bySub[se.subject]) bySub[se.subject] = { sum: 0, count: 0 };
      bySub[se.subject].sum += se.concentration;
      bySub[se.subject].count++;
    });
    const subLabels = Object.keys(bySub);
    const subAvgs = subLabels.map(k => parseFloat((bySub[k].sum / bySub[k].count).toFixed(2)));
    if (subLabels.length > 0) {
      Charts.create('chartSubject', Charts.barConfig(subLabels, subAvgs, 'Conc. prom.', Charts.COLORS.primary));
    }
  }

  // ---- Pantalla: Detalle del Estudiante ----
  function screenStudentDetail() {
    const studentId = App._studentDetailId;
    const s = Storage.get();
    const student = s.users[studentId];
    if (!student) return '<div class="card empty">Estudiante no encontrado.</div>';

    const sessions = Sessions.listFor(studentId);
    const gam = student.gamification || {};
    const levelInfo = Gamification.getLevelInfo(gam.xp || 0);
    const sum = Stats.summary(sessions);
    const profile = Analytics.classifyProfile(sessions);
    const alerts = Analytics.generateAlerts(studentId);
    const subs = Stats.bySubject(sessions);

    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <button class="ghost" data-go="classroom-manage">← Volver</button>
        <h1 style="margin:0;">👤 ${esc(student.name)}</h1>
      </div>

      ${alerts.map(a => `<div class="alert ${a.type === 'success' ? 'success' : a.type === 'error' ? 'error' : 'info'}">${a.msg}</div>`).join('')}

      <div class="grid cols-4" style="margin-bottom:18px;">
        <div class="kpi"><div class="v">${sum.total}</div><div class="l">Sesiones</div></div>
        <div class="kpi"><div class="v">${sum.avgConc || '—'}</div><div class="l">Conc. prom.</div></div>
        <div class="kpi"><div class="v">${sum.totalMin}</div><div class="l">Min. totales</div></div>
        <div class="kpi"><div class="v">🔥 ${gam.streak || 0}</div><div class="l">Racha</div></div>
      </div>

      <div class="grid cols-2" style="margin-bottom:18px;">
        <div class="card">
          <h3>Gamificación</h3>
          <p><strong>Nivel:</strong> ${levelInfo.current.level} — ${esc(levelInfo.current.title)}</p>
          <p><strong>XP Total:</strong> ${gam.xp || 0}</p>
          <p><strong>Insignias:</strong> ${(gam.badges || []).length} / ${Gamification.BADGES.length}</p>
          <div class="xp-bar-wrap" style="margin-top:8px;">
            <div class="xp-bar" style="width:${levelInfo.progress}%"></div>
          </div>
        </div>
        ${profile ? `
        <div class="card" style="text-align:center;">
          <div style="font-size:36px;">${profile.icon}</div>
          <h3 style="margin:8px 0 4px;">${esc(profile.label)}</h3>
          <p class="muted" style="font-size:12px;">${esc(profile.desc)}</p>
        </div>` : '<div class="card"><p class="muted">Pocas sesiones para determinar perfil.</p></div>'}
      </div>

      <div class="card">
        <h3>Concentración por materia</h3>
        ${subs.map(r => {
          const pct = (r.avgConcentration / 5) * 100;
          return `<div>
            <div style="display:flex;justify-content:space-between;font-size:13px;">
              <span>${esc(r.subject)}</span>
              <span class="muted">${r.avgConcentration}/5 · ${r.count} ses.</span>
            </div>
            <div class="bar"><span style="width:${pct}%"></span></div>
          </div>`;
        }).join('') || '<p class="muted">Sin datos.</p>'}
      </div>

      <div class="card" style="padding:0;overflow:auto;">
        <div style="padding:16px;border-bottom:1px solid var(--border);">
          <h3 style="margin:0;">Últimas 10 sesiones</h3>
        </div>
        <table class="table">
          <thead><tr><th>Fecha</th><th>Materia</th><th>Conc.</th><th>Min</th><th>Actividad previa</th></tr></thead>
          <tbody>
            ${sessions.slice(0, 10).map(x => `
              <tr>
                <td>${new Date(x.datetime).toLocaleString('es-PE')}</td>
                <td>${esc(x.subject)}</td>
                <td><strong>${x.concentration}</strong>/5</td>
                <td>${x.durationMin}</td>
                <td>${esc(x.previousActivity)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function wireStudentDetail() {
    root().querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => App.go(btn.dataset.go));
    });
  }

  const _wrap = (typeof window !== 'undefined' && window.__tfSafeScreens) || ((n, s) => s);
  return {
    screens: _wrap('teacher', {
      'teacher-dashboard': { render: screenTeacherDashboard, wire: wireTeacherDashboard },
      'classroom-manage':  { render: screenClassroomManage,  wire: wireClassroomManage },
      'classroom-stats':   { render: screenClassroomStats,   wire: wireClassroomStats },
      'student-detail':    { render: screenStudentDetail,    wire: wireStudentDetail }
    })
  };
})();

