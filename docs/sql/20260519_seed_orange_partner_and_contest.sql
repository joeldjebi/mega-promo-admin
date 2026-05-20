-- MegaPromo - Seed Orange partner and contest
-- A executer dans Supabase SQL Editor.
-- Script idempotent : cree/met a jour le partenaire Orange et un concours lie.
--
-- Important pour le compte partenaire :
-- 1. Cree d'abord le compte dans Supabase Dashboard > Authentication > Users
--    Email: orange@gmail.com
--    Password: 12345678
-- 2. Relance ce script apres creation du compte auth.
--    Le champ partners.user_id sera automatiquement lie a auth.users.id.

alter table public.contests
add column if not exists brand_logo_url text;

alter table public.contests
add column if not exists brand_name varchar;

with auth_partner as (
  select id
  from auth.users
  where email = 'orange@gmail.com'
  limit 1
),
upsert_partner as (
  insert into public.partners (
    id,
    user_id,
    company_name,
    email,
    logo_url,
    sector,
    phone,
    subscription_plan,
    subscription_expires_at,
    is_validated,
    is_active,
    created_at
  )
  values (
    '20260519-0000-4000-8000-000000000101'::uuid,
    (select id from auth_partner),
    'Orange CI',
    'orange@gmail.com',
    'https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg',
    'Telecom',
    '+2250758754662',
    'pro',
    now() + interval '30 days',
    true,
    true,
    now()
  )
  on conflict (email) do update set
    user_id = coalesce(excluded.user_id, public.partners.user_id),
    company_name = excluded.company_name,
    logo_url = excluded.logo_url,
    sector = excluded.sector,
    phone = excluded.phone,
    subscription_plan = excluded.subscription_plan,
    subscription_expires_at = excluded.subscription_expires_at,
    is_validated = excluded.is_validated,
    is_active = excluded.is_active
  returning id
),
telecom_category as (
  insert into public.categories (
    name,
    description,
    icon,
    color,
    is_active,
    created_at
  )
  values (
    'Telecom',
    'Concours et offres des operateurs telecom.',
    'phone',
    '#ff7900',
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
tirage_type as (
  select key
  from public.contest_types
  where key = 'tirage'
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
    boost_type,
    boost_expires_at,
    views_count,
    shares_count,
    created_at
  )
  select
    '20260519-0000-4000-8000-000000000102'::uuid,
    upsert_partner.id,
    'Grand Tirage Orange CI',
    'Participe au grand tirage Orange CI sur MegaPromo et tente de gagner un lot cash.',
    'https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg',
    'https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg',
    'Orange CI',
    tirage_type.key,
    telecom_category.name,
    telecom_category.id,
    'active',
    'Cash MegaPromo offert par Orange CI',
    50000,
    1,
    null,
    now(),
    now() + interval '14 days',
    true,
    'sponsored',
    now() + interval '14 days',
    0,
    0,
    now()
  from upsert_partner, telecom_category, tirage_type
  on conflict (id) do update set
    partner_id = excluded.partner_id,
    title = excluded.title,
    description = excluded.description,
    image_url = excluded.image_url,
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
    is_boosted = excluded.is_boosted,
    boost_type = excluded.boost_type,
    boost_expires_at = excluded.boost_expires_at
  returning id
),
upsert_draw_settings as (
  insert into public.contest_draw_settings (
    contest_id,
    standard_tickets,
    premium_tickets,
    confirmation_message,
    winner_announcement_at,
    rules,
    created_at
  )
  select
    upsert_contest.id,
    1,
    2,
    'Tu participes au Grand Tirage Orange CI. Le gagnant sera annonce a la fin du concours.',
    now() + interval '14 days',
    'Une participation par joueur. Les forfaits joueurs peuvent ajouter des tickets bonus.',
    now()
  from upsert_contest
  on conflict (contest_id) do update set
    standard_tickets = excluded.standard_tickets,
    premium_tickets = excluded.premium_tickets,
    confirmation_message = excluded.confirmation_message,
    winner_announcement_at = excluded.winner_announcement_at,
    rules = excluded.rules
  returning contest_id
)
select
  case
    when not exists (select 1 from tirage_type)
      then 'Erreur : type tirage introuvable dans contest_types.'
    when exists (select 1 from upsert_contest)
      then 'Partenaire Orange CI et concours Grand Tirage Orange CI crees ou mis a jour.'
    else 'Erreur : partenaire ou concours non cree.'
  end as result,
  case
    when exists (select 1 from auth_partner)
      then 'Compte auth orange@gmail.com trouve et lie.'
    else 'Compte auth orange@gmail.com introuvable : cree-le dans Authentication > Users avec le mot de passe 12345678 puis relance ce script.'
  end as auth_link_status;
