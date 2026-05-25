-- MegaPromo - Mobile home bootstrap
-- A executer dans Supabase SQL Editor.
-- Regroupe les donnees critiques de l'accueil mobile en un seul appel RPC.

create or replace function public.get_mobile_home_bootstrap()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  profile_payload jsonb := '{}'::jsonb;
  subscription_payload jsonb := null;
  contests_payload jsonb := '[]'::jsonb;
  registered_live_quiz_ids jsonb := '[]'::jsonb;
  participated_contest_ids jsonb := '[]'::jsonb;
  unread_count int := 0;
  user_plan_key text := 'free';
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecte.';
  end if;

  begin
    perform public.process_live_quiz_events();
  exception
    when undefined_function then null;
    when others then null;
  end;

  select to_jsonb(users)
  into profile_payload
  from public.users
  where id = current_user_id;

  select to_jsonb(active_subscription)
  into subscription_payload
  from (
    select
      player_subscriptions.id,
      player_subscriptions.status,
      player_subscriptions.expires_at,
      jsonb_build_object(
        'key', player_plans.key,
        'name', player_plans.name,
        'daily_participation_limit', player_plans.daily_participation_limit,
        'bonus_tickets', player_plans.bonus_tickets,
        'badge_multiplier', player_plans.badge_multiplier
      ) as player_plans
    from public.player_subscriptions
    join public.player_plans on player_plans.id = player_subscriptions.plan_id
    where player_subscriptions.user_id = current_user_id
      and player_subscriptions.status = 'active'
      and player_subscriptions.expires_at >= now()
    order by player_subscriptions.created_at desc
    limit 1
  ) active_subscription;

  user_plan_key := coalesce(
    subscription_payload #>> '{player_plans,key}',
    'free'
  );

  if user_plan_key = 'standard' then
    user_plan_key := 'free';
  end if;

  select coalesce(
    jsonb_agg(contest_payload order by is_boosted desc, sort_at asc),
    '[]'::jsonb
  )
  into contests_payload
  from (
    select
      coalesce(contests.is_boosted, false) as is_boosted,
      coalesce(contests.starts_at, contests.ends_at) as sort_at,
      to_jsonb(contests)
        || jsonb_build_object(
          'categories',
          case
            when categories.id is null then null
            else jsonb_build_object(
              'id', categories.id,
              'name', categories.name,
              'description', categories.description,
              'icon', categories.icon,
              'color', categories.color,
              'is_active', categories.is_active
            )
          end,
          'live_questions_count', coalesce(question_stats.questions_count, 0),
          'live_duration_seconds', coalesce(question_stats.duration_seconds, 0),
          'participants_count',
          coalesce(participation_stats.participants_count, 0)
        ) as contest_payload
    from public.contests
    left join public.categories on categories.id = contests.category_id
    left join lateral (
      select
        count(questions.id)::int as questions_count,
        coalesce(sum(greatest(coalesce(questions.time_limit, 0), 0)), 0)::int
          as duration_seconds
      from public.questions
      where questions.contest_id = contests.id
    ) question_stats on true
    left join lateral (
      select count(participations.id)::int as participants_count
      from public.participations
      where participations.contest_id = contests.id
    ) participation_stats on true
    where (
        (
          coalesce(contests.is_live, false) = false
          and contests.status = 'active'
          and contests.ends_at > now()
        )
        or (
          coalesce(contests.is_live, false) = true
          and (
            (
              coalesce(contests.status, 'active') not in (
                'inactive',
                'ended',
                'completed',
                'finished'
              )
              and coalesce(contests.live_status, 'scheduled') not in (
                'ended',
                'completed',
                'finished'
              )
            )
            or date(coalesce(contests.live_starts_at, contests.ends_at))
              = date(now())
          )
        )
      )
      and (
        coalesce(array_length(contests.allowed_player_plan_keys, 1), 0) = 0
        or user_plan_key = any(contests.allowed_player_plan_keys)
      )
  ) visible_contests;

  select coalesce(jsonb_agg(live_quiz_registrations.contest_id), '[]'::jsonb)
  into registered_live_quiz_ids
  from public.live_quiz_registrations
  where live_quiz_registrations.user_id = current_user_id
    and live_quiz_registrations.status = 'registered';

  select coalesce(jsonb_agg(participations.contest_id), '[]'::jsonb)
  into participated_contest_ids
  from public.participations
  where participations.user_id = current_user_id;

  select count(*)::int
  into unread_count
  from public.notifications
  where notifications.user_id = current_user_id
    and notifications.is_read = false;

  return jsonb_build_object(
    'server_now', now(),
    'profile', profile_payload,
    'active_subscription', subscription_payload,
    'contests', contests_payload,
    'registered_live_quiz_ids', registered_live_quiz_ids,
    'participated_contest_ids', participated_contest_ids,
    'unread_notifications_count', unread_count
  );
end;
$$;

grant execute on function public.get_mobile_home_bootstrap() to authenticated;

notify pgrst, 'reload schema';
