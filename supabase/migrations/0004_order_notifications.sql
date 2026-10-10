-- Device subscriptions are server-only. No browser access to other endpoints.
create table if not exists public.order_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists order_push_user_idx on public.order_push_subscriptions(user_id);
alter table public.order_push_subscriptions enable row level security;
revoke all on public.order_push_subscriptions from anon, authenticated;
grant all on public.order_push_subscriptions to service_role;

-- RLS on orders limits events to the owner's cafes.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
