-- MegaPromo Web - Contest Types
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ne supprime aucune table et peut etre relance sans perte de donnees.

create table if not exists public.contest_types (
  id uuid primary key default gen_random_uuid(),
  key varchar not null unique,
  name varchar not null,
  description text,
  is_active bool default true,
  order_index int4 default 0,
  created_at timestamptz default now()
);

grant usage on schema public to authenticated;
grant select, insert, update on public.contest_types to authenticated;

alter table public.contest_types enable row level security;

insert into public.contest_types (key, name, description, is_active, order_index)
values
  (
    'quiz',
    'Quiz',
    'Concours avec questions, reponses et score.',
    true,
    1
  ),
  (
    'tirage',
    'Tirage',
    'Participation simple avec selection de gagnants.',
    true,
    2
  ),
  (
    'pronostic',
    'Pronostic',
    'Prediction sportive ou evenementielle, par exemple un score de match.',
    true,
    3
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  order_index = excluded.order_index;

drop policy if exists contest_types_admin_select_web_dashboard on public.contest_types;
create policy contest_types_admin_select_web_dashboard
on public.contest_types
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists contest_types_admin_insert_web_dashboard on public.contest_types;
create policy contest_types_admin_insert_web_dashboard
on public.contest_types
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists contest_types_admin_update_web_dashboard on public.contest_types;
create policy contest_types_admin_update_web_dashboard
on public.contest_types
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
