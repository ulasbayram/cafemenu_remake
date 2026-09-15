-- Table orders created from signed table QR links.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  cafe uuid not null references public.cafes (id) on delete cascade,
  table_no smallint not null check (table_no between 1 and 200),
  status text not null default 'waiting'
    check (status in ('waiting', 'delivered', 'completed')),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_cafe_status_created_idx
  on public.orders (cafe, status, created_at desc);

alter table public.orders enable row level security;

drop policy if exists "orders_owner_read" on public.orders;
create policy "orders_owner_read" on public.orders
  for select to authenticated
  using (
    exists (
      select 1 from public.cafes c
      where c.id = orders.cafe and (select auth.uid()) = c.owner
    )
  );

drop policy if exists "orders_owner_update" on public.orders;
create policy "orders_owner_update" on public.orders
  for update to authenticated
  using (
    exists (
      select 1 from public.cafes c
      where c.id = orders.cafe and (select auth.uid()) = c.owner
    )
  )
  with check (
    exists (
      select 1 from public.cafes c
      where c.id = orders.cafe and (select auth.uid()) = c.owner
    )
  );

drop policy if exists "orders_service_insert" on public.orders;
create policy "orders_service_insert" on public.orders
  for insert to service_role with check (true);

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();
