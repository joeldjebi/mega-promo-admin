-- MegaPromo - Verifier que les questions QL sont pretes avant le depart
-- A executer dans Supabase SQL Editor.
-- Permet de creer/programmer un Quiz Live, mais empeche son ouverture et son
-- lancement tant que les 5 questions valides ne sont pas pretes.

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

create or replace function public.validate_live_quiz_ready_before_start()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ready_status jsonb;
begin
  if coalesce(new.is_live, false) = false then
    return new;
  end if;

  if coalesce(new.live_status, 'scheduled') = 'ended' then
    return new;
  end if;

  if new.live_starts_at is null then
    raise exception 'Un Quiz Live doit avoir une date de debut.';
  end if;

  ready_status := public.live_quiz_questions_ready_status(new.id);
  if coalesce((ready_status->>'ready')::bool, false) = false
    and coalesce(new.live_status, 'scheduled') in ('waiting', 'playing')
  then
    new.live_status := 'scheduled';
    new.current_question_index := 0;
    new.question_started_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists contests_validate_live_quiz_ready_before_start
on public.contests;
create trigger contests_validate_live_quiz_ready_before_start
before update of status, is_live, live_status, live_starts_at
on public.contests
for each row
execute function public.validate_live_quiz_ready_before_start();

create or replace function public.prevent_late_live_quiz_question_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contest_record public.contests%rowtype;
  target_contest_id uuid;
begin
  target_contest_id := case
    when tg_op = 'DELETE' then old.contest_id
    else new.contest_id
  end;

  select *
  into contest_record
  from public.contests
  where id = target_contest_id
  limit 1;

  if contest_record.id is null or coalesce(contest_record.is_live, false) = false then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if coalesce(contest_record.live_status, 'scheduled') <> 'scheduled'
    or contest_record.live_starts_at <= now()
  then
    raise exception 'Les questions du Quiz Live ne peuvent plus etre modifiees apres ouverture du live.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists questions_prevent_late_live_quiz_changes
on public.questions;
create trigger questions_prevent_late_live_quiz_changes
before insert or update or delete
on public.questions
for each row
execute function public.prevent_late_live_quiz_question_changes();

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

  return jsonb_build_object(
    'joined', true,
    'contest_id', p_contest_id,
    'questions_ready', true
  );
end;
$$;

grant execute on function public.live_quiz_questions_ready(uuid) to authenticated;
grant execute on function public.live_quiz_questions_ready_status(uuid) to authenticated;
grant execute on function public.join_live_quiz_waiting_room(uuid) to authenticated;
