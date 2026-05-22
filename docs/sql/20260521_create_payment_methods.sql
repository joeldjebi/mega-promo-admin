-- MegaPromo - Payment methods configuration
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet au Super Admin de configurer les operateurs de
-- paiement affiches dans l'app mobile pour les souscriptions joueurs.

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  operator_key varchar not null unique,
  country varchar not null default 'Côte d''Ivoire',
  payment_url text,
  instructions text,
  proof_phone varchar,
  is_active bool default true,
  order_index int4 default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.payment_methods to authenticated;

alter table public.payment_methods enable row level security;

insert into public.payment_methods (
  name,
  operator_key,
  country,
  payment_url,
  instructions,
  proof_phone,
  is_active,
  order_index
)
values
  (
    'Wave',
    'wave',
    'Côte d''Ivoire',
    'https://pay.wave.com/m/M_ci_o6-9yu9h5hhm/c/ci/',
    'Paie avec Wave, puis envoie la preuve de paiement au numéro indiqué. Le Super Admin validera ton forfait après vérification.',
    '+225 0758754662',
    true,
    1
  ),
  (
    'Orange Money',
    'orange_money',
    'Côte d''Ivoire',
    null,
    'Effectue le paiement Orange Money selon les instructions du Super Admin, puis envoie la preuve au numéro indiqué.',
    '+225 0758754662',
    false,
    2
  ),
  (
    'MTN Money',
    'mtn_money',
    'Côte d''Ivoire',
    null,
    'Effectue le paiement MTN Money selon les instructions du Super Admin, puis envoie la preuve au numéro indiqué.',
    '+225 0758754662',
    false,
    3
  )
on conflict (operator_key) do update set
  name = excluded.name,
  country = excluded.country,
  payment_url = coalesce(public.payment_methods.payment_url, excluded.payment_url),
  instructions = coalesce(public.payment_methods.instructions, excluded.instructions),
  proof_phone = coalesce(public.payment_methods.proof_phone, excluded.proof_phone),
  order_index = excluded.order_index,
  updated_at = now();

drop policy if exists payment_methods_players_select_active on public.payment_methods;
create policy payment_methods_players_select_active
on public.payment_methods
for select
to authenticated
using (coalesce(is_active, true) = true or public.current_user_is_admin());

drop policy if exists payment_methods_admin_insert on public.payment_methods;
create policy payment_methods_admin_insert
on public.payment_methods
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists payment_methods_admin_update on public.payment_methods;
create policy payment_methods_admin_update
on public.payment_methods
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists payment_methods_admin_delete on public.payment_methods;
create policy payment_methods_admin_delete
on public.payment_methods
for delete
to authenticated
using (public.current_user_is_admin());
