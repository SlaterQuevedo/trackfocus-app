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

  // ══════════════════════════════════════════════
  //  PANEL USUARIOS — CSS
  // ══════════════════════════════════════════════
  const _USERS_CSS = `
<style>
/* ── um: Users Manager ── */
.um-wrap { display:flex; flex-direction:column; gap:14px; }

/* Header */
.um-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; }
.um-header-left h1 { margin:0; font-size:22px; font-weight:800; letter-spacing:-.4px; }
.um-header-left p  { margin:4px 0 0; font-size:12px; color:var(--muted); }
.um-kpi-pills { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.um-pill { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:20px; font-size:12px; font-weight:600; white-space:nowrap; }
.um-pill-total    { background:rgba(255,255,255,.06); border:1px solid var(--border); color:var(--text); }
.um-pill-active   { background:rgba(34,197,94,.12);  border:1px solid rgba(34,197,94,.3);  color:#22c55e; }
.um-pill-suspend  { background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.3); color:#f59e0b; }
.um-pill-new      { background:rgba(139,92,246,.12); border:1px solid rgba(139,92,246,.3); color:var(--accent-2); }

/* Filter bar */
.um-filterbar { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 16px; display:flex; flex-direction:column; gap:10px; }
.um-filter-row1 { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.um-filter-row2 { display:flex; gap:8px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
.um-select { background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:8px; color:var(--text); padding:7px 10px; font-size:12px; cursor:pointer; transition:border-color .15s; }
.um-select:focus { outline:none; border-color:rgba(139,92,246,.5); }
.um-search { flex:1; min-width:200px; background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:8px; color:var(--text); padding:8px 12px 8px 34px; font-size:13px; transition:border-color .15s; }
.um-search:focus { outline:none; border-color:rgba(139,92,246,.5); box-shadow:0 0 0 3px rgba(139,92,246,.1); }
.um-search-wrap { position:relative; flex:1; min-width:200px; }
.um-search-icon { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:14px; pointer-events:none; }
.um-btn-apply { background:var(--primary); color:#fff; border:none; border-radius:8px; padding:8px 16px; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; transition:opacity .15s; }
.um-btn-apply:hover { opacity:.88; }
.um-btn-clear { background:transparent; border:1px solid var(--border); color:var(--muted); border-radius:8px; padding:8px 14px; font-size:13px; cursor:pointer; transition:all .15s; white-space:nowrap; }
.um-btn-clear:hover { border-color:rgba(255,255,255,.2); color:var(--text); }

/* Status tabs */
.um-status-tabs { display:flex; gap:4px; flex-wrap:wrap; }
.um-status-tab { padding:5px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid transparent; transition:all .15s; }
.um-status-tab:hover { background:rgba(255,255,255,.06); }
.um-status-tab.active { background:rgba(139,92,246,.15); border-color:rgba(139,92,246,.35); color:var(--accent-2); }
.um-status-tab-all    { color:var(--text); }
.um-status-tab-active { color:#22c55e; }
.um-status-tab-suspended { color:#f59e0b; }
.um-status-tab-deleted { color:#ef4444; }
.um-status-tab-pending { color:var(--muted); }

/* Activity feed */
.um-feed { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:12px; }
.um-feed-label { color:var(--muted); font-weight:600; }
.um-feed-chip { background:rgba(255,255,255,.06); border:1px solid var(--border); border-radius:20px; padding:3px 10px; color:var(--text); font-size:11px; }
.um-feed-chip-new     { background:rgba(34,197,94,.1);  border-color:rgba(34,197,94,.25);  color:#22c55e; }
.um-feed-chip-warn    { background:rgba(245,158,11,.1); border-color:rgba(245,158,11,.25); color:#f59e0b; }
.um-feed-chip-purple  { background:rgba(139,92,246,.1); border-color:rgba(139,92,246,.25); color:var(--accent-2); }

/* Layout */
.um-layout { display:grid; grid-template-columns:1fr; gap:14px; }
.um-layout-split { grid-template-columns:1fr 370px; }
@media(max-width:1024px){ .um-layout-split { grid-template-columns:1fr; } }

/* Table */
.um-table-wrap { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
.um-table-header { padding:12px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
.um-table-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); }
.um-table { width:100%; border-collapse:collapse; }
.um-table thead th { padding:10px 14px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); font-weight:600; border-bottom:1px solid var(--border); white-space:nowrap; }
.um-user-row { border-bottom:1px solid rgba(255,255,255,.04); cursor:pointer; transition:background .12s; }
.um-user-row:last-child { border-bottom:none; }
.um-user-row:hover { background:rgba(255,255,255,.03); }
.um-user-row.um-row-selected { background:rgba(139,92,246,.08); border-left:3px solid var(--accent); }
.um-user-row.um-row-selected td:first-child { padding-left:11px; }
.um-table td { padding:11px 14px; vertical-align:middle; }
.um-user-cell { display:flex; align-items:center; gap:10px; }
.um-avatar { border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; flex-shrink:0; position:relative; }
.um-avatar-dot { position:absolute; bottom:1px; right:1px; width:8px; height:8px; border-radius:50%; border:1.5px solid var(--surface); }
.um-dot-active { background:#22c55e; }
.um-dot-suspended { background:#f59e0b; }
.um-dot-deleted { background:#ef4444; }
.um-dot-pending { background:var(--muted); }
.um-user-name { font-weight:600; font-size:13px; white-space:nowrap; }
.um-user-email { font-size:11px; color:var(--muted); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; }
.um-quick-stats { font-size:10px; color:rgba(139,92,246,.8); margin-top:2px; }

/* Role badges */
.um-role-badge { display:inline-block; padding:3px 10px; border-radius:6px; font-size:11px; font-weight:700; white-space:nowrap; }
.um-role-student  { background:rgba(34,197,94,.12);  color:#22c55e; }
.um-role-teacher  { background:rgba(139,92,246,.12); color:var(--accent-2); }
.um-role-director { background:rgba(245,158,11,.12); color:#f59e0b; }
.um-role-admin    { background:rgba(200,155,109,.15); color:var(--primary); }

/* Status badges */
.um-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
.um-badge-active    { background:rgba(34,197,94,.12);  color:#22c55e; }
.um-badge-suspended { background:rgba(245,158,11,.12); color:#f59e0b; }
.um-badge-deleted   { background:rgba(239,68,68,.12);  color:#ef4444; }
.um-badge-pending   { background:rgba(156,163,175,.1); color:var(--muted); }
.um-badge-inactive  { background:rgba(100,100,100,.1); color:var(--muted); }

.um-school-cell { font-size:13px; max-width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.um-date-cell { font-size:12px; color:var(--muted); white-space:nowrap; }
.um-act-cell  { font-size:12px; color:var(--muted); white-space:nowrap; }
.um-empty { padding:48px 24px; text-align:center; color:var(--muted); font-size:13px; }

/* Detail panel */
.um-detail { background:var(--surface); border:1px solid var(--border); border-radius:14px; display:flex; flex-direction:column; overflow:hidden; }
.um-detail-top { padding:20px 18px 0; display:flex; flex-direction:column; align-items:center; text-align:center; }
.um-detail-avatar { border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:800; color:#fff; position:relative; }
.um-detail-avatar-dot { position:absolute; bottom:4px; right:4px; width:13px; height:13px; border-radius:50%; border:2.5px solid var(--surface); }
.um-detail-name  { font-size:16px; font-weight:800; margin-top:10px; line-height:1.2; }
.um-detail-email { font-size:11px; color:var(--muted); margin-top:3px; word-break:break-all; }
.um-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--border); border-top:1px solid var(--border); border-bottom:1px solid var(--border); margin-top:14px; }
.um-detail-cell { background:var(--surface); padding:10px 14px; }
.um-detail-cell-label { font-size:9px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); font-weight:600; margin-bottom:3px; }
.um-detail-cell-val   { font-size:13px; font-weight:600; }
.um-detail-feed { padding:12px 16px; flex:1; overflow-y:auto; max-height:120px; }
.um-detail-feed-title { font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); font-weight:600; margin-bottom:8px; }
.um-detail-feed-item  { display:flex; align-items:flex-start; gap:8px; margin-bottom:6px; font-size:12px; color:var(--muted); }
.um-detail-feed-dot   { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:4px; }
.um-detail-actions { padding:14px 16px; display:flex; flex-direction:column; gap:7px; border-top:1px solid var(--border); }
.um-act-btn { width:100%; padding:10px 14px; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; border:none; text-align:left; transition:opacity .15s; }
.um-act-btn:hover { opacity:.88; }
.um-act-btn-desc { font-size:10px; font-weight:400; opacity:.75; display:block; margin-top:1px; }
.um-act-suspend  { background:rgba(245,158,11,.18); color:#f59e0b;  border:1px solid rgba(245,158,11,.3); }
.um-act-reactivate { background:rgba(34,197,94,.15);  color:#22c55e; border:1px solid rgba(34,197,94,.3); }
.um-act-del-temp { background:rgba(249,115,22,.12); color:#f97316;  border:1px solid rgba(249,115,22,.3); }
.um-act-restore  { background:rgba(59,130,246,.12); color:#3b82f6;  border:1px solid rgba(59,130,246,.3); }
.um-act-del-perm { background:rgba(239,68,68,.12);  color:#ef4444;  border:1px solid rgba(239,68,68,.3); }
.um-act-sessions { background:rgba(255,255,255,.05); color:var(--muted); border:1px solid var(--border); }
.um-close-panel  { background:transparent; border:none; color:var(--muted); font-size:18px; cursor:pointer; line-height:1; padding:2px 6px; border-radius:4px; }
.um-close-panel:hover { color:var(--text); }

/* Mobile: rows as cards */
@media(max-width:640px){
  .um-table thead { display:none; }
  .um-user-row { display:block; padding:12px; border-bottom:1px solid var(--border); }
  .um-user-row td { display:inline-block; padding:2px 6px 2px 0; border:none; vertical-align:top; }
  .um-user-row td:first-child { display:block; width:100%; padding:0 0 6px; }
  .um-school-cell,.um-date-cell,.um-act-cell { font-size:11px; }
}

/* Checkboxes */
.um-cb { width:15px; height:15px; cursor:pointer; accent-color:var(--accent); }
.um-th-cb { width:34px; padding:0 6px !important; text-align:center; }
.um-td-cb { width:34px; padding:0 6px !important; text-align:center; }

/* Bulk action bar */
.um-bulk-bar { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#1e2535; border:1px solid rgba(139,92,246,.4); border-radius:14px; padding:12px 20px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; z-index:999; box-shadow:0 8px 32px rgba(0,0,0,.5); transition:opacity .2s; }
.um-bulk-count { font-size:13px; font-weight:700; color:var(--accent-2); white-space:nowrap; padding-right:8px; border-right:1px solid var(--border); }
.um-bulk-btn { padding:7px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid; white-space:nowrap; transition:opacity .15s; }
.um-bulk-btn:hover { opacity:.82; }
.um-bulk-move    { background:rgba(139,92,246,.15); border-color:rgba(139,92,246,.35); color:var(--accent-2); }
.um-bulk-suspend { background:rgba(245,158,11,.12); border-color:rgba(245,158,11,.3); color:#f59e0b; }
.um-bulk-reactivate { background:rgba(34,197,94,.12); border-color:rgba(34,197,94,.3); color:#22c55e; }
.um-bulk-quitar  { background:rgba(249,115,22,.1);  border-color:rgba(249,115,22,.25); color:#f97316; }
.um-bulk-cancel  { background:transparent; border-color:var(--border); color:var(--muted); }
.um-bulk-move-form { display:flex; gap:8px; align-items:center; flex-wrap:wrap; padding-top:8px; border-top:1px solid var(--border); width:100%; }

/* Change classroom section in detail panel */
.um-change-cr-btn  { background:rgba(59,130,246,.12); border:1px solid rgba(59,130,246,.3); color:#3b82f6; }
.um-act-tutor { background:rgba(200,155,109,.12); border:1px solid rgba(200,155,109,.3); color:var(--primary); }
.um-change-cr-section { background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px; margin-top:4px; }
.um-change-cr-section label { font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); font-weight:600; }

/* Role management section */
.um-role-mgmt-btn { background:rgba(200,155,109,.12); border:1px solid rgba(200,155,109,.3); color:var(--primary); }
.um-role-section { background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; margin-top:4px; }
.um-role-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--primary); }
.um-role-option { display:flex; align-items:flex-start; gap:10px; padding:9px 11px; border-radius:8px; border:1px solid var(--border); cursor:pointer; transition:all .15s; }
.um-role-option:hover { background:rgba(139,92,246,.06); border-color:rgba(139,92,246,.3); }
.um-role-option input[type=radio] { margin-top:2px; accent-color:var(--accent); flex-shrink:0; }
.um-role-option-lbl { font-size:13px; font-weight:600; }
.um-role-option-desc { font-size:11px; color:var(--muted); margin-top:1px; }
.um-role-option.selected-opt { background:rgba(139,92,246,.1); border-color:rgba(139,92,246,.4); }
.um-audit-strip { font-size:11px; color:var(--muted); background:rgba(255,255,255,.03); border-radius:7px; padding:8px 10px; line-height:1.6; }
.um-audit-title { font-size:9px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); font-weight:700; margin-bottom:4px; }
</style>`;

  // ══════════════════════════════════════════════
  //  PANEL USUARIOS — RENDER
  // ══════════════════════════════════════════════
  function screenManageUsers() {
    const s = Storage.get();
    const now = new Date();
    const sessions = s.sessions || [];
    const schools  = Schools.listSchools();

    // Director detection
    const directorIds = new Set(schools.flatMap(function(sc) { return sc.adminIds || []; }));

    // Filter state
    const filterRole   = App._userFilterRole   || '';
    const filterSchool = App._userFilterSchool || '';
    const filterClass  = App._userFilterClass  || '';
    const filterStatus = App._userFilterStatus || '';
    const filterDate   = App._userFilterDate   || '';
    const filterSearch = App._userFilterSearch || '';
    const selectedId   = App._selectedUserId   || null;

    // ── Helpers ──
    function getRoleLabel(u) {
      if (u.role === 'super_admin') return 'Super Admin';
      if (u.role === 'teacher' && directorIds.has(u.id)) return 'Director';
      if (u.role === 'teacher') return 'Docente';
      return 'Estudiante';
    }
    function getStatus(u) {
      if (u.temporarilyDeleted) return 'deleted';
      if (u.suspended) return 'suspended';
      if (u.approvalStatus === 'pending') return 'pending';
      if (u.approvalStatus === 'approved' || u.classroomId || u.role === 'super_admin') return 'active';
      return 'pending';
    }
    function fmtRelTime(date) {
      if (!date) return 'Nunca';
      const diff = now - new Date(date);
      const mins = Math.floor(diff / 60000);
      if (mins < 2) return 'Hace un momento';
      if (mins < 60) return `Hace ${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
      const days = Math.floor(hours / 24);
      if (days === 1) return 'Ayer';
      if (days < 30) return `Hace ${days} días`;
      return new Date(date).toLocaleDateString('es-PE', { day:'numeric', month:'short' });
    }
    function fmtDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('es-PE', { day:'numeric', month:'short', year:'numeric' });
    }
    function avatarBg(name) {
      const colors = ['#8B5CF6','#C89B6D','#0ea5e9','#22c55e','#ec4899','#f97316','#6366f1','#14b8a6'];
      let h = 0;
      for (let i = 0; i < (name||'').length; i++) h = ((h * 31) + (name||'').charCodeAt(i)) | 0;
      return colors[Math.abs(h) % colors.length];
    }
    function initials(name) {
      const parts = (name||'?').trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return (parts[0]||'?')[0].toUpperCase();
    }
    function avatarEl(name, size, status) {
      const sz = size || 36;
      const bg = avatarBg(name);
      const ini = initials(name);
      const dotClass = status === 'active' ? 'um-dot-active' : status === 'suspended' ? 'um-dot-suspended' : status === 'deleted' ? 'um-dot-deleted' : 'um-dot-pending';
      return `<div class="um-avatar" style="width:${sz}px;height:${sz}px;background:${bg};font-size:${Math.round(sz*0.33)}px;">${ini}<div class="um-avatar-dot ${dotClass}"></div></div>`;
    }
    function statusBadge(u) {
      const st = getStatus(u);
      if (st === 'active')    return '<span class="um-badge um-badge-active">● Activo</span>';
      if (st === 'suspended') return '<span class="um-badge um-badge-suspended">● Suspendido</span>';
      if (st === 'deleted')   return '<span class="um-badge um-badge-deleted">● Eliminado temporalmente</span>';
      if (st === 'pending')   return '<span class="um-badge um-badge-pending">● Pendiente</span>';
      return '<span class="um-badge um-badge-inactive">● Inactivo</span>';
    }
    function roleBadge(u) {
      const r = getRoleLabel(u);
      const cls = { 'Estudiante':'um-role-student', 'Docente':'um-role-teacher', 'Director':'um-role-director', 'Super Admin':'um-role-admin' }[r] || 'um-role-teacher';
      return `<span class="um-role-badge ${cls}">${r}</span>`;
    }
    function quickStats(u) {
      if (u.role === 'student') {
        const ses = sessions.filter(function(se) { return se.email === u.id; });
        if (!ses.length) return '';
        const mins = ses.reduce(function(a, b) { return a + (b.durationMin || 0); }, 0);
        return `<div class="um-quick-stats">Sesiones realizadas: ${ses.length} · Minutos estudiados: ${mins}</div>`;
      }
      if (u.role === 'teacher' && !directorIds.has(u.id)) {
        const tutorCr = Schools.getTutorClassroom(u.id);
        if (tutorCr) return `<div class="um-quick-stats" style="color:var(--primary);font-weight:700;">Tutor de ${esc(tutorCr.name)}</div>`;
        const cls = Object.values(s.classrooms || {}).filter(function(c) { return (c.teacherIds||[]).includes(u.id); });
        return cls.length ? `<div class="um-quick-stats">Aulas gestionadas: ${cls.length}</div>` : '<div class="um-quick-stats">Sin aula asignada</div>';
      }
      if (directorIds.has(u.id)) {
        const scs = schools.filter(function(sc) { return (sc.adminIds||[]).includes(u.id); });
        return scs.length ? `<div class="um-quick-stats">Colegios supervisados: ${scs.length}</div>` : '';
      }
      return '';
    }
    function getLastActivityDate(uid) {
      const us = sessions.filter(function(se) { return se.email === uid; });
      if (!us.length) return null;
      return new Date(Math.max.apply(null, us.map(function(se) { return +new Date(se.datetime); })));
    }

    // ── KPIs ──
    const allUsers   = Object.values(s.users);
    const activeCount    = allUsers.filter(function(u) { return getStatus(u) === 'active'; }).length;
    const suspendedCount = allUsers.filter(function(u) { return u.suspended; }).length;
    const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth   = allUsers.filter(function(u) { return new Date(u.createdAt) >= startOfMonth; }).length;

    // ── Activity feed ──
    const last24h = new Date(+now - 86400000);
    const newStudents24h = allUsers.filter(function(u) { return u.role === 'student' && new Date(u.createdAt) >= last24h; }).length;
    const suspended24h   = allUsers.filter(function(u) { return u.suspended && u.suspendedAt && new Date(u.suspendedAt) >= last24h; }).length;
    const newDirs24h     = allUsers.filter(function(u) { return directorIds.has(u.id) && new Date(u.createdAt) >= last24h; }).length;
    const activeUsers24h = new Set(sessions.filter(function(se) { return new Date(se.datetime) >= last24h; }).map(function(se) { return se.email; })).size;

    const feedItems = [];
    if (newStudents24h > 0) feedItems.push({ text: `${newStudents24h} nuevo${newStudents24h!==1?'s':''} estudiante${newStudents24h!==1?'s':''} hoy`, cls: 'um-feed-chip-new' });
    if (suspended24h   > 0) feedItems.push({ text: `${suspended24h} cuenta${suspended24h!==1?'s':''} suspendida${suspended24h!==1?'s':''}`, cls: 'um-feed-chip-warn' });
    if (newDirs24h     > 0) feedItems.push({ text: `${newDirs24h} director${newDirs24h!==1?'es':''} agregado${newDirs24h!==1?'s':''}`, cls: 'um-feed-chip-purple' });
    if (activeUsers24h > 0) feedItems.push({ text: `${activeUsers24h} usuario${activeUsers24h!==1?'s':''} activos`, cls: 'um-feed-chip' });
    if (!feedItems.length)  feedItems.push({ text: 'Sin actividad reciente', cls: 'um-feed-chip' });

    // ── Filter users ──
    let users = allUsers.slice();

    if (filterRole === 'director')    { users = users.filter(function(u) { return directorIds.has(u.id); }); }
    else if (filterRole === 'student')     { users = users.filter(function(u) { return u.role === 'student'; }); }
    else if (filterRole === 'teacher')     { users = users.filter(function(u) { return u.role === 'teacher' && !directorIds.has(u.id); }); }
    else if (filterRole === 'super_admin') { users = users.filter(function(u) { return u.role === 'super_admin'; }); }

    if (filterSchool) users = users.filter(function(u) { return u.schoolId === filterSchool; });
    if (filterClass)  users = users.filter(function(u) { return u.classroomId === filterClass || (u.classroomIds||[]).includes(filterClass); });

    if (filterStatus === 'active')    { users = users.filter(function(u) { return getStatus(u) === 'active'; }); }
    else if (filterStatus === 'suspended') { users = users.filter(function(u) { return u.suspended; }); }
    else if (filterStatus === 'deleted')   { users = users.filter(function(u) { return u.temporarilyDeleted; }); }
    else if (filterStatus === 'pending')   { users = users.filter(function(u) { return u.approvalStatus === 'pending'; }); }

    if (filterDate) {
      let cutoff = new Date(now);
      if (filterDate === 'today') { cutoff.setHours(0,0,0,0); }
      else if (filterDate === '7')  { cutoff = new Date(+now - 7  * 86400000); }
      else if (filterDate === '30') { cutoff = new Date(+now - 30 * 86400000); }
      users = users.filter(function(u) { return new Date(u.createdAt) >= cutoff; });
    }

    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      users = users.filter(function(u) {
        const sn = (u.schoolId   && s.schools[u.schoolId]?.name)     || '';
        const cn = (u.classroomId && s.classrooms[u.classroomId]?.name) || '';
        return (u.name||'').toLowerCase().includes(q) ||
               (u.email||'').toLowerCase().includes(q) ||
               sn.toLowerCase().includes(q) ||
               cn.toLowerCase().includes(q);
      });
    }

    users.sort(function(a, b) { return (a.name||'').localeCompare(b.name||''); });

    // ── Selected user ──
    const selectedUser = selectedId ? s.users[selectedId] : null;

    // ── Classrooms for school filter ──
    const schoolClassrooms = filterSchool
      ? Object.values(s.classrooms||{}).filter(function(c) { return c.schoolId === filterSchool; })
      : [];

    // ── Detail panel HTML ──
    function renderDetailPanel(u) {
      const st = getStatus(u);
      const lastDate = getLastActivityDate(u.id);
      const lastAct  = lastDate ? fmtRelTime(lastDate) : 'Nunca';
      const schoolName = (u.schoolId && s.schools[u.schoolId]?.name) || 'Sin asignar';
      const crName = (u.classroomId && s.classrooms[u.classroomId]?.name) || '—';
      const roleLabel = getRoleLabel(u);
      const dotClass = st === 'active' ? 'um-dot-active' : st === 'suspended' ? 'um-dot-suspended' : st === 'deleted' ? 'um-dot-deleted' : 'um-dot-pending';

      // Activity for this user
      const uSessions = sessions.filter(function(se) { return se.email === u.id; });
      const totalMins = uSessions.reduce(function(a, b) { return a + (b.durationMin||0); }, 0);
      const avgConc = uSessions.length ? (uSessions.reduce(function(a, b) { return a + b.concentration; }, 0) / uSessions.length).toFixed(1) : '—';

      // Audit log for this user
      const auditLogs = ((s.roleChangeLogs)||[]).filter(function(l){ return l.userId === u.id; }).slice(-3).reverse();

      const feedDots = [
        { color:'#22c55e', text: `${uSessions.length} sesiones registradas` },
        { color:'var(--primary)', text: `${totalMins} minutos estudiados` },
        { color:'var(--accent-2)', text: avgConc !== '—' ? `Concentración promedio: ${avgConc}/5` : 'Sin sesiones aún' },
        { color:'var(--muted)', text: `Registrado: ${fmtDate(u.createdAt)}` }
      ];

      return `
      <div class="um-detail">
        <div class="um-detail-top" style="padding-bottom:14px;">
          <div style="display:flex;justify-content:flex-end;width:100%;margin-bottom:6px;">
            <button class="um-close-panel" id="btnClosePanel" title="Cerrar panel">✕</button>
          </div>
          <div class="um-detail-avatar" style="width:72px;height:72px;background:${avatarBg(u.name)};font-size:24px;">
            ${initials(u.name)}
            <div class="um-avatar-dot ${dotClass}" style="width:14px;height:14px;border-width:3px;bottom:3px;right:3px;"></div>
          </div>
          <div class="um-detail-name">${esc(u.name)}</div>
          <div class="um-detail-email">${esc(u.email)}</div>
          <div style="margin-top:8px;">${statusBadge(u)}</div>
        </div>

        <div class="um-detail-grid">
          <div class="um-detail-cell">
            <div class="um-detail-cell-label">Rol</div>
            <div class="um-detail-cell-val">${roleBadge(u)}</div>
          </div>
          <div class="um-detail-cell">
            <div class="um-detail-cell-label">Aula</div>
            <div class="um-detail-cell-val" style="font-size:13px;">${esc(crName)}</div>
          </div>
          <div class="um-detail-cell">
            <div class="um-detail-cell-label">Fecha de registro</div>
            <div class="um-detail-cell-val" style="font-size:12px;">${fmtDate(u.createdAt)}</div>
          </div>
          <div class="um-detail-cell">
            <div class="um-detail-cell-label">Última actividad</div>
            <div class="um-detail-cell-val" style="font-size:12px;">${lastAct}</div>
          </div>
        </div>

        <div class="um-detail-feed">
          <div class="um-detail-feed-title">Actividad reciente</div>
          ${feedDots.map(function(f) {
            return `<div class="um-detail-feed-item">
              <div class="um-detail-feed-dot" style="background:${f.color};"></div>
              <span>${f.text}</span>
            </div>`;
          }).join('')}
          ${u.schoolId ? `<div class="um-detail-feed-item"><div class="um-detail-feed-dot" style="background:var(--muted);"></div><span>Colegio: ${esc(schoolName)}</span></div>` : ''}
          ${auditLogs.length > 0 ? `<div style="margin-top:8px;"><div class="um-audit-title">Historial de cambios de rol</div>${auditLogs.map(function(l){
            var rd = (function(lbl){return {'student':'Estudiante','teacher':'Docente','director':'Director','super_admin':'Super Admin'}[lbl]||lbl;})(l.fromRole);
            var rn = (function(lbl){return {'student':'Estudiante','teacher':'Docente','director':'Director','super_admin':'Super Admin'}[lbl]||lbl;})(l.toRole);
            return '<div class="um-audit-strip">'+rd+' → '+rn+' · por '+esc(l.adminName)+' · '+new Date(l.changedAt).toLocaleDateString('es-PE')+'</div>';
          }).join('')}</div>` : ''}
        </div>

        <div class="um-detail-actions">
          ${u.role !== 'super_admin'
            ? (function(){
              var curRoleKey = directorIds.has(u.id) ? 'director' : u.role;
              var opts = [];
              if (curRoleKey !== 'student')    opts.push({ key:'student',    label:'Estudiante',  desc:'Acceso a panel personal de estudio.' });
              if (curRoleKey !== 'teacher')    opts.push({ key:'teacher',    label:'Docente',     desc:'Gestiona aulas y solicitudes de ingreso.' });
              if (curRoleKey !== 'director')   opts.push({ key:'director',   label:'Director',    desc:'Supervisa el colegio completo.' });
              if (!opts.length) return '';
              return `<button class="um-act-btn um-role-mgmt-btn" id="umBtnRoleMgmt">
                Gestionar rol
                <span class="um-act-btn-desc">Rol actual: <strong>${curRoleKey==='director'?'Director':curRoleKey==='teacher'?'Docente':'Estudiante'}</strong> · Sin perder datos ni historial.</span>
              </button>
              <div class="um-role-section" id="umRoleSection" style="display:none;">
                <div class="um-role-section-title">Cambiar rol de ${esc(u.name)}</div>
                <div style="font-size:11px;color:var(--muted);">Rol actual: <strong>${curRoleKey==='director'?'Director':curRoleKey==='teacher'?'Docente':'Estudiante'}</strong> — Todo el historial se conserva.</div>
                ${opts.map(function(opt){
                  return '<label class="um-role-option"><input type="radio" name="umNewRole" value="'+opt.key+'" /><div><div class="um-role-option-lbl">'+opt.label+'</div><div class="um-role-option-desc">'+opt.desc+'</div></div></label>';
                }).join('')}
                ${opts.some(function(o){return o.key==='director';}) ? `<div id="umRoleDirectorSchool" style="display:none;">
                  <label style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);font-weight:600;">Asignar al colegio</label>
                  <select class="um-select" id="umDirectorSchoolSel" style="width:100%;margin-top:4px;">
                    <option value="${esc(u.schoolId||'')}">Mismo colegio${u.schoolId&&s.schools[u.schoolId]?' ('+esc(s.schools[u.schoolId].name)+')':''}</option>
                    ${schools.filter(function(sc){return sc.id!==u.schoolId;}).map(function(sc){return '<option value="'+esc(sc.id)+'">'+esc(sc.name)+'</option>';}).join('')}
                  </select>
                </div>` : ''}
                <div>
                  <input type="text" class="um-search" id="umRoleMotivo" placeholder="Motivo del cambio (opcional)" style="margin-bottom:0;min-width:0;width:100%;box-sizing:border-box;" />
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="um-btn-apply" id="umSaveRoleChange" data-uid="${esc(u.id)}" data-current-role="${esc(curRoleKey)}">Guardar cambio</button>
                  <button class="um-btn-clear" id="umCancelRoleChange">Cancelar</button>
                </div>
              </div>`;
            })()
            : ''}
          ${u.role === 'student'
            ? (function(){
              var crs = Schools.listClassrooms(u.schoolId || '');
              return `<button class="um-act-btn um-change-cr-btn" id="umBtnChangeCr">
                Cambiar colegio / aula
                <span class="um-act-btn-desc">Reasignar directamente sin código.</span>
              </button>
              <div class="um-change-cr-section" id="umChangeCrSection" style="display:none;">
                <label>Colegio</label>
                <select class="um-select" id="umChangeCrSchool" style="width:100%;">
                  <option value="">Sin colegio</option>
                  ${schools.map(function(sc){return '<option value="'+esc(sc.id)+'"'+(u.schoolId===sc.id?' selected':'')+'>'+esc(sc.name)+'</option>';}).join('')}
                </select>
                <label>Aula</label>
                <select class="um-select" id="umChangeCrClass" style="width:100%;">
                  <option value="">Sin aula</option>
                  ${crs.map(function(cr){return '<option value="'+esc(cr.id)+'"'+(u.classroomId===cr.id?' selected':'')+'>'+esc(cr.name)+'</option>';}).join('')}
                </select>
                <div style="display:flex;gap:6px;">
                  <button class="um-btn-apply" id="umSaveChangeCr" data-uid="${esc(u.id)}">Guardar asignación</button>
                  <button class="um-btn-clear" id="umCancelChangeCr">Cancelar</button>
                </div>
              </div>`;
            })()
            : ''}
          ${u.role === 'teacher' && !directorIds.has(u.id)
            ? (function(){
              var tutorCr = Schools.getTutorClassroom(u.id);
              var schoolCrs = u.schoolId ? Schools.listClassrooms(u.schoolId) : [];
              return `<button class="um-act-btn um-act-tutor" id="umBtnTutorMgmt">
                ${tutorCr ? 'Tutor de: ' + esc(tutorCr.name) : 'Asignar como tutor de aula'}
                <span class="um-act-btn-desc">${tutorCr ? 'Cambiar o quitar la asignación de tutoría.' : 'Asignar este docente como tutor responsable de un aula.'}</span>
              </button>
              <div id="umTutorSection" style="display:none;background:rgba(200,155,109,.06);border:1px solid rgba(200,155,109,.2);border-radius:10px;padding:12px;margin-top:4px;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--primary);margin-bottom:8px;">${tutorCr ? 'Cambiar aula de tutoría' : 'Seleccionar aula'}</div>
                ${schoolCrs.length === 0
                  ? '<div style="font-size:12px;color:var(--muted);padding:4px 0;">No hay aulas disponibles en el colegio de este docente.</div>'
                  : `<select class="um-select" id="umTutorClassSel" style="width:100%;margin-bottom:8px;">
                      <option value="">— Seleccionar aula —</option>
                      ${schoolCrs.map(function(cr){
                        var isCurrent = tutorCr && tutorCr.id === cr.id;
                        var existingTutor = cr.tutorId && cr.tutorId !== u.id && s.users[cr.tutorId];
                        var label = esc(cr.name) + (isCurrent ? ' ✓ actual' : existingTutor ? ' (tutor: '+esc(existingTutor.name)+')' : '');
                        return '<option value="'+esc(cr.id)+'"'+(isCurrent?' selected':'')+'>'+label+'</option>';
                      }).join('')}
                    </select>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button class="um-btn-apply" id="umSaveTutor" data-uid="${esc(u.id)}">Guardar</button>
                      ${tutorCr ? `<button class="um-btn-clear" id="umRemoveTutor" data-uid="${esc(u.id)}" data-cr-id="${esc(tutorCr.id)}" data-tutor-name="${esc(u.name)}" style="background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.2);color:#ef4444;">Quitar tutoría</button>` : ''}
                      <button class="um-btn-clear" id="umCancelTutor">Cancelar</button>
                    </div>`
                }
              </div>`;
            })()
            : ''}
          ${!u.suspended && !u.temporarilyDeleted
            ? `<button class="um-act-btn um-act-suspend" data-action-suspend="${esc(u.id)}" data-action-name="${esc(u.name)}">
                Suspender temporalmente
                <span class="um-act-btn-desc">La cuenta queda desactivada. Los datos se conservan.</span>
              </button>`
            : ''}
          ${u.suspended
            ? `<button class="um-act-btn um-act-reactivate" data-action-reactivate="${esc(u.id)}">
                Reactivar cuenta
                <span class="um-act-btn-desc">Devuelve el acceso completo al usuario.</span>
              </button>`
            : ''}
          ${!u.temporarilyDeleted
            ? `<button class="um-act-btn um-act-del-temp" data-action-deltemp="${esc(u.id)}" data-action-name="${esc(u.name)}">
                Eliminar temporalmente
                <span class="um-act-btn-desc">Oculta la cuenta. Los datos se conservan y es reversible.</span>
              </button>`
            : `<button class="um-act-btn um-act-restore" data-action-restore="${esc(u.id)}">
                Restaurar cuenta
                <span class="um-act-btn-desc">Reactiva la cuenta eliminada temporalmente.</span>
              </button>`}
          <button class="um-act-btn um-act-del-perm" data-action-delperm="${esc(u.id)}" data-action-name="${esc(u.name)}">
            Eliminar permanentemente
            <span class="um-act-btn-desc">⚠ Irreversible. Requiere doble confirmación.</span>
          </button>
          <button class="um-act-btn um-act-sessions" data-action-sessions="${esc(u.id)}" data-action-name="${esc(u.name)}">
            Cerrar sesiones activas
            <span class="um-act-btn-desc">Fuerza nuevo inicio de sesión.</span>
          </button>
        </div>
      </div>`;
    }

    // ── Build table rows ──
    const tableRows = users.map(function(u) {
      const st = getStatus(u);
      const schoolName = (u.schoolId   && s.schools[u.schoolId]?.name)     || 'Sin asignar';
      const crName     = (u.classroomId && s.classrooms[u.classroomId]?.name) || '—';
      const lastDate   = getLastActivityDate(u.id);
      const lastAct    = lastDate ? fmtRelTime(lastDate) : 'Nunca';
      const isSelected = u.id === selectedId;
      const searchData = [(u.name||''), (u.email||''), schoolName, crName].join(' ').toLowerCase();

      return `<tr class="um-user-row${isSelected ? ' um-row-selected' : ''}" data-uid="${esc(u.id)}" data-search="${esc(searchData)}">
        <td class="um-td-cb" onclick="event.stopPropagation()"><input type="checkbox" class="um-row-cb um-cb" data-uid="${esc(u.id)}" /></td>
        <td>
          <div class="um-user-cell">
            ${avatarEl(u.name, 36, st)}
            <div>
              <div class="um-user-name">${esc(u.name)}</div>
              <div class="um-user-email">${esc(u.email)}</div>
              ${quickStats(u)}
            </div>
          </div>
        </td>
        <td>${roleBadge(u)}</td>
        <td><div class="um-school-cell">${esc(schoolName)}</div></td>
        <td style="font-size:13px;white-space:nowrap;">${esc(crName)}</td>
        <td>${statusBadge(u)}</td>
        <td class="um-date-cell">${fmtDate(u.createdAt)}</td>
        <td class="um-act-cell">${lastAct}</td>
      </tr>`;
    }).join('');

    const statusTabItems = [
      { key: '', label: 'Todos', cls: 'um-status-tab-all' },
      { key: 'active', label: 'Activos', cls: 'um-status-tab-active' },
      { key: 'suspended', label: 'Suspendidos', cls: 'um-status-tab-suspended' },
      { key: 'deleted', label: 'Eliminados temporalmente', cls: 'um-status-tab-deleted' },
      { key: 'pending', label: 'Pendientes', cls: 'um-status-tab-pending' }
    ];

    const hasPanel = !!selectedUser;

    return `${_USERS_CSS}
<div class="um-wrap">

  <!-- ── Header ── -->
  <div class="um-header">
    <div class="um-header-left">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
        <button class="ghost" data-go="admin-dashboard" style="padding:6px 12px;font-size:12px;">← Volver</button>
        <h1>Gestión de Usuarios</h1>
      </div>
      <p>Administra estudiantes, docentes, directores y administradores desde un solo lugar.</p>
    </div>
    <div class="um-kpi-pills">
      <span class="um-pill um-pill-total">Usuarios totales: <strong>${allUsers.length.toLocaleString()}</strong></span>
      <span class="um-pill um-pill-active">Activos: <strong>${activeCount.toLocaleString()}</strong></span>
      <span class="um-pill um-pill-suspend">Suspendidos: <strong>${suspendedCount}</strong></span>
      <span class="um-pill um-pill-new">Nuevos este mes: <strong>${newThisMonth}</strong></span>
    </div>
  </div>

  <!-- ── Filter bar ── -->
  <div class="um-filterbar">
    <div class="um-filter-row1">
      <select class="um-select" id="umFilterRole">
        <option value="">Rol: Todos</option>
        <option value="student"    ${filterRole==='student'?'selected':''}>Estudiantes</option>
        <option value="teacher"    ${filterRole==='teacher'?'selected':''}>Docentes</option>
        <option value="director"   ${filterRole==='director'?'selected':''}>Directores</option>
        <option value="super_admin"${filterRole==='super_admin'?'selected':''}>Super Admin</option>
      </select>
      <select class="um-select" id="umFilterSchool">
        <option value="">Colegio: Todos</option>
        ${schools.map(function(sc) { return `<option value="${esc(sc.id)}" ${filterSchool===sc.id?'selected':''}>${esc(sc.name)}</option>`; }).join('')}
      </select>
      <select class="um-select" id="umFilterClass" ${!schoolClassrooms.length ? 'disabled' : ''}>
        <option value="">Aula: ${filterSchool ? 'Todas' : '— (elige colegio)'}</option>
        ${schoolClassrooms.map(function(c) { return `<option value="${esc(c.id)}" ${filterClass===c.id?'selected':''}>${esc(c.name)}</option>`; }).join('')}
      </select>
      <div class="um-search-wrap">
        <span class="um-search-icon">🔍</span>
        <input class="um-search" id="umSearchInput" type="text" placeholder="Buscar usuario... nombre, e-mail, colegio, aula" value="${esc(filterSearch)}" />
      </div>
      <button class="um-btn-apply" id="umBtnApply">Aplicar filtros</button>
      <button class="um-btn-clear" id="umBtnClear">Limpiar</button>
    </div>
    <div class="um-filter-row2">
      <div class="um-status-tabs">
        ${statusTabItems.map(function(t) {
          return `<span class="um-status-tab ${t.cls}${filterStatus===t.key?' active':''}" data-status-tab="${t.key}">${t.label}</span>`;
        }).join('')}
      </div>
      <select class="um-select" id="umFilterDate">
        <option value="">Fecha de registro: Todos</option>
        <option value="today" ${filterDate==='today'?'selected':''}>Hoy</option>
        <option value="7"     ${filterDate==='7'?'selected':''}>Últimos 7 días</option>
        <option value="30"    ${filterDate==='30'?'selected':''}>Últimos 30 días</option>
      </select>
    </div>
  </div>

  <!-- ── Activity feed ── -->
  <div class="um-feed">
    <span class="um-feed-label">Actividad reciente:</span>
    ${feedItems.map(function(f) { return `<span class="um-feed-chip ${f.cls}">${f.text}</span>`; }).join('')}
  </div>

  <!-- ── Main layout ── -->
  <div class="um-layout${hasPanel ? ' um-layout-split' : ''}">

    <!-- Table -->
    <div class="um-table-wrap">
      <div class="um-table-header">
        <span class="um-table-title">${users.length} usuario${users.length !== 1 ? 's' : ''} ${filterStatus || filterRole || filterSearch ? '(filtrado)' : ''}</span>
        <button class="ghost" id="btnDiagLog" style="font-size:11px;padding:4px 10px;">🩺 Diagnóstico</button>
      </div>
      ${users.length === 0
        ? `<div class="um-empty">
            <div style="font-size:32px;margin-bottom:8px;">👤</div>
            <div style="font-size:15px;font-weight:600;margin-bottom:4px;">Sin usuarios</div>
            <div>No se encontraron usuarios con los filtros actuales.</div>
          </div>`
        : `<div style="overflow-x:auto;">
          <table class="um-table">
            <thead><tr>
              <th class="um-th-cb"><input type="checkbox" class="um-cb" id="umSelectAll" title="Seleccionar todos" /></th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Colegio</th>
              <th>Aula</th>
              <th>Estado actual</th>
              <th>Fecha de registro</th>
              <th>Última actividad</th>
            </tr></thead>
            <tbody id="umTableBody">
              ${tableRows}
            </tbody>
          </table>
        </div>`}
    </div>

    <!-- Detail panel -->
    ${hasPanel ? renderDetailPanel(selectedUser) : ''}

  </div>
</div>

<!-- Bulk action bar (hidden until checkboxes selected) -->
<div class="um-bulk-bar" id="umBulkBar" style="display:none;">
  <span class="um-bulk-count" id="umBulkCount">0 seleccionados</span>
  <div id="umBulkActions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
    <button class="um-bulk-btn um-bulk-move" id="umBulkMoveBtn">Mover a aula</button>
    <button class="um-bulk-btn um-bulk-suspend" id="umBulkSuspendBtn">Suspender</button>
    <button class="um-bulk-btn um-bulk-reactivate" id="umBulkReactivateBtn">Reactivar</button>
    <button class="um-bulk-btn um-bulk-quitar" id="umBulkQuitarBtn">Quitar aula</button>
    <button class="um-bulk-btn um-bulk-cancel" id="umBulkCancelBtn">✕ Cancelar</button>
  </div>
  <div class="um-bulk-move-form" id="umBulkMoveForm" style="display:none;">
    <select class="um-select" id="umBulkSchoolSel">
      <option value="">Seleccionar colegio...</option>
      ${schools.map(function(sc){return '<option value="'+esc(sc.id)+'">'+esc(sc.name)+'</option>';}).join('')}
    </select>
    <select class="um-select" id="umBulkClassSel" disabled>
      <option value="">Elige colegio primero</option>
    </select>
    <button class="um-btn-apply" id="umBulkMoveConfirm">Mover seleccionados</button>
    <button class="um-btn-clear" id="umBulkMoveCancel">Cancelar</button>
  </div>
</div>`;
  }

  // ══════════════════════════════════════════════
  //  PANEL USUARIOS — WIRING
  // ══════════════════════════════════════════════
  function wireManageUsers() {

    // ── Navegación ──
    root().querySelectorAll('[data-go]').forEach(function(btn) {
      btn.addEventListener('click', function() { App.go(btn.dataset.go); });
    });

    // ── Diagnóstico ──
    var diagBtn = document.getElementById('btnDiagLog');
    diagBtn && diagBtn.addEventListener('click', function() {
      try { window.Monitor && window.Monitor.exportLog && window.Monitor.exportLog(); UI.flash('Registro exportado.', 'success'); }
      catch(_) { UI.flash('No disponible.', 'error'); }
    });

    // ── Status tabs ──
    root().querySelectorAll('[data-status-tab]').forEach(function(tab) {
      tab.addEventListener('click', function() {
        App._userFilterStatus = tab.dataset.statusTab;
        App.go('manage-users');
      });
    });

    // ── Aplicar filtros ──
    var applyBtn = document.getElementById('umBtnApply');
    applyBtn && applyBtn.addEventListener('click', function() {
      App._userFilterRole   = (document.getElementById('umFilterRole')   && document.getElementById('umFilterRole').value)   || '';
      App._userFilterSchool = (document.getElementById('umFilterSchool') && document.getElementById('umFilterSchool').value) || '';
      App._userFilterClass  = (document.getElementById('umFilterClass')  && document.getElementById('umFilterClass').value)  || '';
      App._userFilterDate   = (document.getElementById('umFilterDate')   && document.getElementById('umFilterDate').value)   || '';
      App._userFilterSearch = (document.getElementById('umSearchInput')  && document.getElementById('umSearchInput').value)  || '';
      App.go('manage-users');
    });

    // ── Search: Enter key también aplica ──
    var searchInput = document.getElementById('umSearchInput');
    if (searchInput) {
      // Live search via DOM manipulation (sin re-render) — debounced 120ms
      var _umSearchT;
      searchInput.addEventListener('input', function() {
        clearTimeout(_umSearchT);
        _umSearchT = setTimeout(function() {
          var q = searchInput.value.toLowerCase();
          root().querySelectorAll('.um-user-row').forEach(function(row) {
            var text = row.dataset.search || '';
            row.style.display = text.includes(q) ? '' : 'none';
          });
          // Update count badge
          var visible = root().querySelectorAll('.um-user-row:not([style*="none"])').length;
          var titleEl = root().querySelector('.um-table-title');
          if (titleEl) titleEl.textContent = visible + ' usuario' + (visible !== 1 ? 's' : '') + (q ? ' (filtrado)' : '');
        }, 120);
      });
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          App._userFilterSearch = searchInput.value;
          App.go('manage-users');
        }
      });
    }

    // ── Limpiar filtros ──
    var clearBtn = document.getElementById('umBtnClear');
    clearBtn && clearBtn.addEventListener('click', function() {
      App._userFilterRole   = '';
      App._userFilterSchool = '';
      App._userFilterClass  = '';
      App._userFilterStatus = '';
      App._userFilterDate   = '';
      App._userFilterSearch = '';
      App._selectedUserId   = null;
      App.go('manage-users');
    });

    // ── School filter change → update classroom options ──
    var schoolSel = document.getElementById('umFilterSchool');
    schoolSel && schoolSel.addEventListener('change', function() {
      App._userFilterSchool = schoolSel.value;
      App._userFilterClass  = '';
      App.go('manage-users');
    });

    // ── Row click → select user ──
    root().querySelectorAll('.um-user-row').forEach(function(row) {
      row.addEventListener('click', function() {
        var uid = row.dataset.uid;
        if (App._selectedUserId === uid) {
          App._selectedUserId = null;
        } else {
          App._selectedUserId = uid;
        }
        App.go('manage-users');
      });
    });

    // ── Close panel ──
    var closePanelBtn = document.getElementById('btnClosePanel');
    closePanelBtn && closePanelBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      App._selectedUserId = null;
      App.go('manage-users');
    });

    // ── ACTION: Suspender temporalmente ──
    root().querySelectorAll('[data-action-suspend]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id   = btn.dataset.actionSuspend;
        var name = btn.dataset.actionName;
        if (!confirm('¿Suspender temporalmente a "' + name + '"?\n\nSu cuenta quedará desactivada. Todos sus datos y progreso se conservan. Puedes reactivarla en cualquier momento.')) return;
        Storage.set(function(st) {
          if (st.users[id]) { st.users[id].suspended = true; st.users[id].suspendedAt = new Date().toISOString(); }
        });
        try { Storage.flush && Storage.flush(); } catch(_) {}
        UI.flash('"' + name + '" suspendido temporalmente.', 'success');
        App.go('manage-users');
      });
    });

    // ── ACTION: Reactivar cuenta ──
    root().querySelectorAll('[data-action-reactivate]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = btn.dataset.actionReactivate;
        Storage.set(function(st) {
          if (st.users[id]) { delete st.users[id].suspended; delete st.users[id].suspendedAt; }
        });
        try { Storage.flush && Storage.flush(); } catch(_) {}
        UI.flash('Cuenta reactivada correctamente.', 'success');
        App.go('manage-users');
      });
    });

    // ── ACTION: Eliminar temporalmente ──
    root().querySelectorAll('[data-action-deltemp]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id   = btn.dataset.actionDeltemp;
        var name = btn.dataset.actionName;
        if (!confirm('¿Eliminar temporalmente a "' + name + '"?\n\nSu cuenta quedará oculta. Los datos se conservan y puedes restaurarla cuando quieras.')) return;
        Storage.set(function(st) {
          if (st.users[id]) {
            st.users[id].temporarilyDeleted = true;
            st.users[id].temporarilyDeletedAt = new Date().toISOString();
            st.users[id].suspended = false;
          }
        });
        try { Storage.flush && Storage.flush(); } catch(_) {}
        UI.flash('"' + name + '" eliminado temporalmente. Puedes restaurarlo desde el panel.', 'success');
        App.go('manage-users');
      });
    });

    // ── ACTION: Restaurar cuenta (undo temp delete) ──
    root().querySelectorAll('[data-action-restore]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = btn.dataset.actionRestore;
        Storage.set(function(st) {
          if (st.users[id]) { delete st.users[id].temporarilyDeleted; delete st.users[id].temporarilyDeletedAt; }
        });
        try { Storage.flush && Storage.flush(); } catch(_) {}
        UI.flash('Cuenta restaurada correctamente.', 'success');
        App.go('manage-users');
      });
    });

    // ── ACTION: Eliminar permanentemente (doble confirmación) ──
    root().querySelectorAll('[data-action-delperm]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id   = btn.dataset.actionDelperm;
        var name = btn.dataset.actionName;
        // Primera confirmación
        if (!confirm('⚠️ ELIMINAR PERMANENTEMENTE\n\n¿Estás seguro de que quieres eliminar a "' + name + '"?\n\nEsta acción es IRREVERSIBLE. Se eliminarán la cuenta y todos sus datos de forma permanente.\n\nProceder requiere una segunda confirmación.')) return;
        // Segunda confirmación: escribir el nombre
        var typed = window.prompt('Para confirmar, escribe exactamente el nombre del usuario:\n\n"' + name + '"');
        if (typed === null) return; // cancelled
        if (typed.trim() !== name.trim()) {
          UI.flash('El nombre no coincide. Eliminación cancelada.', 'error');
          return;
        }
        var s = Storage.get();
        var user = s.users[id];
        if (!user) return;
        Storage.set(function(st) {
          // Remove from classroom
          if (st.users[id] && st.users[id].classroomId && st.classrooms[st.users[id].classroomId]) {
            st.classrooms[st.users[id].classroomId].studentIds =
              (st.classrooms[st.users[id].classroomId].studentIds||[]).filter(function(x) { return x !== id; });
          }
          // Remove classroom requests
          if (st.classroomRequests) {
            Object.keys(st.classroomRequests).forEach(function(rid) {
              if (st.classroomRequests[rid].studentId === id) delete st.classroomRequests[rid];
            });
          }
          // Remove from school adminIds
          Object.values(st.schools||{}).forEach(function(sc) {
            if (sc.adminIds) sc.adminIds = sc.adminIds.filter(function(x) { return x !== id; });
          });
          delete st.users[id];
        });
        try { Storage.flush && Storage.flush(); } catch(_) {}
        App._selectedUserId = null;
        App.go('manage-users');
        UI.flash('"' + name + '" eliminado permanentemente.', 'success');
      });
    });

    // ── ACTION: Cerrar sesiones activas ──
    root().querySelectorAll('[data-action-sessions]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id   = btn.dataset.actionSessions;
        var name = btn.dataset.actionName;
        if (!confirm('¿Cerrar todas las sesiones activas de "' + name + '"?\n\nEl usuario deberá iniciar sesión nuevamente.')) return;
        // Mark revokedAt — auth.js can check this on next load
        Storage.set(function(st) {
          if (st.users[id]) st.users[id].sessionRevokedAt = new Date().toISOString();
        });
        try { Storage.flush && Storage.flush(); } catch(_) {}
        UI.flash('Sesiones cerradas. "' + name + '" deberá iniciar sesión nuevamente.', 'success');
      });
    });

    // ── Cambiar aula (panel detalle, solo estudiantes) ──
    var btnChangeCr = document.getElementById('umBtnChangeCr');
    var changeCrSection = document.getElementById('umChangeCrSection');
    btnChangeCr && btnChangeCr.addEventListener('click', function() {
      changeCrSection.style.display = changeCrSection.style.display === 'none' ? '' : 'none';
    });
    var cancelChangeCr = document.getElementById('umCancelChangeCr');
    cancelChangeCr && cancelChangeCr.addEventListener('click', function() {
      if (changeCrSection) changeCrSection.style.display = 'none';
    });
    // School changes → update classroom dropdown
    var changeCrSchoolSel = document.getElementById('umChangeCrSchool');
    var changeCrClassSel  = document.getElementById('umChangeCrClass');
    changeCrSchoolSel && changeCrSchoolSel.addEventListener('change', function() {
      var sid = changeCrSchoolSel.value;
      var crs = sid ? Schools.listClassrooms(sid) : [];
      changeCrClassSel.innerHTML = '<option value="">Sin aula</option>' +
        crs.map(function(cr) { return '<option value="'+esc(cr.id)+'">'+esc(cr.name)+'</option>'; }).join('');
    });
    var saveChangeCr = document.getElementById('umSaveChangeCr');
    saveChangeCr && saveChangeCr.addEventListener('click', function() {
      var uid = saveChangeCr.dataset.uid;
      var newSchool = changeCrSchoolSel ? changeCrSchoolSel.value : '';
      var newClass  = changeCrClassSel  ? changeCrClassSel.value  : '';
      if (!uid) return;
      Schools.assignStudentDirectly(uid, newSchool || null, newClass || null);
      try { Storage.flush && Storage.flush(); } catch(_) {}
      var sn = newSchool ? (Storage.get().schools[newSchool]||{}).name || '' : 'sin colegio';
      var cn = newClass  ? (Storage.get().classrooms[newClass]||{}).name || '' : 'sin aula';
      UI.flash('Asignación actualizada: ' + sn + (cn ? ' / ' + cn : '') + '.', 'success');
      App.go('manage-users');
    });

    // ── Gestionar rol ──
    var btnRoleMgmt  = document.getElementById('umBtnRoleMgmt');
    var roleSection  = document.getElementById('umRoleSection');
    btnRoleMgmt && btnRoleMgmt.addEventListener('click', function() {
      if (roleSection) roleSection.style.display = roleSection.style.display === 'none' ? '' : 'none';
    });
    var cancelRoleChg = document.getElementById('umCancelRoleChange');
    cancelRoleChg && cancelRoleChg.addEventListener('click', function() {
      if (roleSection) roleSection.style.display = 'none';
    });
    // Show director school selector when "director" radio is chosen
    root().querySelectorAll('input[name="umNewRole"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        var dirSchoolDiv = document.getElementById('umRoleDirectorSchool');
        if (dirSchoolDiv) dirSchoolDiv.style.display = radio.value === 'director' ? '' : 'none';
        // Highlight selected option
        root().querySelectorAll('.um-role-option').forEach(function(opt) { opt.classList.remove('selected-opt'); });
        radio.closest('.um-role-option') && radio.closest('.um-role-option').classList.add('selected-opt');
      });
    });

    var saveRoleChg = document.getElementById('umSaveRoleChange');
    saveRoleChg && saveRoleChg.addEventListener('click', function() {
      var uid         = saveRoleChg.dataset.uid;
      var currentRole = saveRoleChg.dataset.currentRole;
      var selected    = root().querySelector('input[name="umNewRole"]:checked');
      if (!selected) { UI.flash('Selecciona un rol de destino.', 'error'); return; }
      var newRole  = selected.value;
      var motivo   = (document.getElementById('umRoleMotivo') && document.getElementById('umRoleMotivo').value) || '';
      var dirSchool = (document.getElementById('umDirectorSchoolSel') && document.getElementById('umDirectorSchoolSel').value) || '';

      if (newRole === currentRole) { UI.flash('El rol seleccionado es el mismo actual.', 'error'); return; }

      // Guard: cannot change super_admin
      var st = Storage.get();
      var u  = st.users[uid];
      if (!u || u.role === 'super_admin') { UI.flash('No se puede cambiar el rol de un Super Admin.', 'error'); return; }

      // Guard: cannot leave system without a super_admin
      if (u.role === 'super_admin') { UI.flash('Acción no permitida.', 'error'); return; }

      if (!confirm('¿Cambiar el rol de "' + u.name + '" de ' + currentRole + ' a ' + newRole + '?\n\nTodo el historial y datos se conservan.')) return;

      Storage.set(function(s2) {
        var user = s2.users[uid];
        if (!user) return;
        var oldRole = (function() {
          var isDir = Object.values(s2.schools||{}).some(function(sc){return (sc.adminIds||[]).includes(uid);});
          return isDir ? 'director' : user.role;
        })();

        // ── Limpieza del rol anterior ──
        // Remove from director if was director
        Object.values(s2.schools||{}).forEach(function(sc) {
          sc.adminIds = (sc.adminIds||[]).filter(function(x){return x!==uid;});
        });
        // Remove from classroom lists if was student
        if (user.role === 'student') {
          if (user.classroomId && s2.classrooms[user.classroomId]) {
            s2.classrooms[user.classroomId].studentIds = (s2.classrooms[user.classroomId].studentIds||[]).filter(function(x){return x!==uid;});
          }
          delete user.classroomId;
          delete user.approvalStatus;
          delete user.institutionType;
        }
        // Remove from teacher's classrooms if was teacher
        if (user.role === 'teacher') {
          (user.classroomIds||[]).forEach(function(cid) {
            if (s2.classrooms[cid]) {
              s2.classrooms[cid].teacherIds = (s2.classrooms[cid].teacherIds||[]).filter(function(x){return x!==uid;});
            }
          });
          delete user.classroomIds;
        }

        // ── Aplicar nuevo rol ──
        if (newRole === 'director') {
          user.role = 'teacher';
          var targetSchool = dirSchool || user.schoolId;
          if (targetSchool && s2.schools[targetSchool]) {
            if (!s2.schools[targetSchool].adminIds) s2.schools[targetSchool].adminIds = [];
            if (!s2.schools[targetSchool].adminIds.includes(uid)) s2.schools[targetSchool].adminIds.push(uid);
          }
        } else {
          user.role = newRole; // 'student' or 'teacher'
        }

        // ── Registro de auditoría ──
        if (!s2.roleChangeLogs) s2.roleChangeLogs = [];
        var adminUser = Object.values(s2.users).find(function(au){return au.role==='super_admin';});
        s2.roleChangeLogs.push({
          id: Date.now().toString() + '_' + uid,
          userId:     uid,
          userName:   user.name,
          userEmail:  user.email,
          fromRole:   oldRole,
          toRole:     newRole,
          schoolId:   user.schoolId || dirSchool || '',
          adminId:    adminUser ? adminUser.id : 'super_admin',
          adminName:  adminUser ? adminUser.name : 'Super Admin',
          changedAt:  new Date().toISOString(),
          motivo:     motivo
        });
      });

      try { Storage.flush && Storage.flush(); } catch(_) {}
      var labMap = { student:'Estudiante', teacher:'Docente', director:'Director' };
      UI.flash('"' + (Storage.get().users[uid]||{}).name + '" ahora es ' + (labMap[newRole]||newRole) + '. Historial conservado.', 'success');
      App.go('manage-users');
    });

    // ── Gestionar tutoría (docentes) ──
    var btnTutorMgmt  = document.getElementById('umBtnTutorMgmt');
    var tutorSection  = document.getElementById('umTutorSection');
    btnTutorMgmt && btnTutorMgmt.addEventListener('click', function() {
      if (!tutorSection) return;
      tutorSection.style.display = tutorSection.style.display === 'block' ? 'none' : 'block';
    });
    var cancelTutor = document.getElementById('umCancelTutor');
    cancelTutor && cancelTutor.addEventListener('click', function() {
      if (tutorSection) tutorSection.style.display = 'none';
    });
    var saveTutor = document.getElementById('umSaveTutor');
    saveTutor && saveTutor.addEventListener('click', function() {
      var uid   = saveTutor.dataset.uid;
      var sel   = document.getElementById('umTutorClassSel');
      var crId  = sel && sel.value;
      if (!crId) { UI.flash('Selecciona un aula.', 'error'); return; }
      try {
        Schools.setClassroomTutor(crId, uid);
        try { Storage.flush && Storage.flush(); } catch(_) {}
        var cr = Storage.get().classrooms[crId];
        var tu = Storage.get().users[uid];
        UI.flash((tu ? tu.name : 'Docente') + ' asignado como tutor de ' + (cr ? cr.name : 'aula') + '.', 'success');
        App.go('manage-users');
      } catch(err) { UI.flash(err.message, 'error'); }
    });
    var removeTutor = document.getElementById('umRemoveTutor');
    removeTutor && removeTutor.addEventListener('click', function() {
      var crId = removeTutor.dataset.crId;
      var name = removeTutor.dataset.tutorName;
      if (!confirm('¿Quitar a "' + name + '" como tutor de esta aula?\n\nSu cuenta e historial se conservan.')) return;
      Schools.removeClassroomTutor(crId);
      try { Storage.flush && Storage.flush(); } catch(_) {}
      UI.flash('"' + name + '" ya no es tutor de esa aula.', 'success');
      App.go('manage-users');
    });

    // ── Select all checkbox ──
    var selectAll = document.getElementById('umSelectAll');
    var bulkBar   = document.getElementById('umBulkBar');
    var bulkCount = document.getElementById('umBulkCount');
    function updateBulkBar() {
      var checked = root().querySelectorAll('.um-row-cb:checked');
      if (checked.length > 0) {
        bulkBar && (bulkBar.style.display = 'flex');
        bulkCount && (bulkCount.textContent = checked.length + ' seleccionado' + (checked.length !== 1 ? 's' : ''));
      } else {
        bulkBar && (bulkBar.style.display = 'none');
      }
    }
    function getSelectedIds() {
      return Array.from(root().querySelectorAll('.um-row-cb:checked')).map(function(cb) { return cb.dataset.uid; });
    }
    selectAll && selectAll.addEventListener('change', function() {
      root().querySelectorAll('.um-row-cb').forEach(function(cb) {
        var row = cb.closest('tr');
        if (!row || row.style.display === 'none') return;
        cb.checked = selectAll.checked;
      });
      updateBulkBar();
    });
    root().querySelectorAll('.um-row-cb').forEach(function(cb) {
      cb.addEventListener('change', function() {
        updateBulkBar();
        var allCbs = root().querySelectorAll('.um-row-cb');
        var allChecked = Array.from(allCbs).every(function(c) { return c.checked; });
        if (selectAll) selectAll.checked = allChecked;
      });
    });

    // ── Bulk: Cancel ──
    var bulkCancelBtn = document.getElementById('umBulkCancelBtn');
    bulkCancelBtn && bulkCancelBtn.addEventListener('click', function() {
      root().querySelectorAll('.um-row-cb').forEach(function(cb) { cb.checked = false; });
      if (selectAll) selectAll.checked = false;
      bulkBar && (bulkBar.style.display = 'none');
      var mf = document.getElementById('umBulkMoveForm');
      if (mf) mf.style.display = 'none';
    });

    // ── Bulk: Suspender ──
    var bulkSuspendBtn = document.getElementById('umBulkSuspendBtn');
    bulkSuspendBtn && bulkSuspendBtn.addEventListener('click', function() {
      var ids = getSelectedIds();
      if (!ids.length) return;
      if (!confirm('¿Suspender ' + ids.length + ' usuario' + (ids.length !== 1 ? 's' : '') + '?')) return;
      var now = new Date().toISOString();
      Storage.set(function(st) { ids.forEach(function(id) { if (st.users[id]) { st.users[id].suspended = true; st.users[id].suspendedAt = now; } }); });
      try { Storage.flush && Storage.flush(); } catch(_) {}
      UI.flash(ids.length + ' usuario' + (ids.length !== 1 ? 's' : '') + ' suspendido' + (ids.length !== 1 ? 's' : '') + '.', 'success');
      App.go('manage-users');
    });

    // ── Bulk: Reactivar ──
    var bulkReactivateBtn = document.getElementById('umBulkReactivateBtn');
    bulkReactivateBtn && bulkReactivateBtn.addEventListener('click', function() {
      var ids = getSelectedIds();
      if (!ids.length) return;
      Storage.set(function(st) { ids.forEach(function(id) { if (st.users[id]) { delete st.users[id].suspended; delete st.users[id].suspendedAt; } }); });
      try { Storage.flush && Storage.flush(); } catch(_) {}
      UI.flash(ids.length + ' cuenta' + (ids.length !== 1 ? 's' : '') + ' reactivada' + (ids.length !== 1 ? 's' : '') + '.', 'success');
      App.go('manage-users');
    });

    // ── Bulk: Quitar aula ──
    var bulkQuitarBtn = document.getElementById('umBulkQuitarBtn');
    bulkQuitarBtn && bulkQuitarBtn.addEventListener('click', function() {
      var ids = getSelectedIds();
      if (!ids.length) return;
      if (!confirm('¿Quitar el aula a ' + ids.length + ' estudiante' + (ids.length !== 1 ? 's' : '') + '?')) return;
      Storage.set(function(st) {
        ids.forEach(function(id) {
          var u = st.users[id]; if (!u) return;
          if (u.classroomId && st.classrooms[u.classroomId]) {
            st.classrooms[u.classroomId].studentIds = (st.classrooms[u.classroomId].studentIds||[]).filter(function(x){return x!==id;});
          }
          u.classroomId = null; u.approvalStatus = null;
        });
      });
      try { Storage.flush && Storage.flush(); } catch(_) {}
      UI.flash('Aulas removidas.', 'success');
      App.go('manage-users');
    });

    // ── Bulk: Mover a aula ──
    var bulkMoveBtn  = document.getElementById('umBulkMoveBtn');
    var bulkMoveForm = document.getElementById('umBulkMoveForm');
    var bulkSchoolSel = document.getElementById('umBulkSchoolSel');
    var bulkClassSel  = document.getElementById('umBulkClassSel');
    bulkMoveBtn && bulkMoveBtn.addEventListener('click', function() {
      if (bulkMoveForm) bulkMoveForm.style.display = bulkMoveForm.style.display === 'none' ? 'flex' : 'none';
    });
    bulkSchoolSel && bulkSchoolSel.addEventListener('change', function() {
      var sid = bulkSchoolSel.value;
      var crs = sid ? Schools.listClassrooms(sid) : [];
      if (bulkClassSel) {
        bulkClassSel.disabled = !sid;
        bulkClassSel.innerHTML = '<option value="">Seleccionar aula...</option>' +
          crs.map(function(cr) { return '<option value="'+esc(cr.id)+'">'+esc(cr.name)+'</option>'; }).join('');
      }
    });
    var bulkMoveConfirm = document.getElementById('umBulkMoveConfirm');
    bulkMoveConfirm && bulkMoveConfirm.addEventListener('click', function() {
      var newClass = bulkClassSel && bulkClassSel.value;
      var newSchool = bulkSchoolSel && bulkSchoolSel.value;
      if (!newClass) { UI.flash('Selecciona un aula de destino.', 'error'); return; }
      var ids = getSelectedIds();
      if (!ids.length) return;
      if (!confirm('¿Mover ' + ids.length + ' estudiante' + (ids.length!==1?'s':'') + ' al aula seleccionada?')) return;
      ids.forEach(function(id) { Schools.assignStudentDirectly(id, newSchool || undefined, newClass); });
      try { Storage.flush && Storage.flush(); } catch(_) {}
      var crName = (Storage.get().classrooms[newClass]||{}).name || '';
      UI.flash(ids.length + ' estudiante' + (ids.length!==1?'s':'') + ' movido' + (ids.length!==1?'s':'') + ' a ' + crName + '.', 'success');
      App.go('manage-users');
    });
    var bulkMoveCancel = document.getElementById('umBulkMoveCancel');
    bulkMoveCancel && bulkMoveCancel.addEventListener('click', function() {
      if (bulkMoveForm) bulkMoveForm.style.display = 'none';
    });
  }

  // ══════════════════════════════════════════════
  //  PANEL COLEGIOS — CSS
  // ══════════════════════════════════════════════
  const _CSS = `
<style>
  .cp-wrap { display:flex; flex-direction:column; gap:16px; }
  .cp-hd { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; }
  .cp-hd-left h1 { margin:0; font-size:22px; font-weight:800; letter-spacing:-.4px; }
  .cp-hd-left p { margin:4px 0 0; font-size:12px; color:var(--muted); }
  .cp-hd-right { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .cp-kpi-strip { display:flex; gap:10px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; }
  .cp-kpi-strip::-webkit-scrollbar { display:none; }
  .cp-kpi { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 16px; min-width:140px; flex:1; cursor:default; position:relative; overflow:hidden; }
  .cp-kpi::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(200,155,109,.05),transparent); pointer-events:none; }
  .cp-kpi-val { font-size:26px; font-weight:800; line-height:1; letter-spacing:-.5px; }
  .cp-kpi-lbl { font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted); margin-top:2px; font-weight:600; }
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
  .cp-edit-grid { display:grid; grid-template-columns:340px 1fr; gap:14px; }
  .cp-edit-left { display:flex; flex-direction:column; gap:14px; }
  .cp-edit-right { display:flex; flex-direction:column; gap:14px; }
  @media(max-width:900px){ .cp-edit-grid { grid-template-columns:1fr; } }
  .cp-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .cp-card-hd { padding:12px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
  .cp-card-hd-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); }
  .cp-card-body { padding:16px; }
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
  .cp-cr-form { display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; }
  .cp-cr-form .cp-field { flex:1; min-width:80px; margin-bottom:0; }
  .cp-cr-form .cp-btn-gold { flex-shrink:0; white-space:nowrap; align-self:flex-end; }
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
  .cp-dir-row { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); }
  .cp-dir-row:last-child { border-bottom:none; }
  .cp-dir-avatar { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,var(--accent),#7c3aed); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; }
  .cp-dir-info { flex:1; min-width:0; }
  .cp-dir-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cp-dir-sub { font-size:11px; color:var(--muted); }
  .cp-st-row { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid var(--border); flex-wrap:wrap; }
  .cp-st-row:last-child { border-bottom:none; }
  .cp-st-name { font-size:13px; font-weight:600; flex:1; min-width:100px; }
  .cp-st-current { font-size:11px; color:var(--muted); }
  /* Ordering */
  .cp-sort-bar { display:flex; align-items:center; gap:8px; padding:10px 16px; border-bottom:1px solid var(--border); flex-wrap:wrap; }
  .cp-sort-label { font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
  .cp-sort-btn { background:rgba(255,255,255,.05); border:1px solid var(--border); color:var(--muted); border-radius:7px; padding:5px 12px; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; white-space:nowrap; }
  .cp-sort-btn:hover { border-color:rgba(139,92,246,.4); color:var(--accent-2); }
  .cp-sort-btn.active { background:rgba(139,92,246,.12); border-color:rgba(139,92,246,.35); color:var(--accent-2); }
  .cp-drag-handle { color:var(--muted); cursor:grab; font-size:16px; padding:0 4px; user-select:none; opacity:.6; }
  .cp-drag-handle:hover { opacity:1; color:var(--text); }
  .cp-cr-tr.cp-dragging { opacity:.4; }
  .cp-cr-tr.cp-drag-over td { background:rgba(139,92,246,.1); }
  .cp-move-btn { background:rgba(255,255,255,.05); border:1px solid var(--border); color:var(--muted); border-radius:6px; padding:4px 8px; font-size:13px; cursor:pointer; line-height:1; min-height:32px; transition:all .15s; }
  .cp-move-btn:hover:not([disabled]) { border-color:rgba(139,92,246,.4); color:var(--accent-2); }
  .cp-move-btn[disabled] { opacity:.3; cursor:default; }
  .cp-copy-btn { background:rgba(255,255,255,.05); border:1px solid var(--border); color:var(--muted); border-radius:6px; padding:5px 8px; font-size:13px; cursor:pointer; transition:all .15s; min-height:32px; line-height:1; }
  .cp-copy-btn:hover { border-color:rgba(34,197,94,.4); color:#22c55e; }
  /* Tutor UI */
  .cp-tutor-cell { min-width:140px; }
  .cp-tutor-name { font-size:13px; font-weight:600; color:var(--text); display:block; }
  .cp-tutor-email { font-size:10px; color:var(--muted); display:block; margin-top:1px; }
  .cp-tutor-badge { display:inline-block; background:rgba(200,155,109,.15); color:var(--primary); border:1px solid rgba(200,155,109,.3); border-radius:6px; padding:2px 8px; font-size:10px; font-weight:700; margin-bottom:4px; }
  .cp-no-tutor { font-size:11px; color:var(--muted); font-style:italic; }
  .cp-tutor-form { background:rgba(10,12,18,.6); border:1px solid rgba(200,155,109,.2); border-radius:10px; padding:12px 14px; margin-top:6px; display:flex; flex-direction:column; gap:8px; }
  .cp-tutor-form-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--primary); }
  .cp-tutor-search { background:rgba(255,255,255,.06); border:1px solid var(--border); border-radius:7px; color:var(--text); padding:7px 10px; font-size:12px; width:100%; box-sizing:border-box; }
  .cp-tutor-search:focus { outline:none; border-color:rgba(200,155,109,.5); }
  .cp-tutor-search::placeholder { color:var(--muted); }
  .cp-tutor-list { max-height:150px; overflow-y:auto; display:flex; flex-direction:column; gap:3px; border:1px solid var(--border); border-radius:8px; padding:4px; background:rgba(0,0,0,.25); }
  .cp-tutor-item { display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:7px; cursor:pointer; border:1px solid transparent; transition:all .15s; user-select:none; }
  .cp-tutor-item:hover { background:rgba(200,155,109,.07); border-color:rgba(200,155,109,.15); }
  .cp-tutor-item.cp-ti-sel { background:rgba(200,155,109,.14); border-color:rgba(200,155,109,.4); }
  .cp-tutor-item-av { width:28px; height:28px; border-radius:50%; background:rgba(200,155,109,.2); color:var(--primary); font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .cp-tutor-item-name { font-size:12px; font-weight:600; color:var(--text); }
  .cp-tutor-item-sub { font-size:10px; color:var(--muted); margin-top:1px; }
  .cp-tutor-item-warn { font-size:10px; color:#f59e0b; }
  .cp-tutor-list-empty { font-size:12px; color:var(--muted); text-align:center; padding:12px; }
  .cp-tutor-save  { background:var(--primary); border:none; color:#0a0c12; border-radius:7px; padding:7px 14px; font-size:12px; font-weight:800; cursor:pointer; white-space:nowrap; transition:opacity .15s; }
  .cp-tutor-save:hover { opacity:.88; }
  .cp-tutor-remove { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); color:#ef4444; border-radius:7px; padding:6px 12px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; transition:all .15s; }
  .cp-tutor-remove:hover { background:rgba(239,68,68,.18); }
  .cp-tutor-toggle { background:transparent; border:1px solid var(--border); color:var(--muted); border-radius:7px; padding:6px 12px; font-size:11px; font-weight:600; cursor:pointer; white-space:nowrap; transition:all .15s; }
  .cp-tutor-toggle:hover { border-color:rgba(200,155,109,.4); color:var(--primary); }
  .cp-tutor-form-wrap { display:none; }
</style>`;

  // ══════════════════════════════════════════════
  //  PANEL COLEGIOS
  // ══════════════════════════════════════════════
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
    const classroomsWithTutor = classrooms.filter(function(c) { return !!c.tutorId; }).length;
    const tutorCoverage = classrooms.length ? Math.round(classroomsWithTutor / classrooms.length * 100) : 0;

    const kpiStrip = `
    <div class="cp-kpi-strip">
      <div class="cp-kpi"><div class="cp-kpi-val" style="color:var(--primary);">${schools.length}</div><div class="cp-kpi-lbl">Colegios activos</div>${_spark(weeklyGlobal.map(function() { return schools.length; }), 'var(--primary)')}</div>
      <div class="cp-kpi"><div class="cp-kpi-val" style="color:var(--accent-2);">${classrooms.length}</div><div class="cp-kpi-lbl">Aulas registradas</div>${_spark(weeklyGlobal.map(function() { return classrooms.length; }), 'var(--accent)')}</div>
      <div class="cp-kpi"><div class="cp-kpi-val">${students.length}</div><div class="cp-kpi-lbl">Estudiantes</div>${_spark(weeklyGlobal, '#22c55e')}</div>
      <div class="cp-kpi"><div class="cp-kpi-val" style="color:${tutorCoverage===100?'#22c55e':tutorCoverage>50?'var(--primary)':'#f59e0b'};">${classroomsWithTutor}/${classrooms.length}</div><div class="cp-kpi-lbl">Aulas con tutor</div><div style="font-size:10px;color:var(--muted);margin-top:2px;">${tutorCoverage}% cobertura</div></div>
      <div class="cp-kpi"><div class="cp-kpi-val" style="color:${sessions.length?(parseFloat(avgConc)>=4?'#22c55e':parseFloat(avgConc)>=3?'var(--primary)':'#ef4444'):'var(--muted)'};">${sessions.length ? avgConc+'/5' : '—'}</div><div class="cp-kpi-lbl">Concentración prom.</div>${_spark(weeklyGlobal, 'var(--accent)')}</div>
      <div class="cp-kpi"><div class="cp-kpi-val" style="color:${inactiveSchools.length>0?'#f59e0b':'var(--muted)'};">${inactiveSchools.length}</div><div class="cp-kpi-lbl">Colegios inactivos</div>${_spark(weeklyGlobal.map(function() { return inactiveSchools.length; }), '#f59e0b')}</div>
    </div>`;

    if (editSchool) return _renderEditSchool(editSchool, editId, kpiStrip, s);

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
      <div class="cp-card-hd"><span class="cp-card-hd-title">Nuevo colegio</span><button class="cp-btn-ghost" id="btnCancelNewSchool" style="padding:4px 12px;font-size:12px;">✕ Cancelar</button></div>
      <div class="cp-card-body">
        <form id="schoolForm">
          <div class="cp-field"><label>Nombre del colegio</label><input name="name" placeholder="Ej. I.E. San Martín, Colegio Trilce…" required /></div>
          <div class="cp-form-btns"><button type="submit" class="cp-btn-gold">Crear colegio</button><button type="button" class="cp-btn-ghost" id="btnCancelNewSchool2">Cancelar</button></div>
        </form>
      </div>
    </div>
  </div>
  ${schools.length === 0
    ? `<div class="cp-card"><div class="cp-card-body" style="text-align:center;padding:48px 24px;"><div style="font-size:40px;margin-bottom:12px;">🏫</div><h2 style="margin:0 0 8px;font-size:18px;">Tu red educativa empieza aquí</h2><p style="color:var(--muted);font-size:13px;margin:0 0 20px;">Crea tu primer colegio y comienza a organizar estudiantes, docentes y aulas.</p><button class="cp-btn-gold" id="btnNuevoColegio2">+ Crear colegio</button></div></div>`
    : `<div class="cp-school-grid">${schools.map(function(sc) {
        const stats = Schools.getSchoolStats(sc.id);
        const dir = (sc.adminIds||[]).map(function(id) { return s.users[id]&&s.users[id].name; }).filter(Boolean)[0]||null;
        const statusClass = stats.sessionCount>0?'cp-status-active':stats.studentCount>0?'cp-status-new':'cp-status-empty';
        const statusLabel = stats.sessionCount>0?'● Activo':stats.studentCount>0?'◐ Nuevo':'○ Sin alumnos';
        return `<div class="cp-school-card">
          <div class="cp-school-card-top"><div><div class="cp-school-name">${esc(sc.name)}</div>${dir?`<div style="font-size:12px;color:var(--muted);margin-top:2px;">Dir. ${esc(dir)}</div>`:''}</div><span class="cp-school-code">${esc(sc.code)}</span></div>
          <div class="cp-school-stats"><div class="cp-school-stat"><span class="cp-school-stat-val">${stats.classroomCount}</span><span class="cp-school-stat-lbl">Aulas</span></div><div class="cp-school-stat"><span class="cp-school-stat-val">${stats.studentCount}</span><span class="cp-school-stat-lbl">Alumnos</span></div><div class="cp-school-stat"><span class="cp-school-stat-val">${stats.sessionCount}</span><span class="cp-school-stat-lbl">Sesiones</span></div><div class="cp-school-stat"><span class="cp-school-stat-val" style="font-size:13px;">${stats.avgConcentration!=='—'?stats.avgConcentration:'—'}</span><span class="cp-school-stat-lbl">Conc.</span></div></div>
          <div style="display:flex;justify-content:space-between;align-items:center;"><span class="cp-school-status ${statusClass}">${statusLabel}</span><div class="cp-school-actions"><button class="cp-btn-ghost" style="padding:6px 14px;font-size:12px;" data-del-school="${esc(sc.id)}" data-del-name="${esc(sc.name)}">Eliminar</button><button class="cp-btn-gold" style="padding:6px 14px;font-size:12px;" data-edit-school="${esc(sc.id)}">Editar →</button></div></div>
        </div>`;
      }).join('')}</div>`}
</div>`;
  }

  function _renderEditSchool(editSchool, editId, kpiStrip, s) {
    const classrooms = Schools.listClassrooms(editId);
    const schoolStudents = Schools.listStudentsInSchool(editId);
    const stats = Schools.getSchoolStats(editId);
    const dirs = (editSchool.adminIds||[]).map(function(id) { return s.users[id]; }).filter(Boolean);
    // Teachers in this school (for tutor selector)
    const schoolTeachers = Object.values(s.users).filter(function(u) { return u.role === 'teacher' && u.schoolId === editId; });
    function _ini(n){ var p=(n||'?').trim().split(/\s+/).filter(Boolean); return p.length>=2?(p[0][0]+p[1][0]).toUpperCase():(p[0]||'?')[0].toUpperCase(); }

    const sortBar = `
      <div class="cp-sort-bar">
        <span class="cp-sort-label">Ordenar:</span>
        <button class="cp-sort-btn" data-autosort="desc" title="5°, 4°, 3°... (descendente)">5→1 Desc</button>
        <button class="cp-sort-btn" data-autosort="asc"  title="1°, 2°, 3°... (ascendente)">1→5 Asc</button>
        <span style="font-size:11px;color:var(--muted);">o arrastra para orden personalizado</span>
      </div>`;

    const classroomTable = classrooms.length === 0
      ? `${sortBar}<div style="padding:32px;text-align:center;color:var(--muted);font-size:13px;">Sin aulas. Usa el formulario de abajo para crear la primera.</div>`
      : `${sortBar}<div style="overflow-x:auto;"><table class="cp-cr-table"><thead><tr><th style="width:28px;"></th><th>Aula</th><th>Código de acceso</th><th style="text-align:center;">Alumnos</th><th>Tutor del aula</th><th></th></tr></thead><tbody>
        ${classrooms.map(function(cr, idx) {
          var tutor = cr.tutorId ? s.users[cr.tutorId] : null;
          var tutorCell = tutor
            ? `<div class="cp-tutor-cell"><span class="cp-tutor-badge">Tutor</span><span class="cp-tutor-name">${esc(tutor.name)}</span><span class="cp-tutor-email">${esc(tutor.email)}</span></div>`
            : `<span class="cp-no-tutor">Sin tutor asignado</span>`;
          var tutorItems = schoolTeachers.length === 0
            ? '<div class="cp-tutor-list-empty">No hay docentes en este colegio.</div>'
            : schoolTeachers.map(function(t){
                var isCurrent = t.id === cr.tutorId;
                var alreadyTutor = Schools.getTutorClassroom(t.id);
                var warnText = alreadyTutor && alreadyTutor.id !== cr.id ? 'Ya tutor de ' + esc(alreadyTutor.name) : '';
                return '<label class="cp-tutor-item'+(isCurrent?' cp-ti-sel':'')+'" data-teacher-name="'+esc(t.name).toLowerCase()+'" title="'+esc(t.email)+'">'
                  + '<input type="radio" name="tutorRad-'+esc(cr.id)+'" value="'+esc(t.id)+'"'+(isCurrent?' checked':'')+' style="display:none;"/>'
                  + '<div class="cp-tutor-item-av">'+_ini(t.name)+'</div>'
                  + '<div><div class="cp-tutor-item-name">'+esc(t.name)+'</div>'
                  + (warnText ? '<div class="cp-tutor-item-warn">⚠ '+warnText+'</div>' : '<div class="cp-tutor-item-sub">'+esc(t.email)+'</div>')
                  + '</div></label>';
              }).join('');
          var tutorFormHtml = `<div class="cp-tutor-form-wrap" id="tutorForm-${esc(cr.id)}">
            <div class="cp-tutor-form">
              <div class="cp-tutor-form-title">${tutor ? 'Cambiar tutor del aula' : 'Asignar tutor al aula'}</div>
              <input type="text" class="cp-tutor-search" id="tutorSearch-${esc(cr.id)}" placeholder="Filtrar por nombre…" />
              <div class="cp-tutor-list" id="tutorList-${esc(cr.id)}">${tutorItems}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px;">
                <button class="cp-tutor-save" data-save-tutor="${esc(cr.id)}">Guardar</button>
                ${tutor ? `<button class="cp-tutor-remove" data-remove-tutor="${esc(cr.id)}" data-tutor-name="${esc(tutor.name)}">Quitar tutor</button>` : ''}
                <button class="cp-tutor-toggle" data-toggle-tutor="${esc(cr.id)}">Cancelar</button>
              </div>
            </div>
          </div>`;
          return `<tr class="cp-cr-tr" draggable="true" data-cr-id="${esc(cr.id)}">
            <td style="width:28px;"><span class="cp-drag-handle" title="Arrastrar para reordenar">⠿</span></td>
            <td><span class="cp-cr-name">${esc(cr.name)}</span></td>
            <td><div style="display:flex;gap:4px;align-items:center;"><input class="cp-cr-code-input cr-code-input" data-cr-id="${esc(cr.id)}" value="${esc(cr.inviteCode)}" maxlength="8" /><button class="cp-copy-btn" data-copy-code="${esc(cr.inviteCode)}" title="Copiar código">⧉</button></div></td>
            <td style="text-align:center;"><span class="cp-badge-num">${(cr.studentIds||[]).length}</span></td>
            <td>${tutorCell}${tutorFormHtml}<button class="cp-tutor-toggle" data-toggle-tutor="${esc(cr.id)}" style="margin-top:6px;">${tutor ? 'Cambiar tutor' : 'Asignar tutor'}</button></td>
            <td><div class="cp-cr-actions">
              <button class="cp-move-btn" data-move-up="${esc(cr.id)}" ${idx===0?'disabled':''} title="Subir">↑</button>
              <button class="cp-move-btn" data-move-down="${esc(cr.id)}" ${idx===classrooms.length-1?'disabled':''} title="Bajar">↓</button>
              <button class="cp-cr-save" data-save-cr-code="${esc(cr.id)}">✓ Guardar</button>
              <button class="cp-cr-auto" data-regen-cr="${esc(cr.id)}">↻ Auto</button>
              <button class="cp-cr-del" data-del-cr="${esc(cr.id)}" data-del-cr-name="${esc(cr.name)}">Eliminar</button>
            </div></td>
          </tr>`;
        }).join('')}
        </tbody></table></div>`;

    const studentsTable = schoolStudents.length === 0 ? '' : `
    <div class="cp-card">
      <div class="cp-card-hd"><span class="cp-card-hd-title">Estudiantes del colegio</span><span style="font-size:11px;color:var(--muted);">${schoolStudents.length} alumno${schoolStudents.length!==1?'s':''}</span></div>
      <div class="cp-card-body" style="max-height:220px;overflow-y:auto;padding:8px 16px;">
        ${schoolStudents.map(function(st) {
          const currentCr = st.classroomId?(s.classrooms[st.classroomId]?s.classrooms[st.classroomId].name:'—'):'—';
          return `<div class="cp-st-row"><div class="cp-st-name">${esc(st.name)}</div><div class="cp-st-current">${esc(currentCr)}</div>${classrooms.length>0?`<select class="st-cr-select" data-st-id="${esc(st.id)}" style="font-size:11px;padding:4px 6px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);"><option value="">Sin aula</option>${classrooms.map(function(cr){return `<option value="${esc(cr.id)}"${st.classroomId===cr.id?' selected':''}>${esc(cr.name)}</option>`;}).join('')}</select><button class="cp-cr-save" style="font-size:11px;padding:4px 10px;" data-assign-student="${esc(st.id)}">Asignar</button>`:''}${st.classroomId?`<button class="cp-cr-del" style="font-size:11px;padding:4px 10px;" data-remove-student="${esc(st.id)}" data-remove-from="${esc(st.classroomId)}">Quitar</button>`:''}</div>`;
        }).join('')}
      </div>
    </div>`;

    return _CSS + `
<div class="cp-wrap">
  <div class="cp-hd">
    <div class="cp-hd-left">
      <div style="display:flex;align-items:center;gap:10px;"><button class="cp-btn-ghost" data-go="manage-schools" id="btnBackSchools" style="padding:6px 12px;font-size:12px;">← Volver</button><h1>Gestión de Colegios</h1></div>
      <p>Editando: <strong style="color:var(--text);">${esc(editSchool.name)}</strong> · ${stats.classroomCount} aulas · ${stats.studentCount} alumnos · ${stats.sessionCount} sesiones</p>
    </div>
    <div class="cp-hd-right"><button class="cp-btn-ghost" id="btnDiagLog" style="font-size:12px;padding:6px 12px;">🩺 Diagnóstico</button><button class="primary" id="btnExportReporte">Exportar reporte</button></div>
  </div>
  ${kpiStrip}
  <div class="cp-edit-grid">
    <div class="cp-edit-left">
      <div class="cp-card">
        <div class="cp-card-hd"><span class="cp-card-hd-title">Datos del colegio</span><span class="cp-school-status ${stats.sessionCount>0?'cp-status-active':stats.studentCount>0?'cp-status-new':'cp-status-empty'}" style="font-size:10px;">${stats.sessionCount>0?'● Activo':stats.studentCount>0?'◐ Nuevo':'○ Sin alumnos'}</span></div>
        <div class="cp-card-body">
          <form id="schoolForm">
            <div class="cp-field"><label>Nombre del colegio</label><input name="name" value="${esc(editSchool.name)}" required /></div>
            <div class="cp-field"><label>Código de colegio</label><div class="cp-code-row"><input name="schoolCode" maxlength="6" value="${esc(editSchool.code)}" /><button type="button" class="cp-regen-btn" id="btnRegenSchoolCode">↻</button></div></div>
            <div class="cp-warn">⚠ Cambiar el código invalida los accesos anteriores de docentes y estudiantes.</div>
            <div class="cp-form-btns"><button type="submit" class="cp-btn-gold">Guardar cambios</button><button type="button" class="cp-btn-ghost" data-go="manage-schools" id="cancelEdit">Cancelar</button></div>
          </form>
        </div>
      </div>
      <div class="cp-card">
        <div class="cp-card-hd"><span class="cp-card-hd-title">Nueva aula</span></div>
        <div class="cp-card-body">
          <form id="createClassroomForm">
            <div class="cp-cr-form"><div class="cp-field"><label>Grado</label><input name="grade" placeholder="Ej: 5°" maxlength="10" required /></div><div class="cp-field"><label>Sección</label><input name="section" placeholder="Ej: A" maxlength="10" required /></div><button type="submit" class="cp-btn-gold">Crear aula</button></div>
          </form>
        </div>
      </div>
      ${dirs.length>0?`<div class="cp-card"><div class="cp-card-hd"><span class="cp-card-hd-title">Directores asignados</span><span style="font-size:11px;color:var(--muted);">${dirs.length}</span></div><div class="cp-card-body" style="padding:8px 16px;">${dirs.map(function(d){return `<div class="cp-dir-row"><div class="cp-dir-avatar">${(d.name||'?')[0].toUpperCase()}</div><div class="cp-dir-info"><div class="cp-dir-name">${esc(d.name)}</div><div class="cp-dir-sub">${esc(d.email)}</div></div></div>`;}).join('')}</div></div>`:''}
    </div>
    <div class="cp-edit-right">
      <div class="cp-card"><div class="cp-card-hd"><span class="cp-card-hd-title">Aulas — ${esc(editSchool.name)}</span><span style="font-size:11px;color:var(--muted);">${classrooms.length} aula${classrooms.length!==1?'s':''}</span></div>${classroomTable}</div>
      ${studentsTable}
    </div>
  </div>
</div>`;
  }

  function wireManageSchools() {
    root().querySelectorAll('[data-go]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (btn.id==='cancelEdit'||btn.id==='btnBackSchools') App._editSchoolId=null;
        App.go(btn.dataset.go);
      });
    });
    var dBtn=document.getElementById('btnDiagLog');
    dBtn&&dBtn.addEventListener('click',function(){try{window.Monitor&&window.Monitor.exportLog&&window.Monitor.exportLog();UI.flash('Registro exportado.','success');}catch(_){UI.flash('No disponible.','error');}});
    var expBtn=document.getElementById('btnExportReporte');
    expBtn&&expBtn.addEventListener('click',function(){
      var schls=Schools.listSchools();var html='<h1>Reporte de Colegios</h1>';
      schls.forEach(function(sc){var st=Schools.getSchoolStats(sc.id);html+='<h2>'+sc.name+'</h2><ul><li>Aulas: '+st.classroomCount+'</li><li>Estudiantes: '+st.studentCount+'</li><li>Sesiones: '+st.sessionCount+'</li></ul>';});
      try{window.Exporter&&window.Exporter.printHTML&&window.Exporter.printHTML(html,'reporte-colegios');}catch(_){UI.flash('Exportación no disponible.','error');}
    });
    ['btnNuevoColegio','btnNuevoColegio2'].forEach(function(id){var el=document.getElementById(id);el&&el.addEventListener('click',function(){var f=document.getElementById('newSchoolForm');if(f){f.style.display='block';var inp=f.querySelector('input');inp&&inp.focus();}});});
    ['btnCancelNewSchool','btnCancelNewSchool2'].forEach(function(id){var el=document.getElementById(id);el&&el.addEventListener('click',function(){var f=document.getElementById('newSchoolForm');if(f)f.style.display='none';});});
    var sf=document.getElementById('schoolForm');
    sf&&sf.addEventListener('submit',function(e){
      e.preventDefault();var fd=new FormData(e.target);var name=(fd.get('name')||'').trim();if(!name)return;
      var eId=App._editSchoolId;
      if(eId){
        Schools.updateSchool(eId,name);
        var nc=(fd.get('schoolCode')||'').trim().toUpperCase();var cc=(Storage.get().schools[eId]||{}).code||'';
        if(nc&&nc!==cc){try{Schools.updateSchoolCode(eId,nc);}catch(err){UI.flash(err.message,'error');return;}}
        try{Storage.flush&&Storage.flush();}catch(_){}
        App._editSchoolId=null;UI.flash('Colegio actualizado.','success');
      }else{var sc=Schools.createSchool(name);try{Storage.flush&&Storage.flush();}catch(_){}UI.flash('Colegio "'+sc.name+'" creado. Código: '+sc.code,'success');}
      App.go('manage-schools');
    });
    var rb=document.getElementById('btnRegenSchoolCode');
    rb&&rb.addEventListener('click',function(){var inp=document.querySelector('[name="schoolCode"]');if(!inp)return;var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';var code='';for(var i=0;i<6;i++)code+=chars[Math.floor(Math.random()*chars.length)];inp.value=code;inp.focus();});
    var cf=document.getElementById('createClassroomForm');
    cf&&cf.addEventListener('submit',function(e){e.preventDefault();var fd=new FormData(e.target);var g=(fd.get('grade')||'').trim();var sec=(fd.get('section')||'').trim();if(!g||!sec)return;var eId=App._editSchoolId;if(!eId)return;var cr=Schools.createClassroom(eId,g,sec);try{Storage.flush&&Storage.flush();}catch(_){}UI.flash('Aula "'+cr.name+'" creada. Código: '+cr.inviteCode,'success');App.go('manage-schools');});
    root().querySelectorAll('[data-edit-school]').forEach(function(btn){btn.addEventListener('click',function(){App._editSchoolId=btn.dataset.editSchool;App.go('manage-schools');});});
    root().querySelectorAll('[data-del-school]').forEach(function(btn){btn.addEventListener('click',function(){var id=btn.dataset.delSchool;var name=btn.dataset.delName;if(!confirm('¿Eliminar "'+name+'"?\n\nAcción irreversible.'))return;Schools.deleteSchool(id);try{Storage.flush&&Storage.flush();}catch(_){}UI.flash('Colegio eliminado.','success');App.go('manage-schools');});});
    root().querySelectorAll('[data-save-cr-code]').forEach(function(btn){btn.addEventListener('click',function(){var crId=btn.dataset.saveCrCode;var inp=root().querySelector('.cr-code-input[data-cr-id="'+crId+'"]');if(!inp)return;try{Schools.updateClassroomCode(crId,inp.value);try{Storage.flush&&Storage.flush();}catch(_){}UI.flash('Código actualizado.','success');App.go('manage-schools');}catch(err){UI.flash(err.message,'error');}});});
    root().querySelectorAll('[data-regen-cr]').forEach(function(btn){btn.addEventListener('click',function(){var crId=btn.dataset.regenCr;var nc=Schools.regenerateInviteCode(crId);try{Storage.flush&&Storage.flush();}catch(_){}var inp=root().querySelector('.cr-code-input[data-cr-id="'+crId+'"]');if(inp)inp.value=nc;UI.flash('Nuevo código: '+nc,'success');});});
    root().querySelectorAll('[data-del-cr]').forEach(function(btn){btn.addEventListener('click',function(){var crId=btn.dataset.delCr;var name=btn.dataset.delCrName;if(!confirm('¿Eliminar el aula "'+name+'"?'))return;Schools.deleteClassroom(crId);try{Storage.flush&&Storage.flush();}catch(_){}UI.flash('Aula eliminada.','success');App.go('manage-schools');});});
    root().querySelectorAll('[data-assign-student]').forEach(function(btn){btn.addEventListener('click',function(){var sid=btn.dataset.assignStudent;var sel=root().querySelector('.st-cr-select[data-st-id="'+sid+'"]');var cid=sel&&sel.value;if(!cid){UI.flash('Selecciona un aula primero.','error');return;}Schools.addStudentToClassroom(sid,cid);try{Storage.flush&&Storage.flush();}catch(_){}UI.flash('Estudiante asignado.','success');App.go('manage-schools');});});
    root().querySelectorAll('[data-remove-student]').forEach(function(btn){btn.addEventListener('click',function(){var sid=btn.dataset.removeStudent;var cid=btn.dataset.removeFrom;if(!confirm('¿Quitar al estudiante del aula?'))return;Schools.removeStudentFromClassroom(sid,cid);try{Storage.flush&&Storage.flush();}catch(_){}UI.flash('Estudiante removido.','success');App.go('manage-schools');});});

    // ── Mover aula arriba / abajo ──
    root().querySelectorAll('[data-move-up]').forEach(function(btn){
      btn.addEventListener('click',function(){
        if(btn.disabled||btn.getAttribute('disabled')!=null)return;
        Schools.moveClassroomUp(btn.dataset.moveUp);
        try{Storage.flush&&Storage.flush();}catch(_){}
        App.go('manage-schools');
      });
    });
    root().querySelectorAll('[data-move-down]').forEach(function(btn){
      btn.addEventListener('click',function(){
        if(btn.disabled||btn.getAttribute('disabled')!=null)return;
        Schools.moveClassroomDown(btn.dataset.moveDown);
        try{Storage.flush&&Storage.flush();}catch(_){}
        App.go('manage-schools');
      });
    });

    // ── Auto-sort ──
    root().querySelectorAll('[data-autosort]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var dir=btn.dataset.autosort;
        var eid=App._editSchoolId;
        if(!eid)return;
        Schools.autoSortClassrooms(eid,dir);
        try{Storage.flush&&Storage.flush();}catch(_){}
        UI.flash('Aulas reordenadas ('+(dir==='asc'?'ascendente':'descendente')+').','success');
        App.go('manage-schools');
      });
    });

    // ── Drag & drop para reordenar aulas ──
    (function(){
      var dragSrcId=null;
      root().querySelectorAll('.cp-cr-tr').forEach(function(row){
        row.addEventListener('dragstart',function(e){
          dragSrcId=row.dataset.crId;
          row.classList.add('cp-dragging');
          e.dataTransfer.effectAllowed='move';
        });
        row.addEventListener('dragend',function(){
          row.classList.remove('cp-dragging');
          root().querySelectorAll('.cp-cr-tr').forEach(function(r){r.classList.remove('cp-drag-over');});
        });
        row.addEventListener('dragover',function(e){
          e.preventDefault();
          e.dataTransfer.dropEffect='move';
          root().querySelectorAll('.cp-cr-tr').forEach(function(r){r.classList.remove('cp-drag-over');});
          if(dragSrcId!==row.dataset.crId)row.classList.add('cp-drag-over');
        });
        row.addEventListener('drop',function(e){
          e.preventDefault();
          row.classList.remove('cp-drag-over');
          if(!dragSrcId||dragSrcId===row.dataset.crId)return;
          var allRows=root().querySelectorAll('.cp-cr-tr');
          var currentOrder=Array.from(allRows).map(function(r){return r.dataset.crId;});
          var si=currentOrder.indexOf(dragSrcId);
          var ti=currentOrder.indexOf(row.dataset.crId);
          if(si===-1||ti===-1)return;
          var newOrder=currentOrder.slice();
          newOrder.splice(si,1);
          newOrder.splice(ti,0,dragSrcId);
          Schools.setClassroomOrder(App._editSchoolId,newOrder);
          try{Storage.flush&&Storage.flush();}catch(_){}
          App.go('manage-schools');
        });
      });
    })();

    // ── Copiar código ──
    root().querySelectorAll('[data-copy-code]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var code=btn.dataset.copyCode;
        navigator.clipboard&&navigator.clipboard.writeText(code).then(function(){
          btn.textContent='✓';
          setTimeout(function(){btn.textContent='⧉';},1500);
        }).catch(function(){UI.flash(code,'success');});
      });
    });

    // ── Tutor: toggle formulario ──
    root().querySelectorAll('[data-toggle-tutor]').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        var crId = btn.dataset.toggleTutor;
        var form = document.getElementById('tutorForm-'+crId);
        if (!form) return;
        var isOpen = form.style.display === 'block';
        root().querySelectorAll('.cp-tutor-form-wrap').forEach(function(f){f.style.display='none';});
        form.style.display = isOpen ? 'none' : 'block';
      });
    });

    // ── Tutor: búsqueda — filtra radio-cards ──
    root().querySelectorAll('.cp-tutor-search').forEach(function(inp){
      var crId = inp.id.replace('tutorSearch-','');
      var list = document.getElementById('tutorList-'+crId);
      if (!list) return;
      var _tutorT;
      inp.addEventListener('input',function(){
        clearTimeout(_tutorT);
        _tutorT = setTimeout(function(){
          var q = inp.value.toLowerCase().trim();
          list.querySelectorAll('.cp-tutor-item').forEach(function(item){
            var name = (item.dataset.teacherName || '');
            item.style.display = (!q || name.includes(q)) ? '' : 'none';
          });
        }, 120);
      });
    });

    // ── Tutor: click en card → seleccionar radio ──
    root().querySelectorAll('.cp-tutor-list').forEach(function(list){
      list.querySelectorAll('.cp-tutor-item').forEach(function(item){
        item.addEventListener('click',function(){
          var radio = item.querySelector('input[type="radio"]');
          if (!radio) return;
          list.querySelectorAll('.cp-tutor-item').forEach(function(i){ i.classList.remove('cp-ti-sel'); });
          radio.checked = true;
          item.classList.add('cp-ti-sel');
        });
      });
    });

    // ── Tutor: guardar ──
    root().querySelectorAll('[data-save-tutor]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var crId   = btn.dataset.saveTutor;
        var radio  = root().querySelector('input[name="tutorRad-'+crId+'"]:checked');
        var tid    = radio && radio.value;
        if (!tid){ UI.flash('Selecciona un docente de la lista.','error'); return; }
        try {
          Schools.setClassroomTutor(crId, tid);
          try{Storage.flush&&Storage.flush();}catch(_){}
          var cr = Storage.get().classrooms[crId];
          var tu = Storage.get().users[tid];
          UI.flash((tu?tu.name:'Docente')+' asignado como tutor de '+(cr?cr.name:'aula')+'.',  'success');
          App.go('manage-schools');
        } catch(err){ UI.flash(err.message,'error'); }
      });
    });

    // ── Tutor: quitar ──
    root().querySelectorAll('[data-remove-tutor]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var crId = btn.dataset.removeTutor;
        var name = btn.dataset.tutorName;
        if (!confirm('¿Quitar a "'+name+'" como tutor de esta aula?\n\nSu cuenta e historial se conservan.')) return;
        Schools.removeClassroomTutor(crId);
        try{Storage.flush&&Storage.flush();}catch(_){}
        UI.flash('"'+name+'" ya no es tutor de esta aula.','success');
        App.go('manage-schools');
      });
    });
  }

  // ══════════════════════════════════════════════
  //  DASHBOARD ADMIN
  // ══════════════════════════════════════════════
  function screenAdminDashboard() {
    const s = Storage.get();
    const schools    = Schools.listSchools();
    const allUsers   = Object.values(s.users);
    const students   = allUsers.filter(function(u){return u.role==='student';});
    const teachers   = allUsers.filter(function(u){return u.role==='teacher';});
    const sessions   = s.sessions||[];
    const classrooms = Object.values(s.classrooms||{});
    const now = new Date();
    const totalMin = sessions.reduce(function(a,b){return a+(b.durationMin||0);},0);
    const avgConc  = sessions.length?sessions.reduce(function(a,b){return a+b.concentration;},0)/sessions.length:0;
    const from7=new Date(now);from7.setDate(now.getDate()-7);
    const from14=new Date(now);from14.setDate(now.getDate()-14);
    const sessWeek=sessions.filter(function(se){return new Date(se.datetime)>=from7;});
    const sessLastWeek=sessions.filter(function(se){const d=new Date(se.datetime);return d>=from14&&d<from7;});
    const weekDelta=sessLastWeek.length?Math.round((sessWeek.length-sessLastWeek.length)/sessLastWeek.length*100):sessWeek.length>0?100:0;
    const weeklyData=_weeklyData(sessions,8);
    const weekLabels=['S-7','S-6','S-5','S-4','S-3','S-2','S-1','Hoy'];
    const concBuckets=[0,0,0,0,0];
    sessions.forEach(function(se){const b=Math.min(4,Math.max(0,Math.round(se.concentration)-1));concBuckets[b]++;});
    const schoolRows=schools.map(function(sc){const stats=Schools.getSchoolStats(sc.id);const dir=(sc.adminIds||[]).map(function(id){return s.users[id]&&s.users[id].name;}).filter(Boolean)[0]||'—';const status=stats.sessionCount>0?'Activo':stats.studentCount>0?'Nuevo':'Sin alumnos';return Object.assign({},sc,stats,{directorName:dir,status:status});});
    const ranking=schoolRows.slice().sort(function(a,b){return b.sessionCount-a.sessionCount;}).slice(0,6);
    const maxRank=Math.max(1,Math.max.apply(null,ranking.map(function(r){return r.sessionCount;})));
    const alertInactive=schoolRows.filter(function(sc){return sc.studentCount>0&&sc.sessionCount===0;});
    const alertLowConc=schoolRows.filter(function(sc){const c=parseFloat(sc.avgConcentration);return !isNaN(c)&&c<3&&c>0;});
    const alertSuspended=allUsers.filter(function(u){return u.suspended;});
    const from7d=new Date(+now-7*86400000);
    const alertNoSess=students.filter(function(u){const us=sessions.filter(function(se){return se.email===u.id;});if(!us.length)return true;return(now-new Date(us[us.length-1].datetime))>7*86400000;});
    const recentUsers=allUsers.filter(function(u){return u.role!=='super_admin';}).sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);}).slice(0,6);
    function trendBadge(v){return v>0?'<span style="color:#22c55e;font-size:10px;">▲ '+v+'%</span>':v<0?'<span style="color:#ef4444;font-size:10px;">▼ '+Math.abs(v)+'%</span>':'<span style="color:var(--muted);font-size:10px;">—</span>';}
    function spk(data,color){const m=Math.max(1,Math.max.apply(null,data));return '<div style="display:flex;align-items:flex-end;gap:1.5px;height:26px;margin-top:6px;">'+data.map(function(v){return '<div style="flex:1;background:'+color+';border-radius:1px 1px 0 0;height:'+Math.max(6,Math.round(v/m*100))+'%;opacity:0.75;"></div>';}).join('')+'</div>';}
    function hb(pct,color){return '<div style="background:rgba(255,255,255,0.06);border-radius:4px;height:5px;overflow:hidden;margin-top:6px;"><div style="width:'+Math.min(100,Math.max(0,pct))+'%;height:100%;background:'+color+';border-radius:4px;"></div></div>';}
    function vb(data,colors,labels){const m=Math.max(1,Math.max.apply(null,data));return '<div style="display:flex;align-items:flex-end;gap:6px;height:88px;">'+data.map(function(v,i){return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;"><div style="font-size:9px;color:var(--muted);">'+(v||'')+'</div><div style="width:100%;background:'+(colors[i]||'var(--accent)')+';border-radius:3px 3px 0 0;height:'+Math.max(4,Math.round(v/m*72))+'px;opacity:0.85;"></div></div>';}).join('')+'</div><div style="display:flex;gap:6px;margin-top:4px;">'+labels.map(function(l){return '<div style="flex:1;text-align:center;font-size:9px;color:var(--muted);">'+l+'</div>';}).join('')+'</div>';}
    return `
<style>
  .ops-wrap{display:flex;flex-direction:column;gap:14px;}
  .ops-strip{display:flex;gap:10px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;}
  .ops-strip::-webkit-scrollbar{display:none;}
  .ops-kpi{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px;min-width:130px;flex:1;}
  .ops-kpi-v{font-size:24px;font-weight:800;line-height:1;letter-spacing:-0.5px;}
  .ops-kpi-l{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-top:2px;}
  .ops-2col{display:grid;grid-template-columns:1fr 320px;gap:14px;}
  .ops-row2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
  .ops-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;}
  .ops-card-body{padding:16px;}
  .ops-card-hd{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;}
  .ops-label{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);font-weight:600;}
  .ops-st{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;}
  .ops-st-a{background:rgba(34,197,94,.14);color:#22c55e;}
  .ops-st-n{background:rgba(245,158,11,.14);color:#f59e0b;}
  .ops-st-s{background:rgba(100,100,100,.15);color:var(--muted);}
  .ops-al{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);}
  .ops-al:last-child{border-bottom:none;}
  .ops-rk{margin-bottom:9px;}
  .ops-rk-lbl{display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;}
  @media(max-width:900px){.ops-2col,.ops-row2{grid-template-columns:1fr;}}
</style>
<div class="ops-wrap">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
    <div><h1 style="margin:0;font-size:20px;font-weight:800;">⚙️ Centro de Operaciones</h1><p class="muted" style="margin:3px 0 0;font-size:12px;">${now.toLocaleDateString('es-PE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="primary" data-go="manage-schools">🏫 Colegios</button>
      <button class="ghost"   data-go="manage-users">👥 Usuarios</button>
      <button class="ghost" id="btnDiagLog">🩺 Diagnóstico</button>
    </div>
  </div>
  <div class="ops-strip">
    <div class="ops-kpi"><div class="ops-kpi-v" style="color:var(--accent-2);">${schools.length}</div><div class="ops-kpi-l">Colegios</div>${hb(schools.length?100:0,'var(--accent)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v" style="color:var(--accent-2);">${classrooms.length}</div><div class="ops-kpi-l">Aulas activas</div>${hb(classrooms.length?Math.min(100,classrooms.length/Math.max(1,schools.length*5)*100):0,'var(--accent)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${students.length}</div><div class="ops-kpi-l">Estudiantes</div>${spk(weeklyData.map(function(){return students.length;}),'var(--primary)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${teachers.length}</div><div class="ops-kpi-l">Docentes</div>${hb(teachers.length/Math.max(1,students.length)*100*5,'var(--primary)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v" style="color:var(--primary);">${classrooms.filter(function(c){return !!c.tutorId;}).length}/${classrooms.length}</div><div class="ops-kpi-l">Aulas con tutor</div>${hb(classrooms.length?classrooms.filter(function(c){return !!c.tutorId;}).length/classrooms.length*100:0,'var(--primary)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${sessions.length.toLocaleString()}</div><div class="ops-kpi-l">Sesiones totales</div>${spk(weeklyData,'var(--accent)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${sessWeek.length}</div><div class="ops-kpi-l">Esta semana</div><div style="font-size:10px;margin-top:2px;">${trendBadge(weekDelta)}</div>${spk(weeklyData.slice(-4),'var(--good)')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${sessions.length?avgConc.toFixed(1)+'/5':'—'}</div><div class="ops-kpi-l">Concentración prom.</div>${hb(sessions.length?avgConc/5*100:0,avgConc>=4?'#22c55e':avgConc>=3?'var(--primary)':'#ef4444')}</div>
    <div class="ops-kpi"><div class="ops-kpi-v">${Math.round(totalMin/60).toLocaleString()} h</div><div class="ops-kpi-l">Horas estudiadas</div>${spk(weeklyData.map(function(w){return w*25;}),'#a78bfa')}</div>
  </div>
  <div class="ops-2col">
    <div class="ops-card">
      <div class="ops-card-hd"><div><div class="ops-label">Control Institucional</div><span style="font-size:12px;color:var(--muted);">${schools.length} colegio${schools.length!==1?'s':''}</span></div><button class="ghost" style="font-size:12px;padding:4px 12px;" data-go="manage-schools">Ver todos →</button></div>
      ${schools.length===0?'<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">Sin colegios. <button class="ghost" data-go="manage-schools">Crear →</button></div>':'<div style="overflow-x:auto;"><table class="table" style="font-size:12px;"><thead><tr><th>Colegio</th><th>Código</th><th>Director</th><th>Aulas</th><th>Alumnos</th><th>Sesiones</th><th>Estado</th><th></th></tr></thead><tbody>'+schoolRows.map(function(sc){return '<tr><td><strong>'+esc(sc.name)+'</strong></td><td><code style="background:rgba(139,92,246,.12);color:var(--accent-2);padding:2px 6px;border-radius:4px;font-size:11px;">'+sc.code+'</code></td><td class="muted">'+esc(sc.directorName)+'</td><td>'+sc.classroomCount+'</td><td>'+sc.studentCount+'</td><td>'+sc.sessionCount+'</td><td><span class="ops-st '+(sc.status==='Activo'?'ops-st-a':sc.status==='Nuevo'?'ops-st-n':'ops-st-s')+'">'+sc.status+'</span></td><td><button class="ghost" style="padding:3px 8px;font-size:11px;" data-go="manage-schools" data-sid="'+esc(sc.id)+'">Editar</button></td></tr>';}).join('')+'</tbody></table></div>'}
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div class="ops-card ops-card-body">
        <div class="ops-label" style="margin-bottom:12px;">Alertas del sistema</div>
        <div class="ops-al"><div><div style="font-size:13px;font-weight:600;">⚠️ Sin actividad</div><div style="font-size:11px;color:var(--muted);">Colegios con alumnos sin sesiones</div></div><span style="font-size:18px;font-weight:800;color:${alertInactive.length>0?'#f59e0b':'#22c55e'};">${alertInactive.length}</span></div>
        <div class="ops-al"><div><div style="font-size:13px;font-weight:600;">📉 Concentración baja</div><div style="font-size:11px;color:var(--muted);">Colegios prom. &lt; 3/5</div></div><span style="font-size:18px;font-weight:800;color:${alertLowConc.length>0?'#ef4444':'#22c55e'};">${alertLowConc.length}</span></div>
        <div class="ops-al"><div><div style="font-size:13px;font-weight:600;">😴 Inactivos 7+ días</div></div><span style="font-size:18px;font-weight:800;color:${alertNoSess.length>3?'#f59e0b':'#22c55e'};">${alertNoSess.length}</span></div>
        <div class="ops-al"><div><div style="font-size:13px;font-weight:600;">🔴 Suspendidos</div></div><span style="font-size:18px;font-weight:800;color:${alertSuspended.length>0?'#ef4444':'#22c55e'};">${alertSuspended.length}</span></div>
      </div>
      ${ranking.length>0?'<div class="ops-card ops-card-body"><div class="ops-label" style="margin-bottom:12px;">Ranking por sesiones</div>'+ranking.map(function(r,i){return '<div class="ops-rk"><div class="ops-rk-lbl"><span>'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.')+' '+esc(r.name)+'</span><span style="color:var(--muted);font-size:11px;">'+r.sessionCount+' ses.</span></div><div style="background:rgba(255,255,255,.06);border-radius:4px;height:5px;overflow:hidden;"><div style="width:'+Math.round(r.sessionCount/maxRank*100)+'%;height:100%;background:'+(i===0?'var(--primary)':i===1?'var(--accent-2)':'rgba(139,92,246,.45)')+';border-radius:4px;"></div></div></div>';}).join('')+'</div>':''}
    </div>
  </div>
  <div class="ops-row2">
    <div class="ops-card ops-card-body"><div class="ops-label" style="margin-bottom:12px;">Crecimiento semanal</div>${vb(weeklyData,weeklyData.map(function(_,i){return i===weeklyData.length-1?'var(--primary)':'rgba(139,92,246,.55)';}),weekLabels)}</div>
    <div class="ops-card ops-card-body"><div class="ops-label" style="margin-bottom:12px;">Distribución de concentración</div>${vb(concBuckets,['#ef4444','#f97316','#f59e0b','#22c55e','#10b981'],['1★','2★','3★','4★','5★'])}${sessions.length===0?'<p class="muted" style="font-size:12px;text-align:center;margin:8px 0 0;">Sin sesiones aún.</p>':''}</div>
  </div>
  <div class="ops-card">
    <div class="ops-card-hd"><div class="ops-label">Usuarios recientes</div><button class="ghost" style="font-size:12px;padding:4px 12px;" data-go="manage-users">Ver todos →</button></div>
    ${recentUsers.length===0?'<div style="padding:16px;text-align:center;color:var(--muted);">Sin usuarios.</div>':'<div style="overflow-x:auto;"><table class="table" style="font-size:12px;"><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Colegio</th><th>Estado</th><th>Registrado</th></tr></thead><tbody>'+recentUsers.map(function(u){const rl={student:'Estudiante',teacher:'Docente',super_admin:'Admin'}[u.role]||u.role;const sn=u.schoolId?((s.schools[u.schoolId]&&s.schools[u.schoolId].name)||'—'):'—';let b='—';if(u.suspended)b='<span class="ops-st" style="background:rgba(239,68,68,.12);color:#ef4444;">Suspendido</span>';else if(u.approvalStatus==='pending')b='<span class="ops-st ops-st-n">Pendiente</span>';else if(u.approvalStatus==='approved'||u.classroomId)b='<span class="ops-st ops-st-a">Activo</span>';return '<tr><td><strong>'+esc(u.name)+'</strong></td><td class="muted">'+esc(u.email)+'</td><td><span class="chip" style="font-size:10px;">'+rl+'</span></td><td class="muted">'+esc(sn)+'</td><td>'+b+'</td><td>'+new Date(u.createdAt).toLocaleDateString('es-PE')+'</td></tr>';}).join('')+'</tbody></table></div>'}
  </div>
</div>`;
  }

  function wireAdminDashboard() {
    root().querySelectorAll('[data-go]').forEach(function(btn){
      btn.addEventListener('click',function(){var sid=btn.dataset.sid;if(sid)App._editSchoolId=sid;App.go(btn.dataset.go);});
    });
    var d=document.getElementById('btnDiagLog');
    d&&d.addEventListener('click',function(){try{window.Monitor&&window.Monitor.exportLog&&window.Monitor.exportLog();UI.flash('Registro exportado.','success');}catch(_){UI.flash('No disponible.','error');}});
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
