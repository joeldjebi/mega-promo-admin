-- MegaPromo - Auto generate pending winners when a contest ends
-- A executer dans Supabase SQL Editor.
-- Script idempotent : quand un concours se termine, les gagnants candidats
-- sont automatiquement ajoutes dans public.winners avec status = 'pending'.
-- Le SA garde ensuite la validation manuelle dans la page Gagnants.

grant usage on schema public to authenticated;
grant select on public.contests to authenticated;
grant select on public.participations to authenticated;
grant select, insert, update on public.winners to authenticated;

alter table public.contests enable row level security;
alter table public.participations enable row level security;
alter table public.winners enable row level security;

create or replace function public.generate_pending_winners_for_contest(
  p_contest_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  contest_record public.contests%rowtype;
  inserted_count integer;
begin
  select *
  into contest_record
  from public.contests
  where id = p_contest_id
  limit 1;

  if contest_record.id is null then
    return 0;
  end if;

  with ranked_candidates as (
    select
      participations.user_id,
      participations.score,
      participations.participated_at,
      row_number() over (
        order by
          case
            when lower(coalesce(contest_record.type, '')) in ('tirage', 'raffle', 'draw')
              then random()
            else 0
          end,
          case
            when lower(coalesce(contest_record.type, '')) in ('tirage', 'raffle', 'draw')
              then 0
            else coalesce(participations.score, 0)
          end desc,
          participations.participated_at asc nulls last
      ) as rank
    from public.participations
    where participations.contest_id = p_contest_id
      and participations.user_id is not null
      and coalesce(participations.completed, true) = true
      and not exists (
        select 1
        from public.winners existing
        where existing.contest_id = p_contest_id
          and existing.user_id = participations.user_id
      )
  ),
  inserted_winners as (
    insert into public.winners (
      user_id,
      contest_id,
      prize_description,
      prize_value,
      payment_method,
      payment_number,
      status,
      sent_at,
      created_at
    )
    select
      ranked_candidates.user_id,
      contest_record.id,
      coalesce(contest_record.prize_description, contest_record.title),
      coalesce(contest_record.prize_value, 0),
      null,
      null,
      'pending',
      null,
      now()
    from ranked_candidates
    where ranked_candidates.rank <= greatest(coalesce(contest_record.winners_count, 1), 1)
    returning id
  )
  select count(*)
  into inserted_count
  from inserted_winners;

  return inserted_count;
end;
$$;

create or replace function public.notify_players_on_contest_finished()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if coalesce(old.status, '') <> 'active' then
    return new;
  end if;

  if new.status not in ('inactive', 'ended', 'completed', 'finished') then
    return new;
  end if;

  perform public.generate_pending_winners_for_contest(new.id);

  insert into public.notifications (
    user_id,
    title,
    body,
    type,
    is_read,
    data,
    created_at
  )
  select distinct
    participations.user_id,
    'Jeu termine',
    'Le concours "' || new.title || '" est termine. Les resultats seront disponibles bientot.',
    'contest_finished',
    false,
    jsonb_build_object(
      'contest_id', new.id,
      'contestId', new.id,
      'type', 'contest_finished',
      'source', 'contest_status_finished'
    ),
    now()
  from public.participations
  where participations.contest_id = new.id
    and participations.user_id is not null
    and not exists (
      select 1
      from public.notifications existing
      where existing.user_id = participations.user_id
        and existing.type = 'contest_finished'
        and existing.data ->> 'contest_id' = new.id::text
        and existing.data ->> 'source' = 'contest_status_finished'
    );

  return new;
end;
$$;

drop trigger if exists contests_notify_players_on_finished on public.contests;
create trigger contests_notify_players_on_finished
after update of status
on public.contests
for each row
execute function public.notify_players_on_contest_finished();

create or replace function public.close_finished_contests_and_notify()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  contest_row record;
  closed_count integer := 0;
begin
  for contest_row in
    select id
    from public.contests
    where status = 'active'
      and ends_at <= now()
  loop
    perform public.generate_pending_winners_for_contest(contest_row.id);
  end loop;

  insert into public.notifications (
    user_id,
    title,
    body,
    type,
    is_read,
    data,
    created_at
  )
  select distinct
    participations.user_id,
    'Jeu termine',
    'Le concours "' || contests.title || '" est termine. Les resultats seront disponibles bientot.',
    'contest_finished',
    false,
    jsonb_build_object(
      'contest_id', contests.id,
      'contestId', contests.id,
      'type', 'contest_finished',
      'source', 'contest_status_finished'
    ),
    now()
  from public.contests
  join public.participations on participations.contest_id = contests.id
  where contests.status = 'active'
    and contests.ends_at <= now()
    and participations.user_id is not null
    and not exists (
      select 1
      from public.notifications existing
      where existing.user_id = participations.user_id
        and existing.type = 'contest_finished'
        and existing.data ->> 'contest_id' = contests.id::text
        and existing.data ->> 'source' = 'contest_status_finished'
    );

  update public.contests
  set status = 'inactive'
  where status = 'active'
    and ends_at <= now();

  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

-- Rattrapage manuel pour les concours actifs deja expires avant installation.
select public.close_finished_contests_and_notify() as closed_finished_contests;

-- Rattrapage manuel pour les concours deja termines/inactifs avant installation.
with generated as (
  select public.generate_pending_winners_for_contest(contests.id) as winners_created
  from public.contests
  where contests.ends_at <= now()
    or contests.status in ('inactive', 'ended', 'completed', 'finished')
)
select coalesce(sum(winners_created), 0) as pending_winners_created
from generated;
