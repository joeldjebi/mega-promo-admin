-- MegaPromo Web - Player plans, benefits, subscriptions and SA users access
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ne supprime aucune table et peut etre relance sans perte de donnees.

create table if not exists public.player_plans (
  id uuid primary key default gen_random_uuid(),
  key varchar not null unique,
  name varchar not null,
  description text,
  price int4 not null default 0,
  duration_days int4 not null default 30,
  daily_participation_limit int4 not null default 3,
  bonus_tickets int4 not null default 0,
  badge_multiplier numeric not null default 1,
  is_active bool default true,
  order_index int4 default 0,
  created_at timestamptz default now()
);

create table if not exists public.player_plan_benefits (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.player_plans(id) on delete cascade,
  label varchar not null,
  description text,
  icon varchar,
  order_index int4 default 0,
  created_at timestamptz default now()
);

create table if not exists public.player_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.player_plans(id),
  amount int4 not null default 0,
  status varchar default 'active',
  starts_at timestamptz default now(),
  expires_at timestamptz not null,
  payment_method varchar,
  payment_reference varchar,
  created_at timestamptz default now()
);

create index if not exists player_plan_benefits_plan_id_idx
on public.player_plan_benefits(plan_id);

create index if not exists player_subscriptions_user_id_idx
on public.player_subscriptions(user_id);

create index if not exists player_subscriptions_plan_id_idx
on public.player_subscriptions(plan_id);

grant usage on schema public to authenticated;
grant select, update on public.users to authenticated;
grant select on public.participations to authenticated;
grant select on public.contests to authenticated;
grant select on public.winners to authenticated;
grant select on public.badges to authenticated;
grant select on public.user_badges to authenticated;
grant select, insert, update, delete on public.player_plans to authenticated;
grant select, insert, update, delete on public.player_plan_benefits to authenticated;
grant select, insert, update, delete on public.player_subscriptions to authenticated;

alter table public.player_plans enable row level security;
alter table public.player_plan_benefits enable row level security;
alter table public.player_subscriptions enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.participations enable row level security;

insert into public.player_plans (
  key,
  name,
  description,
  price,
  duration_days,
  daily_participation_limit,
  bonus_tickets,
  badge_multiplier,
  is_active,
  order_index
)
values
  (
    'free',
    'Standard',
    'Acces gratuit aux concours avec limite journaliere standard.',
    0,
    30,
    3,
    0,
    1,
    true,
    1
  ),
  (
    'premium',
    'Premium',
    'Plus de participations, tickets bonus et avantages prioritaires.',
    1500,
    30,
    10,
    1,
    1.5,
    true,
    2
  ),
  (
    'vip',
    'VIP',
    'Forfait avance pour joueurs tres actifs avec meilleurs avantages.',
    5000,
    30,
    25,
    2,
    2,
    true,
    3
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  duration_days = excluded.duration_days,
  daily_participation_limit = excluded.daily_participation_limit,
  bonus_tickets = excluded.bonus_tickets,
  badge_multiplier = excluded.badge_multiplier,
  is_active = excluded.is_active,
  order_index = excluded.order_index;

with benefit_seed as (
  select *
  from (
    values
      ('free', '3 participations par jour', 'Limite gratuite standard.', 'ticket', 1),
      ('free', 'Acces aux gains publics', 'Participation aux concours actifs.', 'gift', 2),
      ('premium', '10 participations par jour', 'Plus de chances de jouer chaque jour.', 'ticket', 1),
      ('premium', '1 ticket bonus sur les tirages', 'Avantage supplementaire pour les tirages.', 'boost', 2),
      ('premium', 'Progression badges acceleree', 'Multiplicateur de progression x1.5.', 'badge', 3),
      ('vip', '25 participations par jour', 'Volume avance pour joueurs tres actifs.', 'ticket', 1),
      ('vip', '2 tickets bonus sur les tirages', 'Avantage fort sur les concours tirage.', 'boost', 2),
      ('vip', 'Progression badges x2', 'Progression badges prioritaire.', 'badge', 3)
  ) as seed(plan_key, label, description, icon, order_index)
)
insert into public.player_plan_benefits (
  plan_id,
  label,
  description,
  icon,
  order_index
)
select
  player_plans.id,
  benefit_seed.label,
  benefit_seed.description,
  benefit_seed.icon,
  benefit_seed.order_index
from benefit_seed
join public.player_plans on player_plans.key = benefit_seed.plan_key
where not exists (
  select 1
  from public.player_plan_benefits existing
  where existing.plan_id = player_plans.id
    and lower(existing.label) = lower(benefit_seed.label)
);

drop policy if exists users_admin_update_player_management on public.users;
create policy users_admin_update_player_management
on public.users
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists participations_admin_select_player_management on public.participations;
create policy participations_admin_select_player_management
on public.participations
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists badges_admin_select_player_management on public.badges;
create policy badges_admin_select_player_management
on public.badges
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists user_badges_admin_select_player_management on public.user_badges;
create policy user_badges_admin_select_player_management
on public.user_badges
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists player_plans_admin_select_web_dashboard on public.player_plans;
create policy player_plans_admin_select_web_dashboard
on public.player_plans
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists player_plans_admin_insert_web_dashboard on public.player_plans;
create policy player_plans_admin_insert_web_dashboard
on public.player_plans
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists player_plans_admin_update_web_dashboard on public.player_plans;
create policy player_plans_admin_update_web_dashboard
on public.player_plans
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists player_plans_admin_delete_web_dashboard on public.player_plans;
create policy player_plans_admin_delete_web_dashboard
on public.player_plans
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists player_plan_benefits_admin_select_web_dashboard on public.player_plan_benefits;
create policy player_plan_benefits_admin_select_web_dashboard
on public.player_plan_benefits
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists player_plan_benefits_admin_insert_web_dashboard on public.player_plan_benefits;
create policy player_plan_benefits_admin_insert_web_dashboard
on public.player_plan_benefits
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists player_plan_benefits_admin_update_web_dashboard on public.player_plan_benefits;
create policy player_plan_benefits_admin_update_web_dashboard
on public.player_plan_benefits
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists player_plan_benefits_admin_delete_web_dashboard on public.player_plan_benefits;
create policy player_plan_benefits_admin_delete_web_dashboard
on public.player_plan_benefits
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists player_subscriptions_admin_select_web_dashboard on public.player_subscriptions;
create policy player_subscriptions_admin_select_web_dashboard
on public.player_subscriptions
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists player_subscriptions_admin_insert_web_dashboard on public.player_subscriptions;
create policy player_subscriptions_admin_insert_web_dashboard
on public.player_subscriptions
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists player_subscriptions_admin_update_web_dashboard on public.player_subscriptions;
create policy player_subscriptions_admin_update_web_dashboard
on public.player_subscriptions
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists player_subscriptions_admin_delete_web_dashboard on public.player_subscriptions;
create policy player_subscriptions_admin_delete_web_dashboard
on public.player_subscriptions
for delete
to authenticated
using (public.current_user_is_admin());
