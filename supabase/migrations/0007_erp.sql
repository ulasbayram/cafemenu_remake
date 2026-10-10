-- Requires 0006. All quantities are in L / kg / units; 250 ml = 0.250 L.
begin;
create table public.erp_inventory (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  name text not null check(length(name) between 1 and 100),
  unit text not null check(unit in ('L','kg','adet')),
  quantity numeric(18,6) not null default 0,
  unit_cost numeric(18,6) check(unit_cost >= 0),
  threshold numeric(18,6) not null default 0 check(threshold >= 0),
  updated_at timestamptz not null default now(),
  unique(cafe_id, name), unique(cafe_id, id)
);
create table public.erp_recipes (
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  product_id text not null,
  ingredient_id uuid not null,
  quantity numeric(18,6) not null check(quantity > 0),
  primary key(cafe_id, product_id, ingredient_id),
  foreign key(cafe_id, ingredient_id) references public.erp_inventory(cafe_id,id)
);
create table public.erp_sales (
  order_id uuid primary key references public.orders(id) on delete cascade,
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  completed_at timestamptz not null default now(),
  total numeric(12,2) not null,
  material_cost numeric(24,6) not null default 0,
  cost_complete boolean not null default true,
  lines jsonb not null default '[]'
);
create index erp_sales_period on public.erp_sales(cafe_id,completed_at);
create table public.erp_movements (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  ingredient_id uuid not null,
  order_id uuid references public.orders(id) on delete set null,
  kind text not null check(kind in ('opening','purchase','count','sale')),
  delta numeric(18,6) not null,
  unit_cost numeric(18,6),
  note text not null default '',
  created_at timestamptz not null default now(),
  foreign key(cafe_id, ingredient_id) references public.erp_inventory(cafe_id,id)
);
create index erp_movements_period on public.erp_movements(cafe_id,created_at);
create table public.erp_expenses (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  day date not null,
  category text not null check(category in ('rent','salary','utilities','other')),
  description text not null check(length(description) between 1 and 200),
  amount numeric(12,2) not null check(amount > 0),
  created_at timestamptz not null default now()
);
create index erp_expenses_period on public.erp_expenses(cafe_id,day);
create table public.erp_operations (
  id uuid primary key,
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  input jsonb not null,
  created_at timestamptz not null default now()
);

-- Private tables: no browser can bypass module checks via PostgREST.
do $$ declare t text; begin
  foreach t in array array['erp_inventory','erp_recipes','erp_sales','erp_movements','erp_expenses','erp_operations'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;

-- Server-only mutation entry point. Rechecks owner and active module in DB.
create function public.erp_mutate(p_user uuid, p_cafe uuid, p_request uuid, p_input jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  action text := p_input->>'action';
  ingredient public.erp_inventory%rowtype;
  ingredient_id uuid;
  qty numeric; price numeric; delta numeric; part jsonb;
  inserted integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_cafe::text, 723));
  if not exists(select 1 from public.cafes c join public.account_module_grants g on g.user_id=c.owner
    where c.id=p_cafe and c.owner=p_user and g.module_key='erp' and g.status='active'
      and (g.expires_at is null or g.expires_at>now())) then
    raise exception 'ERP_ACCESS' using errcode='42501';
  end if;
  insert into public.erp_operations(id,cafe_id,input) values(p_request,p_cafe,p_input) on conflict(id) do nothing;
  get diagnostics inserted=row_count;
  if inserted=0 then
    if exists(select 1 from public.erp_operations where id=p_request and cafe_id=p_cafe and input=p_input) then return;
    else raise exception 'ERP_REQUEST_CONFLICT' using errcode='40001'; end if;
  end if;
  if action='ingredient' then
    if p_input->>'productId' is not null then
      if p_input->>'unit'<>'adet' or not exists(select 1 from public.cafes c,jsonb_array_elements(c.data->'items') i
        where c.id=p_cafe and i->>'id'=p_input->>'productId') then
        raise exception 'ERP_PRODUCT' using errcode='P0002';
      end if;
      if exists(select 1 from public.erp_recipes where cafe_id=p_cafe and product_id=p_input->>'productId') then
        raise exception 'ERP_RECIPE_EXISTS' using errcode='23505';
      end if;
    end if;
    qty := (p_input->>'quantity')::numeric; price := (p_input->>'unitCost')::numeric;
    insert into public.erp_inventory(cafe_id,name,unit,quantity,unit_cost,threshold)
      values(p_cafe,p_input->>'name',p_input->>'unit',qty,price,(p_input->>'threshold')::numeric)
      returning id into ingredient_id;
    insert into public.erp_movements(cafe_id,ingredient_id,kind,delta,unit_cost,note)
      values(p_cafe,ingredient_id,'opening',qty,price,'Açılış stoğu');
    if p_input->>'productId' is not null then
      insert into public.erp_recipes(cafe_id,product_id,ingredient_id,quantity)
        values(p_cafe,p_input->>'productId',ingredient_id,1);
    end if;
  elsif action in ('purchase','count') then
    select * into ingredient from public.erp_inventory
      where id=(p_input->>'ingredientId')::uuid and cafe_id=p_cafe for update;
    if not found then raise exception 'ERP_NOT_FOUND' using errcode='P0002'; end if;
    qty := (p_input->>'quantity')::numeric; price := (p_input->>'unitCost')::numeric;
    if action='purchase' then
      delta:=qty;
      -- Weighted average; missing old cost stays unknown while old stock exists.
      if ingredient.quantity>0 then
        if ingredient.unit_cost is null or price is null then price:=null;
        else price:=(ingredient.quantity*ingredient.unit_cost+qty*price)/(ingredient.quantity+qty); end if;
      end if;
      update public.erp_inventory set quantity=quantity+qty,unit_cost=price,updated_at=clock_timestamp()
        where id=ingredient.id;
    else
      if ingredient.updated_at<>(p_input->>'expectedUpdatedAt')::timestamptz then
        raise exception 'ERP_CONFLICT' using errcode='40001';
      end if;
      delta:=qty-ingredient.quantity;
      update public.erp_inventory set quantity=qty,updated_at=clock_timestamp() where id=ingredient.id;
    end if;
    insert into public.erp_movements(cafe_id,ingredient_id,kind,delta,unit_cost,note)
      values(p_cafe,ingredient.id,action,delta,
        case when action='purchase' then (p_input->>'unitCost')::numeric else ingredient.unit_cost end,
        p_input->>'note');
  elsif action='recipe' then
    if not exists(select 1 from public.cafes c, jsonb_array_elements(c.data->'items') i
      where c.id=p_cafe and i->>'id'=p_input->>'productId') then
      raise exception 'ERP_PRODUCT' using errcode='P0002';
    end if;
    delete from public.erp_recipes where cafe_id=p_cafe and product_id=p_input->>'productId';
    for part in select * from jsonb_array_elements(p_input->'parts') loop
      insert into public.erp_recipes(cafe_id,product_id,ingredient_id,quantity)
        values(p_cafe,p_input->>'productId',(part->>'ingredientId')::uuid,(part->>'quantity')::numeric);
    end loop;
  elsif action='expense' then
    insert into public.erp_expenses(cafe_id,day,category,description,amount)
      values(p_cafe,(p_input->>'day')::date,p_input->>'category',p_input->>'description',(p_input->>'amount')::numeric);
  elsif action='deleteExpense' then
    delete from public.erp_expenses where cafe_id=p_cafe and id=(p_input->>'id')::uuid;
    if not found then raise exception 'ERP_NOT_FOUND' using errcode='P0002'; end if;
  else raise exception 'ERP_ACTION'; end if;
