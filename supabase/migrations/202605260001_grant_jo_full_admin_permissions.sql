-- MegaPromo - Acces complet permanent pour jo.djebi@gmail.com
-- Ce compte garde la permission wildcard "*", donc il herite aussi des
-- permissions des futures features.

insert into public.admin_roles (
  id,
  name,
  description,
  is_system,
  is_active,
  created_at,
  updated_at
)
values (
  '20260526-0000-4000-a000-000000000001'::uuid,
  'Super Admin',
  'Acces complet a tous les modules MegaPromo, presents et futurs.',
  true,
  true,
  now(),
  now()
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = true,
  is_active = true,
  updated_at = now();

insert into public.admin_role_permissions (role_id, permission_key)
values (
  '20260526-0000-4000-a000-000000000001'::uuid,
  '*'
)
on conflict (role_id, permission_key) do nothing;

insert into public.users (
  id,
  phone,
  username,
  role,
  admin_role_id,
  is_active,
  points_total,
  participations_today,
  created_at
)
select
  auth.users.id,
  coalesce(
    nullif(public.users.phone, ''),
    'a_' || left(replace(auth.users.id::text, '-', ''), 18)
  ),
  coalesce(
    nullif(public.users.username, ''),
    split_part(auth.users.email, '@', 1)
  ),
  'admin',
  '20260526-0000-4000-a000-000000000001'::uuid,
  true,
  coalesce(public.users.points_total, 0),
  coalesce(public.users.participations_today, 0),
  coalesce(public.users.created_at, now())
from auth.users
left join public.users on public.users.id = auth.users.id
where lower(auth.users.email) = 'jo.djebi@gmail.com'
on conflict (id) do update set
  role = 'admin',
  admin_role_id = '20260526-0000-4000-a000-000000000001'::uuid,
  is_active = true,
  username = coalesce(
    nullif(users.username, ''),
    excluded.username
  );

notify pgrst, 'reload schema';
