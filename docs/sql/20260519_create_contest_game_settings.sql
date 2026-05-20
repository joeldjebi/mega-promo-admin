-- MegaPromo Web - Contest game settings
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ne supprime aucune table et peut etre relance sans perte de donnees.

create table if not exists public.contest_draw_settings (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null unique references public.contests(id) on delete cascade,
  standard_tickets int4 not null default 1,
  premium_tickets int4 not null default 2,
  confirmation_message text,
  winner_announcement_at timestamptz,
  rules text,
  created_at timestamptz default now()
);

create table if not exists public.contest_predictions (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null unique references public.contests(id) on delete cascade,
  home_team varchar not null default '',
  away_team varchar not null default '',
  match_label varchar,
  match_date timestamptz,
  home_score int4,
  away_score int4,
  status varchar default 'open',
  points_exact_score int4 default 50,
  points_correct_result int4 default 20,
  created_at timestamptz default now()
);

create index if not exists contest_draw_settings_contest_id_idx
on public.contest_draw_settings(contest_id);

create index if not exists contest_predictions_contest_id_idx
on public.contest_predictions(contest_id);

grant usage on schema public to authenticated;
grant select on public.contests to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.contest_draw_settings to authenticated;
grant select, insert, update, delete on public.contest_predictions to authenticated;

alter table public.questions enable row level security;
alter table public.contest_draw_settings enable row level security;
alter table public.contest_predictions enable row level security;

drop policy if exists questions_admin_select_game_config on public.questions;
create policy questions_admin_select_game_config
on public.questions
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists questions_admin_insert_game_config on public.questions;
create policy questions_admin_insert_game_config
on public.questions
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists questions_admin_update_game_config on public.questions;
create policy questions_admin_update_game_config
on public.questions
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists questions_admin_delete_game_config on public.questions;
create policy questions_admin_delete_game_config
on public.questions
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists contest_draw_settings_admin_select_game_config on public.contest_draw_settings;
create policy contest_draw_settings_admin_select_game_config
on public.contest_draw_settings
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists contest_draw_settings_admin_insert_game_config on public.contest_draw_settings;
create policy contest_draw_settings_admin_insert_game_config
on public.contest_draw_settings
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists contest_draw_settings_admin_update_game_config on public.contest_draw_settings;
create policy contest_draw_settings_admin_update_game_config
on public.contest_draw_settings
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists contest_draw_settings_admin_delete_game_config on public.contest_draw_settings;
create policy contest_draw_settings_admin_delete_game_config
on public.contest_draw_settings
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists contest_predictions_admin_select_game_config on public.contest_predictions;
create policy contest_predictions_admin_select_game_config
on public.contest_predictions
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists contest_predictions_admin_insert_game_config on public.contest_predictions;
create policy contest_predictions_admin_insert_game_config
on public.contest_predictions
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists contest_predictions_admin_update_game_config on public.contest_predictions;
create policy contest_predictions_admin_update_game_config
on public.contest_predictions
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists contest_predictions_admin_delete_game_config on public.contest_predictions;
create policy contest_predictions_admin_delete_game_config
on public.contest_predictions
for delete
to authenticated
using (public.current_user_is_admin());
