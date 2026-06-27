-- Im Supabase SQL Editor ausführen (Ordner-Feature)

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.anime
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

alter table public.folders enable row level security;

drop policy if exists "folders_select_public" on public.folders;
drop policy if exists "folders_insert_public" on public.folders;
drop policy if exists "folders_update_public" on public.folders;
drop policy if exists "folders_delete_public" on public.folders;

create policy "folders_select_public" on public.folders for select using (true);
create policy "folders_insert_public" on public.folders for insert with check (true);
create policy "folders_update_public" on public.folders for update using (true) with check (true);
create policy "folders_delete_public" on public.folders for delete using (true);

alter table public.folders replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'folders'
  ) then
    alter publication supabase_realtime add table public.folders;
  end if;
end $$;

-- Alte Test-Namen aus watched_by entfernen (Alex, Ben, Mia ohne Member)
update public.anime
set watched_by = coalesce(
  (
    select array_agg(n)
    from unnest(watched_by) as n
    where n in (select name from public.members)
  ),
  '{}'
);
