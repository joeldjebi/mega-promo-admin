-- MegaPromo Web - Partner contest submission workflow
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet au partenaire connecte de creer ses concours en
-- attente de validation SA, puis notifie automatiquement les Super Admins.

grant usage on schema public to authenticated;

grant select, insert, update on public.contests to authenticated;
grant select on public.partners to authenticated;
grant select on public.categories to authenticated;
grant select on public.contest_types to authenticated;
grant select, insert on public.notifications to authenticated;
grant select on public.users to authenticated;

alter table public.contests enable row level security;
alter table public.partners enable row level security;
alter table public.categories enable row level security;
alter table public.contest_types enable row level security;
alter table public.notifications enable row level security;
alter table public.users enable row level security;

drop policy if exists contests_partner_insert_pending_own on public.contests;
create policy contests_partner_insert_pending_own
on public.contests
for insert
to authenticated
with check (
  status = 'pending'
  and coalesce(is_boosted, false) = false
  and partner_id in (
    select partners.id
    from public.partners
    where coalesce(partners.is_active, true) = true
      and coalesce(partners.is_validated, false) = true
      and (
        partners.user_id = auth.uid()
        or lower(partners.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

drop policy if exists contests_partner_update_pending_own on public.contests;
create policy contests_partner_update_pending_own
on public.contests
for update
to authenticated
using (
  status = 'pending'
  and partner_id in (
    select partners.id
    from public.partners
    where partners.user_id = auth.uid()
      or lower(partners.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  status = 'pending'
  and coalesce(is_boosted, false) = false
  and partner_id in (
    select partners.id
    from public.partners
    where partners.user_id = auth.uid()
      or lower(partners.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

create or replace function public.notify_admins_about_partner_contest(
  p_contest_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  contest_record public.contests%rowtype;
  partner_name text;
  notification_payload jsonb;
  inserted_count integer := 0;
begin
  select *
  into contest_record
  from public.contests
  where id = p_contest_id
  limit 1;

  if contest_record.id is null then
    raise log '[MegaPromo][partner_contest_notification] contest_not_found payload=%',
      jsonb_build_object('contest_id', p_contest_id);
    return 0;
  end if;

  if contest_record.partner_id is null then
    raise log '[MegaPromo][partner_contest_notification] skipped_no_partner payload=%',
      jsonb_build_object('contest_id', contest_record.id, 'status', contest_record.status);
    return 0;
  end if;

  if contest_record.status <> 'pending' then
    raise log '[MegaPromo][partner_contest_notification] skipped_not_pending payload=%',
      jsonb_build_object(
        'contest_id', contest_record.id,
        'partner_id', contest_record.partner_id,
        'status', contest_record.status
      );
    return 0;
  end if;

  select company_name
  into partner_name
  from public.partners
  where id = contest_record.partner_id
  limit 1;

  notification_payload := jsonb_build_object(
    'title', 'Concours partenaire à valider',
    'body', coalesce(partner_name, 'Un partenaire') || ' a soumis le concours "' || contest_record.title || '".',
    'type', 'partner_contest_review',
    'contest_id', contest_record.id,
    'contestId', contest_record.id,
    'partner_id', contest_record.partner_id,
    'source', 'partner_contest_submission'
  );

  raise log '[MegaPromo][partner_contest_notification] sending payload=%',
    notification_payload;
  raise notice '[MegaPromo][partner_contest_notification] sending payload=%',
    notification_payload;

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
    notification_payload ->> 'title',
    notification_payload ->> 'body',
    notification_payload ->> 'type',
    false,
    jsonb_build_object(
      'contest_id', notification_payload ->> 'contest_id',
      'contestId', notification_payload ->> 'contestId',
      'partner_id', notification_payload ->> 'partner_id',
      'type', notification_payload ->> 'type',
      'source', notification_payload ->> 'source'
    ),
    now()
  from public.users
  where users.role in ('admin', 'super-admin', 'super_admin')
    and coalesce(users.is_active, true) = true
    and not exists (
      select 1
      from public.notifications existing
      where existing.user_id = users.id
        and existing.type = 'partner_contest_review'
        and existing.data ->> 'contest_id' = contest_record.id::text
        and existing.data ->> 'source' = 'partner_contest_submission'
    );

  get diagnostics inserted_count = row_count;
  raise log '[MegaPromo][partner_contest_notification] response=%',
    jsonb_build_object(
      'contest_id', contest_record.id,
      'partner_id', contest_record.partner_id,
      'inserted_count', inserted_count,
      'message',
        case
          when inserted_count > 0 then 'notification_created'
          else 'no_admin_or_already_notified'
        end
    );
  raise notice '[MegaPromo][partner_contest_notification] response=%',
    jsonb_build_object(
      'contest_id', contest_record.id,
      'partner_id', contest_record.partner_id,
      'inserted_count', inserted_count,
      'message',
        case
          when inserted_count > 0 then 'notification_created'
          else 'no_admin_or_already_notified'
        end
    );
  return inserted_count;
end;
$$;

grant execute on function public.notify_admins_about_partner_contest(uuid) to authenticated;

create or replace function public.notify_admins_on_partner_contest_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.partner_id is null then
    return new;
  end if;

  if new.status <> 'pending' then
    return new;
  end if;

  if tg_op = 'UPDATE' and coalesce(old.status, '') = 'pending' then
    return new;
  end if;

  perform public.notify_admins_about_partner_contest(new.id);

  return new;
end;
$$;

drop trigger if exists contests_notify_admins_on_partner_submission on public.contests;
create trigger contests_notify_admins_on_partner_submission
after insert or update of status
on public.contests
for each row
execute function public.notify_admins_on_partner_contest_submission();

-- Rattrapage pour les concours partenaires deja crees en attente avant
-- l'installation ou la correction du trigger.
with notified as (
  select public.notify_admins_about_partner_contest(contests.id) as inserted_count
  from public.contests
  where contests.partner_id is not null
    and contests.status = 'pending'
)
select coalesce(sum(inserted_count), 0) as admin_notifications_created
from notified;
