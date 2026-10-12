-- An ERP accounting fault must never roll back a completed order.
-- Re-declares the 0007 function with the same body wrapped in an exception
-- handler; the trigger definition and grants from 0007 are unchanged.
create or replace function public.erp_complete_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  line jsonb; recipe record; cost numeric:=0; line_cost numeric;
  complete boolean:=true; line_complete boolean; parts integer;
  snapshot jsonb:='[]'; inserted integer; consume numeric;
begin
  if new.status<>'completed' then return new; end if;
  if tg_op='UPDATE' and old.status='completed' then return new; end if;
  begin
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
  exception when others then
    raise warning 'erp_complete_order skipped for order %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
