-- MegaPromo - App update configuration
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet de recommander ou forcer une mise a jour app
-- depuis une configuration geree en base.

grant usage on schema public to anon, authenticated;

create table if not exists public.app_update_config (
  key text primary key default 'main',
  minimum_android_build int4 not null default 1,
  latest_android_build int4 not null default 1,
  minimum_ios_build int4 not null default 1,
  latest_ios_build int4 not null default 1,
  android_store_url text,
  ios_store_url text,
  title text not null default 'Mise à jour disponible',
  message text not null default 'Une nouvelle version de MegaPromo est disponible.',
  force_update bool not null default false,
  is_active bool not null default true,
  updated_at timestamptz not null default now()
);

grant select on public.app_update_config to anon, authenticated;
grant insert, update, delete on public.app_update_config to authenticated;

alter table public.app_update_config enable row level security;

drop policy if exists app_update_config_players_select
on public.app_update_config;
create policy app_update_config_players_select
on public.app_update_config
for select
to anon, authenticated
using (is_active = true);

drop policy if exists app_update_config_admin_all
on public.app_update_config;
create policy app_update_config_admin_all
on public.app_update_config
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

insert into public.app_update_config (
  key,
  minimum_android_build,
  latest_android_build,
  minimum_ios_build,
  latest_ios_build,
  android_store_url,
  ios_store_url,
  title,
  message,
  force_update,
  is_active
)
values (
  'main',
  1,
  1,
  1,
  1,
  null,
  null,
  'Mise à jour disponible',
  'Une nouvelle version de MegaPromo est disponible avec des améliorations importantes.',
  false,
  true
)
on conflict (key) do update set
  updated_at = now();

notify pgrst, 'reload schema';
