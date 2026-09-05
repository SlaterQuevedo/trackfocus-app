-- Migration: "Siguiendo" — seguimiento unidireccional (TrackNara)
-- A diferencia de 'connections' (Compañeros: mutuo, requiere aceptación,
-- desbloquea chat/salas), 'follows' es de una sola vía y sin aceptación:
-- sirve para inspirarte en el progreso público de alguien (su XP, nivel,
-- racha, materias) sin que sea tu compañero de estudio. No desbloquea chat
-- ni salas — solo visibilidad del perfil público, igual que ya se puede ver
-- vía búsqueda.

create table if not exists public.follows (
  follower_id text not null references public.users(id) on delete cascade,
  followed_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index if not exists follows_followed_idx on public.follows (followed_id);

alter table public.follows enable row level security;

drop policy if exists "follows_own_select" on public.follows;
create policy "follows_own_select" on public.follows
  for select using (follower_id = current_email() or followed_id = current_email());

drop policy if exists "follows_own_insert" on public.follows;
create policy "follows_own_insert" on public.follows
  for insert with check (follower_id = current_email());

drop policy if exists "follows_own_delete" on public.follows;
create policy "follows_own_delete" on public.follows
  for delete using (follower_id = current_email());

-- search_users / get_public_profiles ahora también devuelven conteos
-- sociales (compañeros, siguiendo, seguidores) — números públicos, nunca
-- listas — mismo criterio de privacidad que xp/level/streak.
drop function if exists public.search_users(text);
create function public.search_users(search_query text)
returns table (
  id text, name text, nickname text, bio text, xp integer, level integer, streak integer,
  companion_count integer, following_count integer, follower_count integer
)
language sql security definer stable
set search_path = public, pg_temp
as $$
  select
    u.id,
    coalesce(nullif(trim(u.display_first_name || ' ' || coalesce(u.display_last_name, '')), ''), u.name) as name,
    u.nickname,
    u.bio,
    u.xp,
    u.level,
    u.streak,
    (select count(*)::int from public.connections c where c.status = 'accepted' and (c.user_id_a = u.id or c.user_id_b = u.id)),
    (select count(*)::int from public.follows f where f.follower_id = u.id),
    (select count(*)::int from public.follows f where f.followed_id = u.id)
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
revoke execute on function public.search_users(text) from anon;

drop function if exists public.get_public_profiles(text[]);
create function public.get_public_profiles(user_ids text[])
returns table (
  id text, name text, nickname text, bio text, xp integer, level integer, streak integer,
  companion_count integer, following_count integer, follower_count integer
)
language sql security definer stable
set search_path = public, pg_temp
as $$
  select
    u.id,
    coalesce(nullif(trim(u.display_first_name || ' ' || coalesce(u.display_last_name, '')), ''), u.name) as name,
    u.nickname,
    u.bio,
    u.xp,
    u.level,
    u.streak,
    (select count(*)::int from public.connections c where c.status = 'accepted' and (c.user_id_a = u.id or c.user_id_b = u.id)),
    (select count(*)::int from public.follows f where f.follower_id = u.id),
    (select count(*)::int from public.follows f where f.followed_id = u.id)
  from public.users u
  where u.id = any(user_ids);
$$;
revoke all on function public.get_public_profiles(text[]) from public;
grant execute on function public.get_public_profiles(text[]) to authenticated;
revoke execute on function public.get_public_profiles(text[]) from anon;
