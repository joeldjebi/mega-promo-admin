-- MegaPromo Web - Countries management
-- A executer dans Supabase SQL Editor.
-- Script idempotent : cree la table pays, ajoute les droits SA et insere la Cote d'Ivoire.

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  flag varchar not null,
  phone_digits int4 not null,
  name varchar not null unique,
  dial_code varchar not null unique,
  is_active bool default true,
  created_at timestamptz default now()
);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.countries to authenticated;

alter table public.countries enable row level security;

insert into public.countries (
  flag,
  phone_digits,
  name,
  dial_code,
  is_active
)
values (
  'orange-white-green',
  10,
  'Cote d''Ivoire',
  '+225',
  true
)
on conflict (dial_code) do update set
  flag = excluded.flag,
  phone_digits = excluded.phone_digits,
  name = excluded.name,
  is_active = excluded.is_active;

drop policy if exists countries_admin_select_web_dashboard on public.countries;
create policy countries_admin_select_web_dashboard
on public.countries
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists countries_admin_insert_web_dashboard on public.countries;
create policy countries_admin_insert_web_dashboard
on public.countries
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists countries_admin_update_web_dashboard on public.countries;
create policy countries_admin_update_web_dashboard
on public.countries
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists countries_admin_delete_web_dashboard on public.countries;
create policy countries_admin_delete_web_dashboard
on public.countries
for delete
to authenticated
using (public.current_user_is_admin());
