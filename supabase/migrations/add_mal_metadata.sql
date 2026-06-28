-- MAL metadata + erweiterte Status-Zeitstempel
-- Im Supabase SQL Editor ausführen

alter table public.anime
  add column if not exists mal_id integer,
  add column if not exists episodes integer,
  add column if not exists episode_duration_min integer,
  add column if not exists total_duration_min integer,
  add column if not exists genres text[] not null default '{}';

create index if not exists anime_mal_id_idx on public.anime (mal_id);
