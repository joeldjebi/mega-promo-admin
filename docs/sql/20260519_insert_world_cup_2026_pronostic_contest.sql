-- MegaPromo Web - Concours pronostic Coupe du Monde 2026
-- A executer dans Supabase SQL Editor.
-- Script idempotent : relancer ce fichier mettra a jour le concours existant.
--
-- Important :
-- - La categorie "Sport" doit deja exister dans public.categories.
-- - Le type "pronostic" doit deja exister dans public.contest_types.
-- - Les dates sont provisoires. Ajuste starts_at et ends_at quand le match exact est connu.

with sport_category as (
  select id, name
  from public.categories
  where lower(name) = 'sport'
  limit 1
),
pronostic_type as (
  select key
  from public.contest_types
  where key = 'pronostic'
    and coalesce(is_active, true) = true
  limit 1
),
upsert_contest as (
  insert into public.contests (
    id,
    partner_id,
    title,
    description,
    image_url,
    type,
    category,
    category_id,
    status,
    prize_description,
    prize_value,
    winners_count,
    max_participants,
    starts_at,
    ends_at,
    is_boosted,
    views_count,
    shares_count,
    created_at
  )
  select
    '20260519-0000-4000-8000-000000000001'::uuid,
    null,
    'Pronostic premier match - Cote d''Ivoire Coupe du Monde 2026',
    'Pronostique le score exact du premier match de la Cote d''Ivoire a la Coupe du Monde 2026. Le meilleur pronostic remporte le gain. En cas d''egalite, un tirage pourra departager les gagnants.',
    'https://upload.wikimedia.org/wikipedia/fr/a/a5/Logo_F%C3%A9d%C3%A9ration_Ivoirienne_de_Football_%28FIF%29_2023.svg',
    pronostic_type.key,
    sport_category.name,
    sport_category.id,
    'draft',
    'Cash MegaPromo pour le meilleur pronostic',
    50000,
    1,
    null,
    '2026-06-01 00:00:00+00'::timestamptz,
    '2026-06-11 15:00:00+00'::timestamptz,
    false,
    0,
    0,
    now()
  from sport_category, pronostic_type
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    image_url = excluded.image_url,
    type = excluded.type,
    category = excluded.category,
    category_id = excluded.category_id,
    status = excluded.status,
    prize_description = excluded.prize_description,
    prize_value = excluded.prize_value,
    winners_count = excluded.winners_count,
    max_participants = excluded.max_participants,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    is_boosted = excluded.is_boosted
  returning id
)
select
  case
    when exists (select 1 from upsert_contest)
      then 'Concours pronostic Coupe du Monde 2026 cree ou mis a jour.'
    when not exists (select 1 from sport_category)
      then 'Erreur : categorie Sport introuvable.'
    when not exists (select 1 from pronostic_type)
      then 'Erreur : type pronostic introuvable.'
    else 'Erreur : concours non cree.'
  end as result;
