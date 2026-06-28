// ui-grades.js — Componentes HTML para el sistema de calificaciones
// Depende de: grades.js, storage.js, ui.js (para esc / UI.flash)
const GradeUI = (() => {

  function _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ── Insignia de escala ────────────────────────────────────────────────────────

  function renderScaleBadge(scale) {
    const info = Grades.SCALE_MAP[scale];
    if (!info) return `<span class="grade-scale-badge grade-scale-none">—</span>`;
    return `<span class="grade-scale-badge grade-scale-${scale.toLowerCase()}"
      title="${_esc(info.desc)}">${_esc(info.label)}</span>`;
  }

  // ── Tabla de calificaciones ───────────────────────────────────────────────────

  function renderGradeTable(grades, { editable = false, showSubject = false } = {}) {
    if (!grades.length) return '<p class="muted" style="font-size:13px;">Sin calificaciones registradas.</p>';
    const s = Storage.get();
    return `
      <div class="grade-table-wrap">
        <table class="grade-table">
          <thead>
            <tr>
              ${showSubject ? '<th>Materia</th>' : ''}
              <th>Competencia</th>
              <th>Evaluación</th>
              <th>Fecha</th>
              <th>Escala</th>
              <th>Puntaje</th>
              <th>Observaciones</th>
              ${editable ? '<th></th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${grades.map(g => `
              <tr data-grade-id="${_esc(g.id)}">
                ${showSubject ? `<td>${_esc(g.subject)}</td>` : ''}
                <td style="font-size:12px;">${_esc(g.competency)}</td>
                <td>${_esc(g.evaluationName)}</td>
                <td style="white-space:nowrap;">${_esc(g.evaluationDate)}</td>
                <td>${renderScaleBadge(g.scale)}</td>
                <td style="text-align:center;font-weight:600;">${g.score}</td>
                <td style="font-size:12px;color:var(--muted);">${_esc(g.observations)}</td>
                ${editable ? `
                  <td style="white-space:nowrap;">
                    <button class="ghost grade-edit-btn" data-id="${_esc(g.id)}"
                      style="font-size:11px;padding:2px 8px;">Editar</button>
                    <button class="ghost grade-del-btn" data-id="${_esc(g.id)}"
                      style="font-size:11px;padding:2px 8px;color:var(--bad);">Eliminar</button>
                  </td>` : '<td></td>'}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ── Formulario de calificación ────────────────────────────────────────────────

  function renderGradeForm({ studentId, bimesterId, subjects, editGrade = null }) {
    const SCALES = ['AD', 'A', 'B', 'C'];
    const today = new Date().toISOString().slice(0, 10);
    const g = editGrade || {};

    const subjectOpts = subjects.map(sub =>
      `<option value="${_esc(sub)}" ${g.subject === sub ? 'selected' : ''}>${_esc(sub)}</option>`
    ).join('');

    // Competencias del primer subject o del editGrade
    const firstSub = g.subject || subjects[0] || '';
    const competencies = Grades.COMPETENCIES[firstSub] || [];
    const compOpts = competencies.map(c =>
      `<option value="${_esc(c)}" ${g.competency === c ? 'selected' : ''}>${_esc(c)}</option>`
    ).join('');

    const scaleOpts = SCALES.map(sc =>
      `<option value="${sc}" ${(g.scale || 'A') === sc ? 'selected' : ''}>
        ${sc} — ${_esc(Grades.SCALE_MAP[sc].desc)}
      </option>`
    ).join('');

    return `
      <form class="grade-form" id="gradeForm"
        data-student-id="${_esc(studentId)}"
        data-bimester-id="${_esc(bimesterId)}"
        ${editGrade ? `data-grade-id="${_esc(editGrade.id)}"` : ''}>

        <div class="grade-form-grid">
          <div class="grade-form-field">
            <label>Materia</label>
            <select name="subject" id="gradeFormSubject" required>
              ${subjectOpts}
            </select>
          </div>
          <div class="grade-form-field">
            <label>Competencia</label>
            <select name="competency" id="gradeFormCompetency" required>
              ${compOpts}
            </select>
          </div>
          <div class="grade-form-field">
            <label>Nombre de evaluación</label>
            <input name="evaluationName" type="text" placeholder="Ej: Prueba escrita"
              value="${_esc(g.evaluationName || '')}" required maxlength="80">
          </div>
          <div class="grade-form-field">
            <label>Fecha</label>
            <input name="evaluationDate" type="date"
              value="${g.evaluationDate || today}" required>
          </div>
          <div class="grade-form-field">
            <label>Escala</label>
            <select name="scale" id="gradeFormScale" required>
              ${scaleOpts}
            </select>
          </div>
          <div class="grade-form-field">
            <label>Puntaje (0–20)</label>
            <input name="score" type="number" min="0" max="20" id="gradeFormScore"
              value="${g.score != null ? g.score : Grades.scaleToScore(g.scale || 'A')}" required>
          </div>
          <div class="grade-form-field" style="grid-column:1/-1;">
            <label>Observaciones <span style="color:var(--muted);font-weight:400;">(opcional)</span></label>
            <textarea name="observations" rows="2" maxlength="300"
              placeholder="Notas adicionales...">${_esc(g.observations || '')}</textarea>
          </div>
        </div>

        <div class="grade-form-actions">
          <button type="submit" class="btn primary" id="gradeFormSubmit">
            ${editGrade ? 'Guardar cambios' : 'Registrar calificación'}
          </button>
          <button type="button" class="ghost" id="gradeFormCancel">Cancelar</button>
        </div>
      </form>`;
  }

  // ── Panel de bimestres ────────────────────────────────────────────────────────

  function renderBimesterPanel(schoolId, directorMode) {
    const bimesters = Grades.listBimesters(schoolId);
    const bimMap = {};
    bimesters.forEach(b => { bimMap[b.number] = b; });

    const rows = [1, 2, 3, 4].map(num => {
      const b = bimMap[num];
      const name = Grades.BIMESTER_NAMES[num - 1];

      if (!b) {
        return `
          <div class="bimester-row bimester-status-none">
            <div class="bimester-row-info">
              <span class="bimester-num">${name}</span>
              <span class="bimester-badge badge-none">Sin crear</span>
            </div>
            ${directorMode ? `
              <button class="ghost bimester-create-btn" data-num="${num}"
                style="font-size:12px;padding:4px 12px;">Crear</button>` : ''}
          </div>`;
      }

      const isOpen   = b.status === 'open';
      const statusClass = isOpen ? 'bimester-status-open' : 'bimester-status-closed';
      const badgeClass  = isOpen ? 'badge-open' : 'badge-closed';
      const badgeText   = isOpen ? '🟢 Abierto' : '🔒 Cerrado';

      let closedInfo = '';
      if (!isOpen && b.closedAt) {
        const s = Storage.get();
        const who = s.users[b.closedBy]?.name || b.closedBy || 'Desconocido';
        closedInfo = `<span class="muted" style="font-size:11px;">
          ${new Date(b.closedAt).toLocaleDateString('es-PE')} por ${_esc(who)}
        </span>`;
      }

      return `
        <div class="bimester-row ${statusClass}">
          <div class="bimester-row-info">
            <span class="bimester-num">${_esc(b.name)}</span>
            <span class="bimester-badge ${badgeClass}">${badgeText}</span>
            ${closedInfo}
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="ghost bimester-view-btn" data-id="${_esc(b.id)}"
              style="font-size:12px;padding:4px 12px;">Ver →</button>
            ${directorMode && isOpen ? `
              <button class="ghost bimester-close-btn"
                data-id="${_esc(b.id)}" data-name="${_esc(b.name)}"
                style="font-size:12px;padding:4px 12px;color:var(--bad);">Cerrar</button>` : ''}
          </div>
        </div>`;
    });

    return `
      <div class="bimester-card card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <h3 style="margin:0;">Bimestres ${new Date().getFullYear()}</h3>
          ${directorMode ? '<span class="muted" style="font-size:11px;">Vista Director</span>' : ''}
        </div>
        <div class="bimester-list">
          ${rows.join('')}
        </div>
      </div>`;
  }

  // ── Panel de asignaciones ─────────────────────────────────────────────────────

  function renderSubjectAssignmentGrid(classroomId, directorMode) {
    const s = Storage.get();
    const classroom = s.classrooms[classroomId];
    if (!classroom) return '';

    const subjects = (s.subjectsByInstitution?.colegio || []);
    const assignments = Grades.getAssignmentsForClassroom(classroomId);
    const assignMap = {};
    assignments.forEach(a => { assignMap[a.subject] = a; });

    const teachers = Object.values(s.users)
      .filter(u => u.role === 'teacher' && u.schoolId === classroom.schoolId)
      .sort((a, b) => a.name.localeCompare(b.name));

    const teacherOpts = teachers.map(t =>
      `<option value="${_esc(t.id)}">${_esc(t.name)}</option>`
    ).join('');

    const rows = subjects.map(sub => {
      const assign = assignMap[sub];
      const teacher = assign ? s.users[assign.teacherId] : null;

      return `
        <div class="subject-assignment-row" data-subject="${_esc(sub)}">
          <span class="subject-assignment-name">${_esc(sub)}</span>
          <div class="subject-assignment-teacher">
            ${assign && teacher
              ? `<span class="subject-assigned-name">${_esc(teacher.name)}</span>`
              : '<span class="muted" style="font-size:12px;">Sin asignar</span>'}
          </div>
          ${directorMode ? `
            <div class="subject-assignment-actions">
              <select class="subject-teacher-select" data-subject="${_esc(sub)}"
                data-assignment-id="${assign ? _esc(assign.id) : ''}"
                style="font-size:12px;padding:4px 8px;">
                <option value="">— Seleccionar docente —</option>
                ${teacherOpts}
              </select>
              <button class="ghost subject-assign-btn" data-subject="${_esc(sub)}"
                style="font-size:12px;padding:4px 10px;">Asignar</button>
              ${assign ? `<button class="ghost subject-unassign-btn" data-id="${_esc(assign.id)}"
                style="font-size:12px;padding:4px 8px;color:var(--bad);">✕</button>` : ''}
            </div>` : ''}
        </div>`;
    });

    return `
      <div class="subject-assignment-grid">
        <div class="subject-assignment-header">
          <span>Materia</span>
          <span>Docente asignado</span>
          ${directorMode ? '<span>Cambiar</span>' : ''}
        </div>
        ${rows.join('')}
      </div>`;
  }

  // ── Tab de calificaciones para student-detail ─────────────────────────────────

  function renderGradesTab({ studentId, classroomId, currentUserId, bimesters, activeBimesterId }) {
    const s = Storage.get();
    const student = s.users[studentId];
    const school = student ? s.schools[student.schoolId] : null;
    if (!school) return '<p class="muted">Sin datos de colegio.</p>';

    const isDemo = !!(typeof window !== 'undefined' && window.__TF_DEMO);
    const currentUser = s.users[currentUserId];
    const viewerRole = currentUser ? currentUser.role : 'student';
    const viewerIsStudent = viewerRole === 'student';
    const isDirector = Grades.isDirector(currentUserId);
    const assignedSubjects = Grades.getAssignedSubjects(currentUserId, classroomId);

    // Selector de bimestre
    const bimesterOpts = bimesters.map(b =>
      `<option value="${_esc(b.id)}" ${b.id === activeBimesterId ? 'selected' : ''}>
        ${_esc(b.name)} ${b.status === 'closed' ? '🔒' : '🟢'}
      </option>`
    ).join('');

    const activeBimester = bimesters.find(b => b.id === activeBimesterId);
    const bimOpen = !!(activeBimester && activeBimester.status === 'open');

    // Si no hay bimestres
    if (!bimesters.length) {
      return `<div class="card">
        <p class="muted">No hay bimestres creados aún.
        ${isDirector ? ' Ve al panel del docente para crear bimestres.' : ' Consulta con el director.'}
        </p></div>`;
    }

    // Calificaciones del estudiante en el bimestre activo
    const allGrades = Grades.listForStudent(studentId, activeBimesterId);

    // Materias a mostrar: asignadas al docente viewer + materias con notas existentes
    const subjectsToShow = new Set([
      ...assignedSubjects,
      ...allGrades.map(g => g.subject)
    ]);

    const subjectSections = [...subjectsToShow].sort().map(sub => {
      const subGrades = allGrades.filter(g => g.subject === sub);
      const isAssigned = assignedSubjects.includes(sub);
      // Estudiantes: solo lectura. Demo: editar siempre. Normal: solo bimestre abierto y asignado.
      const canEdit = !viewerIsStudent && (isDemo ? isAssigned : (isAssigned && bimOpen));
      const showLocked = !bimOpen && activeBimester && !isDemo;

      return `
        <div class="grade-subject-section" data-subject="${_esc(sub)}">
          <div class="grade-subject-header">
            <h4 style="margin:0;">${_esc(sub)}</h4>
            ${canEdit ? `<button class="ghost grade-add-btn" data-subject="${_esc(sub)}"
              style="font-size:12px;padding:4px 12px;">+ Agregar</button>` : ''}
            ${showLocked ? '<span class="grade-locked-badge">🔒 Cerrado</span>' : ''}
            ${isDemo && !bimOpen && activeBimester ? '<span class="grade-locked-badge" style="background:rgba(99,102,241,.2);color:#a5b4fc;">✏️ Demo</span>' : ''}
          </div>
          <div class="grade-form-area" id="gradeFormArea-${_esc(sub)}" style="display:none;"></div>
          ${renderGradeTable(subGrades, { editable: canEdit })}
        </div>`;
    });

    return `
      <div class="grades-tab-content">
        <div class="grades-bimester-selector">
          <label style="font-size:13px;font-weight:600;">Bimestre:</label>
          <select id="gradesBimesterSelect" style="font-size:13px;padding:6px 10px;margin-left:8px;">
            ${bimesterOpts}
          </select>
        </div>

        ${subjectSections.length
          ? subjectSections.join('')
          : `<p class="muted" style="margin-top:16px;">
              ${isDirector ? 'No hay calificaciones para este bimestre.' : 'No tienes materias asignadas en esta aula.'}
             </p>`}
      </div>`;
  }

  // ── Wiring ────────────────────────────────────────────────────────────────────

  function wireGradeTable(container, { onEdit, onDelete }) {
    container.querySelectorAll('.grade-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => onEdit?.(btn.dataset.id));
    });
    container.querySelectorAll('.grade-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('¿Eliminar esta calificación?')) onDelete?.(btn.dataset.id);
      });
    });
  }

  function wireGradeForm(formEl, { onSubmit, onCancel, classroomId }) {
    if (!formEl) return;

    // Sincronizar escala ↔ puntaje
    const scaleEl = formEl.querySelector('#gradeFormScale');
    const scoreEl = formEl.querySelector('#gradeFormScore');
    const subjectEl = formEl.querySelector('#gradeFormSubject');
    const compEl   = formEl.querySelector('#gradeFormCompetency');

    if (scaleEl && scoreEl) {
      scaleEl.addEventListener('change', () => {
        scoreEl.value = Grades.scaleToScore(scaleEl.value);
      });
      scoreEl.addEventListener('input', () => {
        const newScale = Grades.scoreToScale(Number(scoreEl.value));
        if (scaleEl.value !== newScale) scaleEl.value = newScale;
      });
    }

    // Actualizar competencias cuando cambia la materia
    if (subjectEl && compEl) {
      subjectEl.addEventListener('change', () => {
        const comps = Grades.COMPETENCIES[subjectEl.value] || [];
        compEl.innerHTML = comps.map(c =>
          `<option value="${_esc(c)}">${_esc(c)}</option>`
        ).join('');
      });
    }

    formEl.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(formEl).entries());
      data.score = Number(data.score);
      data.studentId   = formEl.dataset.studentId;
      data.bimesterId  = formEl.dataset.bimesterId;
      data.classroomId = classroomId;
      const gradeId = formEl.dataset.gradeId || null;
      onSubmit?.({ ...data, gradeId });
    });

    formEl.querySelector('#gradeFormCancel')?.addEventListener('click', () => onCancel?.());
  }

  function wireBimesterPanel(container, schoolId) {
    const s = Storage.get();
    const user = s.users[s.currentUserId];
    if (!user) return;

    container.querySelectorAll('.bimester-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        App._bimesterId = btn.dataset.id;
        App._bimGradeClassroomId = null;
        App.go('bimester-grades');
      });
    });

    container.querySelectorAll('.bimester-create-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = Number(btn.dataset.num);
        const id = Grades.createBimester(schoolId, num);
        if (id) {
          UI.flash?.(`${Grades.BIMESTER_NAMES[num-1]} creado.`, 'success');
        }
      });
    });

    container.querySelectorAll('.bimester-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        if (!confirm(`¿Cerrar "${name}"?\n\nTodas las calificaciones quedarán bloqueadas. Esta acción no se puede deshacer.`)) return;
        const ok = Grades.closeBimester(btn.dataset.id);
        if (ok) UI.flash?.(`${name} cerrado correctamente.`, 'success');
      });
    });
  }

  function wireSubjectAssignments(container, classroomId) {
    const s = Storage.get();
    const classroom = s.classrooms[classroomId];
    if (!classroom) return;

    container.querySelectorAll('.subject-assign-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const subject = btn.dataset.subject;
        const select  = container.querySelector(`.subject-teacher-select[data-subject="${CSS.escape(subject)}"]`);
        const teacherId = select?.value;
        if (!teacherId) { UI.flash?.('Selecciona un docente primero.', 'error'); return; }
        Grades.assignSubject(teacherId, classroomId, classroom.schoolId, subject);
        UI.flash?.(`Materia asignada.`, 'success');
      });
    });

    container.querySelectorAll('.subject-unassign-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('¿Quitar la asignación?')) return;
        Grades.removeAssignment(btn.dataset.id);
        UI.flash?.('Asignación eliminada.', 'success');
      });
    });
  }

  return {
    renderScaleBadge,
    renderGradeTable,
    renderGradeForm,
    renderBimesterPanel,
    renderSubjectAssignmentGrid,
    renderGradesTab,
    wireGradeTable,
    wireGradeForm,
    wireBimesterPanel,
    wireSubjectAssignments
  };
})();
