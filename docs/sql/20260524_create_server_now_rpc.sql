-- MegaPromo - Horloge serveur pour synchro mobile
-- A executer dans Supabase SQL Editor.
-- Permet aux apps mobiles de synchroniser leurs countdowns QL sur l'heure DB.

create or replace function public.server_now()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select now();
$$;

grant execute on function public.server_now() to anon, authenticated;
