-- MegaPromo - Salle d'attente Quiz Live ouverte des la reservation
-- A executer apres docs/sql/20260521_create_live_quiz_system.sql.
-- Script idempotent : permet a un joueur inscrit d'entrer en salle d'attente
-- a tout moment avant le depart du Quiz Live.

do $$
begin
  begin
    alter publication supabase_realtime add table public.contests;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_quiz_registrations;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_sessions;
  exception
    when duplicate_object then null;
  end;
end;
$$;

create or replace function public.live_quiz_questions_ready_status(
  p_contest_id uuid
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with question_stats as (
    select
      count(*) filter (
        where (
            length(trim(coalesce(question_text, ''))) >= 3
            or length(trim(coalesce(question_image_url, ''))) > 0
          )
          and (
            (
              length(trim(coalesce(option_a, ''))) > 0
              and length(trim(coalesce(option_b, ''))) > 0
              and length(trim(coalesce(option_c, ''))) > 0
              and length(trim(coalesce(option_d, ''))) > 0
            )
            or (
              length(trim(coalesce(option_a_image_url, ''))) > 0
              and length(trim(coalesce(option_b_image_url, ''))) > 0
              and length(trim(coalesce(option_c_image_url, ''))) > 0
              and length(trim(coalesce(option_d_image_url, ''))) > 0
            )
          )
          and correct_answer in ('A', 'B', 'C', 'D')
          and coalesce(time_limit, 0) > 0
          and coalesce(points, 0) > 0
      )::int as valid_questions_count,
      count(*) filter (
        where not (
          (
            length(trim(coalesce(question_text, ''))) >= 3
            or length(trim(coalesce(question_image_url, ''))) > 0
          )
          and (
            (
              length(trim(coalesce(option_a, ''))) > 0
              and length(trim(coalesce(option_b, ''))) > 0
              and length(trim(coalesce(option_c, ''))) > 0
              and length(trim(coalesce(option_d, ''))) > 0
            )
            or (
              length(trim(coalesce(option_a_image_url, ''))) > 0
              and length(trim(coalesce(option_b_image_url, ''))) > 0
              and length(trim(coalesce(option_c_image_url, ''))) > 0
              and length(trim(coalesce(option_d_image_url, ''))) > 0
            )
          )
          and correct_answer in ('A', 'B', 'C', 'D')
          and coalesce(time_limit, 0) > 0
          and coalesce(points, 0) > 0
        )
      )::int as invalid_questions_count,
      coalesce(sum(greatest(coalesce(time_limit, 0), 0)), 0)::int
        as duration_seconds
    from public.questions
    where contest_id = p_contest_id
  )
  select jsonb_build_object(
    'ready', valid_questions_count >= 5,
    'min_questions', 5,
    'valid_questions_count', valid_questions_count,
    'invalid_questions_count', invalid_questions_count,
    'duration_seconds', duration_seconds
  )
  from question_stats;
$$;

create or replace function public.join_live_quiz_waiting_room(
  p_contest_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  contest_record public.contests%rowtype;
  ready_status jsonb;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecte.';
  end if;

  select *
  into contest_record
  from public.contests
  where id = p_contest_id
  limit 1;

  if contest_record.id is null or coalesce(contest_record.is_live, false) = false then
    raise exception 'Quiz Live introuvable.';
  end if;

  if coalesce(contest_record.status, 'active') in ('inactive', 'ended', 'completed', 'finished')
    or coalesce(contest_record.live_status, 'scheduled') = 'ended'
  then
    raise exception 'Ce Quiz Live est termine.';
  end if;

  if contest_record.live_starts_at is null
    or now() >= coalesce(contest_record.ends_at, contest_record.live_starts_at + interval '1 hour')
  then
    raise exception 'La salle d''attente est fermee pour ce Quiz Live.';
  end if;

  ready_status := public.live_quiz_questions_ready_status(p_contest_id);
  if coalesce((ready_status->>'ready')::bool, false) = false then
    raise exception 'Les 5 questions du Quiz Live ne sont pas encore pretes.';
  end if;

  if not exists (
    select 1
    from public.live_quiz_registrations
    where contest_id = p_contest_id
      and user_id = current_user_id
      and status = 'registered'
  ) then
    raise exception 'Inscription requise pour entrer en salle d''attente.';
  end if;

  insert into public.live_sessions (
    contest_id,
    user_id,
    joined_waiting_room_at,
    is_connected,
    last_ping_at
  )
  values (
    p_contest_id,
    current_user_id,
    now(),
    true,
    now()
  )
  on conflict (contest_id, user_id) do update set
    is_connected = true,
    last_ping_at = now(),
    updated_at = now();

  update public.contests
  set
    live_status = case when live_status = 'scheduled' then 'waiting' else live_status end,
    connected_count = (
      select count(*)::int
      from public.live_sessions
      where contest_id = p_contest_id
        and is_connected = true
        and last_ping_at >= now() - interval '30 seconds'
    )
  where id = p_contest_id;

  return jsonb_build_object('joined', true, 'contest_id', p_contest_id);
end;
$$;

grant execute on function public.live_quiz_questions_ready_status(uuid) to authenticated;
grant execute on function public.join_live_quiz_waiting_room(uuid) to authenticated;
