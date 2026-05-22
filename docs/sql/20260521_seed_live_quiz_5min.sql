-- MegaPromo - Demo Quiz Live dans 5 minutes
-- A executer apres docs/sql/20260521_create_live_quiz_system.sql
-- Script idempotent : cree un nouveau Quiz Live actif avec 5 questions de 20 secondes.

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
    'Quiz Live',
    'Evenements live MegaPromo avec questions synchronisees.',
    'bolt',
    '#8B6FFF',
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
    '20260521-0000-4000-9000-000000000801'::uuid,
    null,
    'Quiz Live Test - Départ 5 min',
    'Quiz Live de test : entre en salle d''attente, attends le décompte, puis le jeu se lance automatiquement sans action manuelle.',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    null,
    'MegaPromo',
    'quiz',
    category_seed.name,
    category_seed.id,
    'active',
    '500F de crédit communication pour le meilleur score',
    500,
    1,
    null,
    now(),
    now() + interval '1 hour',
    true,
    array[]::text[],
    true,
    now() + interval '5 minutes',
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
    '20260521-0000-4000-9000-000000000811'::uuid,
    '20260521-0000-4000-9000-000000000801'::uuid,
    'Quel est le principe principal d''un Quiz Live MegaPromo ?',
    'Tout le monde joue au même moment',
    'Chacun joue quand il veut',
    'Les réponses sont visibles avant le jeu',
    'Le quiz se joue sans inscription',
    'A',
    10,
    20,
    1,
    now()
  ),
  (
    '20260521-0000-4000-9000-000000000812'::uuid,
    '20260521-0000-4000-9000-000000000801'::uuid,
    'Combien de secondes dure chaque question dans ce test ?',
    '10 secondes',
    '20 secondes',
    '45 secondes',
    '60 secondes',
    'B',
    10,
    20,
    2,
    now()
  ),
  (
    '20260521-0000-4000-9000-000000000813'::uuid,
    '20260521-0000-4000-9000-000000000801'::uuid,
    'Quelle action est recommandée avant le début ?',
    'Entrer en salle d''attente',
    'Fermer l''application',
    'Désactiver internet',
    'Attendre le lendemain',
    'A',
    10,
    20,
    3,
    now()
  ),
  (
    '20260521-0000-4000-9000-000000000814'::uuid,
    '20260521-0000-4000-9000-000000000801'::uuid,
    'Quel facteur améliore le score dans un quiz rapide ?',
    'La vitesse et la bonne réponse',
    'Le hasard uniquement',
    'Changer de téléphone',
    'Rater le timer',
    'A',
    10,
    20,
    4,
    now()
  ),
  (
    '20260521-0000-4000-9000-000000000815'::uuid,
    '20260521-0000-4000-9000-000000000801'::uuid,
    'Que se passe-t-il quand le décompte arrive à zéro ?',
    'Le quiz démarre automatiquement',
    'Le quiz est supprimé',
    'Le joueur doit attendre une notification papier',
    'Les questions disparaissent définitivement',
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
  count(questions.id) as questions_count
from public.contests
left join public.questions on questions.contest_id = contests.id
where contests.id = '20260521-0000-4000-9000-000000000801'::uuid
group by contests.id;
