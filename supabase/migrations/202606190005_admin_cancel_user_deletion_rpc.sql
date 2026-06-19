-- MegaPromo Web - Annulation SA d'une suppression utilisateur planifiee
-- A executer dans Supabase SQL Editor apres:
-- 202606190003_admin_user_deletion_lifecycle_rpc.sql.
--
-- Objectif:
-- - permettre au Super Admin d'annuler une suppression programmee;
-- - reactiver le compte joueur;
-- - nettoyer les dates de suppression sans toucher a l'historique.

create or replace function public.admin_cancel_user_deletion(
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
begin
  target_user := public.admin_user_deletion_assert_allowed(p_user_id);

  if upper(trim(coalesce(p_confirmation, ''))) <> 'ANNULER' then
    raise exception 'Confirmation invalide. Ecris ANNULER pour continuer.';
  end if;

  if coalesce(target_user.account_status, 'active') <> 'pending_deletion' then
    raise exception 'Ce compte n''a pas de suppression planifiee a annuler.';
  end if;

  update public.users
  set
    is_active = true,
    account_status = 'active',
    deletion_requested_at = null,
    deletion_scheduled_at = null,
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
    'cancel_deletion',
    p_confirmation,
    jsonb_build_object(
      'previous_deletion_requested_at',
      target_user.deletion_requested_at,
      'previous_deletion_scheduled_at',
      target_user.deletion_scheduled_at
    )
  );

  return jsonb_build_object(
    'ok',
    true,
    'status',
    'active',
    'user_id',
    target_user.id
  );
end;
$$;

grant execute on function public.admin_cancel_user_deletion(uuid, text)
to authenticated;

notify pgrst, 'reload schema';
