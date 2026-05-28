-- MegaPromo - Maintenance du site public
-- A executer dans Supabase SQL Editor.
-- Ajoute un mode maintenance dedie a la landing publique, pilote par le SA.

insert into public.app_feature_flags (
  key,
  name,
  description,
  is_enabled,
  metadata,
  created_at,
  updated_at
)
values (
  'landing_maintenance',
  'Maintenance landing publique',
  'Remplace temporairement le site public par une page maintenance.',
  false,
  jsonb_build_object(
    'scope',
    'landing',
    'title',
    'MegaPromo revient très vite',
    'message',
    'Nous effectuons une courte mise à jour afin de vous offrir une expérience plus fluide. Merci pour votre patience.',
    'badge',
    'Maintenance en cours'
  ),
  now(),
  now()
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  metadata = public.app_feature_flags.metadata || excluded.metadata,
  updated_at = now();

grant select on public.app_feature_flags to anon;

drop policy if exists "app_feature_flags_public_landing_select"
on public.app_feature_flags;
create policy "app_feature_flags_public_landing_select"
on public.app_feature_flags
for select
to anon
using (key = 'landing_maintenance');

drop function if exists public.get_public_landing_maintenance();
create function public.get_public_landing_maintenance()
returns table (
  is_enabled boolean,
  title text,
  message text,
  badge text
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(app_feature_flags.is_enabled, false) as is_enabled,
    coalesce(
      nullif(app_feature_flags.metadata->>'title', ''),
      'MegaPromo revient très vite'
    ) as title,
    coalesce(
      nullif(app_feature_flags.metadata->>'message', ''),
      'Nous effectuons une courte mise à jour afin de vous offrir une expérience plus fluide. Merci pour votre patience.'
    ) as message,
    coalesce(
      nullif(app_feature_flags.metadata->>'badge', ''),
      'Maintenance en cours'
    ) as badge
  from public.app_feature_flags
  where key = 'landing_maintenance'
  limit 1;
$$;

grant execute on function public.get_public_landing_maintenance()
to anon, authenticated;

drop function if exists public.upsert_landing_maintenance_flag(
  boolean,
  text,
  text,
  text
);
create function public.upsert_landing_maintenance_flag(
  p_is_enabled boolean,
  p_title text default null,
  p_message text default null,
  p_badge text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  flag_record public.app_feature_flags%rowtype;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecte.';
  end if;

  if not exists (
    select 1
    from public.users
    where users.id = current_user_id
      and coalesce(users.role, 'player') in (
        'admin',
        'super_admin',
        'super-admin',
        'sa'
      )
      and coalesce(users.is_active, true) = true
  ) then
    raise exception 'Acces reserve au super admin.';
  end if;

  insert into public.app_feature_flags (
    key,
    name,
    description,
    is_enabled,
    metadata,
    updated_by,
    created_at,
    updated_at
  )
  values (
    'landing_maintenance',
    'Maintenance landing publique',
    'Remplace temporairement le site public par une page maintenance.',
    coalesce(p_is_enabled, false),
    jsonb_build_object(
      'scope',
      'landing',
      'title',
      coalesce(nullif(trim(coalesce(p_title, '')), ''), 'MegaPromo revient très vite'),
      'message',
      coalesce(
        nullif(trim(coalesce(p_message, '')), ''),
        'Nous effectuons une courte mise à jour afin de vous offrir une expérience plus fluide. Merci pour votre patience.'
      ),
      'badge',
      coalesce(nullif(trim(coalesce(p_badge, '')), ''), 'Maintenance en cours')
    ),
    current_user_id,
    now(),
    now()
  )
  on conflict (key) do update set
    is_enabled = excluded.is_enabled,
    metadata = public.app_feature_flags.metadata || excluded.metadata,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning *
  into flag_record;

  return to_jsonb(flag_record);
end;
$$;

grant execute on function public.upsert_landing_maintenance_flag(
  boolean,
  text,
  text,
  text
) to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime
    add table public.app_feature_flags;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;

notify pgrst, 'reload schema';
