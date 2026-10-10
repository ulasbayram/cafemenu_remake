-- Managed through admin APIs only. Normal users cannot grant themselves access.
create table if not exists public.enterprise_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  package_key text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cafe_id, package_key)
);
create index if not exists enterprise_assignments_user_idx on public.enterprise_assignments(user_id, status);
alter table public.enterprise_assignments enable row level security;
revoke all on public.enterprise_assignments from public, anon, authenticated;
grant all on public.enterprise_assignments to service_role;

create table if not exists public.account_module_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, module_key)
);
alter table public.account_module_grants enable row level security;
revoke all on public.account_module_grants from public, anon, authenticated;
grant all on public.account_module_grants to service_role;

drop trigger if exists enterprise_assignments_touch on public.enterprise_assignments;
create trigger enterprise_assignments_touch before update on public.enterprise_assignments for each row execute function public.touch_updated_at();
drop trigger if exists account_module_grants_touch on public.account_module_grants;
create trigger account_module_grants_touch before update on public.account_module_grants for each row execute function public.touch_updated_at();
