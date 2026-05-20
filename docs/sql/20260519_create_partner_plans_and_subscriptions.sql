-- MegaPromo Web - Partner plans, benefits and subscriptions
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ne supprime aucune table et peut etre relance sans perte de donnees.

create table if not exists public.partner_plans (
  id uuid primary key default gen_random_uuid(),
  key varchar not null unique,
  name varchar not null,
  description text,
  price int4 not null default 0,
  duration_days int4 not null default 30,
  max_contests int4,
  max_boosts int4,
  can_create_quiz bool default false,
  can_create_pronostic bool default false,
  can_access_stats bool default false,
  can_be_featured bool default false,
  is_active bool default true,
  order_index int4 default 0,
  created_at timestamptz default now()
);

create table if not exists public.partner_plan_benefits (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.partner_plans(id) on delete cascade,
  label varchar not null,
  description text,
  icon varchar,
  order_index int4 default 0,
  created_at timestamptz default now()
);

create table if not exists public.partner_subscriptions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  plan_id uuid not null references public.partner_plans(id),
  amount int4 not null default 0,
  status varchar default 'active',
  starts_at timestamptz default now(),
  expires_at timestamptz not null,
  payment_method varchar,
  payment_reference varchar,
  created_at timestamptz default now()
);

create index if not exists partner_plan_benefits_plan_id_idx
on public.partner_plan_benefits(plan_id);

create index if not exists partner_subscriptions_partner_id_idx
on public.partner_subscriptions(partner_id);

create index if not exists partner_subscriptions_plan_id_idx
on public.partner_subscriptions(plan_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.partner_plans to authenticated;
grant select, insert, update, delete on public.partner_plan_benefits to authenticated;
grant select, insert, update, delete on public.partner_subscriptions to authenticated;

alter table public.partner_plans enable row level security;
alter table public.partner_plan_benefits enable row level security;
alter table public.partner_subscriptions enable row level security;

insert into public.partner_plans (
  key,
  name,
  description,
  price,
  duration_days,
  max_contests,
  max_boosts,
  can_create_quiz,
  can_create_pronostic,
  can_access_stats,
  can_be_featured,
  is_active,
  order_index
)
values
  (
    'free',
    'Free',
    'Decouverte pour tester MegaPromo avec une visibilite limitee.',
    0,
    30,
    1,
    0,
    true,
    false,
    false,
    false,
    true,
    1
  ),
  (
    'starter',
    'Starter',
    'Forfait essentiel pour lancer des concours simples.',
    25000,
    30,
    3,
    1,
    true,
    true,
    true,
    false,
    true,
    2
  ),
  (
    'pro',
    'Pro',
    'Forfait premium pour marques actives avec boosts et statistiques.',
    75000,
    30,
    10,
    4,
    true,
    true,
    true,
    true,
    true,
    3
  ),
  (
    'enterprise',
    'Enterprise',
    'Accompagnement sur mesure pour grandes campagnes et operations sponsorisees.',
    200000,
    30,
    null,
    null,
    true,
    true,
    true,
    true,
    true,
    4
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  duration_days = excluded.duration_days,
  max_contests = excluded.max_contests,
  max_boosts = excluded.max_boosts,
  can_create_quiz = excluded.can_create_quiz,
  can_create_pronostic = excluded.can_create_pronostic,
  can_access_stats = excluded.can_access_stats,
  can_be_featured = excluded.can_be_featured,
  is_active = excluded.is_active,
  order_index = excluded.order_index;

with benefit_seed as (
  select *
  from (
    values
      ('free', '1 concours actif', 'Ideal pour tester la plateforme.', 'contest', 1),
      ('free', 'Quiz simple', 'Creation de quiz basiques.', 'quiz', 2),
      ('starter', '3 concours par mois', 'Concours quiz, tirage et pronostic.', 'contest', 1),
      ('starter', 'Statistiques essentielles', 'Suivi basique des vues et participations.', 'chart', 2),
      ('starter', '1 boost inclus', 'Mise en avant limitee.', 'boost', 3),
      ('pro', '10 concours par mois', 'Volume adapte aux marques actives.', 'contest', 1),
      ('pro', '4 boosts inclus', 'Visibilite sponsorisee renforcee.', 'boost', 2),
      ('pro', 'Statistiques avancees', 'Lecture approfondie des performances.', 'chart', 3),
      ('pro', 'Mise en avant premium', 'Priorite dans les concours sponsorises.', 'star', 4),
      ('enterprise', 'Concours illimites', 'Campagnes sur mesure sans limite standard.', 'contest', 1),
      ('enterprise', 'Boosts sur mesure', 'Plan media adapte aux objectifs.', 'boost', 2),
      ('enterprise', 'Accompagnement dedie', 'Support operationnel prioritaire.', 'support', 3)
  ) as seed(plan_key, label, description, icon, order_index)
)
insert into public.partner_plan_benefits (
  plan_id,
  label,
  description,
  icon,
  order_index
)
select
  partner_plans.id,
  benefit_seed.label,
  benefit_seed.description,
  benefit_seed.icon,
  benefit_seed.order_index
from benefit_seed
join public.partner_plans on partner_plans.key = benefit_seed.plan_key
where not exists (
  select 1
  from public.partner_plan_benefits existing
  where existing.plan_id = partner_plans.id
    and lower(existing.label) = lower(benefit_seed.label)
);

drop policy if exists partner_plans_admin_select_web_dashboard on public.partner_plans;
create policy partner_plans_admin_select_web_dashboard
on public.partner_plans
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists partner_plans_admin_insert_web_dashboard on public.partner_plans;
create policy partner_plans_admin_insert_web_dashboard
on public.partner_plans
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists partner_plans_admin_update_web_dashboard on public.partner_plans;
create policy partner_plans_admin_update_web_dashboard
on public.partner_plans
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists partner_plans_admin_delete_web_dashboard on public.partner_plans;
create policy partner_plans_admin_delete_web_dashboard
on public.partner_plans
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists partner_plan_benefits_admin_select_web_dashboard on public.partner_plan_benefits;
create policy partner_plan_benefits_admin_select_web_dashboard
on public.partner_plan_benefits
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists partner_plan_benefits_admin_insert_web_dashboard on public.partner_plan_benefits;
create policy partner_plan_benefits_admin_insert_web_dashboard
on public.partner_plan_benefits
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists partner_plan_benefits_admin_update_web_dashboard on public.partner_plan_benefits;
create policy partner_plan_benefits_admin_update_web_dashboard
on public.partner_plan_benefits
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists partner_plan_benefits_admin_delete_web_dashboard on public.partner_plan_benefits;
create policy partner_plan_benefits_admin_delete_web_dashboard
on public.partner_plan_benefits
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists partner_subscriptions_admin_select_web_dashboard on public.partner_subscriptions;
create policy partner_subscriptions_admin_select_web_dashboard
on public.partner_subscriptions
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists partner_subscriptions_admin_insert_web_dashboard on public.partner_subscriptions;
create policy partner_subscriptions_admin_insert_web_dashboard
on public.partner_subscriptions
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists partner_subscriptions_admin_update_web_dashboard on public.partner_subscriptions;
create policy partner_subscriptions_admin_update_web_dashboard
on public.partner_subscriptions
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists partner_subscriptions_admin_delete_web_dashboard on public.partner_subscriptions;
create policy partner_subscriptions_admin_delete_web_dashboard
on public.partner_subscriptions
for delete
to authenticated
using (public.current_user_is_admin());
