-- MegaPromo - Seed 10 contests with playable games
-- A executer dans Supabase SQL Editor.
-- Script idempotent : relancer ce fichier mettra a jour les concours et leurs jeux.
--
-- Contenu :
-- - 10 concours actifs
-- - 4 quiz avec questions
-- - 4 tirages avec configuration tickets/regles
-- - 2 pronostics avec configuration match/bareme

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

insert into public.contest_types (key, name, description, is_active, order_index)
values
  ('quiz', 'Quiz', 'Concours avec questions, reponses et score.', true, 1),
  ('tirage', 'Tirage', 'Participation simple avec selection de gagnants.', true, 2),
  ('pronostic', 'Pronostic', 'Prediction sportive ou evenementielle.', true, 3)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  order_index = excluded.order_index;

insert into public.categories (id, name, description, icon, color, is_active, created_at)
values
  ('20260519-1000-4000-8000-000000000001'::uuid, 'Sport', 'Tous les sports.', 'sport', '#6B7FFF', true, now()),
  ('20260519-1000-4000-8000-000000000002'::uuid, 'Culture', 'Culture generale et divertissement.', 'game', '#C9A84C', true, now()),
  ('20260519-1000-4000-8000-000000000003'::uuid, 'Tech', 'Mobile, internet et technologie.', 'tech', '#38BDF8', true, now()),
  ('20260519-1000-4000-8000-000000000004'::uuid, 'Shopping', 'Bons d achat et cadeaux.', 'shopping', '#3FC493', true, now()),
  ('20260519-1000-4000-8000-000000000005'::uuid, 'Lifestyle', 'Sorties, loisirs et experiences.', 'beauty', '#F472B6', true, now())
on conflict (name) do update set
  description = excluded.description,
  icon = excluded.icon,
  color = excluded.color,
  is_active = excluded.is_active;

with category_map as (
  select id, name from public.categories
),
seed_contests as (
  select *
  from (
    values
      (
        '20260519-2000-4000-8000-000000000001'::uuid,
        'Quiz Culture Ivoire',
        'Teste tes connaissances sur la Cote d Ivoire et gagne des points.',
        'quiz',
        'Culture',
        'Cash MegaPromo pour le meilleur score',
        25000,
        3,
        1000,
        now() - interval '1 day',
        now() + interval '10 days',
        true,
        'MegaPromo Culture',
        null::text
      ),
      (
        '20260519-2000-4000-8000-000000000002'::uuid,
        'Grand Tirage Smartphone',
        'Participe en un clic pour tenter de gagner un smartphone.',
        'tirage',
        'Tech',
        'Smartphone Android neuf',
        120000,
        1,
        5000,
        now(),
        now() + interval '14 days',
        true,
        'MegaPromo Tech',
        null::text
      ),
      (
        '20260519-2000-4000-8000-000000000003'::uuid,
        'Pronostic Elephants 2026',
        'Pronostique le score du prochain match des Elephants.',
        'pronostic',
        'Sport',
        'Cash pour le score exact',
        50000,
        2,
        3000,
        now(),
        now() + interval '20 days',
        true,
        'MegaPromo Sport',
        null::text
      ),
      (
        '20260519-2000-4000-8000-000000000004'::uuid,
        'Quiz Foot Africain',
        'Montre que tu connais le football africain.',
        'quiz',
        'Sport',
        'Cash et bonus points',
        30000,
        5,
        1500,
        now(),
        now() + interval '12 days',
        false,
        'MegaPromo Sport',
        null::text
      ),
      (
        '20260519-2000-4000-8000-000000000005'::uuid,
        'Tirage Bons Shopping',
        'Gagne un bon d achat pour te faire plaisir.',
        'tirage',
        'Shopping',
        'Bon d achat',
        40000,
        4,
        4000,
        now(),
        now() + interval '9 days',
        false,
        'MegaPromo Shopping',
        null::text
      ),
      (
        '20260519-2000-4000-8000-000000000006'::uuid,
        'Pronostic Finale Afrique',
        'Devine le score d une grande affiche africaine.',
        'pronostic',
        'Sport',
        'Cash pronostic',
        75000,
        2,
        3500,
        now(),
        now() + interval '18 days',
        false,
        'MegaPromo Sport',
        null::text
      ),
      (
        '20260519-2000-4000-8000-000000000007'::uuid,
        'Quiz Mobile Money',
        'Un quiz rapide sur les usages mobile money.',
        'quiz',
        'Tech',
        'Bonus cash mobile money',
        20000,
        3,
        1200,
        now(),
        now() + interval '7 days',
        false,
        'MegaPromo Finance',
        null::text
      ),
      (
        '20260519-2000-4000-8000-000000000008'::uuid,
        'Tirage Weekend Detente',
        'Tente de gagner une experience detente pour le weekend.',
        'tirage',
        'Lifestyle',
        'Experience weekend',
        90000,
        1,
        2500,
        now(),
        now() + interval '16 days',
        false,
        'MegaPromo Lifestyle',
        null::text
      ),
      (
        '20260519-2000-4000-8000-000000000009'::uuid,
        'Quiz Marques CI',
        'Reconnais les grandes marques et habitudes locales.',
        'quiz',
        'Culture',
        'Cash MegaPromo',
        18000,
        3,
        1000,
        now(),
        now() + interval '8 days',
        false,
        'MegaPromo Culture',
        null::text
      ),
      (
        '20260519-2000-4000-8000-000000000010'::uuid,
        'Tirage Data Internet',
        'Participe pour gagner un forfait data.',
        'tirage',
        'Tech',
        'Forfait data internet',
        15000,
        10,
        8000,
        now(),
        now() + interval '6 days',
        true,
        'MegaPromo Data',
        null::text
      )
  ) as seed(
    id,
    title,
    description,
    type,
    category_name,
    prize_description,
    prize_value,
    winners_count,
    max_participants,
    starts_at,
    ends_at,
    is_boosted,
    brand_name,
    brand_logo_url
  )
),
upserted_contests as (
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
    views_count,
    shares_count,
    created_at
  )
  select
    seed_contests.id,
    null,
    seed_contests.title,
    seed_contests.description,
    null,
    seed_contests.brand_logo_url,
    seed_contests.brand_name,
    seed_contests.type,
    seed_contests.category_name,
    category_map.id,
    'active',
    seed_contests.prize_description,
    seed_contests.prize_value,
    seed_contests.winners_count,
    seed_contests.max_participants,
    seed_contests.starts_at,
    seed_contests.ends_at,
    seed_contests.is_boosted,
    0,
    0,
    now()
  from seed_contests
  join category_map on lower(category_map.name) = lower(seed_contests.category_name)
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    brand_logo_url = excluded.brand_logo_url,
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
    is_boosted = excluded.is_boosted
  returning id, type
)
select '10 concours crees ou mis a jour.' as result;

