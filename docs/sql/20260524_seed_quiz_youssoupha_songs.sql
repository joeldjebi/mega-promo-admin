-- MegaPromo - Quiz Youssoupha chansons
-- A executer dans Supabase SQL Editor.
-- Script idempotent : cree un quiz classique actif sur les chansons de
-- Youssoupha et notifie les joueurs actifs.

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
    'Quiz sur les artistes, les chansons, les albums et la culture musicale.',
    'music',
    '#E11D48',
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
quiz_contest as (
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
    views_count,
    shares_count,
    created_at
  )
  select
    '20260524-0000-4000-9000-000000000901'::uuid,
    null,
    'Quiz Youssoupha - Chansons',
    'Teste ta culture musicale autour des titres marquants de Youssoupha : albums, collaborations et morceaux connus.',
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
    now() + interval '7 days',
    true,
    array[]::text[],
    false,
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
    is_live = false
  returning id, title
),
questions_seed as (
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
      '20260524-0000-4000-9000-000000000911'::uuid,
      '20260524-0000-4000-9000-000000000901'::uuid,
      'Quel est le titre de Youssoupha en collaboration avec Indila ?',
      'Dreamin''',
      'Entourage',
      'Menace de mort',
      'On se connait',
      'A',
      10,
      20,
      1,
      now()
    ),
    (
      '20260524-0000-4000-9000-000000000912'::uuid,
      '20260524-0000-4000-9000-000000000901'::uuid,
      'Sur quel album retrouve-t-on notamment le titre Dreamin'' ?',
      'Noir Desir',
      'NGRTD',
      'Polaroid Experience',
      'Neptune Terminus',
      'A',
      10,
      20,
      2,
      now()
    ),
    (
      '20260524-0000-4000-9000-000000000913'::uuid,
      '20260524-0000-4000-9000-000000000901'::uuid,
      'Lequel de ces titres est associe a Youssoupha ?',
      'Menace de mort',
      'Djadja',
      'Sapes comme jamais',
      'Derniere danse',
      'A',
      10,
      20,
      3,
      now()
    ),
    (
      '20260524-0000-4000-9000-000000000914'::uuid,
      '20260524-0000-4000-9000-000000000901'::uuid,
      'Quel titre de Youssoupha evoque directement le cercle proche ?',
      'Entourage',
      'La monnaie',
      'Bella',
      'Mwaka Moon',
      'A',
      10,
      20,
      4,
      now()
    ),
    (
      '20260524-0000-4000-9000-000000000915'::uuid,
      '20260524-0000-4000-9000-000000000901'::uuid,
      'Quel est le genre musical principal de Youssoupha ?',
      'Rap',
      'Zouk',
      'Reggae roots uniquement',
      'Musique classique',
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
    order_index = excluded.order_index
  returning id
),
notification_seed as (
  insert into public.notifications (
    user_id,
    title,
    body,
    type,
    is_read,
    data,
    created_at
  )
  select
    users.id,
    'Nouveau jeu disponible',
    'Un nouveau quiz musical est disponible : Quiz Youssoupha - Chansons',
    'contest',
    false,
    jsonb_build_object(
      'contest_id', '20260524-0000-4000-9000-000000000901',
      'contestId', '20260524-0000-4000-9000-000000000901',
      'type', 'contest',
      'source', 'contest_auto_publish'
    ),
    now()
  from public.users
  where coalesce(users.is_active, true) = true
    and coalesce(users.role, 'player') = 'player'
    and not exists (
      select 1
      from public.notifications existing
      where existing.user_id = users.id
        and existing.type = 'contest'
        and existing.data ->> 'contest_id' = '20260524-0000-4000-9000-000000000901'
        and existing.data ->> 'source' = 'contest_auto_publish'
    )
  returning id
)
select
  contests.id,
  contests.title,
  contests.status,
  count(distinct questions.id) as questions_count,
  count(distinct notification_seed.id) as notifications_count
from public.contests
left join public.questions on questions.contest_id = contests.id
left join notification_seed on true
where contests.id = '20260524-0000-4000-9000-000000000901'::uuid
group by contests.id;
