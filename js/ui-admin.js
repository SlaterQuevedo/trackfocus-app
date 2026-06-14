// Pantallas del Super Admin.
const UIAdmin = (() => {

  const root = () => document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // ---- Helpers visuales (CSS puro, sin librerías) ----
  function _spark(data, color) {
    const m = Math.max(1, ...data);
    return `<div style="display:flex;align-items:flex-end;gap:1.5px;height:26px;margin-top:6px;">${
      data.map(v => `<div style="flex:1;background:${color};border-radius:1px 1px 0 0;height:${Math.max(6, Math.round(v/m*100))}%;opacity:0.75;transition:height .2s;"></div>`).join('')
    }</div>`;
  }
  function _hbar(pct, color) {
    return `<div style="background:rgba(255,255,255,0.06);border-radius:4px;height:5px;overflow:hidden;margin-top:6px;"><div style="width:${Math.min(100, Math.max(0, pct))}%;height:100%;background:${color};border-radius:4px;"></div></div>`;
  }
  function _vbars(data, colors, labels) {
    const m = Math.max(1, ...data);
    return `<div style="display:flex;align-items:flex-end;gap:6px;height:88px;">
      ${data.map((v, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="font-size:9px;color:var(--muted);">${v || ''}</div>
        <div style="width:100%;background:${colors[i] || 'var(--accent)'};border-radius:3px 3px 0 0;height:${Math.max(4, Math.round(v/m*72))}px;opacity:0.85;"></div>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:6px;margin-top:4px;">${
      labels.map(l => `<div style="flex:1;text-align:center;font-size:9px;color:var(--muted);">${l}</div>`).join('')
    }</div>`;
  }

  // ---- Pantalla: Dashboard del Super Admin (Centro de Operaciones) ----
  function screenAdminDashboard() {
    const s = Storage.get();
    const schools    = Schools.listSchools();
    const allUsers   = Object.values(s.users);
    const students   = allUsers.filter(u => u.role === 'student');
    const teachers   = allUsers.filter(u => u.role === 'teacher');
    const sessions   = s.sessions || [];
    const classrooms = Object.values(s.classrooms || {});
    const now = new Date();

    // ── Cálculos base ──
    const totalMin = sessions.reduce((a, b) => a + (b.durationMin || 0), 0);
    const avgConc  = sessions.length
      ? (sessions.reduce((a, b) => a + b.concentration, 0) / sessions.length)
      : 0;

    const from7  = new Date(now); from7.setDate(now.getDate() - 7);
    const from14 = new Date(now); from14.setDate(now.getDate() - 14);
    const sessWeek     = sessions.filter(se => new Date(se.datetime) >= from7);
    const sessLastWeek = sessions.filter(se => {
      const d = new Date(se.datetime); return d >= from14 && d < from7;
    });
    const weekDelta = sessLastWeek.length
      ? Math.round((sessWeek.length - sessLastWeek.length) / sessLastWeek.length * 100)
      : sessWeek.length > 0 ? 100 : 0;

    // ── Serie semanal (últimas 8 semanas) ──
    const weeklyData = [];
    for (let i = 7; i >= 0; i--) {
      const e = new Date(now); e.setDate(now.getDate() - i * 7);
      const st = new Date(e); st.setDate(e.getDate() - 7);
      weeklyData.push(sessions.filter(se => { const d = new Date(se.datetime); return d > st && d <= e; }).length);
    }
    const weekLabels = ['S-7','S-6','S-5','S-4','S-3','S-2','S-1','Hoy'];

    // ── Distribución de concentración (1–5) ──
    const concBuckets = [0,0,0,0,0];
    sessions.forEach(se => {
      const b = Math.min(4, Math.max(0, Math.round(se.concentration) - 1));
      concBuckets[b]++;
    });

    // ── Stats por colegio ──
    const schoolRows = schools.map(sc => {
      const stats = Schools.getSchoolStats(sc.id);
      const dir = (sc.adminIds || []).map(id => s.users[id]?.name).filter(Boolean)[0] || '—';
      const status = stats.sessionCount > 0 ? 'Activo'
        : stats.studentCount > 0 ? 'Nuevo' : 'Sin alumnos';
      return { ...sc, ...stats, directorName: dir, status };
    });

    const ranking = [...schoolRows].sort((a, b) => b.sessionCount - a.sessionCount).slice(0, 6);
    const maxRank = Math.max(1, ...ranking.map(r => r.sessionCount));

    // ── Alertas ──
    const alertInactive   = schoolRows.filter(sc => sc.studentCount > 0 && sc.sessionCount === 0);
    const alertLowConc    = schoolRows.filter(sc => { const c = parseFloat(sc.avgConcentration); return !isNaN(c) && c < 3 && c > 0; });
    const alertSuspended  = allUsers.filter(u => u.suspended);
    const alertNoSess     = students.filter(u => {
      const us = sessions.filter(se => se.email === u.id);
      if (!us.length) return true;
      return (now - new Date(us[us.length-1].datetime)) > 7 * 86400000;
    });

    // ── Usuarios recientes ──
    const recentUsers = allUsers
      .filter(u => u.role !== 'super_admin')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);

    const trendBadge = (v) => v > 0
      ? `<span style="color:#22c55e;font-size:10px;">▲ ${v}%</span>`
      : v < 0
        ? `<span style="color:#ef4444;font-size:10px;">▼ ${Math.abs(v)}%</span>`
        : `<span style="color:var(--muted);font-size:10px;">—</span>`;

    return `
<style>
  .ops-wrap { display:flex; flex-direction:column; gap:14px; }
  .ops-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; }
  .ops-strip { display:flex; gap:10px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
  .ops-strip::-webkit-scrollbar { display:none; }
  .ops-kpi { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 16px; min-width:130px; flex:1; position:relative; overflow:hidden; }
  .ops-kpi::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(139,92,246,.04),transparent); pointer-events:none; }
  .ops-kpi-v { font-size:24px; font-weight:800; line-height:1; letter-spacing:-0.5px; }
  .ops-kpi-l { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin-top:2px; }
  .ops-kpi-sub { font-size:10px; margin-top:2px; }
  .ops-2col { display:grid; grid-template-columns:1fr 320px; gap:14px; }
  .ops-row2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .ops-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .ops-card-body { padding:16px; }
  .ops-card-hd { padding:12px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
  .ops-label { font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted); font-weight:600; }
  .ops-status { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; letter-spacing:.3px; }
  .ops-status-a { background:rgba(34,197,94,.14); color:#22c55e; }
  .ops-status-n { background:rgba(245,158,11,.14); color:#f59e0b; }
  .ops-status-s { background:rgba(100,100,100,.15); color:var(--muted); }
  .ops-alert-row { display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid var(--border); }
  .ops-alert-row:last-child { border-bottom:none; padding-bottom:0; }
  .ops-rank-item { margin-bottom:9px; }
  .ops-rank-label { display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px; }
  @media(max-width:900px){ .ops-2col,.ops-row2 { grid-template-columns:1fr; } }
</style>

<div class="ops-wrap">

  <!-- Header -->
  <div class="ops-header">
    <div>
      <h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:-.3px;">⚙️ Centro de Operaciones</h1>
      <p class="muted" style="margin:3px 0 0;font-size:12px;">${now.toLocaleDateString('es-PE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} · TrackFocus Admin</p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="primary" data-go="manage-schools">+ Crear colegio</button>
      <button class="ghost" data-go="manage-users">Gestionar usuarios</button>
      <button class="ghost" id="btnDiagLog">🩺 Diagnóstico</button>
    </div>
  </div>

  <!-- KPI Strip -->
  <div class="ops-strip">
    <div class="ops-kpi">
      <div class="ops-kpi-v" style="color:var(--accent-2);">${schools.length}</div>
      <div class="ops-kpi-l">Colegios</div>
      ${_hbar(schools.length ? 100 : 0, 'var(--accent)')}
    </div>
    <div class="ops-kpi">
      <div class="ops-kpi-v" style="color:var(--accent-2);">${classrooms.length}</div>
      <div class="ops-kpi-l">Aulas activas</div>
      ${_hbar(schools.length ? Math.min(100, classrooms.length / Math.max(1, schools.length * 5) * 100) : 0, 'var(--accent)')}
    </div>
    <div class="ops-kpi">
      <div class="ops-kpi-v">${students.length}</div>
      <div class="ops-kpi-l">Estudiantes</div>
      ${_spark(weeklyData.map(w => w > 0 ? students.length : 0).fill(students.length), 'var(--primary)')}
    </div>
    <div class="ops-kpi">
      <div class="ops-kpi-v">${teachers.length}</div>
      <div class="ops-kpi-l">Docentes</div>
      ${_hbar(teachers.length / Math.max(1, students.length) * 100 * 5, 'var(--primary)')}
    </div>
    <div class="ops-kpi">
      <div class="ops-kpi-v">${sessions.length.toLocaleString()}</div>
      <div class="ops-kpi-l">Sesiones totales</div>
      ${_spark(weeklyData, 'var(--accent)')}
    </div>
    <div class="ops-kpi">
      <div class="ops-kpi-v">${sessWeek.length}</div>
      <div class="ops-kpi-l">Sesiones esta semana</div>
      <div class="ops-kpi-sub">${trendBadge(weekDelta)} vs semana anterior</div>
      ${_spark(weeklyData.slice(-4), 'var(--good)')}
    </div>
    <div class="ops-kpi">
      <div class="ops-kpi-v">${sessions.length ? avgConc.toFixed(1) + '/5' : '—'}</div>
      <div class="ops-kpi-l">Concentración prom.</div>
      ${_hbar(sessions.length ? avgConc / 5 * 100 : 0, avgConc >= 4 ? '#22c55e' : avgConc >= 3 ? 'var(--primary)' : '#ef4444')}
    </div>
    <div class="ops-kpi">
      <div class="ops-kpi-v">${Math.round(totalMin / 60).toLocaleString()} h</div>
      <div class="ops-kpi-l">Horas estudiadas</div>
      ${_spark(weeklyData.map(w => w * 25), '#a78bfa')}
    </div>
  </div>

  <!-- Main 2-col -->
  <div class="ops-2col">

    <!-- Left: Centro de Control Institucional -->
    <div class="ops-card">
      <div class="ops-card-hd">
        <div>
          <div class="ops-label">Centro de Control Institucional</div>
          <span style="font-size:12px;color:var(--muted);">${schools.length} colegio${schools.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      ${schools.length === 0
        ? '<div style="padding:32px;text-align:center;color:var(--muted);font-size:13px;">Sin colegios registrados. Usa el botón superior para crear el primero.</div>'
        : `<div style="overflow-x:auto;">
        <table class="table" style="font-size:12px;">
          <thead><tr>
            <th>Colegio</th><th>Código</th><th>Director</th><th>Aulas</th><th>Alumnos</th><th>Sesiones</th><th>Conc.</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            ${schoolRows.map(sc => `<tr>
              <td><strong style="font-size:13px;">${esc(sc.name)}</strong></td>
              <td><code style="background:rgba(139,92,246,.12);color:var(--accent-2);padding:2px 6px;border-radius:4px;font-size:11px;">${sc.code}</code></td>
              <td class="muted">${esc(sc.directorName)}</td>
              <td>${sc.classroomCount}</td>
              <td>${sc.studentCount}</td>
              <td>${sc.sessionCount}</td>
              <td>${sc.avgConcentration !== '—' ? sc.avgConcentration + '/5' : '—'}</td>
              <td><span class="ops-status ${sc.status === 'Activo' ? 'ops-status-a' : sc.status === 'Nuevo' ? 'ops-status-n' : 'ops-status-s'}">${sc.status}</span></td>
              <td>
                <button class="ghost" style="padding:3px 8px;font-size:11px;" data-go="manage-schools" data-sid="${esc(sc.id)}">Editar</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
        </div>`}
    </div>

    <!-- Right: Alertas + Ranking -->
    <div style="display:flex;flex-direction:column;gap:14px;">

      <!-- Alertas del sistema -->
      <div class="ops-card ops-card-body">
        <div class="ops-label" style="margin-bottom:12px;">Alertas del sistema</div>
        <div class="ops-alert-row">
          <div>
            <div style="font-size:13px;font-weight:600;">⚠️ Colegios sin actividad</div>
            <div style="font-size:11px;color:var(--muted);">Con alumnos, sin sesiones</div>
          </div>
          <span style="font-size:18px;font-weight:800;color:${alertInactive.length > 0 ? '#f59e0b' : '#22c55e'};">${alertInactive.length}</span>
        </div>
        <div class="ops-alert-row">
          <div>
            <div style="font-size:13px;font-weight:600;">📉 Concentración baja</div>
            <div style="font-size:11px;color:var(--muted);">Colegios con prom. &lt; 3/5</div>
          </div>
          <span style="font-size:18px;font-weight:800;color:${alertLowConc.length > 0 ? '#ef4444' : '#22c55e'};">${alertLowConc.length}</span>
        </div>
        <div class="ops-alert-row">
          <div>
            <div style="font-size:13px;font-weight:600;">😴 Usuarios inactivos</div>
            <div style="font-size:11px;color:var(--muted);">Sin sesiones en 7+ días</div>
          </div>
          <span style="font-size:18px;font-weight:800;color:${alertNoSess.length > 3 ? '#f59e0b' : '#22c55e'};">${alertNoSess.length}</span>
        </div>
        <div class="ops-alert-row">
          <div>
            <div style="font-size:13px;font-weight:600;">🔴 Cuentas suspendidas</div>
            <div style="font-size:11px;color:var(--muted);">Acceso bloqueado</div>
          </div>
          <span style="font-size:18px;font-weight:800;color:${alertSuspended.length > 0 ? '#ef4444' : '#22c55e'};">${alertSuspended.length}</span>
        </div>
      </div>

      <!-- Ranking de colegios -->
      ${ranking.length > 0 ? `
      <div class="ops-card ops-card-body">
        <div class="ops-label" style="margin-bottom:12px;">Ranking por sesiones</div>
        ${ranking.map((r, i) => `
          <div class="ops-rank-item">
            <div class="ops-rank-label">
              <span style="font-weight:${i === 0 ? 700 : 400};">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1)+'.'} ${esc(r.name)}</span>
              <span style="color:var(--muted);font-size:11px;">${r.sessionCount} ses.</span>
            </div>
            <div style="background:rgba(255,255,255,.06);border-radius:4px;height:5px;overflow:hidden;">
              <div style="width:${Math.round(r.sessionCount/maxRank*100)}%;height:100%;background:${i===0?'var(--primary)':i===1?'var(--accent-2)':'rgba(139,92,246,.45)'};border-radius:4px;"></div>
            </div>
          </div>`).join('')}
      </div>` : ''}
    </div>
  </div>

  <!-- Analytics row -->
  <div class="ops-row2">

    <!-- Weekly growth bars -->
    <div class="ops-card ops-card-body">
      <div class="ops-label" style="margin-bottom:12px;">Crecimiento semanal — sesiones registradas</div>
      ${_vbars(
        weeklyData,
        weeklyData.map((_, i) => i === weeklyData.length-1 ? 'var(--primary)' : 'rgba(139,92,246,.55)'),
        weekLabels
      )}
    </div>

    <!-- Concentration distribution -->
    <div class="ops-card ops-card-body">
      <div class="ops-label" style="margin-bottom:12px;">Distribución de concentración global</div>
      ${_vbars(
        concBuckets,
        ['#ef4444','#f97316','#f59e0b','#22c55e','#10b981'],
        ['1★','2★','3★','4★','5★']
      )}
      ${sessions.length === 0 ? '<p class="muted" style="font-size:12px;text-align:center;margin:8px 0 0;">Sin sesiones registradas aún.</p>' : ''}
    </div>
  </div>

  <!-- Usuarios recientes -->
  <div class="ops-card">
    <div class="ops-card-hd">
      <div class="ops-label">Usuarios registrados recientemente</div>
      <button class="ghost" style="font-size:12px;padding:4px 12px;" data-go="manage-users">Ver todos →</button>
    </div>
    ${recentUsers.length === 0
      ? '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">Sin usuarios registrados.</div>'
      : `<div style="overflow-x:auto;">
      <table class="table" style="font-size:12px;">
        <thead><tr>
          <th>Nombre</th><th>Email</th><th>Rol</th><th>Colegio</th><th>Aula</th><th>Estado</th><th>Registrado</th>
        </tr></thead>
        <tbody>
          ${recentUsers.map(u => {
            const rolLabel = { student: 'Estudiante', teacher: 'Docente', super_admin: 'Admin' }[u.role] || u.role;
            const schoolName = u.schoolId ? (s.schools[u.schoolId]?.name || '—') : '—';
            const crName = u.classroomId ? (s.classrooms[u.classroomId]?.name || '—') : '—';
            let badge = '—';
            if (u.suspended) badge = '<span class="ops-status" style="background:rgba(239,68,68,.12);color:#ef4444;">Suspendido</span>';
            else if (u.approvalStatus === 'pending') badge = '<span class="ops-status ops-status-n">Pendiente</span>';
            else if (u.approvalStatus === 'approved' || u.classroomId) badge = '<span class="ops-status ops-status-a">Activo</span>';
            return `<tr>
              <td><strong>${esc(u.name)}</strong></td>
              <td class="muted">${esc(u.email)}</td>
              <td><span class="chip" style="font-size:10px;">${rolLabel}</span></td>
              <td class="muted">${esc(schoolName)}</td>
              <td class="muted">${esc(crName)}</td>
              <td>${badge}</td>
              <td class="muted">${new Date(u.createdAt).toLocaleDateString('es-PE')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>`}
  </div>

</div>`;
  }

  function wireAdminDashboard() {
    root().querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.sid;
        if (sid) App._editSchoolId = sid;
        App.go(btn.dataset.go);
      });
    });
    document.getElementById('btnDiagLog')?.addEventListener('click', () => {
      try { window.Monitor?.exportLog?.(); UI.flash('Registro de errores exportado.', 'success'); }
      catch (_) { UI.flash('No se pudo exportar el registro.', 'error'); }
    });
    root().querySelectorAll('[data-del-school]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delSchool;
        const name = btn.dataset.name;
        if (!confirm(`¿Eliminar el colegio "${name}" y todos sus datos? Esta acción no se puede deshacer.`)) return;
        Schools.deleteSchool(id);
        App.go('admin-dashboard');
        UI.flash('Colegio eliminado.', 'success');
      });
    });
  }

  // ---- Pantalla: Gestión de Colegios ----
  function screenManageSchools() {
    const s = Storage.get();
    const schools = Schools.listSchools();
    const editId = App._editSchoolId;
    const editSchool = editId ? s.schools[editId] : null;
    const classrooms = editId ? Schools.listClassrooms(editId) : [];
    const schoolStudents = editId ? Schools.listStudentsInSchool(editId) : [];

    const studentsSection = (editSchool && schoolStudents.length > 0) ? `
      <div class="card" style="padding:0;overflow:auto;">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;">Estudiantes — ${esc(editSchool.name)}</h3>
          <span class="chip">${schoolStudents.length} alumno${schoolStudents.length !== 1 ? 's' : ''}</span>
        </div>
        <table class="table">
          <thead><tr>
            <th>Nombre</th><th>Email</th><th>Aula actual</th><th>Asignar / Quitar</th>
          </tr></thead>
          <tbody>
            ${schoolStudents.map(st => {
              const currentCr = st.classroomId ? (s.classrooms[st.classroomId]?.name || '—') : '—';
              return `<tr>
                <td><strong>${esc(st.name)}</strong></td>
                <td class="muted" style="font-size:12px;">${esc(st.email)}</td>
                <td>${esc(currentCr)}</td>
                <td>
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    ${classrooms.length > 0 ? `
                    <select class="st-cr-select" data-st-id="${esc(st.id)}" style="font-size:12px;padding:4px 6px;">
                      <option value="">Sin aula</option>
                      ${classrooms.map(cr => `<option value="${esc(cr.id)}"${st.classroomId === cr.id ? ' selected' : ''}>${esc(cr.name)}</option>`).join('')}
                    </select>
                    <button class="ghost" style="font-size:12px;padding:4px 10px;" data-assign-student="${esc(st.id)}">Asignar</button>`
                    : '<span class="muted" style="font-size:12px;">Sin aulas creadas</span>'}
                    ${st.classroomId ? `<button class="ghost" style="font-size:12px;padding:4px 10px;color:#f59e0b;" data-remove-student="${esc(st.id)}" data-remove-from="${esc(st.classroomId)}">Quitar del aula</button>` : ''}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : (editSchool ? `
      <div class="card" style="text-align:center;padding:18px;color:var(--muted);">
        <span style="font-size:13px;">Aún no hay estudiantes vinculados a este colegio.</span>
      </div>` : '');

    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <button class="ghost" data-go="admin-dashboard">← Volver</button>
        <h1 style="margin:0;">Gestión de Colegios</h1>
      </div>

      <div class="card">
        <h3 style="margin:0 0 14px;">${editSchool ? `Editando: ${esc(editSchool.name)}` : 'Crear nuevo colegio'}</h3>
        <form id="schoolForm">
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
            <div class="field" style="flex:2;min-width:200px;">
              <label>Nombre del colegio</label>
              <input name="name" placeholder="Ej. Colegio Trilce, I.E. San Martín…" value="${editSchool ? esc(editSchool.name) : ''}" required />
            </div>
            ${editSchool ? `
            <div class="field" style="flex:1;min-width:150px;">
              <label>Código de colegio</label>
              <div style="display:flex;gap:6px;">
                <input name="schoolCode" maxlength="6" value="${esc(editSchool.code)}" style="text-transform:uppercase;font-family:monospace;letter-spacing:2px;flex:1;" />
                <button type="button" id="btnRegenSchoolCode" class="ghost" title="Generar código automático" style="padding:8px 12px;">↻</button>
              </div>
            </div>` : ''}
            <div style="display:flex;gap:8px;padding-bottom:1px;">
              <button class="primary" type="submit">${editSchool ? 'Guardar cambios' : 'Crear colegio'}</button>
              ${editSchool ? '<button type="button" class="ghost" data-go="manage-schools" id="cancelEdit">Cancelar</button>' : ''}
            </div>
          </div>
          ${editSchool ? '<p class="muted" style="font-size:11px;margin:8px 0 0;">⚠ Cambiar el código invalida los accesos anteriores de docentes y estudiantes.</p>' : ''}
        </form>
      </div>

      ${editSchool ? `
      <div class="card">
        <h3 style="margin:0 0 12px;">+ Nueva aula en ${esc(editSchool.name)}</h3>
        <form id="createClassroomForm" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
          <div class="field" style="flex:1;min-width:90px;margin-bottom:0;">
            <label>Grado</label>
            <input name="grade" placeholder="Ej: 5°" maxlength="10" required />
          </div>
          <div class="field" style="flex:1;min-width:90px;margin-bottom:0;">
            <label>Sección</label>
            <input name="section" placeholder="Ej: A" maxlength="10" required />
          </div>
          <button class="primary" type="submit" style="flex-shrink:0;">Crear aula</button>
        </form>
      </div>` : ''}

      ${editSchool ? `
      <div class="card" style="padding:0;overflow:auto;">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;">Aulas — ${esc(editSchool.name)}</h3>
          <span class="chip">${classrooms.length} aula${classrooms.length !== 1 ? 's' : ''}</span>
        </div>
        ${classrooms.length === 0
          ? '<div class="empty muted" style="padding:18px 16px;font-size:13px;">Sin aulas creadas. Usa el formulario de arriba para crear la primera.</div>'
          : `<table class="table">
          <thead><tr>
            <th>Aula</th><th>Código de acceso</th><th>Alumnos</th><th>Docentes</th><th></th>
          </tr></thead>
          <tbody>
            ${classrooms.map(cr => `<tr>
              <td><strong>${esc(cr.name)}</strong></td>
              <td>
                <div style="display:flex;gap:6px;align-items:center;">
                  <input class="cr-code-input" data-cr-id="${esc(cr.id)}" value="${esc(cr.inviteCode)}" maxlength="8"
                    style="font-family:monospace;font-size:12px;letter-spacing:1px;width:110px;text-transform:uppercase;padding:4px 8px;" />
                  <button class="ghost" style="padding:4px 10px;font-size:12px;" data-save-cr-code="${esc(cr.id)}">✓ Guardar</button>
                  <button class="ghost" style="padding:4px 10px;font-size:12px;" data-regen-cr="${esc(cr.id)}">↻ Auto</button>
                </div>
              </td>
              <td>${(cr.studentIds || []).length}</td>
              <td>${(cr.teacherIds || []).length}</td>
              <td><button class="danger" style="padding:4px 10px;font-size:12px;" data-del-cr="${esc(cr.id)}" data-del-cr-name="${esc(cr.name)}">Eliminar</button></td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>` : ''}

      ${studentsSection}

      <div class="card" style="padding:0;overflow:auto;">
        <div style="padding:16px;border-bottom:1px solid var(--border);">
          <h3 style="margin:0;">Todos los colegios</h3>
        </div>
        ${schools.length === 0 ? '<div class="empty">No hay colegios creados.</div>' : `
        <table class="table">
          <thead><tr>
            <th>Colegio</th><th>Código</th><th>Alumnos</th><th>Aulas</th><th>Sesiones</th><th>Creado</th><th></th>
          </tr></thead>
          <tbody>
            ${schools.map(sc => {
              const stats = Schools.getSchoolStats(sc.id);
              return `<tr>
                <td><strong>${esc(sc.name)}</strong></td>
                <td><span class="chip" style="font-family:monospace;">${sc.code}</span></td>
                <td>${stats.studentCount}</td>
                <td>${stats.classroomCount}</td>
                <td>${stats.sessionCount}</td>
                <td>${new Date(sc.createdAt).toLocaleDateString('es-PE')}</td>
                <td>
                  <button class="ghost" data-edit="${esc(sc.id)}">Editar</button>
                  <button class="danger" data-del="${esc(sc.id)}" data-name="${esc(sc.name)}">Eliminar</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`}
      </div>`;
  }

  function wireManageSchools() {
    root().querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.id === 'cancelEdit') App._editSchoolId = null;
        App.go(btn.dataset.go);
      });
    });

    document.getElementById('btnRegenSchoolCode')?.addEventListener('click', () => {
      const input = document.querySelector('[name="schoolCode"]');
      if (!input) return;
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      input.value = code;
    });

    document.getElementById('schoolForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = fd.get('name').trim();
      if (!name) return;
      const editId = App._editSchoolId;
      if (editId) {
        Schools.updateSchool(editId, name);
        const newCode = (fd.get('schoolCode') || '').trim().toUpperCase();
        if (newCode) {
          try { Schools.updateSchoolCode(editId, newCode); }
          catch (err) { UI.flash(err.message, 'error'); return; }
        }
        try { Storage.flush?.(); } catch (_) {}
        App._editSchoolId = null;
        UI.flash('Colegio actualizado correctamente.', 'success');
      } else {
        const sc = Schools.createSchool(name);
        try { Storage.flush?.(); } catch (_) {}
        UI.flash(`Colegio "${sc.name}" creado. Código: ${sc.code}`, 'success');
      }
      App.go('manage-schools');
    });

    document.getElementById('createClassroomForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const grade = fd.get('grade').trim();
      const section = fd.get('section').trim();
      if (!grade || !section) return;
      const editId = App._editSchoolId;
      if (!editId) return;
      const cr = Schools.createClassroom(editId, grade, section);
      try { Storage.flush?.(); } catch (_) {}
      UI.flash(`Aula "${cr.name}" creada. Código: ${cr.inviteCode}`, 'success');
      App.go('manage-schools');
    });

    root().querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => { App._editSchoolId = btn.dataset.edit; App.go('manage-schools'); });
    });

    root().querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm(`¿Eliminar "${btn.dataset.name}"? Esta acción es irreversible.`)) return;
        Schools.deleteSchool(btn.dataset.del);
        try { Storage.flush?.(); } catch (_) {}
        App.go('manage-schools');
        UI.flash('Colegio eliminado.', 'success');
      });
    });

    root().querySelectorAll('[data-save-cr-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        const crId = btn.dataset.saveCrCode;
        const input = root().querySelector(`.cr-code-input[data-cr-id="${crId}"]`);
        if (!input) return;
        try {
          Schools.updateClassroomCode(crId, input.value);
          try { Storage.flush?.(); } catch (_) {}
          UI.flash('Código de aula actualizado.', 'success');
          App.go('manage-schools');
        } catch (err) { UI.flash(err.message, 'error'); }
      });
    });

    root().querySelectorAll('[data-regen-cr]').forEach(btn => {
      btn.addEventListener('click', () => {
        const crId = btn.dataset.regenCr;
        const newCode = Schools.regenerateInviteCode(crId);
        try { Storage.flush?.(); } catch (_) {}
        const input = root().querySelector(`.cr-code-input[data-cr-id="${crId}"]`);
        if (input) input.value = newCode;
        UI.flash(`Nuevo código generado: ${newCode}`, 'success');
      });
    });

    root().querySelectorAll('[data-del-cr]').forEach(btn => {
      btn.addEventListener('click', () => {
        const crId = btn.dataset.delCr;
        const name = btn.dataset.delCrName;
        if (!confirm(`¿Eliminar el aula "${name}"?\n\nLos alumnos asignados quedarán sin aula pero permanecerán en el colegio.`)) return;
        Schools.deleteClassroom(crId);
        try { Storage.flush?.(); } catch (_) {}
        UI.flash('Aula eliminada.', 'success');
        App.go('manage-schools');
      });
    });

    root().querySelectorAll('[data-assign-student]').forEach(btn => {
      btn.addEventListener('click', () => {
        const studentId = btn.dataset.assignStudent;
        const select = root().querySelector(`.st-cr-select[data-st-id="${studentId}"]`);
        const classroomId = select?.value;
        if (!classroomId) { UI.flash('Selecciona un aula primero.', 'error'); return; }
        Schools.addStudentToClassroom(studentId, classroomId);
        try { Storage.flush?.(); } catch (_) {}
        UI.flash('Estudiante asignado correctamente.', 'success');
        App.go('manage-schools');
      });
    });

    root().querySelectorAll('[data-remove-student]').forEach(btn => {
      btn.addEventListener('click', () => {
        const studentId = btn.dataset.removeStudent;
        const classroomId = btn.dataset.removeFrom;
        if (!confirm('¿Quitar a este estudiante del aula? Permanecerá en el colegio.')) return;
        Schools.removeStudentFromClassroom(studentId, classroomId);
        try { Storage.flush?.(); } catch (_) {}
        UI.flash('Estudiante removido del aula.', 'success');
        App.go('manage-schools');
      });
    });
  }

  // ---- Pantalla: Gestión de Usuarios ----
  function screenManageUsers() {
    const s = Storage.get();
    const filterRole = App._userFilterRole || '';
    const filterSchool = App._userFilterSchool || '';

    let users = Object.values(s.users).filter(u => u.id !== 'superadmin');
    if (filterRole) users = users.filter(u => u.role === filterRole);
    if (filterSchool) users = users.filter(u => u.schoolId === filterSchool);
    users.sort((a, b) => a.name.localeCompare(b.name));

    const schools = Schools.listSchools();
    const ROLE_LABELS = { student: 'Estudiante', teacher: 'Docente', super_admin: 'Super Admin' };

    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <button class="ghost" data-go="admin-dashboard">← Volver</button>
        <h1 style="margin:0;">Gestión de Usuarios</h1>
      </div>

      <div class="toolbar" style="margin-bottom:16px;">
        <div class="filters">
          <select id="filterRole">
            <option value="">Todos los roles</option>
            <option value="student" ${filterRole === 'student' ? 'selected' : ''}>Estudiantes</option>
            <option value="teacher" ${filterRole === 'teacher' ? 'selected' : ''}>Docentes</option>
          </select>
          <select id="filterSchool">
            <option value="">Todos los colegios</option>
            ${schools.map(sc => `<option value="${sc.id}" ${filterSchool === sc.id ? 'selected' : ''}>${esc(sc.name)}</option>`).join('')}
          </select>
          <button class="ghost" id="applyFilter">Aplicar filtros</button>
        </div>
        <span class="muted">${users.length} usuario${users.length === 1 ? '' : 's'}</span>
      </div>

      <div class="card" style="padding:0;overflow:auto;">
        ${users.length === 0 ? '<div class="empty">No hay usuarios con esos filtros.</div>' : `
        <table class="table">
          <thead><tr>
            <th>Nombre</th><th>Email</th><th>Rol</th><th>Colegio</th><th>Aula</th><th>Estado</th><th>Registrado</th><th></th>
          </tr></thead>
          <tbody>
            ${users.map(u => {
              const school = u.schoolId ? s.schools[u.schoolId]?.name : '—';
              const classroom = u.classroomId ? s.classrooms[u.classroomId]?.name : '—';
              let statusBadge = '';
              if (u.suspended) {
                statusBadge = '<span class="chip" style="background:rgba(239,68,68,0.15);color:#ef4444;font-size:11px;">Suspendido</span>';
              } else if (u.role === 'student') {
                if (u.approvalStatus === 'pending')  statusBadge = '<span class="pending-badge">Pendiente</span>';
                else if (u.approvalStatus === 'rejected') statusBadge = '<span class="rejected-badge">Rechazada</span>';
                else if (u.approvalStatus === 'approved' || u.classroomId) statusBadge = '<span class="approved-badge">Activo</span>';
              }
              return `<tr style="${u.suspended ? 'opacity:0.6;' : ''}">
                <td><strong>${esc(u.name)}</strong></td>
                <td class="muted">${esc(u.email)}</td>
                <td><span class="chip">${ROLE_LABELS[u.role] || u.role}</span></td>
                <td>${esc(school || '—')}</td>
                <td>${esc(classroom || '—')}</td>
                <td>${statusBadge || '—'}</td>
                <td>${new Date(u.createdAt).toLocaleDateString('es-PE')}</td>
                <td style="white-space:nowrap;">
                  ${u.suspended
                    ? `<button class="ghost" style="color:#22c55e;font-size:12px;padding:4px 10px;margin-right:4px;" data-reactivate-user="${esc(u.id)}">Reactivar</button>`
                    : `<button class="ghost" style="color:#f59e0b;font-size:12px;padding:4px 10px;margin-right:4px;" data-suspend-user="${esc(u.id)}" data-suspend-name="${esc(u.name)}">Suspender</button>`}
                  <button class="danger" style="font-size:12px;padding:4px 10px;" data-del-user="${esc(u.id)}" data-del-name="${esc(u.name)}">Eliminar</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`}
      </div>`;
  }

  function wireManageUsers() {
    root().querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => App.go(btn.dataset.go)));

    document.getElementById('applyFilter')?.addEventListener('click', () => {
      App._userFilterRole = document.getElementById('filterRole')?.value || '';
      App._userFilterSchool = document.getElementById('filterSchool')?.value || '';
      App.go('manage-users');
    });

    root().querySelectorAll('[data-suspend-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.suspendUser;
        const name = btn.dataset.suspendName;
        if (!confirm(`¿Suspender temporalmente a "${name}"?\n\nSu cuenta quedará desactivada pero todos sus datos y progreso se conservarán. Puedes reactivarla en cualquier momento.`)) return;
        Storage.set(st => {
          if (st.users[id]) { st.users[id].suspended = true; st.users[id].suspendedAt = new Date().toISOString(); }
        });
        try { Storage.flush?.(); } catch (_) {}
        App.go('manage-users');
        UI.flash(`"${name}" suspendido temporalmente.`, 'success');
      });
    });

    root().querySelectorAll('[data-reactivate-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.reactivateUser;
        Storage.set(st => {
          if (st.users[id]) { delete st.users[id].suspended; delete st.users[id].suspendedAt; }
        });
        try { Storage.flush?.(); } catch (_) {}
        App.go('manage-users');
        UI.flash('Usuario reactivado correctamente.', 'success');
      });
    });

    root().querySelectorAll('[data-del-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delUser;
        const name = btn.dataset.delName;
        const s = Storage.get();
        const user = s.users[id];
        if (!user) return;
        if (!confirm(`⚠️ ¿Eliminar permanentemente a "${name}"?\n\nEsto eliminará su cuenta y TODOS sus datos. Esta acción NO se puede deshacer.\n\nSi solo quieres desactivar la cuenta, usa "Suspender".`)) return;
        Storage.set(st => {
          if (st.users[id]?.classroomId && st.classrooms[st.users[id].classroomId]) {
            st.classrooms[st.users[id].classroomId].studentIds =
              (st.classrooms[st.users[id].classroomId].studentIds || []).filter(x => x !== id);
          }
          if (st.classroomRequests) {
            Object.keys(st.classroomRequests).forEach(rid => {
              if (st.classroomRequests[rid].studentId === id) delete st.classroomRequests[rid];
            });
          }
          delete st.users[id];
        });
        try { Storage.flush?.(); } catch (_) {}
        App.go('manage-users');
        UI.flash('Usuario eliminado permanentemente.', 'success');
      });
    });
  }

  const _wrap = (typeof window !== 'undefined' && window.__tfSafeScreens) || ((n, s) => s);
  return {
    screens: _wrap('admin', {
      'admin-dashboard': { render: screenAdminDashboard, wire: wireAdminDashboard },
      'manage-schools':  { render: screenManageSchools,  wire: wireManageSchools },
      'manage-users':    { render: screenManageUsers,    wire: wireManageUsers }
    })
  };
})();
