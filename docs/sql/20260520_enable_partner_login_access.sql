-- MegaPromo Web - Partner login access
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet a un partenaire cree par le SA de se connecter
-- avec un compte Supabase Auth du meme email, puis lie automatiquement
-- public.partners.user_id au premier login.
--
-- Important :
-- Le compte Auth doit exister dans Supabase Authentication avec le meme email
-- que public.partners.email. Le mot de passe reste gere par Supabase Auth.

grant usage on schema public to authenticated;
grant select, update on public.partners to authenticated;

alter table public.partners enable row level security;

update public.partners
set user_id = auth.users.id
from auth.users
where public.partners.user_id is null
  and lower(public.partners.email) = lower(auth.users.email);

drop policy if exists partners_partner_select_own_web_dashboard on public.partners;
create policy partners_partner_select_own_web_dashboard
on public.partners
for select
to authenticated
using (
  public.current_user_is_admin()
  or user_id = auth.uid()
  or (
    user_id is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists partners_partner_link_own_web_dashboard on public.partners;
create policy partners_partner_link_own_web_dashboard
on public.partners
for update
to authenticated
using (
  public.current_user_is_admin()
  or user_id = auth.uid()
  or (
    user_id is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  public.current_user_is_admin()
  or user_id = auth.uid()
);
