-- MegaPromo Web - Admin CRUD player plans and benefits
-- A executer dans Supabase SQL Editor.
-- Script idempotent : autorise le SA a manager les forfaits joueurs et leurs avantages.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.player_plans to authenticated;
grant select, insert, update, delete on public.player_plan_benefits to authenticated;
grant select, insert, update, delete on public.player_subscriptions to authenticated;

alter table public.player_plans enable row level security;
alter table public.player_plan_benefits enable row level security;
alter table public.player_subscriptions enable row level security;

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

drop policy if exists player_subscriptions_admin_update_validation on public.player_subscriptions;
create policy player_subscriptions_admin_update_validation
on public.player_subscriptions
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
