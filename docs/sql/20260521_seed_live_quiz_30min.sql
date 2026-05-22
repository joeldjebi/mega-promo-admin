-- MegaPromo - Demo Quiz Live dans 30 minutes
-- A executer apres docs/sql/20260521_create_live_quiz_system.sql
-- Script idempotent : cree un Quiz Live actif avec 5 questions de 20 secondes.

alter table public.contests
add column if not exists is_live bool not null default false,
add column if not exists live_starts_at timestamptz,
add column if not exists live_status varchar not null default 'scheduled',
add column if not exists registered_count int4 not null default 0,
add column if not exists connected_count int4 not null default 0,
add column if not exists current_question_index int4 not null default 0,
add column if not exists question_started_at timestamptz,
add column if not exists allowed_player_plan_keys text[] default array[]::text[];

create table if not exists public.contest_types (
  id uuid primary key default gen_random_uuid(),
  key varchar not null unique,
  name varchar not null,
  description text,
  is_active bool default true,
  order_index int4 default 0,
  created_at timestamptz default now()
);

insert into public.contest_types (
  key,
  name,
  description,
  is_active,
  order_index
)
values (
  'quiz',
  'Quiz',
  'Concours avec questions, reponses et score.',
  true,
  1
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  order_index = excluded.order_index;

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
    'Culture ivoirienne',
    'Quiz sur la Côte d''Ivoire, la culture, le sport et le quotidien.',
    'flag',
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
    '20260521-0000-4000-9000-000000000701'::uuid,
    null,
    'Quiz Live MegaPromo - Culture CI',
    'Un Quiz Live rapide de 5 questions pour tester ta connaissance de la Côte d''Ivoire. Tout le monde joue au même moment : sois prêt, réponds vite et vise le meilleur score.',
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
    null,
    'MegaPromo',
    'quiz',
    category_seed.name,
    category_seed.id,
    'active',
    '500F de crédit communication pour le meilleur score du live',
    500,
    1,
    null,
    now(),
    now() + interval '2 hours',
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
    is_live = excluded.is_live,
    live_starts_at = excluded.live_starts_at,
    live_status = excluded.live_status,
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
    '20260521-0000-4000-9000-000000000711'::uuid,
    '20260521-0000-4000-9000-000000000701'::uuid,
    'Quelle ville est la capitale politique de la Côte d''Ivoire ?',
    'Abidjan',
    'Yamoussoukro',
    'Bouaké',
    'San Pedro',
    'B',
    10,
    20,
    1,
    now()
  ),
  (
    '20260521-0000-4000-9000-000000000712'::uuid,
    '20260521-0000-4000-9000-000000000701'::uuid,
    'Quel surnom porte l''équipe nationale de football de Côte d''Ivoire ?',
    'Les Lions',
    'Les Aigles',
    'Les Éléphants',
    'Les Panthères',
    'C',
    10,
    20,
    2,
    now()
  ),
  (
    '20260521-0000-4000-9000-000000000713'::uuid,
    '20260521-0000-4000-9000-000000000701'::uuid,
    'Quel moyen est très utilisé en Côte d''Ivoire pour recevoir de petits transferts d''argent ?',
    'Wave',
    'Carte postale',
    'Chèque papier uniquement',
    'Mandat international obligatoire',
    'A',
    10,
    20,
    3,
    now()
  ),
  (
    '20260521-0000-4000-9000-000000000714'::uuid,
    '20260521-0000-4000-9000-000000000701'::uuid,
    'Dans MegaPromo, qu''est-ce qui permet de gagner plus vite sur un quiz live ?',
    'Répondre juste et rapidement',
    'Quitter l''application',
    'Attendre la fin du timer',
    'Ouvrir plusieurs comptes',
    'A',
    10,
    20,
    4,
    now()
  ),
  (
    '20260521-0000-4000-9000-000000000715'::uuid,
    '20260521-0000-4000-9000-000000000701'::uuid,
    'Combien de minutes avant le début ouvre la salle d''attente d''un Quiz Live MegaPromo ?',
    '1 minute',
    '5 minutes',
    '30 minutes',
    'Après le début',
    'B',
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
  contests.is_live,
  contests.live_starts_at,
  count(questions.id) as questions_count
from public.contests
left join public.questions on questions.contest_id = contests.id
where contests.id = '20260521-0000-4000-9000-000000000701'::uuid
group by contests.id;
