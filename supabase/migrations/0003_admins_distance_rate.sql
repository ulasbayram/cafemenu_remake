-- Fincan 0003: admins table, cafe coords, order distance, umbrella rate counters

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policies: only service_role (server) reads; dashboard INSERT by owners.

alter table public.cafes add column if not exists lat double precision;
alter table public.cafes add column if not exists lng numeric(9,6) check (lng between -180 and 180);

alter table public.orders add column if not exists distance_km smallint;
alter table public.orders add column if not exists distance_source text check (distance_source in ('gps','ip'));

-- Umbrella per-cafe per-minute counter (CF binding covers table/visitor scopes)
create table if not exists public.rate_windows (
  key text primary key,
  count integer not null,
  window_start timestamptz not null
);
alter table public.rate_windows enable row level security;
-- No policies: server-only via service role.