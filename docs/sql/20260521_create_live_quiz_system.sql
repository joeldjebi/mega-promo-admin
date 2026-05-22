-- MegaPromo - Live quiz MVP
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute le mode Quiz Live, les inscriptions, la salle
-- d'attente et les reponses live avec controle d'acces par forfait joueur.

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.contests to authenticated;

alter table public.contests
add column if not exists is_live bool not null default false,
add column if not exists live_starts_at timestamptz,
add column if not exists live_status varchar not null default 'scheduled',
add column if not exists registered_count int4 not null default 0,
add column if not exists connected_count int4 not null default 0,
add column if not exists current_question_index int4 not null default 0,
add column if not exists question_started_at timestamptz,
add column if not exists allowed_player_plan_keys text[] default array[]::text[];

alter table public.participations
add column if not exists response_time_ms int4[] default array[]::int4[],
add column if not exists is_live_session bool not null default false;

create table if not exists public.live_quiz_registrations (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status varchar not null default 'registered',
  registered_at timestamptz not null default now(),
  reminder_h1_sent_at timestamptz,
  reminder_h5_sent_at timestamptz,
  unique (contest_id, user_id)
);

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_waiting_room_at timestamptz not null default now(),
  is_connected bool not null default true,
  last_ping_at timestamptz not null default now(),
  current_question_index int4 not null default 0,
  score_live int4 not null default 0,
  rank_live int4 not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contest_id, user_id)
);

create table if not exists public.live_answers (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  answer varchar not null,
  is_correct bool not null default false,
  response_time_ms int4 not null default 0,
  points_awarded int4 not null default 0,
  answered_at timestamptz not null default now(),
  unique (contest_id, question_id, user_id)
);

create index if not exists live_quiz_registrations_contest_idx
on public.live_quiz_registrations(contest_id);

create index if not exists live_sessions_contest_score_idx
on public.live_sessions(contest_id, score_live desc, last_ping_at desc);

create index if not exists live_answers_contest_user_idx
on public.live_answers(contest_id, user_id);

grant select, insert, update on public.live_quiz_registrations to authenticated, service_role;
grant select, insert, update on public.live_sessions to authenticated, service_role;
grant select, insert on public.live_answers to authenticated, service_role;

alter table public.contests enable row level security;
alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.live_quiz_registrations enable row level security;
alter table public.live_sessions enable row level security;
alter table public.live_answers enable row level security;

drop policy if exists contests_admin_delete_live_quiz on public.contests;
create policy contests_admin_delete_live_quiz
on public.contests
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists contests_players_select_live_quiz_recent on public.contests;
create policy contests_players_select_live_quiz_recent
on public.contests
for select
to authenticated
using (
  public.current_user_is_admin()
  or status = 'active'
  or (
    coalesce(is_live, false) = true
    and (
      live_status = 'ended'
      or status in ('inactive', 'ended', 'completed', 'finished')
    )
    and coalesce(ends_at, live_starts_at, created_at) >= now() - interval '24 hours'
  )
);

create or replace function public.prevent_multiple_open_live_quizzes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_live, false) = false then
    return new;
  end if;

  if coalesce(new.live_status, 'scheduled') = 'ended'
    or coalesce(new.status, 'active') in ('inactive', 'ended', 'completed', 'finished')
  then
    return new;
  end if;

  if exists (
    select 1
    from public.contests existing
    where existing.id <> new.id
      and coalesce(existing.is_live, false) = true
      and coalesce(existing.live_status, 'scheduled') <> 'ended'
      and coalesce(existing.status, 'active') not in ('inactive', 'ended', 'completed', 'finished')
  ) then
    raise exception 'Un Quiz Live est deja ouvert. Termine le Quiz Live actuel avant d''en creer un nouveau.';
  end if;

  return new;
end;
$$;

drop trigger if exists contests_prevent_multiple_open_live_quizzes on public.contests;
create trigger contests_prevent_multiple_open_live_quizzes
before insert or update of is_live, live_status, status
on public.contests
for each row
execute function public.prevent_multiple_open_live_quizzes();

create or replace function public.player_plan_key_for_user(p_user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.player_subscriptions
      join public.player_plans on player_plans.id = player_subscriptions.plan_id
      where player_subscriptions.user_id = p_user_id
        and player_subscriptions.status = 'active'
        and player_subscriptions.expires_at > now()
        and lower(player_plans.key) = 'vip'
    ) then 'vip'
    when exists (
      select 1
      from public.player_subscriptions
      join public.player_plans on player_plans.id = player_subscriptions.plan_id
      where player_subscriptions.user_id = p_user_id
        and player_subscriptions.status = 'active'
        and player_subscriptions.expires_at > now()
        and lower(player_plans.key) = 'premium'
    ) then 'premium'
    else 'free'
  end;
