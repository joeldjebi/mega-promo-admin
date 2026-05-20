-- MegaPromo Mobile - Player self subscriptions
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet aux joueurs de lire les forfaits actifs et de creer leur propre souscription.

grant usage on schema public to authenticated;
grant select on public.player_plans to authenticated;
grant select on public.player_plan_benefits to authenticated;
grant select, insert on public.player_subscriptions to authenticated;
grant select, update on public.users to authenticated;

alter table public.player_plans enable row level security;
alter table public.player_plan_benefits enable row level security;
alter table public.player_subscriptions enable row level security;
alter table public.users enable row level security;

drop policy if exists player_plans_players_select_active on public.player_plans;
create policy player_plans_players_select_active
on public.player_plans
for select
to authenticated
using (coalesce(is_active, true) = true);

drop policy if exists player_plan_benefits_players_select_active on public.player_plan_benefits;
create policy player_plan_benefits_players_select_active
on public.player_plan_benefits
for select
to authenticated
using (
  exists (
    select 1
    from public.player_plans
    where player_plans.id = player_plan_benefits.plan_id
      and coalesce(player_plans.is_active, true) = true
  )
);

drop policy if exists player_subscriptions_players_select_own on public.player_subscriptions;
create policy player_subscriptions_players_select_own
on public.player_subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists player_subscriptions_players_insert_own on public.player_subscriptions;
create policy player_subscriptions_players_insert_own
on public.player_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists users_players_update_own_subscription_state on public.users;
create policy users_players_update_own_subscription_state
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
