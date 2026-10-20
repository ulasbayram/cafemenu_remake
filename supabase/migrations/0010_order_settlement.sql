-- Apply before deploying payment/discount UI. Historical payment methods stay unknown.
begin;
alter table public.orders add column payment_method text check(payment_method in ('cash','card'));
alter table public.orders add column receipt_discount numeric(12,2) not null default 0 check(receipt_discount>=0);
alter table public.erp_sales add column payment_method text check(payment_method in ('cash','card'));
alter table public.erp_sales add column discount_total numeric(12,2) not null default 0;

-- Ownership and CAS checks are made by the API; financial writes cannot bypass it.
revoke update on public.orders from authenticated;
revoke update(status) on public.orders from authenticated;

create function public.order_settlement_guard() returns trigger
language plpgsql set search_path='' as $$
declare l jsonb; gross numeric:=0; line_net numeric; net numeric:=0; free integer; discount numeric;
begin
  if tg_op='UPDATE' then
    if old.status='completed' then raise exception 'Completed orders are immutable' using errcode='23514'; end if;
    if new.status='completed' and old.status<>'delivered' then raise exception 'Deliver before completing' using errcode='23514'; end if;
  end if;
  if new.status='completed' and new.payment_method is null then raise exception 'Payment method required' using errcode='23514'; end if;
  if new.status<>'completed' and new.payment_method is not null then raise exception 'Payment only on completion' using errcode='23514'; end if;
  for l in select * from jsonb_array_elements(new.items) loop
    free:=coalesce((l->>'complimentaryQuantity')::integer,0);
    discount:=coalesce((l->>'discountAmount')::numeric,0);
    if (l->>'quantity')::numeric<>trunc((l->>'quantity')::numeric) or (l->>'quantity')::numeric<1
      or (l->>'unitPrice')::numeric<0 or free<0 or free>(l->>'quantity')::integer
      or discount<0 or discount<>round(discount,2) then raise exception 'Invalid line adjustment' using errcode='23514'; end if;
    line_net:=round((l->>'unitPrice')::numeric,2)*((l->>'quantity')::integer-free)-discount;
    if line_net<0 then raise exception 'Discount exceeds line' using errcode='23514'; end if;
    gross:=gross+round((l->>'unitPrice')::numeric,2)*(l->>'quantity')::integer;
    net:=net+line_net;
  end loop;
  if new.receipt_discount>net or new.total<>net-new.receipt_discount then raise exception 'Order total mismatch' using errcode='23514'; end if;
  return new;
end $$;
create trigger order_settlement_guard before insert or update on public.orders
for each row execute function public.order_settlement_guard();

-- Alphabetically runs after erp_order_completion; its cost/stock snapshot keeps
-- all served quantities, while netTotal carries allocated discounts per line.
create function public.erp_order_settlement() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status<>'completed' then return new; end if;
  begin
    update public.erp_sales set payment_method=new.payment_method,
      discount_total=(select coalesce(sum(round((i->>'unitPrice')::numeric,2)*(i->>'quantity')::integer),0) from jsonb_array_elements(new.items) i)-new.total
      where order_id=new.id;
  exception when others then
    raise warning 'ERP payment snapshot skipped for order %: %',new.id,sqlerrm;
  end;
  return new;
end $$;
revoke all on function public.erp_order_settlement() from public,anon,authenticated;
create trigger erp_order_settlement after insert or update of status on public.orders
for each row execute function public.erp_order_settlement();
commit;
