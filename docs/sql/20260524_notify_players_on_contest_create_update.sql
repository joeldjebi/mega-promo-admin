-- MegaPromo - Notifications joueurs creation/mise a jour jeux
-- A executer dans Supabase SQL Editor.
-- Cree des notifications in-app pour tous les joueurs quand un jeu actif est
-- cree ou quand ses informations importantes sont mises a jour.
-- Le push systeme iOS/Android est envoye par l'admin web via l'Edge Function
-- send-push-notifications avec audience = players.

grant usage on schema public to authenticated;
grant select on public.users to authenticated;
grant select, insert on public.notifications to authenticated;

alter table public.notifications enable row level security;
alter table public.users enable row level security;

create or replace function public.notify_players_on_active_contest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_insert boolean := tg_op = 'INSERT';
  became_active boolean := tg_op = 'UPDATE'
    and coalesce(old.status, '') <> 'active'
    and new.status = 'active';
  active_update boolean := tg_op = 'UPDATE'
    and coalesce(old.status, '') = 'active'
    and new.status = 'active'
    and (
      coalesce(old.title, '') is distinct from coalesce(new.title, '')
      or coalesce(old.description, '') is distinct from coalesce(new.description, '')
      or coalesce(old.image_url, '') is distinct from coalesce(new.image_url, '')
      or coalesce(old.prize_description, '') is distinct from coalesce(new.prize_description, '')
      or coalesce(old.prize_value, 0) is distinct from coalesce(new.prize_value, 0)
      or coalesce(old.starts_at, 'epoch'::timestamptz) is distinct from coalesce(new.starts_at, 'epoch'::timestamptz)
      or coalesce(old.ends_at, 'epoch'::timestamptz) is distinct from coalesce(new.ends_at, 'epoch'::timestamptz)
      or coalesce(old.live_starts_at, 'epoch'::timestamptz) is distinct from coalesce(new.live_starts_at, 'epoch'::timestamptz)
      or coalesce(old.live_status, '') is distinct from coalesce(new.live_status, '')
      or coalesce(old.is_live, false) is distinct from coalesce(new.is_live, false)
    );
  notification_source text;
  notification_title text;
  notification_body text;
  notification_type text;
begin
  if new.status <> 'active' then
    return new;
  end if;

  if not (is_insert or became_active or active_update) then
    return new;
  end if;

  notification_source := case
    when active_update then 'contest_auto_update'
    else 'contest_auto_publish'
  end;

  notification_type := case
    when coalesce(new.is_live, false) then 'live_quiz'
    else 'contest'
  end;

  notification_title := case
    when active_update and coalesce(new.is_live, false) then 'Quiz Live mis a jour'
    when active_update then 'Jeu mis a jour'
    when coalesce(new.is_live, false) then 'Nouveau Quiz Live'
    else 'Nouveau jeu disponible'
  end;

  notification_body := case
    when active_update then 'Le jeu "' || new.title || '" a ete mis a jour.'
    when coalesce(new.is_live, false) then 'Un nouveau Quiz Live est disponible : ' || new.title
    else 'Un nouveau concours est disponible : ' || new.title
  end;

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
    notification_title,
    notification_body,
    notification_type,
    false,
    jsonb_build_object(
      'contest_id', new.id,
      'contestId', new.id,
      'type', notification_type,
      'source', notification_source,
      'is_live', coalesce(new.is_live, false)
    ),
    now()
  from public.users
  where coalesce(users.is_active, true) = true
    and coalesce(users.role, 'player') = 'player'
    and (
      active_update
      or not exists (
        select 1
        from public.notifications existing
        where existing.user_id = users.id
          and existing.type = notification_type
          and existing.data ->> 'contest_id' = new.id::text
          and existing.data ->> 'source' = notification_source
      )
    );

  return new;
end;
$$;

drop trigger if exists contests_notify_players_on_active on public.contests;
create trigger contests_notify_players_on_active
after insert or update of
  status,
  title,
  description,
  image_url,
  prize_description,
  prize_value,
  starts_at,
  ends_at,
  is_live,
  live_starts_at,
  live_status
on public.contests
for each row
execute function public.notify_players_on_active_contest();
