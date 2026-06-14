// Pantallas del Super Admin.
const UIAdmin = (() => {

  const root = () => document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // ---- Pantalla: Dashboard del Super Admin ----
  function screenAdminDashboard() {
    const s = Storage.get();
    const schools = Schools.listSchools();
    const allStudents = Object.values(s.users).filter(u => u.role === 'student');
    const allTeachers = Object.values(s.users).filter(u => u.role === 'teacher');
    const allSessions = s.sessions;

    const from7 = new Date(); from7.setDate(from7.getDate() - 7);
    const sessionsThisWeek = allSessions.filter(se => new Date(se.datetime) >= from7);
    const avgConc = allSessions.length
      ? (allSessions.reduce((a, b) => a + b.concentration, 0) / allSessions.length).toFixed(1)
      : '—';

    const schoolCards = schools.map(sc => {
      const stats = Schools.getSchoolStats(sc.id);
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <h2 style="margin:0;">${esc(sc.name)}</h2>
            <span class="chip" style="font-family:monospace;font-size:11px;">${sc.code}</span>
          </div>
          <div class="grid cols-4" style="gap:8px;margin-bottom:14px;">
            <div class="kpi" style="padding:8px;"><div class="v" style="font-size:18px;">${stats.studentCount}</div><div class="l">Alumnos</div></div>
            <div class="kpi" style="padding:8px;"><div class="v" style="font-size:18px;">${stats.classroomCount}</div><div class="l">Aulas</div></div>
            <div class="kpi" style="padding:8px;"><div class="v" style="font-size:18px;">${stats.sessionCount}</div><div class="l">Sesiones</div></div>
            <div class="kpi" style="padding:8px;"><div class="v" style="font-size:18px;">${stats.avgConcentration}</div><div class="l">Conc. prom.</div></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="ghost" data-go="manage-schools" data-sid="${esc(sc.id)}">Editar</button>
            <button class="danger" data-del-school="${esc(sc.id)}" data-name="${esc(sc.name)}">Eliminar</button>
          </div>
        </div>`;
    });

    return `
      <h1>⚙️ Panel de Control — Super Admin</h1>

      <div class="grid cols-4" style="margin-bottom:24px;">
        <div class="kpi"><div class="v">${schools.length}</div><div class="l">Colegios</div></div>
        <div class="kpi"><div class="v">${allStudents.length}</div><div class="l">Estudiantes</div></div>
        <div class="kpi"><div class="v">${allTeachers.length}</div><div class="l">Docentes</div></div>
        <div class="kpi"><div class="v">${allSessions.length}</div><div class="l">Sesiones totales</div></div>
      </div>

      <div class="grid cols-3" style="margin-bottom:24px;">
        <div class="kpi"><div class="v">${sessionsThisWeek.length}</div><div class="l">Sesiones esta semana</div></div>
        <div class="kpi"><div class="v">${avgConc}</div><div class="l">Concentración prom. global</div></div>
        <div class="kpi"><div class="v">${allSessions.reduce((a, b) => a + b.durationMin, 0)}</div><div class="l">Minutos totales</div></div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="margin:0;">Colegios registrados</h2>
        <div style="display:flex;gap:8px;">
          <button class="primary" data-go="manage-schools">+ Crear colegio</button>
          <button class="ghost" data-go="manage-users">Gestionar usuarios</button>
          <button class="ghost" id="btnDiagLog">🩺 Registro de errores</button>
        </div>
      </div>

      ${schoolCards.length > 0
        ? `<div class="grid cols-2">${schoolCards.join('')}</div>`
        : '<div class="card empty">No hay colegios registrados. Crea el primero.</div>'}`;
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
      <div class="card" style="padding:0;overflow:auto;">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;">Aulas — ${esc(editSchool.name)}</h3>
          <span class="chip">${classrooms.length} aula${classrooms.length !== 1 ? 's' : ''}</span>
        </div>
        ${classrooms.length === 0
          ? '<div class="empty muted" style="padding:18px 16px;font-size:13px;">Sin aulas creadas. Los docentes las crean desde su panel.</div>'
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
                  <button class="ghost" style="padding:4px 10px;font-size:12px;" data-save-cr-code="${esc(cr.id)}" title="Guardar código">✓ Guardar</button>
                  <button class="ghost" style="padding:4px 10px;font-size:12px;" data-regen-cr="${esc(cr.id)}" title="Generar código automático">↻ Auto</button>
                </div>
              </td>
              <td>${(cr.studentIds || []).length}</td>
              <td>${(cr.teacherIds || []).length}</td>
              <td><button class="danger" style="padding:4px 10px;font-size:12px;" data-del-cr="${esc(cr.id)}" data-del-cr-name="${esc(cr.name)}">Eliminar</button></td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>` : ''}

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
