-- Migration: TrackTutor compartido dentro de la sala (TrackNara) — Fase 5
-- Tabla propia (no reutiliza 'messages' de compañeros ni el _chatState
-- individual de TrackTutor): mensajes de una sala, donde 'sender' es el
-- email de un participante o el literal 'assistant' para las respuestas de
-- TrackTutor. Ambos participantes ven la misma conversación con la IA
-- (a diferencia de las sesiones individuales existentes, que son 100% locales
-- por usuario). Reutiliza el mismo helper de bloqueo que ya protege la sala.

create table if not exists public.room_messages (
  id text primary key default gen_random_uuid()::text,
  room_id text not null references public.study_rooms(id) on delete cascade,
  sender text not null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists room_messages_room_created_idx
  on public.room_messages (room_id, created_at);

alter table public.room_messages enable row level security;

drop policy if exists "room_messages_select" on public.room_messages;
create policy "room_messages_select" on public.room_messages
  for select using (
    public.is_room_participant(room_id)
    and not public.study_room_blocked(room_id)
  );

drop policy if exists "room_messages_insert" on public.room_messages;
create policy "room_messages_insert" on public.room_messages
  for insert
  with check (
    public.is_room_participant(room_id)
    and not public.study_room_blocked(room_id)
    and (sender = current_email() or sender = 'assistant')
  );

alter publication supabase_realtime add table public.room_messages;
