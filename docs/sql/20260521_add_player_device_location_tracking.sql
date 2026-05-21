-- MegaPromo - Player device and location tracking
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute les champs de telemetry joueur et une RPC
-- securisee pour que l'app mobile mette a jour uniquement ces informations.

grant usage on schema public to authenticated;

alter table public.users
add column if not exists device_info jsonb default '{}'::jsonb,
add column if not exists location_info jsonb default '{}'::jsonb,
add column if not exists device_last_seen_at timestamptz;

create or replace function public.sync_player_device_location(
  p_device_info jsonb,
  p_location_info jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set device_info = coalesce(p_device_info, '{}'::jsonb),
      location_info = coalesce(p_location_info, '{}'::jsonb),
      device_last_seen_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.sync_player_device_location(jsonb, jsonb) to authenticated;
