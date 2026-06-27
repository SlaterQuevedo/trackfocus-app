// Centro de Monitoreo — Rol Padre de Familia
// Panel de supervisión de progreso estudiantil (solo lectura).
// Vinculación mediante código ARV-STU-XXXXXXXX o escaneo QR.
const ParentUI = (() => {

  // ── Helpers de datos ──────────────────────────────────────────────────────

  function _getSessions(studentId) {
    return (Storage.get().sessions || []).filter(s => s.email === studentId);
  }

  function _avgConc(sessions) {
    if (!sessions.length) return 0;
    return sessions.reduce((a, s) => a + (s.concentration || 0), 0) / sessions.length;
  }

  function _totalHours(sessions) {
    return sessions.reduce((a, s) => a + (s.durationMin || 0), 0) / 60;
  }

  function _streak(user) {
    return user?.gamification?.streak || 0;
  }

  function _lastSessionDaysAgo(sessions) {
    if (!sessions.length) return Infinity;
    const last = sessions.reduce((a, s) => s.datetime > a.datetime ? s : a, sessions[0]);
    return (Date.now() - new Date(last.datetime).getTime()) / 86400000;
  }

  function _topSubjects(sessions) {
    const map = {};
    sessions.forEach(s => {
      if (!s.subject) return;
      if (!map[s.subject]) map[s.subject] = { count: 0, concSum: 0 };
      map[s.subject].count++;
      map[s.subject].concSum += s.concentration || 0;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, count: d.count, avg: d.concSum / d.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  function _activityDots(sessions) {
    const dots = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const count = sessions.filter(s => s.datetime?.slice(0, 10) === dayStr).length;
      dots.push({ date: dayStr, count });
    }
    return dots;
  }

  function _generateInsights(sessions, user) {
    const insights = [];
    if (sessions.length === 0) {
      insights.push({ type: 'info', text: 'Sin actividad registrada todavía.' });
      return insights;
    }
    const daysAgo = _lastSessionDaysAgo(sessions);
    if (daysAgo > 7) {
      insights.push({ type: 'warning', text: `Sin actividad en los últimos ${Math.floor(daysAgo)} días.` });
    }
    const avg = _avgConc(sessions);
    if (avg < 2.5) {
      insights.push({ type: 'warning', text: 'La concentración promedio es baja (menor al 50%).' });
    }
    const recent = sessions.slice(-6);
    if (recent.length >= 6) {
      const first3 = recent.slice(0, 3).reduce((a, s) => a + (s.concentration || 0), 0) / 3;
      const last3  = recent.slice(3).reduce((a, s) => a + (s.concentration || 0), 0) / 3;
      if (last3 < first3 - 0.5) {
        insights.push({ type: 'warning', text: 'La concentración ha disminuido en las últimas sesiones.' });
      }
    }
    if (_streak(user) === 0) {
      insights.push({ type: 'info', text: 'La racha de estudio está en 0 — anima al estudiante a retomar.' });
    }
    if (insights.length === 0) {
      insights.push({ type: 'ok', text: 'Todo va bien. El estudiante mantiene un buen ritmo.' });
    }
    return insights.slice(0, 3);
  }

  // ── Export CSV ────────────────────────────────────────────────────────────

  function _exportCSV(student, sessions) {
    const rows = [['Fecha', 'Materia', 'Concentración (1-5)', 'Minutos', 'Actividad previa']];
    const sorted = [...sessions].sort((a, b) => b.datetime.localeCompare(a.datetime));
    sorted.forEach(s => {
      rows.push([
        s.datetime ? s.datetime.slice(0, 10) : '',
        s.subject || '',
        s.concentration || '',
        s.durationMin || '',
        s.previousActivity || ''
      ]);
    });
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ariven-' + (student.name || 'estudiante').replace(/\s+/g, '-') + '-sesiones.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  }

  // ── Export PDF ────────────────────────────────────────────────────────────

  function _exportPDF(student, sessions, insights) {
    const avgC = _avgConc(sessions).toFixed(1);
    const hrs   = _totalHours(sessions).toFixed(1);
    const top   = _topSubjects(sessions);
    const date  = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    const sessRows = [...sessions]
      .sort((a, b) => b.datetime.localeCompare(a.datetime))
      .slice(0, 10)
      .map(s => `<tr><td>${s.datetime?.slice(0,10)||''}</td><td>${s.subject||''}</td><td>${s.concentration||''}/5</td><td>${s.durationMin||''} min</td></tr>`)
      .join('');
    const insHtml = insights.map(i => `<li>${i.text}</li>`).join('');
    const topHtml = top.map(t => `<li>${t.name} — ${t.count} sesión${t.count !== 1 ? 'es' : ''}, conc. prom. ${t.avg.toFixed(1)}/5</li>`).join('');

    const win = window.open('', '_blank');
    if (!win) { UI.flash('Activa las ventanas emergentes para generar el PDF.', 'error'); return; }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Reporte Ariven — ${student.name}</title>
<style>
  body{font-family:Arial,sans-serif;padding:32px;color:#1a1a1a;max-width:700px;margin:auto;}
  h1{color:#c8a06e;font-size:22px;border-bottom:2px solid #c8a06e;padding-bottom:8px;}
  h2{font-size:16px;margin-top:24px;color:#444;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{background:#c8a06e;color:#fff;padding:6px 10px;text-align:left;}
  td{padding:5px 10px;border-bottom:1px solid #eee;}
  .kpi-row{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px;}
  .kpi{background:#f5f0e8;border-radius:8px;padding:10px 16px;min-width:120px;}
  .kpi-val{font-size:22px;font-weight:700;color:#c8a06e;}
  .kpi-label{font-size:11px;color:#666;}
  ul{margin:8px 0;padding-left:20px;}
  li{margin:4px 0;font-size:13px;}
  .footer{margin-top:32px;font-size:11px;color:#999;text-align:center;}
</style></head><body>
<h1>Reporte de progreso — Ariven</h1>
<p><strong>Estudiante:</strong> ${student.name || '—'} &nbsp;|&nbsp; <strong>Código:</strong> ${student.studentCode || '—'}</p>
<p><strong>Generado:</strong> ${date}</p>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-val">${sessions.length}</div><div class="kpi-label">Sesiones totales</div></div>
  <div class="kpi"><div class="kpi-val">${student.gamification?.xp || 0}</div><div class="kpi-label">XP total</div></div>
  <div class="kpi"><div class="kpi-val">${student.gamification?.streak || 0}</div><div class="kpi-label">Racha actual</div></div>
  <div class="kpi"><div class="kpi-val">${hrs}h</div><div class="kpi-label">Horas de estudio</div></div>
  <div class="kpi"><div class="kpi-val">${avgC}/5</div><div class="kpi-label">Conc. promedio</div></div>
</div>
<h2>Materias más frecuentes</h2>
<ul>${topHtml || '<li>Sin datos</li>'}</ul>
<h2>Observaciones</h2>
<ul>${insHtml}</ul>
<h2>Últimas 10 sesiones</h2>
<table><thead><tr><th>Fecha</th><th>Materia</th><th>Concentración</th><th>Duración</th></tr></thead>
<tbody>${sessRows || '<tr><td colspan="4">Sin sesiones registradas.</td></tr>'}</tbody></table>
<div class="footer">Generado por Ariven — Plataforma de aprendizaje adaptativo</div>
<script>window.onload = () => { window.print(); }<\/script>
</body></html>`);
    win.document.close();
  }

  // ── Pantalla: Vincular estudiante ─────────────────────────────────────────

  function screenParentLink() {
    const u = Roles.current();
    const hasLinked = u?.linkedStudentIds?.length > 0;
    return `
      <div class="par-layout">
        <div class="card" style="max-width:520px;margin:48px auto;">
          <h2 style="margin:0 0 8px;">Vincular estudiante</h2>
          <p class="muted" style="margin:0 0 24px;">Ingresa el código de identidad del estudiante (ARV-STU-XXXXXXXX) para vincularte como tutor y acceder a su progreso.</p>
          <div id="parLinkPreview" style="display:none;" class="par-link-preview"></div>
          <div style="display:flex;gap:10px;margin-bottom:16px;">
            <input id="parStudentCodeInput" maxlength="20" placeholder="ARV-STU-XXXXXXXX"
              style="text-transform:uppercase;flex:1;letter-spacing:1px;font-family:monospace;" />
            <button class="primary" id="parLinkSearch">Buscar</button>
          </div>
          <div id="parLinkConfirmRow" style="display:none;margin-bottom:16px;">
            <button class="primary" id="parLinkConfirm" style="width:100%;">Confirmar vinculación</button>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:8px;padding-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
            ${hasLinked ? '<button class="ghost" id="parLinkSkip">Volver al panel</button>' : '<button class="ghost" id="parLinkSkip">Vincular más tarde</button>'}
          </div>
        </div>
      </div>`;
  }

  function wireParentLink() {
    let _foundStudent = null;

    function _showPreview(student) {
      _foundStudent = student;
      const s = Storage.get();
      const crName = student.classroomId ? s.classrooms[student.classroomId]?.name || '' : '';
      const schoolName = student.schoolId ? s.schools[student.schoolId]?.name || '' : '';
      const preview = document.getElementById('parLinkPreview');
      if (!preview) return;
      preview.innerHTML = `
        <div class="par-found-student">
          <div class="par-found-avatar">${(student.name || '?')[0].toUpperCase()}</div>
          <div>
            <div style="font-weight:700;">${student.name || '—'}</div>
            <div class="muted" style="font-size:13px;">${crName ? crName + ' · ' : ''}${schoolName || 'Sin colegio'}</div>
            <div style="font-size:11px;font-family:monospace;color:var(--accent,#c8a06e);margin-top:2px;">${student.studentCode || ''}</div>
          </div>
        </div>`;
      preview.style.display = '';
      const confirmRow = document.getElementById('parLinkConfirmRow');
      if (confirmRow) confirmRow.style.display = '';
    }

    document.getElementById('parLinkSearch')?.addEventListener('click', () => {
      const code = (document.getElementById('parStudentCodeInput')?.value || '').trim().toUpperCase();
      if (!code) { UI.flash('Ingresa un código de estudiante.', 'error'); return; }
      const student = Storage.findUserByStudentCode(code);
      if (!student) { UI.flash('Código no encontrado. Verifica que sea correcto.', 'error'); return; }
      _showPreview(student);
    });

    document.getElementById('parStudentCodeInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('parLinkSearch')?.click();
    });

    document.getElementById('parLinkConfirm')?.addEventListener('click', async () => {
      if (!_foundStudent) return;
      const u = Roles.current();
      if (!u) return;
      const studentId = _foundStudent.id;
      Storage.set(st => {
        if (!st.users[u.id]) return;
        const ids = st.users[u.id].linkedStudentIds || [];
        if (!ids.includes(studentId)) ids.push(studentId);
        st.users[u.id].linkedStudentIds = ids;
      });
      try { await Storage.flush(); } catch (_) {}
      App._parentViewingStudentId = studentId;
      UI.flash(`¡Vinculado! Ahora puedes ver el progreso de ${_foundStudent.name}.`, 'success');
      App.go('parent-dashboard');
    });

    document.getElementById('parLinkSkip')?.addEventListener('click', () => App.go('parent-dashboard'));
  }

  // ── Pantalla: Dashboard padre ─────────────────────────────────────────────

  function screenParentDashboard() {
    const u = Roles.current();
    if (!u) return '<div class="alert error">Sesión no encontrada.</div>';

    const s = Storage.get();
    const linkedIds = u.linkedStudentIds || [];

    if (linkedIds.length === 0) {
      return `
        <div class="par-layout">
          <div class="par-header">
            <div style="font-weight:700;font-size:18px;">Centro de Monitoreo</div>
          </div>
          <div class="par-empty">
            <div style="font-size:48px;margin-bottom:16px;">👨‍👩‍👧</div>
            <h3>Aún no tienes estudiantes vinculados</h3>
            <p class="muted">Vincula a tu hijo o hija usando su código de identidad Ariven para ver su progreso.</p>
            <button class="primary" id="parGoLink" style="margin-top:16px;">Vincular estudiante</button>
          </div>
        </div>`;
    }

    const viewId = App._parentViewingStudentId && linkedIds.includes(App._parentViewingStudentId)
      ? App._parentViewingStudentId
      : linkedIds[0];
    const student = s.users[viewId];
    if (!student) return '<div class="alert error">Estudiante no encontrado.</div>';

    const sessions = _getSessions(viewId);
    const sorted   = [...sessions].sort((a, b) => b.datetime.localeCompare(a.datetime));
    const last7    = sorted.slice(0, 7);
    const avgC     = _avgConc(sessions);
    const hrs      = _totalHours(sessions);
    const streak   = _streak(student);
    const xp       = student.gamification?.xp || 0;
    const badges   = student.gamification?.badges || [];
    const crName   = student.classroomId ? (s.classrooms[student.classroomId]?.name || '') : '';
    const schoolName = student.schoolId ? (s.schools[student.schoolId]?.name || '') : '';
    const insights = _generateInsights(sorted, student);
    const topSubs  = _topSubjects(sessions);
    const dots     = _activityDots(sessions);
    const prodScore = sessions.length > 0 ? Math.round((avgC / 5) * 100) : 0;
    const lvl = student.gamification?.level || 1;

    // Tabs de estudiantes
    const tabsHtml = linkedIds.length > 1 ? `
      <div class="par-student-tabs">
        ${linkedIds.map(id => {
          const st = s.users[id];
          if (!st) return '';
          return `<button class="par-student-tab${id === viewId ? ' active' : ''}" data-student-id="${id}">
            <div class="par-tab-avatar">${(st.name || '?')[0].toUpperCase()}</div>
            <div class="par-tab-name">${st.name?.split(' ')[0] || '—'}</div>
          </button>`;
        }).join('')}
      </div>` : '';

    // Últimas 7 sesiones
    const sessRowsHtml = last7.length ? last7.map(ss => `
      <tr>
        <td>${ss.datetime?.slice(0,10)||'—'}</td>
        <td>${ss.subject||'—'}</td>
        <td>${'★'.repeat(ss.concentration||0)}${'☆'.repeat(Math.max(0,5-(ss.concentration||0)))}</td>
        <td>${ss.durationMin||'—'} min</td>
      </tr>`).join('') : `<tr><td colspan="4" class="muted" style="text-align:center;">Sin sesiones registradas.</td></tr>`;

    // Dots de actividad
    const dotsHtml = dots.map(d => {
      const intensity = d.count === 0 ? 'empty' : d.count === 1 ? 'low' : d.count <= 3 ? 'mid' : 'high';
      return `<div class="par-dot par-dot-${intensity}" title="${d.date}: ${d.count} sesión${d.count!==1?'es':''}"></div>`;
    }).join('');

    // Insights
    const insightsHtml = insights.map(i => `
      <div class="par-insight par-insight-${i.type}">${i.text}</div>`).join('');

    // Top materias
    const topSubsHtml = topSubs.length ? topSubs.map(t => `
      <div class="par-sub-row">
        <span class="par-sub-name">${t.name}</span>
        <span class="par-sub-meta">${t.count} ses. · ${t.avg.toFixed(1)}/5</span>
      </div>`).join('') : '<p class="muted" style="font-size:13px;">Sin datos de materias.</p>';

    // Badges
    const badgesHtml = badges.length ? badges.map(b => `<span class="par-badge-chip">${b.replace(/_/g,' ')}</span>`).join('') : '<span class="muted" style="font-size:13px;">Aún sin insignias.</span>';

    return `
      <div class="par-layout">
        <div class="par-header">
          <div style="font-weight:700;font-size:18px;">Centro de Monitoreo</div>
          <button class="par-header-btn" id="parGoLinkMore">+ Vincular estudiante</button>
        </div>

        ${tabsHtml}

        <div class="par-hero">
          <div class="par-hero-avatar">${(student.name||'?')[0].toUpperCase()}</div>
          <div class="par-hero-info">
            <div class="par-hero-name">${student.name||'—'}</div>
            <div class="par-hero-sub">${crName ? crName + ' · ' : ''}${schoolName||'Sin colegio'}</div>
            <div class="par-hero-code">${student.studentCode||''}</div>
          </div>
          <div class="par-hero-level">Nv. ${lvl}</div>
        </div>

        <div class="par-kpi-grid">
          <div class="par-kpi-card"><div class="par-kpi-val">${sessions.length}</div><div class="par-kpi-label">Sesiones</div></div>
          <div class="par-kpi-card"><div class="par-kpi-val">${xp}</div><div class="par-kpi-label">XP total</div></div>
          <div class="par-kpi-card"><div class="par-kpi-val">${streak}</div><div class="par-kpi-label">Racha 🔥</div></div>
          <div class="par-kpi-card"><div class="par-kpi-val">${hrs.toFixed(1)}h</div><div class="par-kpi-label">Horas</div></div>
          <div class="par-kpi-card"><div class="par-kpi-val">${avgC.toFixed(1)}/5</div><div class="par-kpi-label">Concentración</div></div>
          <div class="par-kpi-card"><div class="par-kpi-val">${prodScore}%</div><div class="par-kpi-label">Productividad</div></div>
        </div>

        <div class="par-section">
          <div class="par-section-title">Insignias obtenidas</div>
          <div class="par-badges-row">${badgesHtml}</div>
        </div>

        <div class="par-section">
          <div class="par-section-title">Actividad — últimos 14 días</div>
          <div class="par-dots-row">${dotsHtml}</div>
        </div>

        <div class="par-section">
          <div class="par-section-title">Materias más frecuentes</div>
          ${topSubsHtml}
        </div>

        <div class="par-section">
          <div class="par-section-title">Últimas sesiones</div>
          <div class="par-table-wrap">
            <table class="par-table">
              <thead><tr><th>Fecha</th><th>Materia</th><th>Concentración</th><th>Duración</th></tr></thead>
              <tbody>${sessRowsHtml}</tbody>
            </table>
          </div>
        </div>

        <div class="par-section">
          <div class="par-section-title">Observaciones</div>
          ${insightsHtml}
        </div>

        <div class="par-export-bar">
          <button class="par-export-btn" id="parExportPDF">📄 Exportar PDF</button>
          <button class="par-export-btn" id="parExportCSV">📊 Exportar CSV</button>
        </div>
      </div>`;
  }

  function wireParentDashboard() {
    document.getElementById('parGoLink')?.addEventListener('click', () => App.go('parent-link'));
    document.getElementById('parGoLinkMore')?.addEventListener('click', () => App.go('parent-link'));

    document.querySelectorAll('.par-student-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        App._parentViewingStudentId = btn.dataset.studentId;
        App.go('parent-dashboard');
      });
    });

    document.getElementById('parExportPDF')?.addEventListener('click', () => {
      const u = Roles.current();
      const s = Storage.get();
      const viewId = App._parentViewingStudentId || u?.linkedStudentIds?.[0];
      if (!viewId) return;
      const student  = s.users[viewId];
      const sessions = _getSessions(viewId);
      const insights = _generateInsights(sessions, student);
      _exportPDF(student, sessions, insights);
    });

    document.getElementById('parExportCSV')?.addEventListener('click', () => {
      const u = Roles.current();
      const s = Storage.get();
      const viewId = App._parentViewingStudentId || u?.linkedStudentIds?.[0];
      if (!viewId) return;
      _exportCSV(s.users[viewId], _getSessions(viewId));
    });
  }

  // ── Registro de pantallas ─────────────────────────────────────────────────

  return {
    screens: {
      'parent-link':      { render: screenParentLink,      wire: wireParentLink },
      'parent-dashboard': { render: screenParentDashboard, wire: wireParentDashboard }
    }
  };
})();
