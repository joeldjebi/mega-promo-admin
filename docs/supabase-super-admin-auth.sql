-- MegaPromo Web - Auth Super Admin
-- A executer dans Supabase SQL Editor si les grants/policies ne sont pas encore presents.

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
grant select on public.users to authenticated;
grant select on public.partners to authenticated;
grant select, insert, update on public.contests to authenticated;
grant select, insert, update on public.contest_types to authenticated;
grant select on public.participations to authenticated;
grant select on public.winners to authenticated;
grant select on public.notifications to authenticated;
grant select, insert, update on public.categories to authenticated;

alter table public.users enable row level security;
alter table public.partners enable row level security;
alter table public.contests enable row level security;
alter table public.contest_types enable row level security;
alter table public.participations enable row level security;
alter table public.winners enable row level security;
alter table public.notifications enable row level security;
alter table public.categories enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
      and coalesce(is_active, true) = true
  );
$$;

grant execute on function public.current_user_is_admin() to authenticated;

insert into public.contest_types (key, name, description, is_active, order_index)
values
  (
    'quiz',
    'Quiz',
    'Concours avec questions, réponses et score.',
    true,
    1
  ),
  (
    'tirage',
    'Tirage',
    'Participation simple avec sélection de gagnants.',
    true,
    2
  ),
  (
    'pronostic',
    'Pronostic',
    'Prédiction sportive ou événementielle, par exemple un score de match.',
    true,
    3
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  order_index = excluded.order_index;

drop policy if exists users_select_own_web_auth on public.users;
create policy users_select_own_web_auth
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists users_admin_select_web_dashboard on public.users;
create policy users_admin_select_web_dashboard
on public.users
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists partners_admin_select_web_dashboard on public.partners;
create policy partners_admin_select_web_dashboard
on public.partners
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists contests_admin_select_web_dashboard on public.contests;
create policy contests_admin_select_web_dashboard
on public.contests
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists contests_admin_insert_web_dashboard on public.contests;
create policy contests_admin_insert_web_dashboard
on public.contests
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists contests_admin_update_web_dashboard on public.contests;
create policy contests_admin_update_web_dashboard
on public.contests
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

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

drop policy if exists participations_admin_select_web_dashboard on public.participations;
create policy participations_admin_select_web_dashboard
on public.participations
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists winners_admin_select_web_dashboard on public.winners;
create policy winners_admin_select_web_dashboard
on public.winners
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists notifications_admin_select_web_dashboard on public.notifications;
create policy notifications_admin_select_web_dashboard
on public.notifications
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists categories_admin_select_web_dashboard on public.categories;
create policy categories_admin_select_web_dashboard
on public.categories
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists categories_admin_insert_web_dashboard on public.categories;
create policy categories_admin_insert_web_dashboard
on public.categories
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists categories_admin_update_web_dashboard on public.categories;
create policy categories_admin_update_web_dashboard
on public.categories
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- Exemple de creation du profil SA apres creation du compte dans Authentication > Users.
-- Remplacer l'id par l'UUID du compte auth.users.
--
-- insert into public.users (
--   id,
--   username,
--   role,
--   is_active,
--   points_total,
--   participations_today,
--   created_at
-- ) values (
--   '00000000-0000-0000-0000-000000000000',
--   'Super Admin',
--   'admin',
--   true,
--   0,
--   0,
--   now()
-- )
-- on conflict (id) do update set
--   role = excluded.role,
--   is_active = excluded.is_active;
