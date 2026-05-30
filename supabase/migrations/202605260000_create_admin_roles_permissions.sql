-- MegaPromo - Roles et permissions des admins
-- A executer dans Supabase SQL Editor avant de deployer la fonction admin-access.

create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_system bool not null default false,
  is_active bool not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists admin_roles_name_unique_idx
on public.admin_roles(lower(name));

create table if not exists public.admin_role_permissions (
  role_id uuid not null references public.admin_roles(id) on delete cascade,
  permission_key text not null,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

alter table public.users
add column if not exists admin_role_id uuid
references public.admin_roles(id) on delete set null;

create index if not exists users_admin_role_idx
on public.users(admin_role_id)
where admin_role_id is not null;

create index if not exists admin_role_permissions_key_idx
on public.admin_role_permissions(permission_key);

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
  'Acces complet a tous les modules MegaPromo.',
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
values
  ('20260526-0000-4000-a000-000000000001'::uuid, '*')
on conflict (role_id, permission_key) do nothing;

update public.users
set admin_role_id = coalesce(
  admin_role_id,
  '20260526-0000-4000-a000-000000000001'::uuid
)
where coalesce(role, 'player') in ('admin', 'super_admin', 'super-admin', 'sa')
  and coalesce(is_active, true) = true;

create or replace function public.current_admin_permission_keys()
returns text[]
language sql
security definer
set search_path = public
as $$
  select case
    when not exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and coalesce(users.role, 'player') in ('admin', 'super_admin', 'super-admin', 'sa')
        and coalesce(users.is_active, true) = true
    ) then array[]::text[]
    when exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and coalesce(users.role, 'player') in ('admin', 'super_admin', 'super-admin', 'sa')
        and coalesce(users.is_active, true) = true
        and users.admin_role_id is null
    ) then array['*']::text[]
    else coalesce(
      (
        select array_agg(distinct admin_role_permissions.permission_key)
        from public.users
        join public.admin_role_permissions
          on admin_role_permissions.role_id = users.admin_role_id
        join public.admin_roles
          on admin_roles.id = users.admin_role_id
        where users.id = auth.uid()
          and coalesce(users.role, 'player') in ('admin', 'super_admin', 'super-admin', 'sa')
          and coalesce(users.is_active, true) = true
          and coalesce(admin_roles.is_active, true) = true
      ),
      array[]::text[]
    )
  end;
$$;

create or replace function public.current_admin_has_permission(
  p_permission_key text
)
returns bool
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from unnest(public.current_admin_permission_keys()) as permissions(permission_key)
    where permissions.permission_key = '*'
      or permissions.permission_key = p_permission_key
  );
$$;

grant select on public.admin_roles to authenticated;
grant select on public.admin_role_permissions to authenticated;
grant execute on function public.current_admin_permission_keys() to authenticated;
grant execute on function public.current_admin_has_permission(text) to authenticated;

alter table public.admin_roles enable row level security;
alter table public.admin_role_permissions enable row level security;

drop policy if exists "admin_roles_sa_select" on public.admin_roles;
create policy "admin_roles_sa_select"
on public.admin_roles
for select
to authenticated
using (public.current_admin_has_permission('admin_access.read'));

drop policy if exists "admin_role_permissions_sa_select" on public.admin_role_permissions;
create policy "admin_role_permissions_sa_select"
on public.admin_role_permissions
for select
to authenticated
using (public.current_admin_has_permission('admin_access.read'));

notify pgrst, 'reload schema';
