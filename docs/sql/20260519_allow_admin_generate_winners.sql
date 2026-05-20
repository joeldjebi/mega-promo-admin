-- MegaPromo Web - Admin generate winner candidates
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet au SA de lire les participations pour generer
-- automatiquement des gagnants candidats apres la fin d'un concours.

grant usage on schema public to authenticated;
grant select on public.participations to authenticated;
grant select, insert, update on public.winners to authenticated;

alter table public.participations enable row level security;
alter table public.winners enable row level security;

drop policy if exists participations_admin_select_generate_winners on public.participations;
create policy participations_admin_select_generate_winners
on public.participations
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists winners_admin_insert_generated_candidates on public.winners;
create policy winners_admin_insert_generated_candidates
on public.winners
for insert
to authenticated
with check (public.current_user_is_admin());

