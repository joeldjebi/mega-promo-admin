-- MegaPromo Mobile - Fix player read access to game settings
-- A executer dans Supabase SQL Editor.
-- Script idempotent : simplifie la lecture des configurations de jeux par les joueurs.
--
-- Pourquoi :
-- L'app mobile doit pouvoir lire contest_predictions et contest_draw_settings.
-- Sinon elle affiche "Ce jeu n'est pas encore configure par MegaPromo"
-- meme si le SA a bien configure le jeu.

grant usage on schema public to authenticated;
grant select on public.contest_draw_settings to authenticated;
grant select on public.contest_predictions to authenticated;

alter table public.contest_draw_settings enable row level security;
alter table public.contest_predictions enable row level security;

drop policy if exists contest_draw_settings_players_select_active_games on public.contest_draw_settings;
drop policy if exists contest_draw_settings_players_select_game_settings on public.contest_draw_settings;
create policy contest_draw_settings_players_select_game_settings
on public.contest_draw_settings
for select
to authenticated
using (true);

drop policy if exists contest_predictions_players_select_active_games on public.contest_predictions;
drop policy if exists contest_predictions_players_select_game_settings on public.contest_predictions;
create policy contest_predictions_players_select_game_settings
on public.contest_predictions
for select
to authenticated
using (true);
