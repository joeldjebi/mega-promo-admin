-- MegaPromo - Contest access by player plan
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute une restriction optionnelle par forfait joueur.
--
-- allowed_player_plan_keys :
-- - null ou tableau vide => accessible a tous les joueurs
-- - ['free'] => Standard uniquement
-- - ['premium'] => Premium uniquement
-- - ['vip'] => VIP uniquement
-- - ['premium', 'vip'] => Premium et VIP

alter table public.contests
add column if not exists allowed_player_plan_keys text[] default array[]::text[];

update public.contests
set allowed_player_plan_keys = array[]::text[]
where allowed_player_plan_keys is null;

grant select, insert, update on public.contests to authenticated;
