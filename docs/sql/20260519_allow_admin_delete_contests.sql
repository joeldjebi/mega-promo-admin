-- MegaPromo Web - Admin delete contests
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute seulement le droit de suppression des concours pour le SA.

grant delete on public.contests to authenticated;

drop policy if exists contests_admin_delete_web_dashboard on public.contests;
create policy contests_admin_delete_web_dashboard
on public.contests
for delete
to authenticated
using (public.current_user_is_admin());
