-- Migration: Chat en tiempo real entre compañeros (TrackNara) — Fase 3
-- Aditiva e idempotente: no borra datos, no toca ninguna tabla existente.
-- Modelo N-participantes desde el día uno (conversations + conversation_participants
-- + messages) para que las salas de estudio grupales de fases futuras no requieran
-- rehacer el esquema, aunque hoy solo se usen conversaciones de 2 personas.
-- Realtime: canal dedicado por conversación vía postgres_changes filtrado por
-- conversation_id (NO el canal global 'tracknara-sync', que hace refetch completo
-- y no sirve para mensajería de alto volumen).

create table if not exists public.conversations (
  id text primary key default gen_random_uuid()::text,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id text not null references public.conversations(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_id text not null references public.users(id),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Helper SECURITY DEFINER para evitar recursión RLS entre conversations y
-- conversation_participants (mismo patrón que current_role()/current_school()
-- en schema.sql).
create or replace function public.is_conversation_participant(conv_id text)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conv_id and cp.user_id = current_email()
  );
$$;

-- Solo lectura desde el cliente: las filas de conversations/participants se
-- crean exclusivamente vía get_or_create_conversation() (SECURITY DEFINER),
-- nunca con insert directo del cliente.
drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations
  for select using (public.is_conversation_participant(id));

drop policy if exists "participants_select" on public.conversation_participants;
create policy "participants_select" on public.conversation_participants
  for select using (public.is_conversation_participant(conversation_id));

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (public.is_conversation_participant(conversation_id));

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert
  with check (sender_id = current_email() and public.is_conversation_participant(conversation_id));

-- Obtiene la conversación 1:1 con "other_id" si ya existe, o la crea junto con
-- sus 2 filas de participantes. Solo permite crear conversación entre
-- compañeros con status='accepted' — nadie puede escribirle a un desconocido
-- ni a alguien bloqueado.
create or replace function public.get_or_create_conversation(other_id text)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  me text := current_email();
  conv_id text;
  a text; b text;
begin
  if me is null then
    raise exception 'No autenticado';
  end if;
  if me = other_id then
    raise exception 'No puedes enviarte mensajes a ti mismo';
  end if;

  a := least(me, other_id);
  b := greatest(me, other_id);

  if not exists (
    select 1 from public.connections c
    where c.status = 'accepted' and c.user_id_a = a and c.user_id_b = b
  ) then
    raise exception 'Solo puedes escribirle a tus compañeros';
  end if;

  select cp1.conversation_id into conv_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = me and cp2.user_id = other_id
  limit 1;

  if conv_id is null then
    insert into public.conversations default values returning id into conv_id;
    insert into public.conversation_participants (conversation_id, user_id)
      values (conv_id, me), (conv_id, other_id);
  end if;

  return conv_id;
end;
$$;
revoke all on function public.get_or_create_conversation(text) from public;
grant execute on function public.get_or_create_conversation(text) to authenticated;

-- Lista las conversaciones del usuario actual con el nombre del otro
-- participante y el último mensaje, sin exponer emails ni joins crudos al
-- cliente (mismo criterio de privacidad que search_users/get_public_profiles).
create or replace function public.list_my_conversations()
returns table (
  conversation_id text,
  other_id text,
  other_name text,
  last_body text,
  last_at timestamptz
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select
    c.id,
    other.user_id,
    coalesce(nullif(trim(u.display_first_name || ' ' || coalesce(u.display_last_name, '')), ''), u.name),
    lm.body,
    coalesce(lm.created_at, c.created_at)
  from public.conversations c
  join public.conversation_participants me_p
    on me_p.conversation_id = c.id and me_p.user_id = current_email()
  join public.conversation_participants other
    on other.conversation_id = c.id and other.user_id <> current_email()
  join public.users u on u.id = other.user_id
  left join lateral (
    select body, created_at from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc limit 1
  ) lm on true
  order by coalesce(lm.created_at, c.created_at) desc;
$$;
revoke all on function public.list_my_conversations() from public;
grant execute on function public.list_my_conversations() to authenticated;
