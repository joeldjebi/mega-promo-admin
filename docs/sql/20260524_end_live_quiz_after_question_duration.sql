-- MegaPromo - Terminer un Quiz Live des que ses questions sont terminees
-- A executer apres docs/sql/20260521_create_live_quiz_system.sql
-- Le statut passe a ended selon live_starts_at + somme des time_limit.

create or replace function public.live_quiz_questions_ready(p_contest_id uuid)
returns bool
language sql
security definer
set search_path = public
as $$
  select count(*) >= 5
  from (
    select id
    from public.questions
    where questions.contest_id = p_contest_id
      and (
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
  ) valid_questions;
$$;

create or replace function public.process_live_quiz_events()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  waiting_count integer := 0;
  playing_count integer := 0;
  ended_count integer := 0;
  h1_count integer := 0;
  h5_count integer := 0;
begin
  update public.contests
  set live_status = 'waiting'
  where coalesce(is_live, false) = true
    and live_status = 'scheduled'
    and live_starts_at is not null
    and public.live_quiz_questions_ready(contests.id)
    and now() >= live_starts_at - interval '5 minutes'
    and now() < live_starts_at;
  get diagnostics waiting_count = row_count;

  update public.contests
  set
    live_status = 'playing',
    current_question_index = greatest(current_question_index, 1),
    question_started_at = coalesce(question_started_at, live_starts_at, now())
  where coalesce(is_live, false) = true
    and live_status in ('scheduled', 'waiting')
    and live_starts_at is not null
    and public.live_quiz_questions_ready(contests.id)
    and now() >= live_starts_at
    and now() < coalesce(
      (
        select contests.live_starts_at
          + (greatest(coalesce(sum(questions.time_limit), 0), 1)::text || ' seconds')::interval
        from public.questions
        where questions.contest_id = contests.id
      ),
      contests.ends_at,
      contests.live_starts_at + interval '1 hour'
    );
  get diagnostics playing_count = row_count;

  update public.contests
  set
    live_status = 'ended',
    status = case when status = 'active' then 'inactive' else status end,
    ends_at = least(
      coalesce(ends_at, now()),
      coalesce(
        (
          select contests.live_starts_at
            + (greatest(coalesce(sum(questions.time_limit), 0), 1)::text || ' seconds')::interval
          from public.questions
          where questions.contest_id = contests.id
        ),
        coalesce(ends_at, now())
      )
    )
  where coalesce(is_live, false) = true
    and live_status <> 'ended'
    and coalesce(
      (
        select contests.live_starts_at
          + (greatest(coalesce(sum(questions.time_limit), 0), 1)::text || ' seconds')::interval
        from public.questions
        where questions.contest_id = contests.id
      ),
      contests.ends_at,
      contests.live_starts_at + interval '1 hour'
    ) <= now();
  get diagnostics ended_count = row_count;

  insert into public.notifications (
    user_id,
    title,
    body,
    type,
    is_read,
    data,
    created_at
  )
  select
    live_quiz_registrations.user_id,
    'Quiz Live dans 1 heure',
    'Prepare-toi : "' || contests.title || '" commence bientot.',
    'live_quiz_reminder',
    false,
    jsonb_build_object(
      'contest_id', contests.id,
      'contestId', contests.id,
      'type', 'live_quiz_reminder',
      'source', 'live_quiz_h1'
    ),
    now()
  from public.live_quiz_registrations
  join public.contests on contests.id = live_quiz_registrations.contest_id
  where live_quiz_registrations.status = 'registered'
    and live_quiz_registrations.reminder_h1_sent_at is null
    and contests.live_starts_at is not null
    and coalesce(contests.live_status, 'scheduled') <> 'ended'
    and now() >= contests.live_starts_at - interval '1 hour'
    and now() < contests.live_starts_at - interval '5 minutes';
  get diagnostics h1_count = row_count;

  update public.live_quiz_registrations
  set reminder_h1_sent_at = now()
  from public.contests
  where contests.id = live_quiz_registrations.contest_id
    and live_quiz_registrations.status = 'registered'
    and live_quiz_registrations.reminder_h1_sent_at is null
    and contests.live_starts_at is not null
    and coalesce(contests.live_status, 'scheduled') <> 'ended'
    and now() >= contests.live_starts_at - interval '1 hour'
    and now() < contests.live_starts_at - interval '5 minutes';

  insert into public.notifications (
    user_id,
    title,
    body,
    type,
    is_read,
    data,
    created_at
  )
  select
    live_quiz_registrations.user_id,
    'Entre en salle d''attente',
    '"' || contests.title || '" commence dans moins de 5 minutes.',
    'live_quiz_waiting',
    false,
    jsonb_build_object(
      'contest_id', contests.id,
      'contestId', contests.id,
      'type', 'live_quiz_waiting',
      'source', 'live_quiz_h5'
    ),
    now()
  from public.live_quiz_registrations
  join public.contests on contests.id = live_quiz_registrations.contest_id
  where live_quiz_registrations.status = 'registered'
    and live_quiz_registrations.reminder_h5_sent_at is null
    and contests.live_starts_at is not null
    and coalesce(contests.live_status, 'scheduled') <> 'ended'
    and now() >= contests.live_starts_at - interval '5 minutes'
    and now() < contests.live_starts_at;
  get diagnostics h5_count = row_count;

  update public.live_quiz_registrations
  set reminder_h5_sent_at = now()
  from public.contests
  where contests.id = live_quiz_registrations.contest_id
    and live_quiz_registrations.status = 'registered'
    and live_quiz_registrations.reminder_h5_sent_at is null
    and contests.live_starts_at is not null
    and coalesce(contests.live_status, 'scheduled') <> 'ended'
    and now() >= contests.live_starts_at - interval '5 minutes'
    and now() < contests.live_starts_at;

  return jsonb_build_object(
    'waiting', waiting_count,
    'playing', playing_count,
    'ended', ended_count,
    'reminders_h1', h1_count,
    'reminders_h5', h5_count
  );
end;
$$;

grant execute on function public.process_live_quiz_events() to authenticated, service_role;

notify pgrst, 'reload schema';
