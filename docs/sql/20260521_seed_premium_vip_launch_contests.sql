-- MegaPromo - Production launch quiz contests for Premium/VIP players
-- A executer dans Supabase SQL Editor.
-- Script idempotent : cree 3 concours quiz de lancement reserves aux joueurs
-- Premium et VIP uniquement.

alter table public.contests
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

with categories_seed as (
  insert into public.categories (
    name,
    description,
    icon,
    color,
    is_active,
    created_at
  )
  values
    (
      'Télécom',
      'Crédit, data mobile, appels et offres opérateurs.',
      'phone',
      '#ff7900',
      true,
      now()
    ),
    (
      'Mobile Money',
      'Transferts, cash et récompenses mobile money.',
      'money',
      '#4CAF7D',
      true,
      now()
    )
  on conflict (name) do update set
    description = excluded.description,
    icon = excluded.icon,
    color = excluded.color,
    is_active = excluded.is_active
  returning id, name
),
contest_seed as (
  select *
  from (
    values
      (
        '20260521-0000-4000-8000-000000000501'::uuid,
        'Télécom',
        'Quiz Crédit Communication 500F',
        'Réponds à un quiz rapide sur les bons réflexes de communication mobile. Le meilleur score remporte 500F de crédit communication pour appeler, envoyer des SMS ou gérer une urgence du quotidien. Concours réservé aux joueurs Premium et VIP MegaPromo.',
        '500F de crédit communication',
        500,
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
        'MegaPromo'
      ),
      (
        '20260521-0000-4000-8000-000000000502'::uuid,
        'Télécom',
        'Quiz Data Orange 1.5GB',
        'Teste tes connaissances sur l’usage d’internet mobile, la sécurité digitale et les bons réflexes data. Le meilleur score remporte 1.5GB d’internet Orange. En cas d’égalité, le joueur le plus rapide est prioritaire.',
        '1.5GB d’internet Orange',
        1500,
        'https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1200&q=80',
        'Orange'
      ),
      (
        '20260521-0000-4000-8000-000000000503'::uuid,
        'Mobile Money',
        'Quiz Transfert Wave 500F',
        'Prouve que tu connais les bons réflexes mobile money : sécurité, vérification du numéro et gestion d’un transfert. Le meilleur score gagne un transfert Wave de 500F directement sur son numéro.',
        'Transfert Wave de 500F',
        500,
        'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
        'Wave'
      )
  ) as seed(
    id,
    category_name,
    title,
    description,
    prize_description,
    prize_value,
    image_url,
    brand_name
  )
),
upsert_contests as (
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
    views_count,
    shares_count,
    created_at
  )
  select
    contest_seed.id,
    null,
    contest_seed.title,
    contest_seed.description,
    contest_seed.image_url,
    null,
    contest_seed.brand_name,
    'quiz',
    contest_seed.category_name,
    categories.id,
    'active',
    contest_seed.prize_description,
    contest_seed.prize_value,
    1,
    null,
    now(),
    now() + interval '7 days',
    true,
    array['premium', 'vip']::text[],
    0,
    0,
    now()
  from contest_seed
  join public.categories categories on categories.name = contest_seed.category_name
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
    allowed_player_plan_keys = excluded.allowed_player_plan_keys
  returning id
),
delete_old_draw_settings as (
  delete from public.contest_draw_settings
  where contest_id in (
    '20260521-0000-4000-8000-000000000501'::uuid,
    '20260521-0000-4000-8000-000000000503'::uuid
  )
  returning contest_id
),
question_seed as (
  select *
  from (
    values
      (
        '20260521-0000-4000-8000-000000000511'::uuid,
        '20260521-0000-4000-8000-000000000501'::uuid,
        'Avant d’appeler longtemps, quel réflexe permet de mieux gérer son crédit ?',
        'Vérifier son solde',
        'Ignorer son solde',
        'Désactiver son téléphone',
        'Partager son code PIN',
        'A',
        10,
        25,
        1
      ),
      (
        '20260521-0000-4000-8000-000000000512'::uuid,
        '20260521-0000-4000-8000-000000000501'::uuid,
        'Quel usage consomme généralement le moins de crédit communication ?',
        'Un appel très long',
        'Un SMS court',
        'Un appel international prolongé',
        'Une conférence audio de plusieurs heures',
        'B',
        10,
        25,
        2
      ),
      (
        '20260521-0000-4000-8000-000000000513'::uuid,
        '20260521-0000-4000-8000-000000000501'::uuid,
        'Que faire si tu reçois un message demandant ton code secret ?',
        'Envoyer le code rapidement',
        'Le publier dans un groupe',
        'Ne jamais partager le code',
        'Le donner à un inconnu',
        'C',
        10,
        25,
        3
      ),
      (
        '20260521-0000-4000-8000-000000000521'::uuid,
        '20260521-0000-4000-8000-000000000502'::uuid,
        'Quel réflexe aide à économiser son forfait internet mobile ?',
        'Laisser toutes les vidéos en HD automatique',
        'Activer le Wi-Fi quand il est disponible',
        'Partager son code avec tout le monde',
        'Télécharger sans vérifier la taille',
        'B',
        10,
        25,
        1
      ),
      (
        '20260521-0000-4000-8000-000000000522'::uuid,
        '20260521-0000-4000-8000-000000000502'::uuid,
        'Que signifie 1.5GB dans une offre internet ?',
        'Un volume de données mobiles',
        'Un numéro de téléphone',
        'Un code PIN',
        'Une durée d’appel',
        'A',
        10,
        25,
        2
      ),
      (
        '20260521-0000-4000-8000-000000000523'::uuid,
        '20260521-0000-4000-8000-000000000502'::uuid,
        'Quel geste protège le mieux ton compte mobile ?',
        'Envoyer son OTP à un ami',
        'Utiliser un code PIN secret',
        'Publier son mot de passe',
        'Ignorer les alertes de sécurité',
        'B',
        10,
        25,
        3
      ),
      (
        '20260521-0000-4000-8000-000000000531'::uuid,
        '20260521-0000-4000-8000-000000000503'::uuid,
        'Avant de valider un transfert Wave, que faut-il vérifier ?',
        'Le nom et le numéro du destinataire',
        'La couleur du téléphone',
        'Le niveau de batterie uniquement',
        'La météo du jour',
        'A',
        10,
        25,
        1
      ),
      (
        '20260521-0000-4000-8000-000000000532'::uuid,
        '20260521-0000-4000-8000-000000000503'::uuid,
        'Quel élément ne doit jamais être partagé avec un inconnu ?',
        'Son code secret ou OTP',
        'Son prénom',
        'Le nom de sa commune',
        'Le nom de son opérateur',
        'A',
        10,
        25,
        2
      ),
      (
        '20260521-0000-4000-8000-000000000533'::uuid,
        '20260521-0000-4000-8000-000000000503'::uuid,
        'Que faire si une transaction semble suspecte ?',
        'Valider sans réfléchir',
        'Vérifier et contacter le support si besoin',
        'Donner son code pour accélérer',
        'Supprimer toutes les preuves',
        'B',
        10,
        25,
        3
      )
  ) as seed(
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
    order_index
  )
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
select
  question_seed.id,
  question_seed.contest_id,
  question_seed.question_text,
  question_seed.option_a,
  question_seed.option_b,
  question_seed.option_c,
  question_seed.option_d,
  question_seed.correct_answer,
  question_seed.points,
  question_seed.time_limit,
  question_seed.order_index,
  now()
from question_seed
where exists (
  select 1
  from public.contests
  where contests.id = question_seed.contest_id
)
on conflict (id) do update set
  contest_id = excluded.contest_id,
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
  contests.type,
  contests.status,
  contests.allowed_player_plan_keys,
  (
    select count(*)
    from public.questions
    where questions.contest_id = contests.id
  ) as questions_count,
  contests.starts_at,
  contests.ends_at
from public.contests
where contests.id in (
  '20260521-0000-4000-8000-000000000501'::uuid,
  '20260521-0000-4000-8000-000000000502'::uuid,
  '20260521-0000-4000-8000-000000000503'::uuid
)
order by contests.created_at desc;
