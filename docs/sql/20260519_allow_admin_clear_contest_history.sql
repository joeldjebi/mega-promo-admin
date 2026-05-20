-- MegaPromo Web - Admin clear contest participation history
-- A executer dans Supabase SQL Editor.
-- Script idempotent : autorise le SA a lire et vider l'historique de participations d'un concours.

grant usage on schema public to authenticated;
grant select, delete on public.participations to authenticated;
grant select on public.users to authenticated;
grant select on public.contests to authenticated;

alter table public.participations enable row level security;

drop policy if exists participations_admin_select_contest_history on public.participations;
create policy participations_admin_select_contest_history
on public.participations
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists participations_admin_delete_contest_history on public.participations;
create policy participations_admin_delete_contest_history
on public.participations
for delete
to authenticated
using (public.current_user_is_admin());

