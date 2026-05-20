-- MegaPromo Web - Partner sectors management
-- A executer dans Supabase SQL Editor.
-- Script idempotent : cree le referentiel des secteurs partenaires et permet
-- au SA de le manager depuis le dashboard.

create table if not exists public.partner_sectors (
  id uuid primary key default gen_random_uuid(),
  name varchar not null unique,
  description text,
  is_active bool default true,
  order_index int4 default 0,
  created_at timestamptz default now()
);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.partner_sectors to authenticated;

alter table public.partner_sectors enable row level security;

insert into public.partner_sectors (
  name,
  description,
  is_active,
  order_index
)
values
  ('Télécom', 'Opérateurs télécom, internet et mobile money.', true, 1),
  ('Banque', 'Banques, fintech et services financiers.', true, 2),
  ('Assurance', 'Assurances et mutuelles.', true, 3),
  ('Food', 'Restaurants, boissons, agroalimentaire et livraison.', true, 4),
  ('Retail', 'Commerce, supermarchés et e-commerce.', true, 5),
  ('Sport', 'Clubs, événements sportifs et équipementiers.', true, 6),
  ('Divertissement', 'Médias, musique, cinéma et loisirs.', true, 7),
  ('Éducation', 'Écoles, formations et edtech.', true, 8),
  ('Santé', 'Cliniques, pharmacies et bien-être.', true, 9),
  ('Autre', 'Secteur non classé.', true, 99)
on conflict (name) do update set
  description = excluded.description,
  is_active = excluded.is_active,
  order_index = excluded.order_index;

drop policy if exists partner_sectors_admin_select_web_dashboard on public.partner_sectors;
create policy partner_sectors_admin_select_web_dashboard
on public.partner_sectors
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists partner_sectors_admin_insert_web_dashboard on public.partner_sectors;
create policy partner_sectors_admin_insert_web_dashboard
on public.partner_sectors
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists partner_sectors_admin_update_web_dashboard on public.partner_sectors;
create policy partner_sectors_admin_update_web_dashboard
on public.partner_sectors
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists partner_sectors_admin_delete_web_dashboard on public.partner_sectors;
create policy partner_sectors_admin_delete_web_dashboard
on public.partner_sectors
for delete
to authenticated
using (public.current_user_is_admin());
