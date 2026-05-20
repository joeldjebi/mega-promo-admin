-- MegaPromo Web - Admin send notifications
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet au SA de creer des notifications individuelles ou groupees.

grant usage on schema public to authenticated;
grant select on public.users to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

alter table public.notifications enable row level security;

drop policy if exists notifications_admin_insert_send_push on public.notifications;
create policy notifications_admin_insert_send_push
on public.notifications
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists notifications_admin_update_send_push on public.notifications;
create policy notifications_admin_update_send_push
on public.notifications
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists notifications_admin_delete_send_push on public.notifications;
create policy notifications_admin_delete_send_push
on public.notifications
for delete
to authenticated
using (public.current_user_is_admin());
