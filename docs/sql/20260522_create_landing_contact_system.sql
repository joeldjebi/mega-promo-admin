-- MegaPromo - Landing contact and WhatsApp settings
-- A executer dans Supabase SQL Editor.
-- Script idempotent : configure le contact public de la landing, le numero
-- WhatsApp et stocke les messages envoyes par les visiteurs/joueurs.

grant usage on schema public to anon, authenticated;

create table if not exists public.landing_contact_settings (
  key text primary key default 'main',
  whatsapp_number text not null default '2250000000000',
  whatsapp_message text not null default 'Bonjour MegaPromo, j''ai besoin d''informations.',
  email text not null default 'contact@megapromo.ci',
  updated_at timestamptz not null default now()
);

create table if not exists public.landing_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  subject text,
  message text not null,
  source text not null default 'landing',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

grant select on public.landing_contact_settings to anon, authenticated;
grant insert on public.landing_contact_messages to anon, authenticated;
grant select, insert, update, delete on public.landing_contact_settings to authenticated;
grant select, update, delete on public.landing_contact_messages to authenticated;

alter table public.landing_contact_settings enable row level security;
alter table public.landing_contact_messages enable row level security;

drop policy if exists landing_contact_settings_public_select
on public.landing_contact_settings;
create policy landing_contact_settings_public_select
on public.landing_contact_settings
for select
to anon, authenticated
using (true);

drop policy if exists landing_contact_settings_admin_all
on public.landing_contact_settings;
create policy landing_contact_settings_admin_all
on public.landing_contact_settings
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists landing_contact_messages_public_insert
on public.landing_contact_messages;
create policy landing_contact_messages_public_insert
on public.landing_contact_messages
for insert
to anon, authenticated
with check (
  char_length(trim(name)) >= 2
  and char_length(trim(message)) >= 3
);

drop policy if exists landing_contact_messages_admin_select
on public.landing_contact_messages;
create policy landing_contact_messages_admin_select
on public.landing_contact_messages
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists landing_contact_messages_admin_update
on public.landing_contact_messages;
create policy landing_contact_messages_admin_update
on public.landing_contact_messages
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists landing_contact_messages_admin_delete
on public.landing_contact_messages;
create policy landing_contact_messages_admin_delete
on public.landing_contact_messages
for delete
to authenticated
using (public.current_user_is_admin());

insert into public.landing_contact_settings (
  key,
  whatsapp_number,
  whatsapp_message,
  email
)
values (
  'main',
  '2250000000000',
  'Bonjour MegaPromo, j''ai besoin d''informations.',
  'contact@megapromo.ci'
)
on conflict (key) do update set
  whatsapp_number = coalesce(
    nullif(public.landing_contact_settings.whatsapp_number, ''),
    excluded.whatsapp_number
  ),
  whatsapp_message = coalesce(
    nullif(public.landing_contact_settings.whatsapp_message, ''),
    excluded.whatsapp_message
  ),
  email = coalesce(
    nullif(public.landing_contact_settings.email, ''),
    excluded.email
  ),
  updated_at = now();
