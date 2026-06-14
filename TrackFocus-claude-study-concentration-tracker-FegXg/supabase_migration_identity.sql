-- Migration: Identidad robusta TrackFocus
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Es idempotente: se puede ejecutar más de una vez sin error.

-- 1. Agregar columnas de identidad display a public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_first_name text,
  ADD COLUMN IF NOT EXISTS display_last_name  text,
  ADD COLUMN IF NOT EXISTS profile_source     text DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS google_linked      boolean DEFAULT false;

-- 2. Normalizar: para usuarios existentes que no tengan profile_source, inferirlo.
--    Si tienen avatar_url de Google (contiene googleusercontent), es 'google'.
--    De lo contrario, mantener 'google' como default conservador.
UPDATE public.users
SET profile_source = 'google'
WHERE profile_source IS NULL;

-- 3. Garantizar restricción UNIQUE en email (por si no existe).
--    public.users ya usa email como id, pero esta constraint es una red de seguridad.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users'
      AND constraint_name = 'users_email_unique'
      AND constraint_type = 'UNIQUE'
  ) THEN
    -- Solo agregar si id != email (si ya son iguales, ya hay PK que garantiza unicidad)
    -- Verificar que la columna email exista y sea distinta al PK
    ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);
  END IF;
EXCEPTION WHEN others THEN
  -- Si falla (email ya es PK o constraint duplicada), ignorar silenciosamente
  NULL;
END;
$$;

-- 4. Índice para búsqueda rápida por email normalizado
CREATE INDEX IF NOT EXISTS users_email_lower_idx
  ON public.users (lower(email));

-- Verificación final
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('display_first_name','display_last_name','profile_source','google_linked')
ORDER BY column_name;
