-- Fincan v2 · SQL RPCs for PostgREST aggregation endpoints (stats + admin).
-- Run once in Supabase SQL Editor after 0001_init.sql.
-- Admin RPCs are guarded via assert_admin() (app_metadata.role = 'admin').
-- Naming: <name> = inner implementation, <name>_guarded = admin-checked wrapper.

-- Admin guard (used by all admin RPCs).
create or replace function public.assert_admin()
returns void
language plpgsql
stable
set search_path = auth
as $$
BEGIN
  IF COALESCE(
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    ''
  ) <> 'admin' THEN
    RAISE EXCEPTION 'not an admin' USING ERRCODE = '42501';
  END IF;
END $$;

-- Dashboard stats for the caller's cafes (owner-scoped via auth.uid()).
create or replace function public.visits_stats()
returns table (cafe uuid, day date, hour smallint, "count" bigint, table_no smallint)
language sql
stable
security invoker
set search_path = ''
as $$
  SELECT v.cafe, v.day, v.hour, COUNT(*) AS count,
         MIN(v.table_no) AS table_no
  FROM public.visits v
  JOIN public.cafes c ON c.id = v.cafe
  WHERE c.owner = auth.uid() AND v.day >= (now() - interval '29 days')::date
  GROUP BY v.cafe, v.day, v.hour
$$;

grant execute on function public.visits_stats() to authenticated;

-- ─── Admin overview ─────────────────────────────────────────────────────────
create or replace function public.admin_overview()
returns table (
  cafes bigint, published_cafes bigint, new_cafes_7d bigint,
  visits_total bigint, visits_7d bigint, visits_30d bigint,
  active_cafes_30d bigint, users bigint, new_users_7d bigint
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
BEGIN
  PERFORM public.assert_admin();
  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM cafes),
    (SELECT COUNT(*) FROM cafes WHERE published),
    (SELECT COUNT(*) FROM cafes WHERE created_at > now() - interval '7 days'),
    (SELECT COUNT(*) FROM visits),
    (SELECT COUNT(*) FROM visits WHERE day >= (now() - interval '7 days')::date),
    (SELECT COUNT(*) FROM visits WHERE day >= (now() - interval '30 days')::date),
    (SELECT COUNT(DISTINCT cafe) FROM visits WHERE day >= (now() - interval '30 days')::date),
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '7 days');
END $$;

-- ─── Admin cafes (searchable) ───────────────────────────────────────────────
create or replace function public.admin_cafes(search text default '')
returns table (
  id uuid, slug text, name text, published boolean,
  table_count smallint, created_at timestamptz,
  owner_email text, visits_total bigint, last_visit date
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
BEGIN
  PERFORM public.assert_admin();
  RETURN QUERY
  SELECT c.id, c.slug, c.name, c.published, c.table_count, c.created_at,
         u.email,
         (SELECT COUNT(*) FROM visits v WHERE v.cafe = c.id),
         (SELECT MAX(day) FROM visits v WHERE v.cafe = c.id)
  FROM cafes c
  LEFT JOIN auth.users u ON u.id = c.owner
  WHERE search = ''
     OR lower(c.name) LIKE '%' || lower(search) || '%'
     OR lower(c.slug) LIKE '%' || lower(search) || '%'
     OR lower(coalesce(u.email, '')) LIKE '%' || lower(search) || '%'
  ORDER BY c.created_at DESC
  LIMIT 200;
END $$;

-- ─── Admin users ────────────────────────────────────────────────────────────
create or replace function public.admin_users()
returns table (id uuid, email text, created_at timestamptz, cafes bigint)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
BEGIN
  PERFORM public.assert_admin();
  RETURN QUERY
  SELECT u.id, u.email, u.created_at,
         (SELECT COUNT(*) FROM cafes c WHERE c.owner = u.id)
  FROM auth.users u
  ORDER BY u.created_at DESC
  LIMIT 500;
END $$;

revoke execute on function public.admin_overview() from public, anon, authenticated;
revoke execute on function public.admin_cafes(text) from public, anon, authenticated;
revoke execute on function public.admin_users() from public, anon, authenticated;
revoke execute on function public.assert_admin() from public, anon, authenticated;