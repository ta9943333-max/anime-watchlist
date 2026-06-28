alter table public.anime
  add column if not exists aired_from timestamptz,
  add column if not exists aired_to timestamptz,
  add column if not exists broadcast_day text,
  add column if not exists broadcast_time text,
  add column if not exists mal_season text,
  add column if not exists mal_year integer;
