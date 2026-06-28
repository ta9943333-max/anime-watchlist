-- Status pro Person (wie LiveChart.me)
-- Im Supabase SQL Editor ausführen

alter table public.anime
  add column if not exists member_statuses jsonb not null default '{}'::jsonb;

-- Alte watched_by-Einträge als "completed" übernehmen (mit updatedAt)
update public.anime
set member_statuses = coalesce(member_statuses, '{}'::jsonb) || (
  select coalesce(
    jsonb_object_agg(
      name,
      jsonb_build_object(
        'status', 'completed',
        'updatedAt', '1970-01-01T00:00:00.000Z'
      )
    ),
    '{}'::jsonb
  )
  from unnest(watched_by) as name
  where name is not null and name <> ''
)
where watched_by is not null
  and array_length(watched_by, 1) > 0;
