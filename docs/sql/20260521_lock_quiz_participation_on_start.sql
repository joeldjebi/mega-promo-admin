-- MegaPromo - Lock quiz participation when the player starts
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet a l'app mobile de creer une participation
-- "completed = false" au demarrage d'un quiz, puis de la completer a la fin.

grant usage on schema public to authenticated;
grant select, insert, update on public.participations to authenticated;

alter table public.participations enable row level security;

drop policy if exists participations_players_insert_own_quiz_start on public.participations;
create policy participations_players_insert_own_quiz_start
on public.participations
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists participations_players_update_own_quiz_result on public.participations;
create policy participations_players_update_own_quiz_result
on public.participations
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
