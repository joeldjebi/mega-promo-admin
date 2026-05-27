-- MegaPromo - Attribution d'un forfait joueur par le SA apres paiement
-- A executer dans Supabase SQL Editor.

create or replace function public.admin_assign_player_subscription(
  p_user_id uuid,
  p_plan_id uuid,
  p_payment_method text default 'Validation SA',
  p_payment_reference text default 'Validation SA',
  p_starts_at timestamptz default now()
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
  plan_record public.player_plans%rowtype;
  target_user public.users%rowtype;
  subscription_record public.player_subscriptions%rowtype;
  starts_at timestamptz := coalesce(p_starts_at, now());
  expires_at timestamptz;
  is_paid_plan boolean;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecte.';
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
    raise exception 'Permission users.write requise pour modifier le forfait joueur.';
  end if;

  select *
  into target_user
  from public.users
  where users.id = p_user_id
    and coalesce(users.role, 'player') = 'player'
  limit 1;

  if target_user.id is null then
    raise exception 'Joueur introuvable.';
  end if;

  select *
  into plan_record
  from public.player_plans
  where player_plans.id = p_plan_id
    and coalesce(player_plans.is_active, true) = true
  limit 1;

  if plan_record.id is null then
    raise exception 'Forfait joueur introuvable ou inactif.';
  end if;

  expires_at := starts_at + (coalesce(plan_record.duration_days, 30) * interval '1 day');
  is_paid_plan := coalesce(plan_record.price, 0) > 0
    and lower(coalesce(plan_record.key, '')) not in ('free', 'standard');

  update public.player_subscriptions
  set status = 'expired'
  where user_id = target_user.id
    and status = 'active';

  insert into public.player_subscriptions (
    user_id,
    plan_id,
    amount,
    status,
    starts_at,
    expires_at,
    payment_method,
    payment_reference
  )
  values (
    target_user.id,
    plan_record.id,
    coalesce(plan_record.price, 0),
    'active',
    starts_at,
    expires_at,
    nullif(trim(coalesce(p_payment_method, '')), ''),
    nullif(trim(coalesce(p_payment_reference, '')), '')
  )
  returning *
  into subscription_record;

  update public.users
  set
    is_premium = is_paid_plan,
    premium_expires_at = case
      when is_paid_plan then expires_at
      else null
    end
  where id = target_user.id;

  return jsonb_build_object(
    'ok',
    true,
    'subscription',
    to_jsonb(subscription_record),
    'premium',
    is_paid_plan
  );
end;
$$;

grant execute on function public.admin_assign_player_subscription(
  uuid,
  uuid,
  text,
  text,
  timestamptz
) to authenticated;

notify pgrst, 'reload schema';
