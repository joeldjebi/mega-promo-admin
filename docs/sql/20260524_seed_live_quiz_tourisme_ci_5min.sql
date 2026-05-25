-- MegaPromo - Quiz Live Tourisme Côte d'Ivoire dans 5 minutes
-- A executer apres docs/sql/20260521_create_live_quiz_system.sql.
-- Script idempotent : cree un Quiz Live avec 5 questions images sur des
-- lieux touristiques en Côte d'Ivoire.

alter table public.contests
add column if not exists is_live bool not null default false,
add column if not exists live_starts_at timestamptz,
add column if not exists live_status varchar not null default 'scheduled',
add column if not exists registered_count int4 not null default 0,
add column if not exists connected_count int4 not null default 0,
add column if not exists current_question_index int4 not null default 0,
add column if not exists question_started_at timestamptz,
add column if not exists allowed_player_plan_keys text[] default array[]::text[];

alter table public.questions
add column if not exists question_image_url text,
add column if not exists option_a_image_url text,
add column if not exists option_b_image_url text,
add column if not exists option_c_image_url text,
add column if not exists option_d_image_url text;

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
    'Tourisme',
    'Quiz sur les lieux, paysages et destinations touristiques.',
    'map',
    '#0F766E',
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
    '20260524-0000-4000-9000-000000000891'::uuid,
    null,
    'Quiz Live Tourisme Côte d''Ivoire',
    'Reconnais des lieux touristiques ivoiriens à partir d''images. Réserve ta place, entre en salle d''attente et réponds vite.',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Basilique%20notre%20Dame%20de%20la%20Paix%20de%20Yamoussoukro.jpg',
    null,
    'MegaPromo',
    'quiz',
    category_seed.name,
    category_seed.id,
    'active',
    '500F de crédit communication pour le meilleur score tourisme',
    500,
    1,
    null,
    now(),
    now() + interval '5 minutes' + interval '100 seconds',
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
    current_question_index = 0,
    question_started_at = null
  returning id
)
insert into public.questions (
  id,
  contest_id,
  question_text,
  question_image_url,
  option_a,
  option_b,
  option_c,
  option_d,
  option_a_image_url,
  option_b_image_url,
  option_c_image_url,
  option_d_image_url,
  correct_answer,
  points,
  time_limit,
  order_index,
  created_at
)
values
  (
    '20260524-0000-4000-9000-000000000901'::uuid,
    '20260524-0000-4000-9000-000000000891'::uuid,
    'Quel lieu touristique vois-tu sur cette image ?',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Basilique%20notre%20Dame%20de%20la%20Paix%20de%20Yamoussoukro.jpg',
    'Basilique Notre-Dame de la Paix, Yamoussoukro',
    'Cathédrale Saint-Paul, Abidjan',
    'Grande Mosquée du Plateau',
    'Musée des Civilisations de Côte d''Ivoire',
    null,
    null,
    null,
    null,
    'A',
    10,
    20,
    1,
    now()
  ),
  (
    '20260524-0000-4000-9000-000000000902'::uuid,
    '20260524-0000-4000-9000-000000000891'::uuid,
    'Cette plage ivoirienne est associée à quelle ville historique ?',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Beach%20at%20Grand-Bassam.jpg',
    'Grand-Bassam',
    'Korhogo',
    'Bouaké',
    'Daloa',
    null,
    null,
    null,
    null,
    'A',
    10,
    20,
    2,
    now()
  ),
  (
    '20260524-0000-4000-9000-000000000903'::uuid,
    '20260524-0000-4000-9000-000000000891'::uuid,
    'Quelle station balnéaire est représentée par cette image ?',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Plage%20Assinie.jpg',
    'Assinie',
    'Jacqueville',
    'San-Pédro',
    'Fresco',
    null,
    null,
    null,
    null,
    'A',
    10,
    20,
    3,
    now()
  ),
  (
    '20260524-0000-4000-9000-000000000904'::uuid,
    '20260524-0000-4000-9000-000000000891'::uuid,
    'Quel site naturel de l''ouest ivoirien vois-tu ?',
    'https://commons.wikimedia.org/wiki/Special:FilePath/La%20cascade%20de%20Man.jpg',
    'Cascade de Man',
    'Mont Nimba',
    'Parc national de Taï',
    'Îles Ehotilé',
    null,
    null,
    null,
    null,
    'A',
    10,
    20,
    4,
    now()
  ),
  (
    '20260524-0000-4000-9000-000000000905'::uuid,
    '20260524-0000-4000-9000-000000000891'::uuid,
    'Cette forêt urbaine protégée se trouve dans quelle ville ?',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Parc%20National%20du%20Banco%20-%20Club%20RFI%20Abidjan%2013.jpg',
    'Abidjan',
    'Yamoussoukro',
    'Man',
    'Bondoukou',
    null,
    null,
    null,
    null,
    'A',
    10,
    20,
    5,
    now()
  )
on conflict (id) do update set
  question_text = excluded.question_text,
  question_image_url = excluded.question_image_url,
  option_a = excluded.option_a,
  option_b = excluded.option_b,
  option_c = excluded.option_c,
  option_d = excluded.option_d,
  option_a_image_url = excluded.option_a_image_url,
  option_b_image_url = excluded.option_b_image_url,
  option_c_image_url = excluded.option_c_image_url,
  option_d_image_url = excluded.option_d_image_url,
  correct_answer = excluded.correct_answer,
  points = excluded.points,
  time_limit = excluded.time_limit,
  order_index = excluded.order_index;

select
  contests.id,
  contests.title,
  contests.live_starts_at,
  contests.ends_at,
  contests.live_status,
  count(questions.id) as questions_count,
  count(questions.question_image_url) as image_questions_count
from public.contests
left join public.questions on questions.contest_id = contests.id
where contests.id = '20260524-0000-4000-9000-000000000891'::uuid
group by contests.id;
