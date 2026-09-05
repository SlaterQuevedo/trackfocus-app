-- Migration: Perfil social ampliado (TrackNara) — Fase 1
-- Aditiva e idempotente: no borra datos, no rompe usuarios existentes.
-- Agrega apodo único + bio a users, y una tabla de hasta 4 fotos por usuario
-- (position 0 = foto principal, 1-3 = secundarias) con su bucket de Storage.

alter table public.users add column if not exists nickname text;
alter table public.users add column if not exists bio text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_bio_length'
  ) then
    alter table public.users
      add constraint users_bio_length check (bio is null or char_length(bio) <= 160);
  end if;
end $$;

create unique index if not exists users_nickname_lower_idx
  on public.users (lower(nickname)) where nickname is not null;

create table if not exists public.profile_photos (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users(id) on delete cascade,
  storage_path text not null,
  position smallint not null check (position between 0 and 3),
  created_at timestamptz not null default now(),
  unique (user_id, position)
);

alter table public.profile_photos enable row level security;

drop policy if exists "profile_photos_owner_all" on public.profile_photos;
create policy "profile_photos_owner_all" on public.profile_photos
  for all
  using (user_id = current_email())
  with check (user_id = current_email());

drop policy if exists "profile_photos_authenticated_read" on public.profile_photos;
create policy "profile_photos_authenticated_read" on public.profile_photos
  for select
  using (auth.role() = 'authenticated');

-- Bucket privado: la lectura de objetos se controla por policy, no por bucket público.
insert into storage.buckets (id, name, public)
  values ('profile-photos', 'profile-photos', false)
  on conflict (id) do nothing;

drop policy if exists "profile_photos_storage_owner" on storage.objects;
create policy "profile_photos_storage_owner" on storage.objects
  for all
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = current_email())
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = current_email());

drop policy if exists "profile_photos_storage_authenticated_read" on storage.objects;
create policy "profile_photos_storage_authenticated_read" on storage.objects
  for select
  using (bucket_id = 'profile-photos' and auth.role() = 'authenticated');

-- Realtime: no se agrega profile_photos a supabase_realtime en esta fase
-- (no hay todavía descubrimiento de otros usuarios que lo necesite).
