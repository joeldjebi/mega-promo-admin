-- MegaPromo Web - Demande utilisateur de suppression de compte
-- A executer dans Supabase SQL Editor.
--
-- Objectif:
-- - permettre a un utilisateur connecte depuis la page web de suppression de
--   compte de fermer son compte;
-- - appliquer le meme cycle que l'application mobile: fermeture immediate,
--   suppression definitive programmee dans 30 jours;
-- - prendre en charge les comptes crees par telephone, Google ou Apple.

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

create or replace function public.request_own_account_deletion(
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  scheduled_at timestamptz := now() + interval '30 days';
  auth_phone text;
begin
  if current_user_id is null then
    raise exception 'Connexion requise pour supprimer le compte.';
  end if;

  if upper(trim(coalesce(p_confirmation, ''))) <> 'SUPPRIMER' then
    raise exception 'Confirmation invalide. Ecris SUPPRIMER pour continuer.';
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
  where id = current_user_id;

  if not found then
    select phone
    into auth_phone
    from auth.users
    where id = current_user_id;

    insert into public.users (
      id,
      phone,
      role,
      is_premium,
      points_total,
      participations_today,
      last_participation_date,
      is_active,
      account_status,
      deletion_requested_at,
      deletion_scheduled_at,
      deleted_at,
      created_at
    )
    values (
      current_user_id,
      auth_phone,
      'player',
      false,
      0,
      0,
      current_date,
      false,
      'pending_deletion',
      now(),
      scheduled_at,
      null,
      now()
    )
    on conflict (id) do update set
      is_active = false,
      account_status = 'pending_deletion',
      deletion_requested_at = now(),
      deletion_scheduled_at = scheduled_at,
      deleted_at = null;
  end if;

  return jsonb_build_object(
    'status',
    'pending_deletion',
    'deletion_scheduled_at',
    scheduled_at,
    'message',
    'Compte ferme. La suppression definitive est programmee dans 30 jours.'
  );
end;
$$;

grant execute on function public.request_own_account_deletion(text)
to authenticated;

notify pgrst, 'reload schema';
