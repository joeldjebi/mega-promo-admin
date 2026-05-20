-- MegaPromo Web - Notify partner when SA validates a contest
-- A executer dans Supabase SQL Editor.
-- Script idempotent : quand un concours partenaire passe en active, cree une
-- notification in-app pour le partenaire. Le push systeme est ensuite envoye
-- par l'app web via Edge Function lorsque le SA fait l'action.

grant usage on schema public to authenticated;
grant select on public.contests to authenticated;
grant select on public.partners to authenticated;
grant select, insert on public.notifications to authenticated;

alter table public.contests enable row level security;
alter table public.partners enable row level security;
alter table public.notifications enable row level security;

create or replace function public.notify_partner_on_contest_validation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  partner_user_id uuid;
begin
  if new.partner_id is null then
    return new;
  end if;

  if new.status <> 'active' then
    return new;
  end if;

  if tg_op = 'UPDATE' and coalesce(old.status, '') = 'active' then
    return new;
  end if;

  select user_id
  into partner_user_id
  from public.partners
  where id = new.partner_id
  limit 1;

  if partner_user_id is null then
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
    partner_user_id,
    'Concours validé',
    'Ton concours "' || new.title || '" a été validé par le Super Admin.',
    'partner_contest_approved',
    false,
    jsonb_build_object(
      'contest_id', new.id,
      'contestId', new.id,
      'partner_id', new.partner_id,
      'type', 'partner_contest_approved',
      'source', 'partner_contest_validation'
    ),
    now()
  where not exists (
    select 1
    from public.notifications existing
    where existing.user_id = partner_user_id
      and existing.type = 'partner_contest_approved'
      and existing.data ->> 'contest_id' = new.id::text
      and existing.data ->> 'source' = 'partner_contest_validation'
  );

  return new;
end;
$$;

drop trigger if exists contests_notify_partner_on_validation on public.contests;
create trigger contests_notify_partner_on_validation
after update of status
on public.contests
for each row
execute function public.notify_partner_on_contest_validation();
