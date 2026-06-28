-- Nur ausgewählte Namen dürfen sich als Member registrieren
-- Im Supabase SQL Editor ausführen

create table if not exists public.allowed_members (
  name text primary key,
  created_at timestamptz not null default now()
);

alter table public.allowed_members enable row level security;

drop policy if exists "allowed_members_select_public" on public.allowed_members;
create policy "allowed_members_select_public"
  on public.allowed_members for select
  using (true);

drop policy if exists "members_insert_public" on public.members;
drop policy if exists "members_insert_whitelist" on public.members;

create policy "members_insert_whitelist"
  on public.members for insert
  with check (
    exists (
      select 1
      from public.allowed_members am
      where lower(trim(am.name)) = lower(trim(members.name))
    )
  );

-- Erlaubte Namen anpassen (weitere Zeilen hinzufügen oder löschen)
insert into public.allowed_members (name) values
  ('Ricardo'),
  ('Leonard'),
  ('Alex')
on conflict (name) do nothing;