insert into public.contest_draw_settings (
  contest_id,
  standard_tickets,
  premium_tickets,
  confirmation_message,
  winner_announcement_at,
  rules,
  created_at
)
values
  (
    '20260519-2000-4000-8000-000000000002'::uuid,
    1,
    2,
    'Tu participes au tirage Smartphone. Les gagnants seront annonces bientot.',
    now() + interval '15 days',
    'Une participation par joueur. Les joueurs premium obtiennent 2 tickets.',
    now()
  ),
  (
    '20260519-2000-4000-8000-000000000005'::uuid,
    1,
    2,
    'Tu participes au tirage Bons Shopping.',
    now() + interval '10 days',
    'Les gagnants seront tires apres la fin du concours.',
    now()
  ),
  (
    '20260519-2000-4000-8000-000000000008'::uuid,
    1,
    2,
    'Tu participes au tirage Weekend Detente.',
    now() + interval '17 days',
    'Le lot est valable selon disponibilite du partenaire.',
    now()
  ),
  (
    '20260519-2000-4000-8000-000000000010'::uuid,
    1,
    3,
    'Tu participes au tirage Data Internet.',
    now() + interval '7 days',
    'Les joueurs premium obtiennent 3 tickets sur ce tirage.',
    now()
  )
on conflict (contest_id) do update set
  standard_tickets = excluded.standard_tickets,
  premium_tickets = excluded.premium_tickets,
  confirmation_message = excluded.confirmation_message,
  winner_announcement_at = excluded.winner_announcement_at,
  rules = excluded.rules;

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
values
  (
    '20260519-2000-4000-8000-000000000003'::uuid,
    'Cote d Ivoire',
    'Adversaire a definir',
    'Match des Elephants - Pronostic 2026',
    now() + interval '19 days',
    null,
    null,
    'open',
    50,
    20,
    now()
  ),
  (
    '20260519-2000-4000-8000-000000000006'::uuid,
    'Equipe A',
    'Equipe B',
    'Grande affiche africaine',
    now() + interval '17 days',
    null,
    null,
    'open',
    60,
    25,
    now()
  )
