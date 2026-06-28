-- Bewertungen pro Person (1-10)
-- Im Supabase SQL Editor ausführen

alter table public.anime
  add column if not exists ratings jsonb not null default '{}'::jsonb;
