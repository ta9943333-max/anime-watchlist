-- Einmal im Supabase Dashboard ausführen:
-- SQL Editor → New query → einfügen → Run

create table if not exists public.anime (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  watched_by text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.anime enable row level security;

create policy "anime_select_public"
  on public.anime for select
  using (true);

create policy "anime_insert_public"
  on public.anime for insert
  with check (true);

create policy "anime_update_public"
  on public.anime for update
  using (true);

create policy "anime_delete_public"
  on public.anime for delete
  using (true);

alter table public.anime replica identity full;

alter publication supabase_realtime add table public.anime;

-- Optional: Start-Anime (nur wenn die Tabelle leer ist)
insert into public.anime (title, watched_by)
select title, watched_by
from (values
  ('Attack on Titan', array['Alex', 'Ben']),
  ('Demon Slayer', array['Mia']),
  ('Jujutsu Kaisen', array[]::text[]),
  ('Spy x Family', array['Alex', 'Ben', 'Mia']),
  ('Chainsaw Man', array['Alex'])
) as seed(title, watched_by)
where not exists (select 1 from public.anime limit 1);
