-- Canonical menu item rows. The cafes.data jsonb items array is kept as a
-- read mirror during migration; this table is the typed source.
create table if not exists public.menu_items (
  cafe uuid not null references public.cafes(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  name text not null check (length(name) between 1 and 100),
  description text not null default '' check (length(description) <= 300),
  price numeric(12,2) not null check (price >= 0),
  category text not null check (length(category) between 1 and 60),
  available boolean not null default true,
  photo text check (photo is null or length(photo) <= 500),
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (cafe, id)
);
create index if not exists menu_items_cafe_position_idx
  on public.menu_items (cafe, position);
alter table public.menu_items enable row level security;
drop policy if exists "menu_items_owner_all" on public.menu_items;
create policy "menu_items_owner_all" on public.menu_items
  for all to authenticated
  using (exists (select 1 from public.cafes c
    where c.id = menu_items.cafe and (select auth.uid()) = c.owner))
  with check (exists (select 1 from public.cafes c
    where c.id = menu_items.cafe and (select auth.uid()) = c.owner));

-- Backfill: every existing cafe's blob items become rows. Idempotent.
insert into public.menu_items
  (cafe, id, name, description, price, category, available, photo, position)
select c.id,
       i.value->>'id',
       i.value->>'name',
       coalesce(i.value->>'description', ''),
       (i.value->>'price')::numeric,
       i.value->>'category',
       coalesce((i.value->>'available')::boolean, true),
       i.value->>'photo',
       i.ordinality::int - 1
from public.cafes c
cross join lateral jsonb_array_elements(c.data->'items') with ordinality as i(value, ordinality)
where jsonb_typeof(c.data->'items') = 'array'
  and i.value ? 'id' and i.value ? 'name' and i.value ? 'price' and i.value ? 'category'
on conflict (cafe, id) do nothing;
