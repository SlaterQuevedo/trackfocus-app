// Pantallas del Super Admin.
const UIAdmin = (() => {

  const root = () => document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // ── Sparkline CSS puro ──
  function _spark(data, color) {
    const m = Math.max(1, ...data);
    return `<div style="display:flex;align-items:flex-end;gap:1.5px;height:28px;margin-top:8px;">
      ${data.map(v => `<div style="flex:1;background:${color};border-radius:1px 1px 0 0;height:${Math.max(8,Math.round(v/m*100))}%;opacity:0.6;"></div>`).join('')}
    </div>`;
  }

  function _weeklyData(sessions, weeks) {
    if (weeks === undefined) weeks = 8;
    const now = new Date();
    const out = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const e = new Date(now); e.setDate(now.getDate() - i * 7);
      const st = new Date(e); st.setDate(e.getDate() - 7);
      out.push(sessions.filter(function(se) { const d = new Date(se.datetime); return d > st && d <= e; }).length);
    }
    return out;
  }

  // ── CSS compartido del panel Colegios ──
  const _CSS = `
<style>
  /* ── ColegiosPanel ── */
  .cp-wrap { display:flex; flex-direction:column; gap:16px; }
  .cp-hd { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; }
  .cp-hd-left h1 { margin:0; font-size:22px; font-weight:800; letter-spacing:-.4px; }
  .cp-hd-left p { margin:4px 0 0; font-size:12px; color:var(--muted); }
  .cp-hd-right { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }

  /* KPI strip */
  .cp-kpi-strip { display:flex; gap:10px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; }
  .cp-kpi-strip::-webkit-scrollbar { display:none; }
  .cp-kpi { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 16px; min-width:140px; flex:1; cursor:default; position:relative; overflow:hidden; }
  .cp-kpi::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(200,155,109,.05),transparent); pointer-events:none; }
  .cp-kpi-val { font-size:26px; font-weight:800; line-height:1; letter-spacing:-.5px; }
  .cp-kpi-lbl { font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted); margin-top:2px; font-weight:600; }
  .cp-kpi-sub { font-size:10px; color:var(--muted); margin-top:2px; }

  /* School list grid */
  .cp-school-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
  .cp-school-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:10px; transition:border-color .15s; }
  .cp-school-card:hover { border-color:rgba(139,92,246,.35); }
  .cp-school-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
  .cp-school-name { font-size:15px; font-weight:700; }
  .cp-school-code { font-family:monospace; font-size:11px; letter-spacing:1.5px; background:rgba(139,92,246,.12); color:var(--accent-2); padding:3px 8px; border-radius:6px; white-space:nowrap; }
  .cp-school-stats { display:flex; gap:12px; }
  .cp-school-stat { display:flex; flex-direction:column; align-items:center; }
  .cp-school-stat-val { font-size:16px; font-weight:700; }
  .cp-school-stat-lbl { font-size:9px; color:var(--muted); text-transform:uppercase; letter-spacing:.4px; }
  .cp-school-status { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; }
  .cp-status-active { background:rgba(34,197,94,.12); color:#22c55e; }
  .cp-status-new    { background:rgba(245,158,11,.12); color:#f59e0b; }
  .cp-status-empty  { background:rgba(100,100,100,.12); color:var(--muted); }
  .cp-school-actions { display:flex; gap:6px; }

  /* Edit layout */
  .cp-edit-grid { display:grid; grid-template-columns:340px 1fr; gap:14px; }
  .cp-edit-left { display:flex; flex-direction:column; gap:14px; }
  .cp-edit-right { display:flex; flex-direction:column; gap:14px; }
  @media(max-width:900px){ .cp-edit-grid { grid-template-columns:1fr; } }

  /* Edit cards */
  .cp-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .cp-card-hd { padding:12px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
  .cp-card-hd-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); }
  .cp-card-body { padding:16px; }

  /* School edit form */
  .cp-field { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
  .cp-field label { font-size:11px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; }
  .cp-field input { background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:8px; color:var(--text); padding:9px 12px; font-size:14px; width:100%; box-sizing:border-box; transition:border-color .15s; }
  .cp-field input:focus { outline:none; border-color:rgba(139,92,246,.5); box-shadow:0 0 0 3px rgba(139,92,246,.1); }
  .cp-code-row { display:flex; gap:6px; }
  .cp-code-row input { flex:1; font-family:monospace; letter-spacing:2px; text-transform:uppercase; font-size:14px; }
  .cp-regen-btn { background:rgba(139,92,246,.1); border:1px solid rgba(139,92,246,.25); color:var(--accent-2); border-radius:8px; padding:9px 12px; cursor:pointer; font-size:16px; line-height:1; transition:all .15s; white-space:nowrap; }
  .cp-regen-btn:hover { background:rgba(139,92,246,.2); }
  .cp-warn { background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.2); border-radius:8px; padding:8px 12px; font-size:11px; color:#f59e0b; line-height:1.5; margin-top:-4px; margin-bottom:12px; }
  .cp-form-btns { display:flex; gap:8px; }
  .cp-btn-gold { background:var(--primary); color:#fff; border:none; border-radius:8px; padding:10px 18px; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .15s; }
  .cp-btn-gold:hover { opacity:.88; }
  .cp-btn-ghost { background:transparent; border:1px solid var(--border); color:var(--muted); border-radius:8px; padding:10px 18px; font-size:13px; cursor:pointer; transition:all .15s; }
  .cp-btn-ghost:hover { border-color:rgba(255,255,255,.2); color:var(--text); }

  /* Create classroom form */
  .cp-cr-form { display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; }
  .cp-cr-form .cp-field { flex:1; min-width:80px; margin-bottom:0; }
  .cp-cr-form .cp-btn-gold { flex-shrink:0; white-space:nowrap; align-self:flex-end; }

  /* Classroom table */
  .cp-cr-table { width:100%; border-collapse:collapse; font-size:13px; }
  .cp-cr-table thead th { padding:10px 12px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); font-weight:600; border-bottom:1px solid var(--border); white-space:nowrap; }
  .cp-cr-table tbody tr { border-bottom:1px solid var(--border); transition:background .1s; }
  .cp-cr-table tbody tr:last-child { border-bottom:none; }
  .cp-cr-table tbody tr:hover { background:rgba(255,255,255,.02); }
  .cp-cr-table td { padding:10px 12px; vertical-align:middle; }
  .cp-cr-name { font-weight:700; font-size:14px; }
  .cp-cr-code-input { background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:6px; color:var(--text); padding:6px 10px; font-family:monospace; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; width:108px; transition:border-color .15s; }
  .cp-cr-code-input:focus { outline:none; border-color:rgba(139,92,246,.5); }
  .cp-cr-actions { display:flex; gap:5px; align-items:center; flex-wrap:nowrap; }
  .cp-cr-save { background:rgba(34,197,94,.1); border:1px solid rgba(34,197,94,.25); color:#22c55e; border-radius:6px; padding:5px 10px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; transition:all .15s; min-width:44px; min-height:36px; }
  .cp-cr-save:hover { background:rgba(34,197,94,.2); }
  .cp-cr-auto { background:rgba(139,92,246,.1); border:1px solid rgba(139,92,246,.25); color:var(--accent-2); border-radius:6px; padding:5px 10px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; transition:all .15s; min-width:44px; min-height:36px; }
  .cp-cr-auto:hover { background:rgba(139,92,246,.2); }
  .cp-cr-del { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); color:#ef4444; border-radius:6px; padding:5px 10px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; transition:all .15s; min-width:44px; min-height:36px; }
  .cp-cr-del:hover { background:rgba(239,68,68,.18); }
  .cp-badge-num { display:inline-block; background:rgba(255,255,255,.06); border-radius:6px; padding:2px 8px; font-size:12px; font-weight:600; min-width:24px; text-align:center; }

  /* Director panel */
  .cp-dir-row { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); }
  .cp-dir-row:last-child { border-bottom:none; }
  .cp-dir-avatar { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,var(--accent),#7c3aed); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; }
  .cp-dir-info { flex:1; min-width:0; }
  .cp-dir-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cp-dir-sub { font-size:11px; color:var(--muted); }

  /* Students panel */
  .cp-st-row { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid var(--border); flex-wrap:wrap; }
  .cp-st-row:last-child { border-bottom:none; }
  .cp-st-name { font-size:13px; font-weight:600; flex:1; min-width:100px; }
  .cp-st-current { font-size:11px; color:var(--muted); }
</style>`;

  // ── Pantalla principal: Gestión de Colegios ──
  function screenManageSchools() {
    const s = Storage.get();
    const schools = Schools.listSchools();
    const editId = App._editSchoolId;
    const editSchool = editId ? s.schools[editId] : null;

    const allUsers   = Object.values(s.users);
    const students   = allUsers.filter(function(u) { return u.role === 'student'; });
    const sessions   = s.sessions || [];
    const classrooms = Object.values(s.classrooms || {});
    const directors  = allUsers.filter(function(u) {
      return schools.some(function(sc) { return (sc.adminIds || []).includes(u.id); });
    });
    const avgConc = sessions.length
      ? (sessions.reduce(function(a, b) { return a + b.concentration; }, 0) / sessions.length).toFixed(1)
      : '—';
    const inactiveSchools = schools.filter(function(sc) {
      const sts = Schools.getSchoolStats(sc.id);
      return sts.studentCount > 0 && sts.sessionCount === 0;
    });
    const weeklyGlobal = _weeklyData(sessions, 6);

    const kpiStrip = `
    <div class="cp-kpi-strip">
      <div class="cp-kpi">
        <div class="cp-kpi-val" style="color:var(--primary);">${schools.length}</div>
        <div class="cp-kpi-lbl">Colegios activos</div>
        ${_spark(weeklyGlobal.map(function() { return schools.length; }), 'var(--primary)')}
      </div>
      <div class="cp-kpi">
        <div class="cp-kpi-val" style="color:var(--accent-2);">${classrooms.length}</div>
        <div class="cp-kpi-lbl">Aulas registradas</div>
        ${_spark(weeklyGlobal.map(function() { return classrooms.length; }), 'var(--accent)')}
      </div>
      <div class="cp-kpi">
        <div class="cp-kpi-val">${students.length}</div>
        <div class="cp-kpi-lbl">Estudiantes</div>
        ${_spark(weeklyGlobal, '#22c55e')}
      </div>
      <div class="cp-kpi">
        <div class="cp-kpi-val">${directors.length}</div>
        <div class="cp-kpi-lbl">Directores</div>
        ${_spark(weeklyGlobal.map(function() { return directors.length; }), 'var(--primary)')}
      </div>
      <div class="cp-kpi">
        <div class="cp-kpi-val" style="color:${
          sessions.length ? (parseFloat(avgConc) >= 4 ? '#22c55e' : parseFloat(avgConc) >= 3 ? 'var(--primary)' : '#ef4444') : 'var(--muted)'
        };">${sessions.length ? avgConc + '/5' : '—'}</div>
        <div class="cp-kpi-lbl">Concentración prom. global</div>
        ${_spark(weeklyGlobal, sessions.length && parseFloat(avgConc) >= 3 ? 'var(--primary)' : 'var(--accent)')}
      </div>
      <div class="cp-kpi">
        <div class="cp-kpi-val" style="color:${inactiveSchools.length > 0 ? '#f59e0b' : 'var(--muted)'};">${inactiveSchools.length}</div>
        <div class="cp-kpi-lbl">Colegios inactivos</div>
        ${_spark(weeklyGlobal.map(function() { return inactiveSchools.length; }), '#f59e0b')}
      </div>
    </div>`;

    if (editSchool) {
      return _renderEditSchool(editSchool, editId, kpiStrip, s);
    }

    // ── Vista: Lista de colegios ──
    return _CSS + `
<div class="cp-wrap">
  <div class="cp-hd">
    <div class="cp-hd-left">
      <h1>Gestión de Colegios</h1>
      <p>Supervisa, organiza y administra toda la estructura institucional desde un único lugar.</p>
    </div>
    <div class="cp-hd-right">
      <button class="cp-btn-ghost" data-go="admin-dashboard" style="padding:8px 14px;font-size:13px;">← Panel Global</button>
      <button class="cp-btn-gold" id="btnNuevoColegio">+ Nuevo colegio</button>
      <button class="primary" id="btnExportReporte">Exportar reporte</button>
    </div>
  </div>

  ${kpiStrip}

  <div id="newSchoolForm" style="display:none;">
    <div class="cp-card">
      <div class="cp-card-hd">
        <span class="cp-card-hd-title">Nuevo colegio</span>
        <button class="cp-btn-ghost" id="btnCancelNewSchool" style="padding:4px 12px;font-size:12px;">✕ Cancelar</button>
      </div>
      <div class="cp-card-body">
        <form id="schoolForm">
          <div class="cp-field">
            <label>Nombre del colegio</label>
            <input name="name" placeholder="Ej. I.E. San Martín, Colegio Trilce…" required />
          </div>
          <div class="cp-form-btns">
            <button type="submit" class="cp-btn-gold">Crear colegio</button>
            <button type="button" class="cp-btn-ghost" id="btnCancelNewSchool2">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  ${schools.length === 0
    ? `<div class="cp-card">
        <div class="cp-card-body" style="text-align:center;padding:48px 24px;">
          <div style="font-size:40px;margin-bottom:12px;">🏫</div>
          <h2 style="margin:0 0 8px;font-size:18px;">Tu red educativa empieza aquí</h2>
          <p style="color:var(--muted);font-size:13px;margin:0 0 20px;">Crea tu primer colegio y comienza a organizar estudiantes, docentes y aulas.</p>
          <button class="cp-btn-gold" id="btnNuevoColegio2">+ Crear colegio</button>
        </div>
      </div>`
    : `<div class="cp-school-grid">
        ${schools.map(function(sc) {
          const stats = Schools.getSchoolStats(sc.id);
          const dir = (sc.adminIds || []).map(function(id) { return s.users[id] && s.users[id].name; }).filter(Boolean)[0] || null;
          const statusClass = stats.sessionCount > 0 ? 'cp-status-active' : stats.studentCount > 0 ? 'cp-status-new' : 'cp-status-empty';
          const statusLabel = stats.sessionCount > 0 ? '● Activo' : stats.studentCount > 0 ? '◐ Nuevo' : '○ Sin alumnos';
          return `<div class="cp-school-card">
            <div class="cp-school-card-top">
              <div>
                <div class="cp-school-name">${esc(sc.name)}</div>
                ${dir ? `<div style="font-size:12px;color:var(--muted);margin-top:2px;">Dir. ${esc(dir)}</div>` : ''}
              </div>
              <span class="cp-school-code">${esc(sc.code)}</span>
            </div>
            <div class="cp-school-stats">
              <div class="cp-school-stat">
                <span class="cp-school-stat-val">${stats.classroomCount}</span>
                <span class="cp-school-stat-lbl">Aulas</span>
              </div>
              <div class="cp-school-stat">
                <span class="cp-school-stat-val">${stats.studentCount}</span>
                <span class="cp-school-stat-lbl">Alumnos</span>
              </div>
              <div class="cp-school-stat">
                <span class="cp-school-stat-val">${stats.sessionCount}</span>
                <span class="cp-school-stat-lbl">Sesiones</span>
              </div>
              <div class="cp-school-stat">
                <span class="cp-school-stat-val" style="font-size:13px;">${stats.avgConcentration !== '—' ? stats.avgConcentration : '—'}</span>
                <span class="cp-school-stat-lbl">Conc.</span>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="cp-school-status ${statusClass}">${statusLabel}</span>
              <div class="cp-school-actions">
                <button class="cp-btn-ghost" style="padding:6px 14px;font-size:12px;" data-del-school="${esc(sc.id)}" data-del-name="${esc(sc.name)}">Eliminar</button>
                <button class="cp-btn-gold" style="padding:6px 14px;font-size:12px;" data-edit-school="${esc(sc.id)}">Editar →</button>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`}
</div>`;
  }

  function _renderEditSchool(editSchool, editId, kpiStrip, s) {
    const classrooms = Schools.listClassrooms(editId);
    const schoolStudents = Schools.listStudentsInSchool(editId);
    const stats = Schools.getSchoolStats(editId);
    const dirs = (editSchool.adminIds || []).map(function(id) { return s.users[id]; }).filter(Boolean);

    const classroomTable = classrooms.length === 0
      ? `<div style="padding:32px;text-align:center;color:var(--muted);font-size:13px;">
          Sin aulas creadas. Usa el formulario de abajo para crear la primera.
        </div>`
      : `<div style="overflow-x:auto;">
        <table class="cp-cr-table">
          <thead><tr>
            <th>Aula</th>
            <th>Código de acceso</th>
            <th style="text-align:center;">Alumnos</th>
            <th style="text-align:center;">Docentes</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${classrooms.map(function(cr) { return `<tr>
              <td><span class="cp-cr-name">${esc(cr.name)}</span></td>
              <td>
                <input class="cp-cr-code-input cr-code-input" data-cr-id="${esc(cr.id)}"
                  value="${esc(cr.inviteCode)}" maxlength="8" />
              </td>
              <td style="text-align:center;"><span class="cp-badge-num">${(cr.studentIds || []).length}</span></td>
              <td style="text-align:center;"><span class="cp-badge-num">${(cr.teacherIds || []).length}</span></td>
              <td>
                <div class="cp-cr-actions">
                  <button class="cp-cr-save" data-save-cr-code="${esc(cr.id)}">✓ Guardar</button>
                  <button class="cp-cr-auto" data-regen-cr="${esc(cr.id)}">↻ Auto</button>
                  <button class="cp-cr-del" data-del-cr="${esc(cr.id)}" data-del-cr-name="${esc(cr.name)}">Eliminar</button>
                </div>
              </td>
            </tr>`; }).join('')}
          </tbody>
        </table>
      </div>`;

    const studentsTable = schoolStudents.length === 0 ? '' : `
    <div class="cp-card">
      <div class="cp-card-hd">
        <span class="cp-card-hd-title">Estudiantes del colegio</span>
        <span style="font-size:11px;color:var(--muted);">${schoolStudents.length} alumno${schoolStudents.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="cp-card-body" style="max-height:220px;overflow-y:auto;padding:8px 16px;">
        ${schoolStudents.map(function(st) {
          const currentCr = st.classroomId ? (s.classrooms[st.classroomId] ? s.classrooms[st.classroomId].name : '—') : '—';
          return `<div class="cp-st-row">
            <div class="cp-st-name">${esc(st.name)}</div>
            <div class="cp-st-current">${esc(currentCr)}</div>
            ${classrooms.length > 0 ? `
            <select class="st-cr-select" data-st-id="${esc(st.id)}" style="font-size:11px;padding:4px 6px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);">
              <option value="">Sin aula</option>
              ${classrooms.map(function(cr) { return `<option value="${esc(cr.id)}"${st.classroomId === cr.id ? ' selected' : ''}>${esc(cr.name)}</option>`; }).join('')}
            </select>
            <button class="cp-cr-save" style="font-size:11px;padding:4px 10px;" data-assign-student="${esc(st.id)}">Asignar</button>` : ''}
            ${st.classroomId ? `<button class="cp-cr-del" style="font-size:11px;padding:4px 10px;" data-remove-student="${esc(st.id)}" data-remove-from="${esc(st.classroomId)}">Quitar</button>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;

    return _CSS + `
<div class="cp-wrap">
  <div class="cp-hd">
    <div class="cp-hd-left">
      <div style="display:flex;align-items:center;gap:10px;">
        <button class="cp-btn-ghost" data-go="manage-schools" id="btnBackSchools" style="padding:6px 12px;font-size:12px;">← Volver</button>
        <h1>Gestión de Colegios</h1>
      </div>
      <p>Editando: <strong style="color:var(--text);">${esc(editSchool.name)}</strong> · ${stats.classroomCount} aulas · ${stats.studentCount} alumnos · ${stats.sessionCount} sesiones</p>
    </div>
    <div class="cp-hd-right">
      <button class="cp-btn-ghost" id="btnDiagLog" style="font-size:12px;padding:6px 12px;">🩺 Diagnóstico</button>
      <button class="primary" id="btnExportReporte">Exportar reporte</button>
    </div>
  </div>

  ${kpiStrip}

  <div class="cp-edit-grid">
    <div class="cp-edit-left">

      <div class="cp-card">
        <div class="cp-card-hd">
          <span class="cp-card-hd-title">Datos del colegio</span>
          <span class="cp-school-status ${stats.sessionCount > 0 ? 'cp-status-active' : stats.studentCount > 0 ? 'cp-status-new' : 'cp-status-empty'}" style="font-size:10px;">${stats.sessionCount > 0 ? '● Activo' : stats.studentCount > 0 ? '◐ Nuevo' : '○ Sin alumnos'}</span>
        </div>
        <div class="cp-card-body">
          <form id="schoolForm">
            <div class="cp-field">
              <label>Nombre del colegio</label>
              <input name="name" value="${esc(editSchool.name)}" required />
            </div>
            <div class="cp-field">
              <label>Código de colegio</label>
              <div class="cp-code-row">
                <input name="schoolCode" maxlength="6" value="${esc(editSchool.code)}" placeholder="ABC123" />
                <button type="button" class="cp-regen-btn" id="btnRegenSchoolCode" title="Generar código automático">↻</button>
              </div>
            </div>
            <div class="cp-warn">⚠ Cambiar el código invalida los accesos anteriores de docentes y estudiantes.</div>
            <div class="cp-form-btns">
              <button type="submit" class="cp-btn-gold">Guardar cambios</button>
              <button type="button" class="cp-btn-ghost" data-go="manage-schools" id="cancelEdit">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <div class="cp-card">
        <div class="cp-card-hd">
          <span class="cp-card-hd-title">Nueva aula</span>
        </div>
        <div class="cp-card-body">
          <form id="createClassroomForm">
            <div class="cp-cr-form">
              <div class="cp-field">
                <label>Grado</label>
                <input name="grade" placeholder="Ej: 5°" maxlength="10" required />
              </div>
              <div class="cp-field">
                <label>Sección</label>
                <input name="section" placeholder="Ej: A" maxlength="10" required />
              </div>
              <button type="submit" class="cp-btn-gold">Crear aula</button>
            </div>
          </form>
        </div>
      </div>

      ${dirs.length > 0 ? `
      <div class="cp-card">
        <div class="cp-card-hd">
          <span class="cp-card-hd-title">Directores asignados</span>
          <span style="font-size:11px;color:var(--muted);">${dirs.length}</span>
        </div>
        <div class="cp-card-body" style="padding:8px 16px;">
          ${dirs.map(function(d) { return `<div class="cp-dir-row">
            <div class="cp-dir-avatar">${(d.name || '?')[0].toUpperCase()}</div>
            <div class="cp-dir-info">
              <div class="cp-dir-name">${esc(d.name)}</div>
              <div class="cp-dir-sub">${esc(d.email)}</div>
            </div>
          </div>`; }).join('')}
        </div>
      </div>` : ''}

    </div>

    <div class="cp-edit-right">
      <div class="cp-card">
        <div class="cp-card-hd">
          <span class="cp-card-hd-title">Aulas — ${esc(editSchool.name)}</span>
          <span style="font-size:11px;color:var(--muted);">${classrooms.length} aula${classrooms.length !== 1 ? 's' : ''}</span>
        </div>
        ${classroomTable}
      </div>
      ${studentsTable}
    </div>
  </div>
</div>`;
  }

  function wireManageSchools() {
    root().querySelectorAll('[data-go]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (btn.id === 'cancelEdit' || btn.id === 'btnBackSchools') App._editSchoolId = null;
        App.go(btn.dataset.go);
      });
    });

    document.getElementById('btnDiagLog') && document.getElementById('btnDiagLog').addEventListener('click', function() {
      try { window.Monitor && window.Monitor.exportLog && window.Monitor.exportLog(); UI.flash('Registro exportado.', 'success'); }
      catch (_) { UI.flash('No se pudo exportar el registro.', 'error'); }
    });

    document.getElementById('btnExportReporte') && document.getElementById('btnExportReporte').addEventListener('click', function() {
      const schools = Schools.listSchools();
      let html = '<h1>Reporte de Colegios — TrackFocus</h1><p>' + new Date().toLocaleDateString('es-PE', {weekday:'long',year:'numeric',month:'long',day:'numeric'}) + '</p><hr>';
      schools.forEach(function(sc) {
        const stats = Schools.getSchoolStats(sc.id);
        html += '<h2>' + sc.name + ' (' + sc.code + ')</h2><ul><li>Aulas: ' + stats.classroomCount + '</li><li>Estudiantes: ' + stats.studentCount + '</li><li>Sesiones: ' + stats.sessionCount + '</li><li>Concentración prom: ' + stats.avgConcentration + '</li></ul>';
      });
      try { window.Exporter && window.Exporter.printHTML && window.Exporter.printHTML(html, 'reporte-colegios'); }
      catch (_) { UI.flash('Exportación no disponible.', 'error'); }
    });

    ['btnNuevoColegio', 'btnNuevoColegio2'].forEach(function(id) {
      var el = document.getElementById(id);
      el && el.addEventListener('click', function() {
        var f = document.getElementById('newSchoolForm');
        if (f) { f.style.display = 'block'; var inp = f.querySelector('input'); inp && inp.focus(); }
      });
    });
    ['btnCancelNewSchool', 'btnCancelNewSchool2'].forEach(function(id) {
      var el = document.getElementById(id);
      el && el.addEventListener('click', function() {
        var f = document.getElementById('newSchoolForm');
        if (f) f.style.display = 'none';
      });
    });

    var schoolFormEl = document.getElementById('schoolForm');
    schoolFormEl && schoolFormEl.addEventListener('submit', function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var name = (fd.get('name') || '').trim();
      if (!name) return;
      var editId = App._editSchoolId;
      if (editId) {
        Schools.updateSchool(editId, name);
        var newCode = (fd.get('schoolCode') || '').trim().toUpperCase();
        var currentCode = (Storage.get().schools[editId] || {}).code || '';
        if (newCode && newCode !== currentCode) {
          try { Schools.updateSchoolCode(editId, newCode); }
          catch (err) { UI.flash(err.message, 'error'); return; }
        }
        try { Storage.flush && Storage.flush(); } catch (_) {}
        App._editSchoolId = null;
        UI.flash('Colegio actualizado.', 'success');
      } else {
        var sc = Schools.createSchool(name);
        try { Storage.flush && Storage.flush(); } catch (_) {}
        UI.flash('Colegio "' + sc.name + '" creado. Código: ' + sc.code, 'success');
      }
      App.go('manage-schools');
    });

    var regenBtn = document.getElementById('btnRegenSchoolCode');
    regenBtn && regenBtn.addEventListener('click', function() {
      var input = document.querySelector('[name="schoolCode"]');
      if (!input) return;
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      var code = '';
      for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      input.value = code;
      input.focus();
    });

    var crFormEl = document.getElementById('createClassroomForm');
    crFormEl && crFormEl.addEventListener('submit', function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var grade = (fd.get('grade') || '').trim();
      var section = (fd.get('section') || '').trim();
      if (!grade || !section) return;
      var editId = App._editSchoolId;
      if (!editId) return;
      var cr = Schools.createClassroom(editId, grade, section);
      try { Storage.flush && Storage.flush(); } catch (_) {}
      UI.flash('Aula "' + cr.name + '" creada. Código: ' + cr.inviteCode, 'success');
      App.go('manage-schools');
    });

    root().querySelectorAll('[data-edit-school]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        App._editSchoolId = btn.dataset.editSchool;
        App.go('manage-schools');
      });
    });

    root().querySelectorAll('[data-del-school]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.dataset.delSchool;
        var name = btn.dataset.delName;
        if (!confirm('¿Eliminar "' + name + '"?\n\nEsta acción eliminará también todas sus aulas y desvinculará a todos sus usuarios. No se puede deshacer.')) return;
        Schools.deleteSchool(id);
        try { Storage.flush && Storage.flush(); } catch (_) {}
        UI.flash('Colegio eliminado.', 'success');
        App.go('manage-schools');
      });
    });

    root().querySelectorAll('[data-save-cr-code]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var crId = btn.dataset.saveCrCode;
        var input = root().querySelector('.cr-code-input[data-cr-id="' + crId + '"]');
        if (!input) return;
        try {
          Schools.updateClassroomCode(crId, input.value);
          try { Storage.flush && Storage.flush(); } catch (_) {}
          UI.flash('Código de aula actualizado.', 'success');
          App.go('manage-schools');
        } catch (err) { UI.flash(err.message, 'error'); }
      });
    });

    root().querySelectorAll('[data-regen-cr]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var crId = btn.dataset.regenCr;
        var newCode = Schools.regenerateInviteCode(crId);
        try { Storage.flush && Storage.flush(); } catch (_) {}
        var input = root().querySelector('.cr-code-input[data-cr-id="' + crId + '"]');
        if (input) input.value = newCode;
        UI.flash('Nuevo código: ' + newCode, 'success');
      });
    });

    root().querySelectorAll('[data-del-cr]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var crId = btn.dataset.delCr;
        var name = btn.dataset.delCrName;
        if (!confirm('¿Eliminar el aula "' + name + '"?\n\nLos alumnos quedarán sin aula pero permanecerán en el colegio.')) return;
        Schools.deleteClassroom(crId);
        try { Storage.flush && Storage.flush(); } catch (_) {}
        UI.flash('Aula eliminada.', 'success');
        App.go('manage-schools');
      });
    });

    root().querySelectorAll('[data-assign-student]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var studentId = btn.dataset.assignStudent;
        var select = root().querySelector('.st-cr-select[data-st-id="' + studentId + '"]');
        var classroomId = select && select.value;
        if (!classroomId) { UI.flash('Selecciona un aula primero.', 'error'); return; }
        Schools.addStudentToClassroom(studentId, classroomId);
        try { Storage.flush && Storage.flush(); } catch (_) {}
        UI.flash('Estudiante asignado.', 'success');
        App.go('manage-schools');
      });
    });

    root().querySelectorAll('[data-remove-student]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var studentId = btn.dataset.removeStudent;
        var classroomId = btn.dataset.removeFrom;
        if (!confirm('¿Quitar a este estudiante del aula? Permanecerá en el colegio.')) return;
        Schools.removeStudentFromClassroom(studentId, classroomId);
        try { Storage.flush && Storage.flush(); } catch (_) {}
        UI.flash('Estudiante removido del aula.', 'success');
        App.go('manage-schools');
      });
    });
  }

  // ── Dashboard Centro de Operaciones ──
  function screenAdminDashboard() {
    const s = Storage.get();
    const schools    = Schools.listSchools();
    const allUsers   = Object.values(s.users);
    const students   = allUsers.filter(function(u) { return u.role === 'student'; });
    const teachers   = allUsers.filter(function(u) { return u.role === 'teacher'; });
    const sessions   = s.sessions || [];
    const classrooms = Object.values(s.classrooms || {});
    const now = new Date();

    const totalMin = sessions.reduce(function(a, b) { return a + (b.durationMin || 0); }, 0);
    const avgConc  = sessions.length
      ? sessions.reduce(function(a, b) { return a + b.concentration; }, 0) / sessions.length
      : 0;

    const from7  = new Date(now); from7.setDate(now.getDate() - 7);
    const from14 = new Date(now); from14.setDate(now.getDate() - 14);
    const sessWeek     = sessions.filter(function(se) { return new Date(se.datetime) >= from7; });
    const sessLastWeek = sessions.filter(function(se) {
      const d = new Date(se.datetime); return d >= from14 && d < from7;
    });
    const weekDelta = sessLastWeek.length
      ? Math.round((sessWeek.length - sessLastWeek.length) / sessLastWeek.length * 100)
      : sessWeek.length > 0 ? 100 : 0;

    const weeklyData = _weeklyData(sessions, 8);
    const weekLabels = ['S-7','S-6','S-5','S-4','S-3','S-2','S-1','Hoy'];

    const concBuckets = [0,0,0,0,0];
    sessions.forEach(function(se) {
      const b = Math.min(4, Math.max(0, Math.round(se.concentration) - 1));
      concBuckets[b]++;
    });

    const schoolRows = schools.map(function(sc) {
      const stats = Schools.getSchoolStats(sc.id);
      const dir = (sc.adminIds || []).map(function(id) { return s.users[id] && s.users[id].name; }).filter(Boolean)[0] || '—';
      const status = stats.sessionCount > 0 ? 'Activo' : stats.studentCount > 0 ? 'Nuevo' : 'Sin alumnos';
      return Object.assign({}, sc, stats, { directorName: dir, status: status });
    });

    const ranking = schoolRows.slice().sort(function(a, b) { return b.sessionCount - a.sessionCount; }).slice(0, 6);
    const maxRank = Math.max(1, Math.max.apply(null, ranking.map(function(r) { return r.sessionCount; })));

    const alertInactive   = schoolRows.filter(function(sc) { return sc.studentCount > 0 && sc.sessionCount === 0; });
    const alertLowConc    = schoolRows.filter(function(sc) { const c = parseFloat(sc.avgConcentration); return !isNaN(c) && c < 3 && c > 0; });
    const alertSuspended  = allUsers.filter(function(u) { return u.suspended; });
    const alertNoSess     = students.filter(function(u) {
      const us = sessions.filter(function(se) { return se.email === u.id; });
      if (!us.length) return true;
      return (now - new Date(us[us.length-1].datetime)) > 7 * 86400000;
    });

    const recentUsers = allUsers
      .filter(function(u) { return u.role !== 'super_admin'; })
      .sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); })
      .slice(0, 6);

    function trendBadge(v) {
      return v > 0
        ? '<span style="color:#22c55e;font-size:10px;">▲ ' + v + '%</span>'
        : v < 0
          ? '<span style="color:#ef4444;font-size:10px;">▼ ' + Math.abs(v) + '%</span>'
          : '<span style="color:var(--muted);font-size:10px;">—</span>';
    }
    function sparkI(data, color) {
      const m = Math.max(1, Math.max.apply(null, data));
      return '<div style="display:flex;align-items:flex-end;gap:1.5px;height:26px;margin-top:6px;">' +
        data.map(function(v) { return '<div style="flex:1;background:' + color + ';border-radius:1px 1px 0 0;height:' + Math.max(6, Math.round(v/m*100)) + '%;opacity:0.75;"></div>'; }).join('') +
      '</div>';
    }
    function hbar(pct, color) {
      return '<div style="background:rgba(255,255,255,0.06);border-radius:4px;height:5px;overflow:hidden;margin-top:6px;"><div style="width:' + Math.min(100, Math.max(0, pct)) + '%;height:100%;background:' + color + ';border-radius:4px;"></div></div>';
    }
    function vbars(data, colors, labels) {
      const m = Math.max(1, Math.max.apply(null, data));
      return '<div style="display:flex;align-items:flex-end;gap:6px;height:88px;">' +
        data.map(function(v, i) { return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;"><div style="font-size:9px;color:var(--muted);">' + (v||'') + '</div><div style="width:100%;background:' + (colors[i]||'var(--accent)') + ';border-radius:3px 3px 0 0;height:' + Math.max(4,Math.round(v/m*72)) + 'px;opacity:0.85;"></div></div>'; }).join('') +
      '</div><div style="display:flex;gap:6px;margin-top:4px;">' +
        labels.map(function(l) { return '<div style="flex:1;text-align:center;font-size:9px;color:var(--muted);">' + l + '</div>'; }).join('') +
      '</div>';
    }

    return `
<style>
  .ops-wrap { display:flex; flex-direction:column; gap:14px; }
  .ops-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; }
  .ops-strip { display:flex; gap:10px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
  .ops-strip::-webkit-scrollbar { display:none; }
  .ops-kpi { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 16px; min-width:130px; flex:1; }
  .ops-kpi-v { font-size:24px; font-weight:800; line-height:1; letter-spacing:-0.5px; }
  .ops-kpi-l { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin-top:2px; }
  .ops-kpi-sub { font-size:10px; margin-top:2px; }
  .ops-2col { display:grid; grid-template-columns:1fr 320px; gap:14px; }
  .ops-row2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .ops-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .ops-card-body { padding:16px; }
  .ops-card-hd { padding:12px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
  .ops-label { font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted); font-weight:600; }
  .ops-status { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; }
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
  <div class="ops-header">
    <div>
      <h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:-.3px;">⚙️ Centro de Operaciones</h1>
      <p class="muted" style="margin:3px 0 0;font-size:12px;">${now.toLocaleDateString('es-PE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} · TrackFocus Admin</p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="primary" data-go="manage-schools">🏫 Gestionar Colegios</button>
      <button class="ghost" data-go="manage-users">Gestionar usuarios</button>
      <button class="ghost" id="btnDiagLog">🩺 Diagnóstico</button>
    </div>
  </div>
  <div class="ops-strip">
    <div class="ops-kpi"><div class="ops-kpi-v" style="color:var(--accent-2);">${schools.length}</div><div class="ops-kpi-l">Colegios</div>${hbar(schools.length ? 100 : 0, 'var(--accent)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v" style="color:var(--accent-2);">${classrooms.length}</div><div class="ops-kpi-l">Aulas activas</div>${hbar(classrooms.length ? Math.min(100, classrooms.length / Math.max(1, schools.length * 5) * 100) : 0, 'var(--accent)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${students.length}</div><div class="ops-kpi-l">Estudiantes</div>${sparkI(weeklyData.map(function() { return students.length; }), 'var(--primary)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${teachers.length}</div><div class="ops-kpi-l">Docentes</div>${hbar(teachers.length / Math.max(1, students.length) * 100 * 5, 'var(--primary)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${sessions.length.toLocaleString()}</div><div class="ops-kpi-l">Sesiones totales</div>${sparkI(weeklyData, 'var(--accent)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${sessWeek.length}</div><div class="ops-kpi-l">Sesiones esta semana</div><div class="ops-kpi-sub">${trendBadge(weekDelta)} vs anterior</div>${sparkI(weeklyData.slice(-4), 'var(--good)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${sessions.length ? avgConc.toFixed(1) + '/5' : '—'}</div><div class="ops-kpi-l">Concentración prom.</div>${hbar(sessions.length ? avgConc / 5 * 100 : 0, avgConc >= 4 ? '#22c55e' : avgConc >= 3 ? 'var(--primary)' : '#ef4444')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${Math.round(totalMin / 60).toLocaleString()} h</div><div class="ops-kpi-l">Horas estudiadas</div>${sparkI(weeklyData.map(function(w) { return w * 25; }), '#a78bfa')}</div>
  </div>
  <div class="ops-2col">
    <div class="ops-card">
      <div class="ops-card-hd">
        <div><div class="ops-label">Centro de Control Institucional</div><span style="font-size:12px;color:var(--muted);">${schools.length} colegio${schools.length !== 1 ? 's' : ''}</span></div>
        <button class="ghost" style="font-size:12px;padding:4px 12px;" data-go="manage-schools">Ver todos →</button>
      </div>
      ${schools.length === 0
        ? '<div style="padding:32px;text-align:center;color:var(--muted);font-size:13px;">Sin colegios registrados. <button class="ghost" data-go="manage-schools">Crear el primero →</button></div>'
        : '<div style="overflow-x:auto;"><table class="table" style="font-size:12px;"><thead><tr><th>Colegio</th><th>Código</th><th>Director</th><th>Aulas</th><th>Alumnos</th><th>Sesiones</th><th>Conc.</th><th>Estado</th><th></th></tr></thead><tbody>' +
          schoolRows.map(function(sc) { return '<tr><td><strong>' + esc(sc.name) + '</strong></td><td><code style="background:rgba(139,92,246,.12);color:var(--accent-2);padding:2px 6px;border-radius:4px;font-size:11px;">' + sc.code + '</code></td><td class="muted">' + esc(sc.directorName) + '</td><td>' + sc.classroomCount + '</td><td>' + sc.studentCount + '</td><td>' + sc.sessionCount + '</td><td>' + (sc.avgConcentration !== '—' ? sc.avgConcentration + '/5' : '—') + '</td><td><span class="ops-status ' + (sc.status === 'Activo' ? 'ops-status-a' : sc.status === 'Nuevo' ? 'ops-status-n' : 'ops-status-s') + '">' + sc.status + '</span></td><td><button class="ghost" style="padding:3px 8px;font-size:11px;" data-go="manage-schools" data-sid="' + esc(sc.id) + '">Editar</button></td></tr>'; }).join('') +
        '</tbody></table></div>'}
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div class="ops-card ops-card-body">
        <div class="ops-label" style="margin-bottom:12px;">Alertas del sistema</div>
        <div class="ops-alert-row"><div><div style="font-size:13px;font-weight:600;">⚠️ Colegios sin actividad</div><div style="font-size:11px;color:var(--muted);">Con alumnos, sin sesiones</div></div><span style="font-size:18px;font-weight:800;color:${alertInactive.length > 0 ? '#f59e0b' : '#22c55e'};">${alertInactive.length}</span></div>
        <div class="ops-alert-row"><div><div style="font-size:13px;font-weight:600;">📉 Concentración baja</div><div style="font-size:11px;color:var(--muted);">Colegios prom. &lt; 3/5</div></div><span style="font-size:18px;font-weight:800;color:${alertLowConc.length > 0 ? '#ef4444' : '#22c55e'};">${alertLowConc.length}</span></div>
        <div class="ops-alert-row"><div><div style="font-size:13px;font-weight:600;">😴 Usuarios inactivos</div><div style="font-size:11px;color:var(--muted);">Sin sesiones 7+ días</div></div><span style="font-size:18px;font-weight:800;color:${alertNoSess.length > 3 ? '#f59e0b' : '#22c55e'};">${alertNoSess.length}</span></div>
        <div class="ops-alert-row"><div><div style="font-size:13px;font-weight:600;">🔴 Cuentas suspendidas</div></div><span style="font-size:18px;font-weight:800;color:${alertSuspended.length > 0 ? '#ef4444' : '#22c55e'};">${alertSuspended.length}</span></div>
      </div>
      ${ranking.length > 0 ? '<div class="ops-card ops-card-body"><div class="ops-label" style="margin-bottom:12px;">Ranking por sesiones</div>' +
        ranking.map(function(r, i) { return '<div class="ops-rank-item"><div class="ops-rank-label"><span>' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.') + ' ' + esc(r.name) + '</span><span style="color:var(--muted);font-size:11px;">' + r.sessionCount + ' ses.</span></div><div style="background:rgba(255,255,255,.06);border-radius:4px;height:5px;overflow:hidden;"><div style="width:' + Math.round(r.sessionCount/maxRank*100) + '%;height:100%;background:' + (i===0?'var(--primary)':i===1?'var(--accent-2)':'rgba(139,92,246,.45)') + ';border-radius:4px;"></div></div></div>'; }).join('') +
      '</div>' : ''}
    </div>
  </div>
  <div class="ops-row2">
    <div class="ops-card ops-card-body">
      <div class="ops-label" style="margin-bottom:12px;">Crecimiento semanal — sesiones</div>
      ${vbars(weeklyData, weeklyData.map(function(_,i){return i===weeklyData.length-1?'var(--primary)':'rgba(139,92,246,.55)';}), weekLabels)}
    </div>
    <div class="ops-card ops-card-body">
      <div class="ops-label" style="margin-bottom:12px;">Distribución de concentración global</div>
      ${vbars(concBuckets, ['#ef4444','#f97316','#f59e0b','#22c55e','#10b981'], ['1★','2★','3★','4★','5★'])}
      ${sessions.length === 0 ? '<p class="muted" style="font-size:12px;text-align:center;margin:8px 0 0;">Sin sesiones registradas aún.</p>' : ''}
    </div>
  </div>
  <div class="ops-card">
    <div class="ops-card-hd"><div class="ops-label">Usuarios registrados recientemente</div><button class="ghost" style="font-size:12px;padding:4px 12px;" data-go="manage-users">Ver todos →</button></div>
    ${recentUsers.length === 0
      ? '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">Sin usuarios registrados.</div>'
      : '<div style="overflow-x:auto;"><table class="table" style="font-size:12px;"><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Colegio</th><th>Estado</th><th>Registrado</th></tr></thead><tbody>' +
        recentUsers.map(function(u) {
          const rolLabel = {student:'Estudiante',teacher:'Docente',super_admin:'Admin'}[u.role] || u.role;
          const schoolName = u.schoolId ? ((s.schools[u.schoolId] && s.schools[u.schoolId].name) || '—') : '—';
          let badge = '—';
          if (u.suspended) badge = '<span class="ops-status" style="background:rgba(239,68,68,.12);color:#ef4444;">Suspendido</span>';
          else if (u.approvalStatus === 'pending') badge = '<span class="ops-status ops-status-n">Pendiente</span>';
          else if (u.approvalStatus === 'approved' || u.classroomId) badge = '<span class="ops-status ops-status-a">Activo</span>';
          return '<tr><td><strong>' + esc(u.name) + '</strong></td><td class="muted">' + esc(u.email) + '</td><td><span class="chip" style="font-size:10px;">' + rolLabel + '</span></td><td class="muted">' + esc(schoolName) + '</td><td>' + badge + '</td><td>' + new Date(u.createdAt).toLocaleDateString('es-PE') + '</td></tr>';
        }).join('') +
      '</tbody></table></div>'}
  </div>
</div>`;
  }

  function wireAdminDashboard() {
    root().querySelectorAll('[data-go]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var sid = btn.dataset.sid;
        if (sid) App._editSchoolId = sid;
        App.go(btn.dataset.go);
      });
    });
    var diagBtn = document.getElementById('btnDiagLog');
    diagBtn && diagBtn.addEventListener('click', function() {
      try { window.Monitor && window.Monitor.exportLog && window.Monitor.exportLog(); UI.flash('Registro exportado.', 'success'); }
      catch (_) { UI.flash('No se pudo exportar.', 'error'); }
    });
  }

  // ── Pantalla: Gestión de Usuarios ──
  function screenManageUsers() {
    const s = Storage.get();
    const filterRole = App._userFilterRole || '';
    const filterSchool = App._userFilterSchool || '';

    let users = Object.values(s.users).filter(function(u) { return u.id !== 'superadmin'; });
    if (filterRole) users = users.filter(function(u) { return u.role === filterRole; });
    if (filterSchool) users = users.filter(function(u) { return u.schoolId === filterSchool; });
    users.sort(function(a, b) { return a.name.localeCompare(b.name); });

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
            ${schools.map(function(sc) { return '<option value="' + sc.id + '" ' + (filterSchool === sc.id ? 'selected' : '') + '>' + esc(sc.name) + '</option>'; }).join('')}
          </select>
          <button class="ghost" id="applyFilter">Aplicar filtros</button>
        </div>
        <span class="muted">${users.length} usuario${users.length === 1 ? '' : 's'}</span>
      </div>
      <div class="card" style="padding:0;overflow:auto;">
        ${users.length === 0 ? '<div class="empty">No hay usuarios con esos filtros.</div>' :
        '<table class="table"><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Colegio</th><th>Aula</th><th>Estado</th><th>Registrado</th><th></th></tr></thead><tbody>' +
        users.map(function(u) {
          const school = u.schoolId ? (s.schools[u.schoolId] && s.schools[u.schoolId].name) : '—';
          const classroom = u.classroomId ? (s.classrooms[u.classroomId] && s.classrooms[u.classroomId].name) : '—';
          let statusBadge = '';
          if (u.suspended) statusBadge = '<span class="chip" style="background:rgba(239,68,68,0.15);color:#ef4444;font-size:11px;">Suspendido</span>';
          else if (u.role === 'student') {
            if (u.approvalStatus === 'pending') statusBadge = '<span class="pending-badge">Pendiente</span>';
            else if (u.approvalStatus === 'rejected') statusBadge = '<span class="rejected-badge">Rechazada</span>';
            else if (u.approvalStatus === 'approved' || u.classroomId) statusBadge = '<span class="approved-badge">Activo</span>';
          }
          return '<tr style="' + (u.suspended ? 'opacity:0.6;' : '') + '"><td><strong>' + esc(u.name) + '</strong></td><td class="muted">' + esc(u.email) + '</td><td><span class="chip">' + (ROLE_LABELS[u.role] || u.role) + '</span></td><td>' + esc(school || '—') + '</td><td>' + esc(classroom || '—') + '</td><td>' + (statusBadge || '—') + '</td><td>' + new Date(u.createdAt).toLocaleDateString('es-PE') + '</td><td style="white-space:nowrap;">' +
            (u.suspended
              ? '<button class="ghost" style="color:#22c55e;font-size:12px;padding:4px 10px;margin-right:4px;" data-reactivate-user="' + esc(u.id) + '">Reactivar</button>'
              : '<button class="ghost" style="color:#f59e0b;font-size:12px;padding:4px 10px;margin-right:4px;" data-suspend-user="' + esc(u.id) + '" data-suspend-name="' + esc(u.name) + '">Suspender</button>') +
            '<button class="danger" style="font-size:12px;padding:4px 10px;" data-del-user="' + esc(u.id) + '" data-del-name="' + esc(u.name) + '">Eliminar</button></td></tr>';
        }).join('') + '</tbody></table>'}
      </div>`;
  }

  function wireManageUsers() {
    root().querySelectorAll('[data-go]').forEach(function(btn) {
      btn.addEventListener('click', function() { App.go(btn.dataset.go); });
    });
    var filterBtn = document.getElementById('applyFilter');
    filterBtn && filterBtn.addEventListener('click', function() {
      App._userFilterRole = (document.getElementById('filterRole') && document.getElementById('filterRole').value) || '';
      App._userFilterSchool = (document.getElementById('filterSchool') && document.getElementById('filterSchool').value) || '';
      App.go('manage-users');
    });
    root().querySelectorAll('[data-suspend-user]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.dataset.suspendUser;
        var name = btn.dataset.suspendName;
        if (!confirm('¿Suspender temporalmente a "' + name + '"?\n\nSu cuenta quedará desactivada pero todos sus datos se conservarán.')) return;
        Storage.set(function(st) {
          if (st.users[id]) { st.users[id].suspended = true; st.users[id].suspendedAt = new Date().toISOString(); }
        });
        try { Storage.flush && Storage.flush(); } catch (_) {}
        App.go('manage-users');
        UI.flash('"' + name + '" suspendido.', 'success');
      });
    });
    root().querySelectorAll('[data-reactivate-user]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.dataset.reactivateUser;
        Storage.set(function(st) {
          if (st.users[id]) { delete st.users[id].suspended; delete st.users[id].suspendedAt; }
        });
        try { Storage.flush && Storage.flush(); } catch (_) {}
        App.go('manage-users');
        UI.flash('Usuario reactivado.', 'success');
      });
    });
    root().querySelectorAll('[data-del-user]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.dataset.delUser;
        var name = btn.dataset.delName;
        var s = Storage.get();
        var user = s.users[id];
        if (!user) return;
        if (!confirm('⚠️ ¿Eliminar permanentemente a "' + name + '"?\n\nEsta acción NO se puede deshacer. Si solo quieres desactivar la cuenta, usa "Suspender".')) return;
        Storage.set(function(st) {
          if (st.users[id] && st.users[id].classroomId && st.classrooms[st.users[id].classroomId]) {
            st.classrooms[st.users[id].classroomId].studentIds =
              (st.classrooms[st.users[id].classroomId].studentIds || []).filter(function(x) { return x !== id; });
          }
          if (st.classroomRequests) {
            Object.keys(st.classroomRequests).forEach(function(rid) {
              if (st.classroomRequests[rid].studentId === id) delete st.classroomRequests[rid];
            });
          }
          delete st.users[id];
        });
        try { Storage.flush && Storage.flush(); } catch (_) {}
        App.go('manage-users');
        UI.flash('Usuario eliminado permanentemente.', 'success');
      });
    });
  }

  const _wrap = (typeof window !== 'undefined' && window.__tfSafeScreens) || function(n, s) { return s; };
  return {
    screens: _wrap('admin', {
      'admin-dashboard': { render: screenAdminDashboard, wire: wireAdminDashboard },
      'manage-schools':  { render: screenManageSchools,  wire: wireManageSchools },
      'manage-users':    { render: screenManageUsers,    wire: wireManageUsers }
    })
  };
})();
