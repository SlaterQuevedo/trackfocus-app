-- Migration: Compañeros (TrackNara) — Fase 2
-- Aditiva e idempotente: no borra datos, no toca la política sensible de users.
-- Búsqueda global de usuarios sin exponer email/datos privados: se hace vía
-- funciones SECURITY DEFINER que devuelven solo campos públicos, en vez de
-- ampliar la policy de SELECT de la tabla users (que debe seguir restringida
-- a la propia aula/colegio para todo lo demás).

create table if not exists public.connections (
  id text primary key default gen_random_uuid()::text,
  user_id_a text not null references public.users(id) on delete cascade,
  user_id_b text not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  requested_by text not null references public.users(id),
  blocked_by text references public.users(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint connections_order check (user_id_a < user_id_b),
  unique (user_id_a, user_id_b)
);

alter table public.connections enable row level security;

drop policy if exists "connections_parties_select" on public.connections;
create policy "connections_parties_select" on public.connections
  for select using (user_id_a = current_email() or user_id_b = current_email());

drop policy if exists "connections_parties_insert" on public.connections;
create policy "connections_parties_insert" on public.connections
  for insert
  with check (
    (user_id_a = current_email() or user_id_b = current_email())
    and requested_by = current_email()
  );

drop policy if exists "connections_parties_update" on public.connections;
create policy "connections_parties_update" on public.connections
  for update
  using (user_id_a = current_email() or user_id_b = current_email())
  with check (user_id_a = current_email() or user_id_b = current_email());

drop policy if exists "connections_parties_delete" on public.connections;
create policy "connections_parties_delete" on public.connections
  for delete using (user_id_a = current_email() or user_id_b = current_email());

-- Búsqueda de usuarios por nombre o apodo (nunca por email). Excluye a uno
-- mismo y a cualquier par con relación "blocked" en cualquier dirección.
-- SECURITY DEFINER: puede leer la tabla users completa internamente, pero
-- solo devuelve columnas públicas — nunca email ni otros campos sensibles.
create or replace function public.search_users(search_query text)
returns table (id text, name text, nickname text, bio text)
language sql security definer stable
set search_path = public, pg_temp
as $$
  select
    u.id,
    coalesce(nullif(trim(u.display_first_name || ' ' || coalesce(u.display_last_name, '')), ''), u.name) as name,
    u.nickname,
    u.bio
  from public.users u
  where u.id <> current_email()
    and length(trim(search_query)) >= 2
    and (u.name ilike '%' || search_query || '%' or u.nickname ilike '%' || search_query || '%')
    and not exists (
      select 1 from public.connections c
      where c.status = 'blocked'
        and ((c.user_id_a = current_email() and c.user_id_b = u.id)
          or (c.user_id_b = current_email() and c.user_id_a = u.id))
    )
  order by (u.nickname ilike search_query || '%') desc, u.name
  limit 20;
$$;

revoke all on function public.search_users(text) from public;
grant execute on function public.search_users(text) to authenticated;

-- Perfiles públicos por lista de IDs (para mostrar nombre/apodo/bio de
-- solicitudes y compañeros ya existentes, sin exponer el resto de la fila).
create or replace function public.get_public_profiles(user_ids text[])
returns table (id text, name text, nickname text, bio text)
language sql security definer stable
set search_path = public, pg_temp
as $$
  select
    u.id,
    coalesce(nullif(trim(u.display_first_name || ' ' || coalesce(u.display_last_name, '')), ''), u.name) as name,
    u.nickname,
    u.bio
  from public.users u
  where u.id = any(user_ids);
$$;

revoke all on function public.get_public_profiles(text[]) from public;
grant execute on function public.get_public_profiles(text[]) to authenticated;
