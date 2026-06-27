// CRUD de colegios y aulas + sistema de solicitudes de ingreso.
const Schools = (() => {

  // --- Colegios ---

  function createSchool(name) {
    const id = Storage.uuid();
    const code = Auth.generateSchoolCode();
    Storage.set(s => {
      s.schools[id] = {
        id, name: name.trim(), code,
        adminIds: [],
        createdAt: new Date().toISOString()
      };
    });
    return Storage.get().schools[id];
  }

  function listSchools() {
    return Object.values(Storage.get().schools)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function getSchool(id) {
    return Storage.get().schools[id] || null;
  }

  function deleteSchool(id) {
    Storage.set(s => {
      Object.values(s.users).forEach(u => {
        if (u.schoolId === id) {
          u.schoolId = null;
          if (u.role === 'student') { u.classroomId = null; u.institutionType = null; u.approvalStatus = null; }
          if (u.role === 'teacher') { u.classroomIds = []; }
        }
      });
      Object.keys(s.classrooms).forEach(cid => {
        if (s.classrooms[cid].schoolId === id) delete s.classrooms[cid];
      });
      // Remove school requests
      if (s.classroomRequests) {
        Object.keys(s.classroomRequests).forEach(rid => {
          if (s.classroomRequests[rid].schoolId === id) delete s.classroomRequests[rid];
        });
      }
      delete s.schools[id];
    });
  }

  function updateSchool(id, name) {
    Storage.set(s => { if (s.schools[id]) s.schools[id].name = name.trim(); });
  }

  function updateSchoolCode(id, newCode) {
    const code = (newCode || '').trim().toUpperCase().slice(0, 6);
    if (!code) throw new Error('El código no puede estar vacío.');
    const existing = Object.values(Storage.get().schools).find(sc => sc.code === code && sc.id !== id);
    if (existing) throw new Error('Este código ya está en uso por otro colegio.');
    Storage.set(s => { if (s.schools[id]) s.schools[id].code = code; });
  }

  function updateClassroomCode(classroomId, newCode) {
    const code = (newCode || '').trim().toUpperCase().slice(0, 8);
    if (!code) throw new Error('El código no puede estar vacío.');
    const existing = Object.values(Storage.get().classrooms).find(c => c.inviteCode === code && c.id !== classroomId);
    if (existing) throw new Error('Este código ya está en uso por otra aula.');
    Storage.set(s => { if (s.classrooms[classroomId]) s.classrooms[classroomId].inviteCode = code; });
  }

  // --- Aulas ---

  function _generateInviteCode() {
    return Storage.uuid().toUpperCase().replace(/-/g, '').slice(0, 8);
  }

  function _ensureOrderIndexes(schoolId) {
    const classrooms = Object.values(Storage.get().classrooms).filter(c => c.schoolId === schoolId);
    if (classrooms.some(c => c.orderIndex === undefined)) {
      Storage.set(s => {
        Object.values(s.classrooms)
          .filter(c => c.schoolId === schoolId)
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach((c, i) => { s.classrooms[c.id].orderIndex = i; });
      });
    }
  }

  function createClassroom(schoolId, grade, section) {
    const id = Storage.uuid();
    const name = `${grade.trim()} ${section.trim()}`;
    const inviteCode = _generateInviteCode();
    const existingCount = Object.values(Storage.get().classrooms).filter(c => c.schoolId === schoolId).length;
    Storage.set(s => {
      s.classrooms[id] = {
        id, schoolId, name, grade: grade.trim(), section: section.trim(),
        teacherIds: [], studentIds: [],
        inviteCode,
        orderIndex: existingCount,
        createdAt: new Date().toISOString()
      };
    });
    return Storage.get().classrooms[id];
  }

  function regenerateInviteCode(classroomId) {
    const code = _generateInviteCode();
    Storage.set(s => { if (s.classrooms[classroomId]) s.classrooms[classroomId].inviteCode = code; });
    return code;
  }

  function findClassroomByCode(code) {
    const s = Storage.get();
    return Object.values(s.classrooms).find(c => c.inviteCode === code.trim().toUpperCase()) || null;
  }

  function listClassrooms(schoolId) {
    _ensureOrderIndexes(schoolId);
    return Object.values(Storage.get().classrooms)
      .filter(c => c.schoolId === schoolId)
      .sort((a, b) => {
        const oa = a.orderIndex !== undefined ? a.orderIndex : 999;
        const ob = b.orderIndex !== undefined ? b.orderIndex : 999;
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name);
      });
  }

  function setClassroomOrder(schoolId, orderedIds) {
    Storage.set(s => {
      orderedIds.forEach((id, i) => { if (s.classrooms[id]) s.classrooms[id].orderIndex = i; });
    });
  }

  function moveClassroomUp(classroomId) {
    const cr = Storage.get().classrooms[classroomId];
    if (!cr) return;
    const sorted = listClassrooms(cr.schoolId);
    const idx = sorted.findIndex(c => c.id === classroomId);
    if (idx <= 0) return;
    const newOrder = sorted.map(c => c.id);
    newOrder.splice(idx, 1); newOrder.splice(idx - 1, 0, classroomId);
    setClassroomOrder(cr.schoolId, newOrder);
  }

  function moveClassroomDown(classroomId) {
    const cr = Storage.get().classrooms[classroomId];
    if (!cr) return;
    const sorted = listClassrooms(cr.schoolId);
    const idx = sorted.findIndex(c => c.id === classroomId);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const newOrder = sorted.map(c => c.id);
    newOrder.splice(idx, 1); newOrder.splice(idx + 1, 0, classroomId);
    setClassroomOrder(cr.schoolId, newOrder);
  }

  function autoSortClassrooms(schoolId, direction) {
    function gradeNum(name) { const m = name.match(/(\d+)/); return m ? parseInt(m[1], 10) : 999; }
    const sorted = listClassrooms(schoolId).slice().sort((a, b) => {
      const na = gradeNum(a.name), nb = gradeNum(b.name);
      if (na !== nb) return direction === 'asc' ? na - nb : nb - na;
      return a.name.localeCompare(b.name);
    });
    setClassroomOrder(schoolId, sorted.map(c => c.id));
  }

  function assignStudentDirectly(studentId, newSchoolId, newClassroomId) {
    Storage.set(s => {
      const u = s.users[studentId];
      if (!u) return;
      if (u.classroomId && s.classrooms[u.classroomId]) {
        s.classrooms[u.classroomId].studentIds = (s.classrooms[u.classroomId].studentIds || []).filter(x => x !== studentId);
      }
      if (newSchoolId !== undefined) u.schoolId = newSchoolId || null;
      if (newClassroomId) {
        u.classroomId = newClassroomId;
        u.approvalStatus = 'approved';
        const cr = s.classrooms[newClassroomId];
        if (cr) { if (!cr.studentIds) cr.studentIds = []; if (!cr.studentIds.includes(studentId)) cr.studentIds.push(studentId); }
      } else {
        u.classroomId = null;
        u.approvalStatus = null;
      }
    });
  }

  function getClassroom(id) {
    return Storage.get().classrooms[id] || null;
  }

  function deleteClassroom(id) {
    Storage.set(s => {
      Object.values(s.users).forEach(u => {
        if (u.classroomId === id) u.classroomId = null;
        if (u.classroomIds) u.classroomIds = u.classroomIds.filter(c => c !== id);
      });
      delete s.classrooms[id];
    });
  }

  // --- Membresía directa (solo para profesores/admin) ---

  function addStudentToClassroom(studentId, classroomId) {
    Storage.set(s => {
      const cr = s.classrooms[classroomId];
      if (!cr) return;
      if (s.users[studentId]?.classroomId) {
        const prev = s.classrooms[s.users[studentId].classroomId];
        if (prev) prev.studentIds = prev.studentIds.filter(x => x !== studentId);
      }
      if (!cr.studentIds.includes(studentId)) cr.studentIds.push(studentId);
      if (s.users[studentId]) {
        s.users[studentId].classroomId = classroomId;
        s.users[studentId].approvalStatus = 'approved';
      }
    });
  }

  function removeStudentFromClassroom(studentId, classroomId) {
    Storage.set(s => {
      const cr = s.classrooms[classroomId];
      if (cr) cr.studentIds = cr.studentIds.filter(x => x !== studentId);
      if (s.users[studentId]?.classroomId === classroomId) {
        s.users[studentId].classroomId = null;
        s.users[studentId].approvalStatus = null;
      }
    });
  }

  function moveStudent(studentId, toClassroomId) {
    addStudentToClassroom(studentId, toClassroomId);
  }

  function listStudentsInClassroom(classroomId) {
    const s = Storage.get();
    const cr = s.classrooms[classroomId];
    if (!cr) return [];
    return cr.studentIds.map(id => s.users[id]).filter(Boolean);
  }

  function listStudentsInSchool(schoolId) {
    const s = Storage.get();
    return Object.values(s.users)
      .filter(u => u.role === 'student' && u.schoolId === schoolId);
  }

  function getSchoolStats(schoolId) {
    const s = Storage.get();
    const students = listStudentsInSchool(schoolId);
    const studentIds = students.map(u => u.id);
    const sessions = s.sessions.filter(se => studentIds.includes(se.email));
    const classrooms = listClassrooms(schoolId);
    const tutorCount = classrooms.filter(c => !!c.tutorId).length;
    return {
      studentCount: students.length,
      classroomCount: classrooms.length,
      sessionCount: sessions.length,
      tutorCount,
      avgConcentration: sessions.length
        ? (sessions.reduce((a, b) => a + b.concentration, 0) / sessions.length).toFixed(1)
        : '—'
    };
  }

  // --- Tutores de aula (un único docente responsable por aula) ---

  function getTutorClassroom(teacherId) {
    return Object.values(Storage.get().classrooms).find(c => c.tutorId === teacherId) || null;
  }

  function setClassroomTutor(classroomId, teacherId) {
    const s = Storage.get();
    const cr = s.classrooms[classroomId];
    if (!cr) throw new Error('Aula no encontrada.');
    const teacher = s.users[teacherId];
    if (!teacher || teacher.role !== 'teacher') throw new Error('El usuario seleccionado no es docente.');
    // Validate: teacher already tutor of another classroom
    const existing = getTutorClassroom(teacherId);
    if (existing && existing.id !== classroomId) {
      throw new Error('Este docente ya es tutor del aula "' + existing.name + '". Quítalo primero de ese aula antes de asignarlo aquí.');
    }
    Storage.set(st => {
      // Remove this teacher from any other classroom's tutorId (safety)
      Object.values(st.classrooms).forEach(c => { if (c.tutorId === teacherId && c.id !== classroomId) delete c.tutorId; });
      st.classrooms[classroomId].tutorId = teacherId;
    });
  }

  function removeClassroomTutor(classroomId) {
    Storage.set(s => { if (s.classrooms[classroomId]) delete s.classrooms[classroomId].tutorId; });
  }

  // --- Sistema de solicitudes ---

  function _ensureRequests(s) {
    if (!s.classroomRequests) s.classroomRequests = {};
  }

  function createJoinRequest(studentId, schoolId, classroomId) {
    const s = Storage.get();
    const student = s.users[studentId];
    if (!student) return null;
    const id = Storage.uuid();
    Storage.set(st => {
      _ensureRequests(st);
      st.classroomRequests[id] = {
        id,
        studentId,
        studentName: student.name,
        studentEmail: student.email,
        schoolId,
        classroomId: classroomId || null,
        type: 'join',
        fromClassroomId: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null
      };
      st.users[studentId].approvalStatus = 'pending';
    });
    return Storage.get().classroomRequests[id];
  }

  function createChangeRequest(studentId, toClassroomId) {
    const s = Storage.get();
    const student = s.users[studentId];
    if (!student) return null;
    const id = Storage.uuid();
    Storage.set(st => {
      _ensureRequests(st);
      st.classroomRequests[id] = {
        id,
        studentId,
        studentName: student.name,
        studentEmail: student.email,
        schoolId: student.schoolId,
        classroomId: toClassroomId,
        type: 'change',
        fromClassroomId: student.classroomId || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null
      };
    });
    return Storage.get().classroomRequests[id];
  }

  function listRequestsForSchool(schoolId) {
    const s = Storage.get();
    if (!s.classroomRequests) return [];
    return Object.values(s.classroomRequests)
      .filter(r => r.schoolId === schoolId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function getPendingCount(schoolId) {
    return listRequestsForSchool(schoolId).filter(r => r.status === 'pending').length;
  }

  function approveRequest(requestId, teacherId, targetClassroomId) {
    const s = Storage.get();
    if (!s.classroomRequests) return;
    const req = s.classroomRequests[requestId];
    if (!req || req.status !== 'pending') return;

    const classroomId = targetClassroomId || req.classroomId;
    Storage.set(st => {
      _ensureRequests(st);
      st.classroomRequests[requestId].status = 'approved';
      st.classroomRequests[requestId].resolvedAt = new Date().toISOString();
      st.classroomRequests[requestId].resolvedBy = teacherId;

      const student = st.users[req.studentId];
      if (!student) return;

      student.approvalStatus = 'approved';

      if (classroomId && st.classrooms[classroomId]) {
        // Remove from old classroom
        if (student.classroomId && st.classrooms[student.classroomId]) {
          st.classrooms[student.classroomId].studentIds =
            st.classrooms[student.classroomId].studentIds.filter(x => x !== req.studentId);
        }
        student.classroomId = classroomId;
        if (!st.classrooms[classroomId].studentIds.includes(req.studentId)) {
          st.classrooms[classroomId].studentIds.push(req.studentId);
        }
      }
    });
  }

  function rejectRequest(requestId, teacherId) {
    const s = Storage.get();
    if (!s.classroomRequests) return;
    const req = s.classroomRequests[requestId];
    if (!req || req.status !== 'pending') return;
    Storage.set(st => {
      _ensureRequests(st);
      st.classroomRequests[requestId].status = 'rejected';
      st.classroomRequests[requestId].resolvedAt = new Date().toISOString();
      st.classroomRequests[requestId].resolvedBy = teacherId;
      if (req.type === 'join' && st.users[req.studentId]) {
        st.users[req.studentId].approvalStatus = 'rejected';
      }
    });
  }

  function getStudentRequests(studentId) {
    const s = Storage.get();
    if (!s.classroomRequests) return [];
    return Object.values(s.classroomRequests)
      .filter(r => r.studentId === studentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // Unirse a un aula directamente por código de invitación (flujo QR).
  // Devuelve { cr, school } o lanza un error con código de estado.
  function joinByInviteCode(userId, inviteCode) {
    const s = Storage.get();
    const code = (inviteCode || '').trim().toUpperCase();
    if (!code) throw new Error('CODIGO_INVALIDO');

    const cr = findClassroomByCode(code);
    if (!cr) throw new Error('AULA_NO_ENCONTRADA');

    const school = s.schools[cr.schoolId];
    if (!school) throw new Error('COLEGIO_NO_ENCONTRADO');

    const user = s.users[userId];
    if (!user) throw new Error('PERFIL_NO_ENCONTRADO');

    if (cr.studentIds && cr.studentIds.includes(userId)) throw new Error('YA_MIEMBRO');

    const pending = s.classroomRequests
      ? Object.values(s.classroomRequests).find(r =>
          r.studentId === userId && r.classroomId === cr.id && r.status === 'pending')
      : null;
    if (pending) throw new Error('YA_PENDIENTE');

    if (user.schoolId && user.schoolId !== cr.schoolId) throw new Error('COLEGIO_DIFERENTE');

    if (!user.schoolId) {
      Storage.set(st => {
        if (!st.users[userId]) return;
        st.users[userId].schoolId = cr.schoolId;
        st.users[userId].institutionType = 'colegio';
        st.users[userId].approvalStatus = 'pending';
      });
    }

    createJoinRequest(userId, cr.schoolId, cr.id);
    return { cr, school };
  }

  return {
    createSchool, listSchools, getSchool, deleteSchool, updateSchool, updateSchoolCode, updateClassroomCode,
    createClassroom, listClassrooms, getClassroom, deleteClassroom,
    regenerateInviteCode, findClassroomByCode,
    setClassroomOrder, moveClassroomUp, moveClassroomDown, autoSortClassrooms,
    addStudentToClassroom, removeStudentFromClassroom, moveStudent, assignStudentDirectly,
    listStudentsInClassroom, listStudentsInSchool, getSchoolStats,
    getTutorClassroom, setClassroomTutor, removeClassroomTutor,
    createJoinRequest, createChangeRequest, listRequestsForSchool,
    getPendingCount, approveRequest, rejectRequest, getStudentRequests,
    joinByInviteCode
  };
})();
