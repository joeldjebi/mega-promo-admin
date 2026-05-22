-- MegaPromo - Public player plans for landing page
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet a la landing publique (role anon) de lire
-- les forfaits joueurs actifs et leurs avantages.

grant usage on schema public to anon, authenticated;
grant select on public.player_plans to anon, authenticated;
grant select on public.player_plan_benefits to anon, authenticated;

alter table public.player_plans enable row level security;
alter table public.player_plan_benefits enable row level security;

drop policy if exists player_plans_public_select_active_for_landing on public.player_plans;
create policy player_plans_public_select_active_for_landing
on public.player_plans
for select
to anon, authenticated
using (coalesce(is_active, true) = true);

drop policy if exists player_plan_benefits_public_select_active_for_landing
on public.player_plan_benefits;
create policy player_plan_benefits_public_select_active_for_landing
on public.player_plan_benefits
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.player_plans
    where player_plans.id = player_plan_benefits.plan_id
      and coalesce(player_plans.is_active, true) = true
  )
);