$$;

create or replace function public.user_can_access_contest(
  p_user_id uuid,
  p_contest_id uuid
)
returns bool
language sql
security definer
set search_path = public
as $$
  select coalesce(cardinality(contests.allowed_player_plan_keys), 0) = 0
    or public.player_plan_key_for_user(p_user_id) = any(contests.allowed_player_plan_keys)
  from public.contests
  where contests.id = p_contest_id;
$$;

create or replace function public.register_live_quiz(
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

  if contest_record.live_starts_at is null or contest_record.live_starts_at <= now() then
    raise exception 'La porte est fermee pour ce Quiz Live.';
  end if;

  if coalesce(contest_record.status, 'active') in ('inactive', 'ended', 'completed', 'finished')
    or coalesce(contest_record.live_status, 'scheduled') = 'ended'
  then
    raise exception 'Les inscriptions sont fermees.';
  end if;

  if not public.user_can_access_contest(current_user_id, p_contest_id) then
    raise exception 'Ton forfait ne permet pas de participer a ce Quiz Live.';
  end if;

  insert into public.live_quiz_registrations (
    contest_id,
    user_id,
    status,
    registered_at
  )
  values (
    p_contest_id,
    current_user_id,
    'registered',
    now()
  )
  on conflict (contest_id, user_id) do update set
    status = 'registered';

  update public.contests
  set registered_count = (
    select count(*)::int
    from public.live_quiz_registrations
    where contest_id = p_contest_id
      and status = 'registered'
  )
  where id = p_contest_id;

  return jsonb_build_object('registered', true, 'contest_id', p_contest_id);
end;
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

  if contest_record.live_starts_at is null
    or now() < contest_record.live_starts_at - interval '5 minutes'
    or now() >= contest_record.live_starts_at
  then
    raise exception 'La salle d''attente ouvre 5 minutes avant le debut.';
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

create or replace function public.can_view_live_sessions_for_contest(
  p_contest_id uuid,
  p_user_id uuid
)
returns bool
language sql
security definer
set search_path = public
as $$
  select p_user_id is not null
    and (
      public.current_user_is_admin()
      or exists (
        select 1
        from public.live_quiz_registrations
        where live_quiz_registrations.contest_id = p_contest_id
          and live_quiz_registrations.user_id = p_user_id
          and live_quiz_registrations.status = 'registered'
      )
    );
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
    and now() >= live_starts_at
    and now() < coalesce(ends_at, live_starts_at + interval '1 hour');
  get diagnostics playing_count = row_count;

  update public.contests
  set
    live_status = 'ended',
    status = case when status = 'active' then 'inactive' else status end
  where coalesce(is_live, false) = true
    and live_status <> 'ended'
    and coalesce(ends_at, live_starts_at + interval '1 hour') <= now();
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

do $$
begin
  begin
    create extension if not exists pg_cron with schema extensions;
  exception
    when others then
      null;
  end;

  begin
    if to_regclass('cron.job') is not null then
      perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'megapromo-process-live-quiz-events';
    end if;
  exception
    when others then
      null;
  end;

  begin
    perform cron.schedule(
      'megapromo-process-live-quiz-events',
      '* * * * *',
      'select public.process_live_quiz_events();'
    );
  exception
    when others then
      null;
  end;
end;
$$;

drop policy if exists live_quiz_registrations_select_own on public.live_quiz_registrations;
create policy live_quiz_registrations_select_own
on public.live_quiz_registrations
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists live_sessions_select_contest on public.live_sessions;
create policy live_sessions_select_contest
on public.live_sessions
for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_view_live_sessions_for_contest(contest_id, auth.uid())
);

drop policy if exists live_answers_select_own on public.live_answers;
create policy live_answers_select_own
on public.live_answers
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

grant execute on function public.player_plan_key_for_user(uuid) to authenticated;
grant execute on function public.user_can_access_contest(uuid, uuid) to authenticated;
grant execute on function public.register_live_quiz(uuid) to authenticated;
grant execute on function public.join_live_quiz_waiting_room(uuid) to authenticated;
grant execute on function public.can_view_live_sessions_for_contest(uuid, uuid) to authenticated;
grant execute on function public.process_live_quiz_events() to authenticated, service_role;
