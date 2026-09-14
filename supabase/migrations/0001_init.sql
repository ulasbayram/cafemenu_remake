-- Fincan v2 schema · Supabase Postgres
-- Run once in Supabase SQL Editor (or via psql) after project creation.

create extension if not exists pgcrypto;

-- ─── cafes ───────────────────────────────────────────────────────────────────
create table if not exists public.cafes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z][a-z0-9-]{2,59}$'),
  name text not null check (length(name) between 2 and 80),
  location text not null default '' check (length(location) <= 150),
  social jsonb not null default '{}',
  published boolean not null default false,
  table_count smallint not null default 0 check (table_count between 0 and 200),
  logo_url text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cafes_owner_idx on public.cafes (owner, created_at desc);

-- ─── visits ──────────────────────────────────────────────────────────────────
create table if not exists public.visits (
  cafe uuid not null references public.cafes (id) on delete cascade,
  day date not null,
  visitor uuid not null,
  hour smallint not null check (hour between 0 and 23),
  table_no smallint,
  primary key (cafe, day, visitor)
);

-- ─── rates (FX cache) ────────────────────────────────────────────────────────
create table if not exists public.rates (
  key text primary key,
  data jsonb not null,
  fetched_at timestamptz not null
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table public.cafes enable row level security;
alter table public.visits enable row level security;
alter table public.rates enable row level security;

drop policy if exists "cafes_owner_all" on public.cafes;
create policy "cafes_owner_all" on public.cafes
  for all to authenticated
  using ((select auth.uid()) = owner)
  with check ((select auth.uid()) = owner);

drop policy if exists "visits_owner_read" on public.visits;
create policy "visits_owner_read" on public.visits
  for select to authenticated
  using (
    exists (
      select 1 from public.cafes c
      where c.id = visits.cafe and (select auth.uid()) = c.owner
    )
  );

-- Public visit inserts happen through the server (service role bypasses RLS).
drop policy if exists "visits_service_insert" on public.visits;
create policy "visits_service_insert" on public.visits
  for insert to service_role
  with check (true);

-- rates rows are shared, read-only cache data.
drop policy if exists "rates_public_read" on public.rates;
create policy "rates_public_read" on public.rates
  for select to authenticated, anon
  using (true);

-- ─── Storage: menu-images bucket ─────────────────────────────────────────────
-- If this INSERT errors (storage schema restrictions), create the bucket in
-- the dashboard instead: Storage → New bucket → "menu-images" → Public.
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "menu_images_public_read" on storage.objects;
create policy "menu_images_public_read" on storage.objects
  for select
  using (bucket_id = 'menu-images');

drop policy if exists "menu_images_owner_write" on storage.objects;
create policy "menu_images_owner_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "menu_images_owner_delete" on storage.objects;
create policy "menu_images_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- ─── updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists cafes_touch on public.cafes;
create trigger cafes_touch
  before update on public.cafes
  for each row execute function public.touch_updated_at();