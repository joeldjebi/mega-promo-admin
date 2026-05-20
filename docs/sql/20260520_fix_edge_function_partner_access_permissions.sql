-- MegaPromo Web - Edge Function partner access permissions
-- A executer dans Supabase SQL Editor.
-- Script idempotent : donne aux roles techniques Supabase les droits requis
-- pour que l'Edge Function send-partner-access puisse verifier le SA, creer
-- ou reparer l'acces Auth partenaire, puis lier public.partners.user_id.

grant usage on schema public to authenticated, service_role;

grant select, insert, update on public.users to authenticated, service_role;
grant select, update on public.partners to authenticated, service_role;

alter table public.users enable row level security;
alter table public.partners enable row level security;

drop policy if exists users_service_role_select_partner_access on public.users;
create policy users_service_role_select_partner_access
on public.users
for select
to service_role
using (true);

drop policy if exists users_service_role_insert_partner_access on public.users;
create policy users_service_role_insert_partner_access
on public.users
for insert
to service_role
with check (true);

drop policy if exists users_service_role_update_partner_access on public.users;
create policy users_service_role_update_partner_access
on public.users
for update
to service_role
using (true)
with check (true);

drop policy if exists partners_service_role_select_partner_access on public.partners;
create policy partners_service_role_select_partner_access
on public.partners
for select
to service_role
using (true);

drop policy if exists partners_service_role_update_partner_access on public.partners;
create policy partners_service_role_update_partner_access
on public.partners
for update
to service_role
using (true)
with check (true);
