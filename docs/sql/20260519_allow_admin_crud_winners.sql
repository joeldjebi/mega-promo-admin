-- MegaPromo Web - Admin CRUD winners and rewards
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute les droits CRUD des gagnants pour le SA.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.winners to authenticated;
grant select on public.users to authenticated;
grant select on public.contests to authenticated;

alter table public.winners enable row level security;

drop policy if exists winners_admin_select_web_dashboard on public.winners;
create policy winners_admin_select_web_dashboard
on public.winners
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists winners_admin_insert_web_dashboard on public.winners;
create policy winners_admin_insert_web_dashboard
on public.winners
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists winners_admin_update_web_dashboard on public.winners;
create policy winners_admin_update_web_dashboard
on public.winners
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists winners_admin_delete_web_dashboard on public.winners;
create policy winners_admin_delete_web_dashboard
on public.winners
for delete
to authenticated
using (public.current_user_is_admin());
