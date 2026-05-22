-- MegaPromo - Player notification management
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet aux joueurs de marquer leurs notifications
-- comme lues et de supprimer uniquement leurs propres notifications.

grant usage on schema public to authenticated;
grant select, update, delete on public.notifications to authenticated;

alter table public.notifications enable row level security;

drop policy if exists notifications_players_select_own_manage on public.notifications;
create policy notifications_players_select_own_manage
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_players_update_own_manage on public.notifications;
create policy notifications_players_update_own_manage
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notifications_players_delete_own_manage on public.notifications;
create policy notifications_players_delete_own_manage
on public.notifications
for delete
to authenticated
using (user_id = auth.uid());
