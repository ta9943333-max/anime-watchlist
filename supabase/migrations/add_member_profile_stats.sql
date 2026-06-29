-- Offizielle AniList-Profilstatistiken pro Mitglied (exakt aus GDPR-Export)
alter table public.members
  add column if not exists profile_stats jsonb;
