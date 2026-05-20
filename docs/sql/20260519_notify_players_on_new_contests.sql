-- MegaPromo - Notify players when a contest becomes available
-- A executer dans Supabase SQL Editor.
-- Script idempotent : active Realtime pour les concours/notifications et cree
-- automatiquement des notifications in-app pour les evenements importants :
-- - nouveau concours actif
-- - abonnement joueur valide
-- - concours termine
-- - gagnant officiellement declare

grant usage on schema public to authenticated;
grant select on public.contests to authenticated;
grant select, insert, update on public.notifications to authenticated;
grant select on public.users to authenticated;
grant select on public.participations to authenticated;
grant select on public.player_plans to authenticated;
grant select on public.player_subscriptions to authenticated;
grant select on public.partner_subscriptions to authenticated;
grant select on public.partners to authenticated;
grant select on public.categories to authenticated;
grant select on public.contest_types to authenticated;
grant select on public.winners to authenticated;

alter table public.contests enable row level security;
alter table public.notifications enable row level security;
alter table public.users enable row level security;
alter table public.participations enable row level security;
alter table public.player_plans enable row level security;
alter table public.player_subscriptions enable row level security;
alter table public.partner_subscriptions enable row level security;
alter table public.partners enable row level security;
alter table public.categories enable row level security;
alter table public.contest_types enable row level security;
alter table public.winners enable row level security;

do $$
begin
  begin
    alter publication supabase_realtime add table public.contests;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.notifications;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.users;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.partners;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.participations;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.winners;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.player_subscriptions;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.partner_subscriptions;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.categories;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.contest_types;
  exception
    when duplicate_object then null;
  end;
end;
$$;

drop policy if exists notifications_players_select_own_realtime on public.notifications;
create policy notifications_players_select_own_realtime
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_players_update_own_realtime on public.notifications;
create policy notifications_players_update_own_realtime
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.notify_players_on_active_contest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'active' then
    return new;
  end if;

  if tg_op = 'UPDATE' and coalesce(old.status, '') = 'active' then
    return new;
  end if;

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
    users.id,
    'Nouveau jeu disponible',
    'Un nouveau concours est disponible : ' || new.title,
    'contest',
    false,
    jsonb_build_object(
      'contest_id', new.id,
      'contestId', new.id,
      'type', 'contest',
      'source', 'contest_auto_publish'
    ),
    now()
  from public.users
  where coalesce(users.is_active, true) = true
    and coalesce(users.role, 'player') = 'player'
    and not exists (
      select 1
      from public.notifications existing
      where existing.user_id = users.id
        and existing.type = 'contest'
        and existing.data ->> 'contest_id' = new.id::text
        and existing.data ->> 'source' = 'contest_auto_publish'
    );

  return new;
end;
$$;

drop trigger if exists contests_notify_players_on_active on public.contests;
create trigger contests_notify_players_on_active
after insert or update of status
on public.contests
for each row
execute function public.notify_players_on_active_contest();

create or replace function public.notify_player_subscription_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_name text;
begin
  if new.status <> 'active' then
    return new;
  end if;

  if tg_op = 'UPDATE' and coalesce(old.status, '') = 'active' then
    return new;
  end if;

  select name
  into plan_name
  from public.player_plans
  where id = new.plan_id
  limit 1;

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
    new.user_id,
    'Abonnement valide',
    'Ton forfait ' || coalesce(plan_name, 'MegaPromo') || ' est maintenant actif.',
    'subscription',
    false,
    jsonb_build_object(
      'subscription_id', new.id,
      'plan_id', new.plan_id,
      'type', 'subscription',
      'source', 'player_subscription_approved'
    ),
    now()
  where not exists (
    select 1
    from public.notifications existing
    where existing.user_id = new.user_id
      and existing.type = 'subscription'
      and existing.data ->> 'subscription_id' = new.id::text
      and existing.data ->> 'source' = 'player_subscription_approved'
  );

  return new;
end;
$$;

drop trigger if exists player_subscriptions_notify_approved on public.player_subscriptions;
create trigger player_subscriptions_notify_approved
after insert or update of status
on public.player_subscriptions
for each row
execute function public.notify_player_subscription_approved();

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
  closed_count integer;
begin
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
      where jobname = 'megapromo-close-finished-contests';
    end if;
  exception
    when others then
      null;
  end;

  begin
    perform cron.schedule(
      'megapromo-close-finished-contests',
      '*/5 * * * *',
      'select public.close_finished_contests_and_notify();'
    );
  exception
    when others then
      null;
  end;
end;
$$;

create or replace function public.notify_player_declared_winner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contest_title text;
  prize_label text;
begin
  if new.user_id is null then
    return new;
  end if;

  if new.status not in ('sent', 'received') then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and coalesce(old.status, '') in ('sent', 'received')
    and old.user_id = new.user_id
  then
    return new;
  end if;

  select title
  into contest_title
  from public.contests
  where id = new.contest_id
  limit 1;

  prize_label := coalesce(new.prize_description, 'un gain MegaPromo');

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
    new.user_id,
    'Tu as gagne',
    'Felicitations ! Tu es declare gagnant sur "' || coalesce(contest_title, 'un concours') || '" pour ' || prize_label || '.',
    'winner',
    false,
    jsonb_build_object(
      'winner_id', new.id,
      'contest_id', new.contest_id,
      'contestId', new.contest_id,
      'type', 'winner',
      'source', 'winner_declared'
    ),
    now()
  where not exists (
    select 1
    from public.notifications existing
    where existing.user_id = new.user_id
      and existing.type = 'winner'
      and existing.data ->> 'winner_id' = new.id::text
      and existing.data ->> 'source' = 'winner_declared'
  );

  return new;
end;
$$;

drop trigger if exists winners_notify_player_declared_winner on public.winners;
create trigger winners_notify_player_declared_winner
after insert or update of status
on public.winners
for each row
execute function public.notify_player_declared_winner();
