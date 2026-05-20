-- MegaPromo Web - Configuration jeu pronostic Coupe du Monde 2026
-- A executer dans Supabase SQL Editor.
-- Script idempotent : relancer ce fichier mettra a jour la configuration du jeu.
--
-- Important :
-- - Le concours doit deja exister.
-- - Ajuste away_team et match_date quand l'adversaire et la date exacte seront connus.

with target_contest as (
  select id
  from public.contests
  where id = '20260519-0000-4000-8000-000000000001'::uuid
     or title = 'Pronostic premier match - Cote d''Ivoire Coupe du Monde 2026'
  limit 1
),
updated_contest as (
  update public.contests
  set
    type = 'pronostic',
    status = 'active'
  where id in (select id from target_contest)
  returning id
),
upsert_game as (
  insert into public.contest_predictions (
    contest_id,
    home_team,
    away_team,
    match_label,
    match_date,
    home_score,
    away_score,
    status,
    points_exact_score,
    points_correct_result,
    created_at
  )
  select
    id,
    'Cote d''Ivoire',
    'Adversaire a definir',
    'Premier match de la Cote d''Ivoire - Coupe du Monde 2026',
    '2026-06-11 15:00:00+00'::timestamptz,
    null,
    null,
    'open',
    50,
    20,
    now()
  from updated_contest
  on conflict (contest_id) do update set
    home_team = excluded.home_team,
    away_team = excluded.away_team,
    match_label = excluded.match_label,
    match_date = excluded.match_date,
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    status = excluded.status,
    points_exact_score = excluded.points_exact_score,
    points_correct_result = excluded.points_correct_result
  returning contest_id
)
select
  case
    when exists (select 1 from upsert_game)
      then 'Jeu pronostic Coupe du Monde 2026 configure.'
    else 'Erreur : concours introuvable ou table contest_predictions non creee.'
  end as result;
