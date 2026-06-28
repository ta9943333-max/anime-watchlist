-- Englische Titel, Serien-Gruppierung und MAL-Status
alter table public.anime
  add column if not exists title_english text,
  add column if not exists series_key text,
  add column if not exists mal_status text;

create index if not exists anime_series_key_idx on public.anime (series_key);
create index if not exists anime_mal_id_idx on public.anime (mal_id);
