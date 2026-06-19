-- MegaPromo Web - Cycle SA de suppression utilisateur
-- A executer dans Supabase SQL Editor.
--
-- Objectif:
-- - permettre au Super Admin de programmer une suppression utilisateur;
-- - permettre l'anonymisation definitive;
-- - permettre, avec confirmation forte, une suppression definitive immediate
--   de toutes les donnees rattachees a l'utilisateur.

alter table public.users
add column if not exists account_status text not null default 'active',
add column if not exists deletion_requested_at timestamptz,
add column if not exists deletion_scheduled_at timestamptz,
add column if not exists deleted_at timestamptz,
add column if not exists anonymized_ref text,
add column if not exists active_device_session_id text,
add column if not exists active_device_info jsonb default '{}'::jsonb,
add column if not exists active_device_seen_at timestamptz;

alter table public.users
alter column phone drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_account_status_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
    add constraint users_account_status_check
    check (account_status in ('active', 'pending_deletion', 'deleted'));
  end if;
end $$;

create index if not exists users_account_status_idx
on public.users(account_status, deletion_scheduled_at);

create table if not exists public.admin_user_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  target_user_id uuid,
  action text not null,
  confirmation text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_user_deletion_audit enable row level security;

drop policy if exists "admin_user_deletion_audit_admin_select"
on public.admin_user_deletion_audit;

create policy "admin_user_deletion_audit_admin_select"
on public.admin_user_deletion_audit
for select
to authenticated
using (public.current_admin_has_permission('users.read'));

grant select on public.admin_user_deletion_audit to authenticated;
grant select, insert, update, delete on public.admin_user_deletion_audit to service_role;

create or replace function public.admin_user_deletion_assert_allowed(
  p_target_user_id uuid
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_user public.users%rowtype;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecte.';
  end if;

  if not public.current_admin_has_permission('users.write') then
    raise exception 'Permission users.write requise.';
  end if;

  if p_target_user_id = current_user_id then
    raise exception 'Action interdite sur ton propre compte SA.';
  end if;

  select *
  into target_user
  from public.users
  where id = p_target_user_id
  limit 1;

  if target_user.id is null then
    raise exception 'Utilisateur introuvable.';
  end if;

  if coalesce(target_user.role, 'player') in ('admin', 'super_admin', 'super-admin', 'sa') then
    raise exception 'Action interdite sur un compte administrateur.';
  end if;

  return target_user;
end;
$$;

create or replace function public.admin_schedule_user_deletion(
  p_user_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user public.users%rowtype;
  scheduled_at timestamptz := now() + interval '30 days';
begin
  target_user := public.admin_user_deletion_assert_allowed(p_user_id);

  if upper(trim(coalesce(p_confirmation, ''))) <> 'PROGRAMMER' then
    raise exception 'Confirmation invalide. Ecris PROGRAMMER pour continuer.';
  end if;

  update public.users
  set
    is_active = false,
    account_status = 'pending_deletion',
    deletion_requested_at = now(),
    deletion_scheduled_at = scheduled_at,
    deleted_at = null,
    active_device_session_id = null,
    active_device_info = '{}'::jsonb,
    active_device_seen_at = null
  where id = target_user.id;

  insert into public.admin_user_deletion_audit (
    actor_user_id,
    target_user_id,
    action,
    confirmation,
    metadata
  )
  values (
    auth.uid(),
    target_user.id,
    'schedule_deletion',
    p_confirmation,
    jsonb_build_object('deletion_scheduled_at', scheduled_at)
  );

  return jsonb_build_object(
    'ok',
    true,
    'status',
    'pending_deletion',
    'deletion_scheduled_at',
    scheduled_at
  );
end;
$$;

create or replace function public.admin_anonymize_user_now(
  p_user_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user public.users%rowtype;
  anonymized_reference text;
begin
  target_user := public.admin_user_deletion_assert_allowed(p_user_id);

  if upper(trim(coalesce(p_confirmation, ''))) <> 'ANONYMISER' then
    raise exception 'Confirmation invalide. Ecris ANONYMISER pour continuer.';
  end if;

  anonymized_reference := coalesce(
    target_user.anonymized_ref,
    'deleted-player-' || substring(target_user.id::text from 1 for 8)
  );

  update public.users
  set
    account_status = 'deleted',
    is_active = false,
    deleted_at = coalesce(deleted_at, now()),
    deletion_requested_at = coalesce(deletion_requested_at, now()),
    deletion_scheduled_at = coalesce(deletion_scheduled_at, now()),
    anonymized_ref = anonymized_reference,
    phone = null,
    username = 'Joueur supprimé',
    avatar_url = null,
    fcm_token = null,
    fcm_token_platform = null,
    fcm_token_updated_at = null,
    fcm_token_last_error = null,
    fcm_token_last_error_at = null,
    active_device_session_id = null,
    active_device_info = '{}'::jsonb,
    active_device_seen_at = null,
    device_info = '{}'::jsonb,
    location_info = '{}'::jsonb,
    device_last_seen_at = null
  where id = target_user.id;

  insert into public.admin_user_deletion_audit (
    actor_user_id,
    target_user_id,
    action,
    confirmation,
    metadata
  )
  values (
    auth.uid(),
    target_user.id,
    'anonymize_now',
    p_confirmation,
    jsonb_build_object('anonymized_ref', anonymized_reference)
  );

  return jsonb_build_object(
    'ok',
    true,
    'status',
    'deleted',
    'anonymized_ref',
    anonymized_reference
  );
end;
$$;

create or replace function public.admin_hard_delete_user_now(
  p_user_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user public.users%rowtype;
  deleted_from_user_id_tables int := 0;
  deleted_count int := 0;
  table_record record;
begin
  target_user := public.admin_user_deletion_assert_allowed(p_user_id);

  if upper(trim(coalesce(p_confirmation, ''))) <> 'SUPPRIMER DEFINITIVEMENT' then
    raise exception 'Confirmation invalide. Ecris SUPPRIMER DEFINITIVEMENT pour continuer.';
  end if;

  insert into public.admin_user_deletion_audit (
    actor_user_id,
    target_user_id,
    action,
    confirmation,
    metadata
  )
  values (
    auth.uid(),
    target_user.id,
    'hard_delete_now',
    p_confirmation,
    jsonb_build_object(
      'username',
      target_user.username,
      'phone_present',
      target_user.phone is not null
    )
  );

  for table_record in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'user_id'
      and udt_name = 'uuid'
      and table_name <> 'admin_user_deletion_audit'
    group by table_schema, table_name
    order by table_name
  loop
    execute format(
      'delete from %I.%I where user_id = $1',
      table_record.table_schema,
      table_record.table_name
    )
    using target_user.id;
    get diagnostics deleted_count = row_count;
    deleted_from_user_id_tables := deleted_from_user_id_tables + deleted_count;
  end loop;

  if to_regclass('auth.identities') is not null then
    delete from auth.identities
    where user_id = target_user.id;
  end if;

  delete from public.users
  where id = target_user.id;

  if to_regclass('auth.users') is not null then
    delete from auth.users
    where id = target_user.id;
  end if;

  return jsonb_build_object(
    'ok',
    true,
    'deleted_user_id',
    target_user.id,
    'deleted_related_rows',
    deleted_from_user_id_tables
  );
end;
$$;

grant execute on function public.admin_schedule_user_deletion(uuid, text)
to authenticated;

grant execute on function public.admin_anonymize_user_now(uuid, text)
to authenticated;

grant execute on function public.admin_hard_delete_user_now(uuid, text)
to authenticated;

notify pgrst, 'reload schema';