end $$;
revoke all on function public.erp_mutate(uuid,uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.erp_mutate(uuid,uuid,uuid,jsonb) to service_role;

-- Payment and stock ledger commit or roll back together, regardless of API used.
create function public.erp_complete_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  line jsonb; recipe record; cost numeric:=0; line_cost numeric;
  complete boolean:=true; line_complete boolean; parts integer;
  snapshot jsonb:='[]'; inserted integer; consume numeric;
begin
  if new.status<>'completed' then return new; end if;
  if tg_op='UPDATE' then
    if old.status='completed' then return new; end if;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.cafe::text,723));
  if not exists(select 1 from public.cafes c join public.account_module_grants g on g.user_id=c.owner
    where c.id=new.cafe and g.module_key='erp' and g.status='active'
      and (g.expires_at is null or g.expires_at>now())) then return new; end if;
  insert into public.erp_sales(order_id,cafe_id,total) values(new.id,new.cafe,new.total)
    on conflict(order_id) do nothing;
  get diagnostics inserted=row_count;
  if inserted=0 then return new; end if;
  for line in select * from jsonb_array_elements(new.items) loop
    parts:=0; line_cost:=0; line_complete:=true;
    for recipe in select r.quantity as recipe_quantity, i.* from public.erp_recipes r
      join public.erp_inventory i on i.id=r.ingredient_id and i.cafe_id=r.cafe_id
      where r.cafe_id=new.cafe and r.product_id=line->>'id' order by i.id loop
      parts:=parts+1; consume:=recipe.recipe_quantity*(line->>'quantity')::numeric;
      -- Negative stock records a real shortage; a collected payment must not disappear.
      update public.erp_inventory set quantity=quantity-consume,updated_at=clock_timestamp() where id=recipe.id;
      insert into public.erp_movements(cafe_id,ingredient_id,order_id,kind,delta,unit_cost,note)
        values(new.cafe,recipe.id,new.id,'sale',-consume,recipe.unit_cost,line->>'name');
      if recipe.unit_cost is null then line_complete:=false;
      else line_cost:=line_cost+consume*recipe.unit_cost; end if;
    end loop;
    if parts=0 then line_complete:=false; end if;
    complete:=complete and line_complete; cost:=cost+line_cost;
    snapshot:=snapshot||jsonb_build_array(line||jsonb_build_object('materialCost',line_cost,'costComplete',line_complete));
  end loop;
  update public.erp_sales set material_cost=cost,cost_complete=complete,lines=snapshot where order_id=new.id;
  return new;
end $$;
revoke all on function public.erp_complete_order() from public, anon, authenticated;
create trigger erp_order_completion after insert or update of status on public.orders
  for each row execute function public.erp_complete_order();
commit;
