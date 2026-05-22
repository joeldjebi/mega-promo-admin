-- MegaPromo - Quiz Live Production Rap francais
-- A executer apres docs/sql/20260521_create_live_quiz_system.sql
-- Script idempotent : cree un vrai Quiz Live de production avec 4 questions
-- sur le rap francais. Ajuste live_starts_at avant execution si necessaire.

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
    'Musique',
    'Quiz musique, culture urbaine, artistes et tendances.',
    'music',
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
    '20260522-0000-4000-9000-000000000901'::uuid,
    null,
    'Quiz Live Rap Francais',
    'Teste ta culture rap francais en direct : artistes, classiques, labels et moments marquants. Tout le monde joue au meme moment, alors sois rapide et precis.',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    null,
    'MegaPromo',
    'quiz',
    category_seed.name,
    category_seed.id,
    'active',
    '500F de credit communication pour le meilleur score',
    500,
    1,
    null,
    now(),
    now() + interval '1 hour',
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
    '20260522-0000-4000-9000-000000000911'::uuid,
    '20260522-0000-4000-9000-000000000901'::uuid,
    'Quel rappeur francais a sorti l''album "Ipséité" en 2017 ?',
    'Nekfeu',
    'Damso',
    'Booba',
    'Orelsan',
    'B',
    10,
    20,
    1,
    now()
  ),
  (
    '20260522-0000-4000-9000-000000000912'::uuid,
    '20260522-0000-4000-9000-000000000901'::uuid,
    'Quel collectif est associe a Nekfeu, Alpha Wann et Sneazzy ?',
    'Mafia K''1 Fry',
    'Sexion d''Assaut',
    '1995',
    'Fonky Family',
    'C',
    10,
    20,
    2,
    now()
  ),
  (
    '20260522-0000-4000-9000-000000000913'::uuid,
    '20260522-0000-4000-9000-000000000901'::uuid,
    'Quel artiste est connu pour le slogan "92i" et une longue carriere dans le rap francais ?',
    'Booba',
    'Jul',
    'Soprano',
    'Ninho',
    'A',
    10,
    20,
    3,
    now()
  ),
  (
    '20260522-0000-4000-9000-000000000914'::uuid,
    '20260522-0000-4000-9000-000000000901'::uuid,
    'Quel rappeur francais a sorti l''album "Civilisation" en 2021 ?',
    'Vald',
    'Orelsan',
    'SCH',
    'Niska',
    'B',
    10,
    20,
    4,
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
where contests.id = '20260522-0000-4000-9000-000000000901'::uuid
group by contests.id;