on conflict (contest_id) do update set
  home_team = excluded.home_team,
  away_team = excluded.away_team,
  match_label = excluded.match_label,
  match_date = excluded.match_date,
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  status = excluded.status,
  points_exact_score = excluded.points_exact_score,
  points_correct_result = excluded.points_correct_result;

delete from public.questions
where contest_id in (
  '20260519-2000-4000-8000-000000000001'::uuid,
  '20260519-2000-4000-8000-000000000004'::uuid,
  '20260519-2000-4000-8000-000000000007'::uuid,
  '20260519-2000-4000-8000-000000000009'::uuid
);

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
  ('20260519-3000-4000-8000-000000000001'::uuid, '20260519-2000-4000-8000-000000000001'::uuid, 'Quelle est la capitale economique de la Cote d Ivoire ?', 'Yamoussoukro', 'Abidjan', 'Bouake', 'San Pedro', 'B', 10, 30, 1, now()),
  ('20260519-3000-4000-8000-000000000002'::uuid, '20260519-2000-4000-8000-000000000001'::uuid, 'Quelle ville est la capitale politique de la Cote d Ivoire ?', 'Abidjan', 'Daloa', 'Yamoussoukro', 'Korhogo', 'C', 10, 30, 2, now()),
  ('20260519-3000-4000-8000-000000000003'::uuid, '20260519-2000-4000-8000-000000000001'::uuid, 'Quel surnom donne-t-on a l equipe nationale ivoirienne ?', 'Les Lions', 'Les Elephants', 'Les Aigles', 'Les Panthères', 'B', 10, 30, 3, now()),

  ('20260519-3000-4000-8000-000000000004'::uuid, '20260519-2000-4000-8000-000000000004'::uuid, 'Quel pays a organise la CAN 2023 ?', 'Cote d Ivoire', 'Cameroun', 'Maroc', 'Senegal', 'A', 10, 30, 1, now()),
  ('20260519-3000-4000-8000-000000000005'::uuid, '20260519-2000-4000-8000-000000000004'::uuid, 'Combien de joueurs commencent un match de football dans une equipe ?', '9', '10', '11', '12', 'C', 10, 30, 2, now()),
  ('20260519-3000-4000-8000-000000000006'::uuid, '20260519-2000-4000-8000-000000000004'::uuid, 'Quelle competition oppose les clubs champions africains ?', 'CAN', 'CAF Champions League', 'Coupe du Monde', 'Euro', 'B', 10, 30, 3, now()),

  ('20260519-3000-4000-8000-000000000007'::uuid, '20260519-2000-4000-8000-000000000007'::uuid, 'A quoi sert principalement le mobile money ?', 'Envoyer et recevoir de l argent', 'Regarder des films', 'Faire des photos', 'Mesurer la temperature', 'A', 10, 25, 1, now()),
  ('20260519-3000-4000-8000-000000000008'::uuid, '20260519-2000-4000-8000-000000000007'::uuid, 'Quel code est souvent demande pour confirmer une transaction ?', 'Code PIN', 'Code postal', 'Code couleur', 'Code Wi-Fi', 'A', 10, 25, 2, now()),
  ('20260519-3000-4000-8000-000000000009'::uuid, '20260519-2000-4000-8000-000000000007'::uuid, 'Que faut-il verifier avant d envoyer de l argent ?', 'Le nom du destinataire', 'La couleur du telephone', 'La meteo', 'Le niveau sonore', 'A', 10, 25, 3, now()),

  ('20260519-3000-4000-8000-000000000010'::uuid, '20260519-2000-4000-8000-000000000009'::uuid, 'Quel secteur correspond a une marque de supermarche ?', 'Distribution', 'Transport aerien', 'Football', 'Musique', 'A', 10, 25, 1, now()),
  ('20260519-3000-4000-8000-000000000011'::uuid, '20260519-2000-4000-8000-000000000009'::uuid, 'Un logo sert principalement a quoi ?', 'Identifier une marque', 'Remplacer un mot de passe', 'Mesurer un score', 'Bloquer un appel', 'A', 10, 25, 2, now()),
  ('20260519-3000-4000-8000-000000000012'::uuid, '20260519-2000-4000-8000-000000000009'::uuid, 'Une campagne sponsorisee vise surtout a gagner quoi ?', 'Visibilite', 'Silence', 'Poids', 'Distance', 'A', 10, 25, 3, now());
