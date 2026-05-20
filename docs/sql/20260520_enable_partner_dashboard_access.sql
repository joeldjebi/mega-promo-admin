-- MegaPromo Web - Partner dashboard read access
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet au partenaire connecte de lire son profil,
-- ses concours et les referentiels utiles pour le dashboard partenaire minimum.

grant usage on schema public to authenticated;

grant select, update on public.partners to authenticated;
grant select on public.contests to authenticated;
grant select on public.categories to authenticated;
grant select on public.contest_types to authenticated;
grant select on public.partner_subscriptions to authenticated;
grant select on public.partner_plans to authenticated;
grant select on public.partner_plan_benefits to authenticated;

alter table public.partners enable row level security;
alter table public.contests enable row level security;
alter table public.categories enable row level security;
alter table public.contest_types enable row level security;
alter table public.partner_subscriptions enable row level security;
alter table public.partner_plans enable row level security;
alter table public.partner_plan_benefits enable row level security;

drop policy if exists partners_partner_select_own_dashboard on public.partners;
create policy partners_partner_select_own_dashboard
on public.partners
for select
to authenticated
using (
  user_id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists partners_partner_update_own_dashboard on public.partners;
create policy partners_partner_update_own_dashboard
on public.partners
for update
to authenticated
using (
  user_id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  user_id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists contests_partner_select_own_dashboard on public.contests;
create policy contests_partner_select_own_dashboard
on public.contests
for select
to authenticated
using (
  partner_id in (
    select partners.id
    from public.partners
    where partners.user_id = auth.uid()
      or lower(partners.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists partner_subscriptions_partner_select_own_dashboard on public.partner_subscriptions;
create policy partner_subscriptions_partner_select_own_dashboard
on public.partner_subscriptions
for select
to authenticated
using (
  partner_id in (
    select partners.id
    from public.partners
    where partners.user_id = auth.uid()
      or lower(partners.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists categories_partner_select_dashboard on public.categories;
create policy categories_partner_select_dashboard
on public.categories
for select
to authenticated
using (coalesce(is_active, true) = true);

drop policy if exists contest_types_partner_select_dashboard on public.contest_types;
create policy contest_types_partner_select_dashboard
on public.contest_types
for select
to authenticated
using (coalesce(is_active, true) = true);

drop policy if exists partner_plans_partner_select_dashboard on public.partner_plans;
create policy partner_plans_partner_select_dashboard
on public.partner_plans
for select
to authenticated
using (coalesce(is_active, true) = true);

drop policy if exists partner_plan_benefits_partner_select_dashboard on public.partner_plan_benefits;
create policy partner_plan_benefits_partner_select_dashboard
on public.partner_plan_benefits
for select
to authenticated
using (true);
