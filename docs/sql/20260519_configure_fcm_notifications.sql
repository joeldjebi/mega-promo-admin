-- MegaPromo Mobile - FCM token and notifications policies
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute fcm_token et les droits nécessaires aux notifications.

alter table public.users
add column if not exists fcm_token text;

create index if not exists users_fcm_token_idx
on public.users(fcm_token)
where fcm_token is not null;

grant usage on schema public to authenticated;
grant select, update on public.users to authenticated;
grant select, update on public.notifications to authenticated;

alter table public.users enable row level security;
alter table public.notifications enable row level security;

drop policy if exists users_update_own_fcm_token on public.users;
create policy users_update_own_fcm_token
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_update_own_read_status on public.notifications;
create policy notifications_update_own_read_status
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notifications_admin_select_all on public.notifications;
create policy notifications_admin_select_all
on public.notifications
for select
to authenticated
using (public.current_user_is_admin());
