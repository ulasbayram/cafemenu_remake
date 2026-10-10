-- Default users may advance order status, but not rewrite order contents
-- through direct PostgREST requests. Package A edits use the server client
-- after explicit package assignment and cafe ownership checks.
revoke update on public.orders from authenticated;
grant update (status) on public.orders to authenticated;
revoke insert on public.orders from authenticated;
