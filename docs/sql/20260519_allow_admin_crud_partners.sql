-- MegaPromo Web - Admin CRUD partners
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute les droits CRUD des partenaires pour le SA.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.partners to authenticated;

alter table public.partners enable row level security;

drop policy if exists partners_admin_select_web_dashboard on public.partners;
create policy partners_admin_select_web_dashboard
on public.partners
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists partners_admin_insert_web_dashboard on public.partners;
create policy partners_admin_insert_web_dashboard
on public.partners
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists partners_admin_update_web_dashboard on public.partners;
create policy partners_admin_update_web_dashboard
on public.partners
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists partners_admin_delete_web_dashboard on public.partners;
create policy partners_admin_delete_web_dashboard
on public.partners
for delete
to authenticated
using (public.current_user_is_admin());
