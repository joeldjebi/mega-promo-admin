-- MegaPromo Web - Super Admin maintenance cleanup
-- A executer dans Supabase SQL Editor.
-- Script idempotent : cree une fonction RPC securisee pour vider certaines
-- donnees de test avant la mise en production.
--
-- La fonction exige :
-- - un utilisateur connecte role admin via public.current_user_is_admin()
-- - la confirmation exacte : CONFIRMER

grant usage on schema public to authenticated;

create or replace function public.admin_maintenance_clear(
  p_scope text,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
  total_count integer := 0;
begin
  if not public.current_user_is_admin() then
    raise exception 'Action reservee au Super Admin.';
  end if;

  if p_confirmation <> 'CONFIRMER' then
    raise exception 'Confirmation invalide. Ecris CONFIRMER pour executer cette action.';
  end if;

  if p_scope = 'game_history' then
    delete from public.participations
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    update public.users
    set participations_today = 0,
        last_participation_date = null,
        points_total = 0
    where true;

    return jsonb_build_object(
      'scope', p_scope,
      'deleted', total_count,
      'message', 'Historique de jeu vide, points et compteurs joueurs remis a zero.'
    );
  end if;

  if p_scope = 'rewards_notifications' then
    delete from public.winners
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.notifications
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    return jsonb_build_object(
      'scope', p_scope,
      'deleted', total_count,
      'message', 'Gagnants et notifications vides.'
    );
  end if;

  if p_scope = 'badges' then
    delete from public.user_badges
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    return jsonb_build_object(
      'scope', p_scope,
      'deleted', total_count,
      'message', 'Badges attribues aux joueurs vides. Les definitions de badges sont conservees.'
    );
  end if;

  if p_scope = 'subscriptions' then
    delete from public.player_subscriptions
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.partner_subscriptions
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.subscriptions
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    update public.users
    set is_premium = false,
        premium_expires_at = null
    where true;

    update public.partners
    set subscription_plan = null,
        subscription_expires_at = null
    where true;

    return jsonb_build_object(
      'scope', p_scope,
      'deleted', total_count,
      'message', 'Abonnements joueurs/partenaires vides et statuts premium reinitialises.'
    );
  end if;

  if p_scope = 'contests' then
    delete from public.winners
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.participations
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.boosts
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.questions
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    if to_regclass('public.contest_draw_settings') is not null then
      delete from public.contest_draw_settings
      where true;
      get diagnostics deleted_count = row_count;
      total_count := total_count + deleted_count;
    end if;

    if to_regclass('public.contest_predictions') is not null then
      delete from public.contest_predictions
      where true;
      get diagnostics deleted_count = row_count;
      total_count := total_count + deleted_count;
    end if;

    delete from public.contests
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    update public.users
    set participations_today = 0,
        last_participation_date = null,
        points_total = 0
    where true;

    return jsonb_build_object(
      'scope', p_scope,
      'deleted', total_count,
      'message', 'Concours, jeux, questions, boosts, participations et gagnants vides. Points joueurs remis a zero.'
    );
  end if;

  if p_scope = 'all_test_data' then
    delete from public.notifications
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.winners
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.user_badges
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.participations
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.player_subscriptions
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.partner_subscriptions
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.subscriptions
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.boosts
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    delete from public.questions
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    if to_regclass('public.contest_draw_settings') is not null then
      delete from public.contest_draw_settings
      where true;
      get diagnostics deleted_count = row_count;
      total_count := total_count + deleted_count;
    end if;

    if to_regclass('public.contest_predictions') is not null then
      delete from public.contest_predictions
      where true;
      get diagnostics deleted_count = row_count;
      total_count := total_count + deleted_count;
    end if;

    delete from public.contests
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;

    update public.users
    set is_premium = false,
        premium_expires_at = null,
        participations_today = 0,
        last_participation_date = null,
        points_total = 0
    where true;

    update public.partners
    set subscription_plan = null,
        subscription_expires_at = null
    where true;

    return jsonb_build_object(
      'scope', p_scope,
      'deleted', total_count,
      'message', 'Donnees de test videes. Les configurations, utilisateurs et partenaires sont conserves.'
    );
  end if;

  raise exception 'Scope de maintenance inconnu: %', p_scope;
end;
$$;

grant execute on function public.admin_maintenance_clear(text, text) to authenticated;
