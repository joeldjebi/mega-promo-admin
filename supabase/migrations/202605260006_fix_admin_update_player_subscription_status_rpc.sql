-- MegaPromo - Fix RPC de mise a jour du statut d'abonnement joueur
-- A executer dans Supabase SQL Editor.
-- Corrige l'erreur PGRST202:
-- Could not find public.admin_update_player_subscription_status(p_status, p_subscription_id)

drop function if exists public.admin_update_player_subscription_status(uuid, text);
drop function if exists public.admin_update_player_subscription_status(text, uuid);

create or replace function public.admin_update_player_subscription_status(
  p_status text,
  p_subscription_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  actor_role text;
  actor_admin_role_id uuid;
  subscription_record public.player_subscriptions%rowtype;
  plan_record public.player_plans%rowtype;
  active_paid_expires_at timestamptz;
  normalized_status text := lower(trim(coalesce(p_status, '')));
  is_paid_plan boolean;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecte.';
  end if;

  if normalized_status not in ('pending', 'active', 'expired', 'cancelled') then
    raise exception 'Statut d''abonnement invalide.';
  end if;

  select users.role, users.admin_role_id
  into actor_role, actor_admin_role_id
  from public.users
  where users.id = current_user_id
    and coalesce(users.is_active, true) = true
  limit 1;

  if actor_role is null then
    raise exception 'Compte admin introuvable ou inactif.';
  end if;

  if coalesce(actor_role, 'player') not in ('super_admin', 'super-admin', 'sa')
    and not exists (
      select 1
      from public.admin_role_permissions
      where admin_role_permissions.role_id = actor_admin_role_id
        and admin_role_permissions.permission_key in ('users.write', '*')
    )
  then
    raise exception 'Permission users.write requise pour modifier un abonnement joueur.';
  end if;

  select *
  into subscription_record
  from public.player_subscriptions
  where id = p_subscription_id
  limit 1;

  if subscription_record.id is null then
    raise exception 'Abonnement joueur introuvable.';
  end if;

  select *
  into plan_record
  from public.player_plans
  where id = subscription_record.plan_id
  limit 1;

  if plan_record.id is null then
    raise exception 'Forfait joueur introuvable.';
  end if;

  if normalized_status = 'active' then
    update public.player_subscriptions
    set status = 'expired'
    where user_id = subscription_record.user_id
      and status = 'active'
      and id <> subscription_record.id;
  end if;

  update public.player_subscriptions
  set status = normalized_status
  where id = subscription_record.id
  returning *
  into subscription_record;

  is_paid_plan := normalized_status = 'active'
    and coalesce(plan_record.price, 0) > 0
    and lower(coalesce(plan_record.key, '')) not in ('free', 'standard');

  if is_paid_plan then
    update public.users
    set
      is_premium = true,
      premium_expires_at = subscription_record.expires_at
    where id = subscription_record.user_id;
  else
    select player_subscriptions.expires_at
    into active_paid_expires_at
    from public.player_subscriptions
    join public.player_plans
      on player_plans.id = player_subscriptions.plan_id
    where player_subscriptions.user_id = subscription_record.user_id
      and player_subscriptions.status = 'active'
      and coalesce(player_plans.price, 0) > 0
      and lower(coalesce(player_plans.key, '')) not in ('free', 'standard')
    order by player_subscriptions.expires_at desc nulls last,
      player_subscriptions.created_at desc
    limit 1;

    update public.users
    set
      is_premium = active_paid_expires_at is not null,
      premium_expires_at = active_paid_expires_at
    where id = subscription_record.user_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'subscription', to_jsonb(subscription_record)
  );
end;
$$;

grant execute on function public.admin_update_player_subscription_status(text, uuid)
to authenticated;

notify pgrst, 'reload schema';
