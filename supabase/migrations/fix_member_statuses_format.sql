-- Altes member_statuses-Format ("Alex": "completed") in Objekte mit updatedAt umwandeln
-- Im Supabase SQL Editor ausführen (oder via Supabase CLI)

update public.anime a
set member_statuses = coalesce(
  (
    select jsonb_object_agg(
      e.key,
      case
        when jsonb_typeof(e.value) = 'string'
        then jsonb_build_object(
          'status', e.value,
          'updatedAt', '1970-01-01T00:00:00.000Z'
        )
        else e.value
      end
    )
    from jsonb_each(a.member_statuses) e
  ),
  '{}'::jsonb
)
where member_statuses <> '{}'::jsonb;
