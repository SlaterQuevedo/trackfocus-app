-- Migration: Salas de estudio compartidas (TrackNara) — Fase 4
-- Aditiva e idempotente. Mismo patrón N-participantes que conversations
-- (aunque hoy solo se usan salas de 2 personas) para no rehacer el esquema
-- cuando existan salas grupales. Sin mensajería propia todavía — la
-- presencia (quién está "en línea" en la sala ahora mismo) se maneja con
-- Supabase Realtime Presence del lado del cliente, no con una tabla; la
-- Fase 5 reutilizará el _chatState existente de TrackTutor, mapeado por
-- roomId, para el tutor compartido dentro de la sala.

create table if not exists public.study_rooms (
  id text primary key default gen_random_uuid()::text,
  name text,
  created_by text not null references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.study_room_participants (
  room_id text not null references public.study_rooms(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.study_rooms enable row level security;
alter table public.study_room_participants enable row level security;

create or replace function public.is_room_participant(rid text)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.study_room_participants p
    where p.room_id = rid and p.user_id = current_email()
  );
$$;
revoke all on function public.is_room_participant(text) from public;
grant execute on function public.is_room_participant(text) to authenticated;
revoke execute on function public.is_room_participant(text) from anon;

-- Igual que conversation_blocked (Fase 3): si el otro participante está
-- bloqueado (en cualquier dirección), no debe poder verse/usarse la sala.
create or replace function public.study_room_blocked(rid text)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.study_room_participants other
    join public.connections c
      on c.user_id_a = least(other.user_id, current_email())
     and c.user_id_b = greatest(other.user_id, current_email())
    where other.room_id = rid
      and other.user_id <> current_email()
      and c.status = 'blocked'
  );
$$;
revoke all on function public.study_room_blocked(text) from public;
grant execute on function public.study_room_blocked(text) to authenticated;
revoke execute on function public.study_room_blocked(text) from anon;

drop policy if exists "study_rooms_select" on public.study_rooms;
create policy "study_rooms_select" on public.study_rooms
  for select using (public.is_room_participant(id) and not public.study_room_blocked(id));

drop policy if exists "study_room_participants_select" on public.study_room_participants;
create policy "study_room_participants_select" on public.study_room_participants
  for select using (public.is_room_participant(room_id) and not public.study_room_blocked(room_id));

-- Igual que get_or_create_conversation: solo entre compañeros con status
-- 'accepted'. Reutiliza la sala existente si ya hay una entre ambos.
create or replace function public.get_or_create_study_room(other_id text)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  me text := current_email();
  rid text;
  a text; b text;
begin
  if me is null then
    raise exception 'No autenticado';
  end if;
  if me = other_id then
    raise exception 'No puedes crear una sala contigo mismo';
  end if;

  a := least(me, other_id);
  b := greatest(me, other_id);

  if not exists (
    select 1 from public.connections c
    where c.status = 'accepted' and c.user_id_a = a and c.user_id_b = b
  ) then
    raise exception 'Solo puedes estudiar en sala con tus compañeros';
  end if;

  select p1.room_id into rid
  from public.study_room_participants p1
  join public.study_room_participants p2 on p1.room_id = p2.room_id
  where p1.user_id = me and p2.user_id = other_id
  limit 1;

  if rid is null then
    insert into public.study_rooms (created_by) values (me) returning id into rid;
    insert into public.study_room_participants (room_id, user_id)
      values (rid, me), (rid, other_id);
  end if;

  return rid;
end;
$$;
revoke all on function public.get_or_create_study_room(text) from public;
grant execute on function public.get_or_create_study_room(text) to authenticated;
revoke execute on function public.get_or_create_study_room(text) from anon;

create or replace function public.list_my_study_rooms()
returns table (room_id text, other_id text, other_name text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select
    r.id,
    other.user_id,
    coalesce(nullif(trim(u.display_first_name || ' ' || coalesce(u.display_last_name, '')), ''), u.name)
  from public.study_rooms r
  join public.study_room_participants me_p
    on me_p.room_id = r.id and me_p.user_id = current_email()
  join public.study_room_participants other
    on other.room_id = r.id and other.user_id <> current_email()
  join public.users u on u.id = other.user_id
  where not public.study_room_blocked(r.id)
  order by r.created_at desc;
$$;
revoke all on function public.list_my_study_rooms() from public;
grant execute on function public.list_my_study_rooms() to authenticated;
revoke execute on function public.list_my_study_rooms() from anon;
