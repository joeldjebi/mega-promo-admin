-- MegaPromo - Quiz Live Intelligence Artificielle dans 30 minutes
-- A executer apres docs/sql/20260521_create_live_quiz_system.sql
-- Script idempotent : cree un Quiz Live actif avec 5 questions sur l'IA.

alter table public.contests
add column if not exists is_live bool not null default false,
add column if not exists live_starts_at timestamptz,
add column if not exists live_status varchar not null default 'scheduled',
add column if not exists registered_count int4 not null default 0,
add column if not exists connected_count int4 not null default 0,
add column if not exists current_question_index int4 not null default 0,
add column if not exists question_started_at timestamptz,
add column if not exists allowed_player_plan_keys text[] default array[]::text[];

with category_seed as (
  insert into public.categories (
    name,
    description,
    icon,
    color,
    is_active,
    created_at
  )
  values (
    'Technologie',
    'Quiz sur le digital, l''intelligence artificielle et les innovations.',
    'cpu',
    '#5B4AE8',
    true,
    now()
  )
  on conflict (name) do update set
    description = excluded.description,
    icon = excluded.icon,
    color = excluded.color,
    is_active = true
  returning id, name
),
live_contest as (
  insert into public.contests (
    id,
    partner_id,
    title,
    description,
    image_url,
    brand_logo_url,
    brand_name,
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
    allowed_player_plan_keys,
    is_live,
    live_starts_at,
    live_status,
    registered_count,
    connected_count,
    current_question_index,
    views_count,
    shares_count,
    created_at
  )
  select
    '20260523-0000-4000-9000-000000000831'::uuid,
    null,
    'Quiz Live Intelligence Artificielle',
    'Teste ta culture IA en direct : concepts, usages, limites et outils du quotidien. Réserve ta place, entre en salle d''attente et réponds vite pour viser le meilleur score.',
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
    null,
    'MegaPromo',
    'quiz',
    category_seed.name,
    category_seed.id,
    'active',
    '500F de crédit communication pour le meilleur score IA',
    500,
    1,
    null,
    now(),
    now() + interval '30 minutes' + interval '100 seconds',
    true,
    array[]::text[],
    true,
    now() + interval '30 minutes',
    'scheduled',
    0,
    0,
    0,
    0,
    0,
    now()
  from category_seed
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    image_url = excluded.image_url,
    brand_name = excluded.brand_name,
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
    is_boosted = excluded.is_boosted,
    allowed_player_plan_keys = excluded.allowed_player_plan_keys,
    is_live = true,
    live_starts_at = excluded.live_starts_at,
    live_status = 'scheduled',
    registered_count = 0,
    connected_count = 0,
    current_question_index = 0
  returning id
)
insert into public.questions (
  id,
  contest_id,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_answer,
  points,
  time_limit,
  order_index,
  created_at
)
values
  (
    '20260523-0000-4000-9000-000000000841'::uuid,
    '20260523-0000-4000-9000-000000000831'::uuid,
    'Que signifie généralement le sigle IA ?',
    'Interface Automatique',
    'Intelligence Artificielle',
    'Internet Avancé',
    'Information Active',
    'B',
    10,
    20,
    1,
    now()
  ),
  (
    '20260523-0000-4000-9000-000000000842'::uuid,
    '20260523-0000-4000-9000-000000000831'::uuid,
    'Quel type d''IA peut générer du texte, des images ou du son ?',
    'IA générative',
    'IA analogique',
    'IA mécanique',
    'IA silencieuse',
    'A',
    10,
    20,
    2,
    now()
  ),
  (
    '20260523-0000-4000-9000-000000000843'::uuid,
    '20260523-0000-4000-9000-000000000831'::uuid,
    'Pourquoi faut-il vérifier une réponse produite par une IA ?',
    'Parce qu''elle peut se tromper',
    'Parce qu''elle ne répond jamais',
    'Parce qu''elle efface le téléphone',
    'Parce qu''elle bloque internet',
    'A',
    10,
    20,
    3,
    now()
  ),
  (
    '20260523-0000-4000-9000-000000000844'::uuid,
    '20260523-0000-4000-9000-000000000831'::uuid,
    'Quel élément améliore souvent la qualité d''une demande faite à une IA ?',
    'Un prompt clair et précis',
    'Un écran plus sombre',
    'Un mot de passe plus court',
    'Une batterie faible',
    'A',
    10,
    20,
    4,
    now()
  ),
  (
    '20260523-0000-4000-9000-000000000845'::uuid,
    '20260523-0000-4000-9000-000000000831'::uuid,
    'Quel usage de l''IA est utile dans une application mobile ?',
    'Aider à personnaliser l''expérience utilisateur',
    'Désactiver toutes les notifications',
    'Supprimer les règles de sécurité',
    'Empêcher les mises à jour',
    'A',
    10,
    20,
    5,
    now()
  )
on conflict (id) do update set
  question_text = excluded.question_text,
  option_a = excluded.option_a,
  option_b = excluded.option_b,
  option_c = excluded.option_c,
  option_d = excluded.option_d,
  correct_answer = excluded.correct_answer,
  points = excluded.points,
  time_limit = excluded.time_limit,
  order_index = excluded.order_index;

select
  contests.id,
  contests.title,
  contests.live_starts_at,
  contests.live_status,
  count(questions.id) as questions_count
from public.contests
left join public.questions on questions.contest_id = contests.id
where contests.id = '20260523-0000-4000-9000-000000000831'::uuid
group by contests.id;
