-- MegaPromo - Mobile info carousel and single active device
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute les messages d'information dismissibles par
-- joueur et force une seule session device active par compte.

grant usage on schema public to authenticated;

create table if not exists public.mobile_info_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_url text,
  cta_label text,
  cta_url text,
  background_color text not null default '#F7C4AD',
  text_color text not null default '#4B1609',
  is_active bool not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  order_index int4 not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_info_message_dismissals (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.mobile_info_messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  unique (message_id, user_id)
);

alter table public.users
add column if not exists active_device_session_id text,
add column if not exists active_device_info jsonb default '{}'::jsonb,
add column if not exists active_device_seen_at timestamptz;

create index if not exists mobile_info_messages_active_idx
on public.mobile_info_messages(is_active, order_index, created_at desc);

create index if not exists mobile_info_message_dismissals_user_idx
on public.mobile_info_message_dismissals(user_id, message_id);

grant select, insert, update, delete on public.mobile_info_messages to authenticated;
grant select, insert, update on public.mobile_info_message_dismissals to authenticated;
grant update on public.users to authenticated;

alter table public.mobile_info_messages enable row level security;
alter table public.mobile_info_message_dismissals enable row level security;
alter table public.users enable row level security;

drop policy if exists mobile_info_messages_players_select_active
on public.mobile_info_messages;
create policy mobile_info_messages_players_select_active
on public.mobile_info_messages
for select
to authenticated
using (
  public.current_user_is_admin()
  or (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  )
);

drop policy if exists mobile_info_messages_admin_all
on public.mobile_info_messages;
create policy mobile_info_messages_admin_all
on public.mobile_info_messages
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists mobile_info_dismissals_players_select_own
on public.mobile_info_message_dismissals;
create policy mobile_info_dismissals_players_select_own
on public.mobile_info_message_dismissals
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists mobile_info_dismissals_players_insert_own
on public.mobile_info_message_dismissals;
create policy mobile_info_dismissals_players_insert_own
on public.mobile_info_message_dismissals
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists mobile_info_dismissals_players_update_own
on public.mobile_info_message_dismissals;
create policy mobile_info_dismissals_players_update_own
on public.mobile_info_message_dismissals
for update
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin())
with check (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists users_update_own_active_device_session
on public.users;
create policy users_update_own_active_device_session
on public.users
for update
to authenticated
using (id = auth.uid() or public.current_user_is_admin())
with check (id = auth.uid() or public.current_user_is_admin());

create or replace function public.claim_player_device_session(
  p_session_id text,
  p_device_info jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecte.';
  end if;

  update public.users
  set active_device_session_id = p_session_id,
      active_device_info = coalesce(p_device_info, '{}'::jsonb),
      active_device_seen_at = now(),
      device_info = coalesce(p_device_info, device_info, '{}'::jsonb),
      device_last_seen_at = now()
  where id = current_user_id;

  return jsonb_build_object(
    'active', true,
    'session_id', p_session_id
  );
end;
$$;

create or replace function public.validate_player_device_session(
  p_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  active_session text;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecte.';
  end if;

  select active_device_session_id
  into active_session
  from public.users
  where id = current_user_id;

  if active_session is null or active_session = p_session_id then
    update public.users
    set active_device_session_id = p_session_id,
        active_device_seen_at = now()
    where id = current_user_id;

    return jsonb_build_object('active', true);
  end if;

  return jsonb_build_object('active', false);
end;
$$;

grant execute on function public.claim_player_device_session(text, jsonb) to authenticated;
grant execute on function public.validate_player_device_session(text) to authenticated;

insert into public.mobile_info_messages (
  title,
  body,
  cta_label,
  cta_url,
  background_color,
  text_color,
  is_active,
  order_index
)
values (
  'Nouveautés MegaPromo',
  'Découvre les Quiz Live, les forfaits joueurs et les notifications importantes directement sur l’accueil.',
  'Voir les jeux',
  '/contests',
  '#F7C4AD',
  '#4B1609',
  true,
  1
)
on conflict do nothing;
