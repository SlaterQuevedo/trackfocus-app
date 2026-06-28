-- ===========================================================
-- Ariven — Sistema Académico de Calificaciones
-- Migración idempotente: ejecutar en el Supabase Dashboard → SQL Editor
-- ===========================================================

-- ---------- TABLA: subject_assignments ----------
-- Asigna un docente a una materia dentro de un aula para un año escolar.
-- Restricción: una sola materia puede tener un solo docente por aula por año.

CREATE TABLE IF NOT EXISTS public.subject_assignments (
  id            text        PRIMARY KEY,
  teacher_id    text        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  classroom_id  text        NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  school_id     text        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject       text        NOT NULL,
  academic_year text        NOT NULL DEFAULT '2026',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subject_assignments_unique_slot UNIQUE (classroom_id, subject, academic_year)
);

CREATE INDEX IF NOT EXISTS subject_assignments_teacher_idx    ON public.subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS subject_assignments_classroom_idx  ON public.subject_assignments(classroom_id);
CREATE INDEX IF NOT EXISTS subject_assignments_school_idx     ON public.subject_assignments(school_id);

-- ---------- TABLA: bimesters ----------
-- Bimestres (1–4) por escuela y año escolar.
-- Solo el Director (teacher en school.admin_ids) puede crear/cerrar bimestres.

CREATE TABLE IF NOT EXISTS public.bimesters (
  id            text        PRIMARY KEY,
  school_id     text        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year text        NOT NULL DEFAULT '2026',
  number        smallint    NOT NULL CHECK (number BETWEEN 1 AND 4),
  name          text        NOT NULL,
  start_date    date,
  end_date      date,
  status        text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at     timestamptz,
  closed_by     text        REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bimesters_unique_slot UNIQUE (school_id, academic_year, number)
);

CREATE INDEX IF NOT EXISTS bimesters_school_idx ON public.bimesters(school_id);

-- ---------- TABLA: grades ----------
-- Calificaciones individuales por estudiante, materia, competencia y bimestre.
-- Escala oficial MINEDU: AD (18-20) / A (14-17) / B (11-13) / C (0-10)

CREATE TABLE IF NOT EXISTS public.grades (
  id               text        PRIMARY KEY,
  student_id       text        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_id       text        NOT NULL REFERENCES public.users(id),
  classroom_id     text        NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  bimester_id      text        NOT NULL REFERENCES public.bimesters(id),
  subject          text        NOT NULL,
  competency       text        NOT NULL,
  evaluation_name  text        NOT NULL,
  evaluation_date  date        NOT NULL,
  scale            text        NOT NULL CHECK (scale IN ('AD', 'A', 'B', 'C')),
  score            smallint    NOT NULL CHECK (score BETWEEN 0 AND 20),
  observations     text        NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grades_student_id_idx    ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS grades_classroom_id_idx  ON public.grades(classroom_id);
CREATE INDEX IF NOT EXISTS grades_bimester_id_idx   ON public.grades(bimester_id);
CREATE INDEX IF NOT EXISTS grades_teacher_id_idx    ON public.grades(teacher_id);

-- ---------- TABLA: grade_audit ----------
-- Registro de auditoría inmutable para todas las operaciones sobre calificaciones.
-- Solo INSERT permitido — nunca UPDATE ni DELETE desde la app.

CREATE TABLE IF NOT EXISTS public.grade_audit (
  id          text        PRIMARY KEY,
  grade_id    text        NOT NULL,
  action      text        NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  changed_by  text        NOT NULL REFERENCES public.users(id),
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grade_audit_grade_id_idx   ON public.grade_audit(grade_id);
CREATE INDEX IF NOT EXISTS grade_audit_changed_by_idx ON public.grade_audit(changed_by);

-- ---------- RLS: habilitar en todas las tablas nuevas ----------
-- Las políticas permissive siguen el patrón existente de la app:
-- la autenticación app-level garantiza que solo usuarios autenticados acceden,
-- y los checks de permisos de escritura son app-level en grades.js.

ALTER TABLE public.subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bimesters           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_audit         ENABLE ROW LEVEL SECURITY;

-- Políticas permissive: usuarios autenticados pueden leer todo
-- (el filtrado real se hace a nivel de app con la lógica de roles)
DO $$ BEGIN
  -- subject_assignments
  DROP POLICY IF EXISTS "subject_assignments_select" ON public.subject_assignments;
  CREATE POLICY "subject_assignments_select" ON public.subject_assignments
    FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS "subject_assignments_insert" ON public.subject_assignments;
  CREATE POLICY "subject_assignments_insert" ON public.subject_assignments
    FOR INSERT TO authenticated WITH CHECK (true);
  DROP POLICY IF EXISTS "subject_assignments_update" ON public.subject_assignments;
  CREATE POLICY "subject_assignments_update" ON public.subject_assignments
    FOR UPDATE TO authenticated USING (true);
  DROP POLICY IF EXISTS "subject_assignments_delete" ON public.subject_assignments;
  CREATE POLICY "subject_assignments_delete" ON public.subject_assignments
    FOR DELETE TO authenticated USING (true);

  -- bimesters
  DROP POLICY IF EXISTS "bimesters_select" ON public.bimesters;
  CREATE POLICY "bimesters_select" ON public.bimesters
    FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS "bimesters_insert" ON public.bimesters;
  CREATE POLICY "bimesters_insert" ON public.bimesters
    FOR INSERT TO authenticated WITH CHECK (true);
  DROP POLICY IF EXISTS "bimesters_update" ON public.bimesters;
  CREATE POLICY "bimesters_update" ON public.bimesters
    FOR UPDATE TO authenticated USING (true);
  DROP POLICY IF EXISTS "bimesters_delete" ON public.bimesters;
  CREATE POLICY "bimesters_delete" ON public.bimesters
    FOR DELETE TO authenticated USING (true);

  -- grades
  DROP POLICY IF EXISTS "grades_select" ON public.grades;
  CREATE POLICY "grades_select" ON public.grades
    FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS "grades_insert" ON public.grades;
  CREATE POLICY "grades_insert" ON public.grades
    FOR INSERT TO authenticated WITH CHECK (true);
  DROP POLICY IF EXISTS "grades_update" ON public.grades;
  CREATE POLICY "grades_update" ON public.grades
    FOR UPDATE TO authenticated USING (true);
  DROP POLICY IF EXISTS "grades_delete" ON public.grades;
  CREATE POLICY "grades_delete" ON public.grades
    FOR DELETE TO authenticated USING (true);

  -- grade_audit (solo lectura y escritura, sin update ni delete)
  DROP POLICY IF EXISTS "grade_audit_select" ON public.grade_audit;
  CREATE POLICY "grade_audit_select" ON public.grade_audit
    FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS "grade_audit_insert" ON public.grade_audit;
  CREATE POLICY "grade_audit_insert" ON public.grade_audit
    FOR INSERT TO authenticated WITH CHECK (true);
END $$;
