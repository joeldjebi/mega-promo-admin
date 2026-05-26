-- MegaPromo - RPC robuste pour creer/modifier les roles admin
-- A executer dans Supabase SQL Editor.

create or replace function public.upsert_admin_role_with_permissions(
  p_role_id uuid default null,
  p_name text default '',
  p_description text default null,
  p_permissions text[] default array[]::text[],
  p_is_active boolean default true,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role_id uuid := p_role_id;
  normalized_name text := nullif(trim(coalesce(p_name, '')), '');
begin
  if normalized_name is null then
    raise exception 'Le nom du role est obligatoire.';
  end if;

  if resolved_role_id is null then
    select admin_roles.id
    into resolved_role_id
    from public.admin_roles
    where lower(admin_roles.name) = lower(normalized_name)
    order by admin_roles.created_at asc
    limit 1;
  end if;

  if resolved_role_id is null then
    insert into public.admin_roles (
      name,
      description,
      is_active,
      created_by,
      created_at,
      updated_at
    )
    values (
      normalized_name,
      nullif(trim(coalesce(p_description, '')), ''),
      coalesce(p_is_active, true),
      p_actor_id,
      now(),
      now()
    )
    returning id
    into resolved_role_id;
  else
    update public.admin_roles
    set
      name = normalized_name,
      description = nullif(trim(coalesce(p_description, '')), ''),
      is_active = coalesce(p_is_active, true),
      updated_at = now()
    where id = resolved_role_id;
  end if;

  delete from public.admin_role_permissions
  where role_id = resolved_role_id;

  insert into public.admin_role_permissions (role_id, permission_key)
  select resolved_role_id, permission_key
  from (
    select distinct nullif(trim(permission_key), '') as permission_key
    from unnest(coalesce(p_permissions, array[]::text[])) as permission_key
  ) permissions
  where permission_key is not null
  on conflict (role_id, permission_key) do nothing;

  return jsonb_build_object(
    'ok',
    true,
    'roleId',
    resolved_role_id
  );
end;
$$;

grant execute on function public.upsert_admin_role_with_permissions(
  uuid,
  text,
  text,
  text[],
  boolean,
  uuid
) to authenticated;

notify pgrst, 'reload schema';
