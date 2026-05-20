-- MegaPromo Web - Raffle contest type alias
-- A executer dans Supabase SQL Editor si tes concours utilisent le type "raffle".
-- Script idempotent : ajoute l'alias sans modifier les concours existants.

insert into public.contest_types (
  key,
  name,
  description,
  is_active,
  order_index
)
values (
  'raffle',
  'Tirage',
  'Participation simple avec selection de gagnants. Alias technique du type tirage.',
  true,
  2
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  order_index = excluded.order_index;
