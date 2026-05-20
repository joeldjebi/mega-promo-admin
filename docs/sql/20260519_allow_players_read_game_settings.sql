-- MegaPromo Mobile - Player read access to game settings
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet aux joueurs connectes de lire la configuration des jeux actifs.

grant usage on schema public to authenticated;
grant select on public.contest_draw_settings to authenticated;
grant select on public.contest_predictions to authenticated;

alter table public.contest_draw_settings enable row level security;
alter table public.contest_predictions enable row level security;

drop policy if exists contest_draw_settings_players_select_active_games on public.contest_draw_settings;
create policy contest_draw_settings_players_select_active_games
on public.contest_draw_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.contests
    where contests.id = contest_draw_settings.contest_id
      and contests.status = 'active'
  )
);

drop policy if exists contest_predictions_players_select_active_games on public.contest_predictions;
create policy contest_predictions_players_select_active_games
on public.contest_predictions
for select
to authenticated
using (
  exists (
    select 1
    from public.contests
    where contests.id = contest_predictions.contest_id
      and contests.status = 'active'
  )
);
