-- MegaPromo Web - Admin clear player game history
-- A executer dans Supabase SQL Editor.
-- Script idempotent : autorise le SA a vider l'historique de jeux d'un joueur
-- et a remettre ses compteurs de participation a zero.

grant usage on schema public to authenticated;
grant select, update on public.users to authenticated;
grant select, delete on public.participations to authenticated;

alter table public.users enable row level security;
alter table public.participations enable row level security;

drop policy if exists users_admin_update_clear_player_history on public.users;
create policy users_admin_update_clear_player_history
on public.users
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists participations_admin_select_clear_player_history on public.participations;
create policy participations_admin_select_clear_player_history
on public.participations
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists participations_admin_delete_clear_player_history on public.participations;
create policy participations_admin_delete_clear_player_history
on public.participations
for delete
to authenticated
using (public.current_user_is_admin());

