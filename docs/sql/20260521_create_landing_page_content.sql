-- MegaPromo Web - Landing page content management
-- A executer dans Supabase SQL Editor.
-- Script idempotent : cree une table de contenu pour permettre au Super Admin
-- de manager tous les blocs de la landing page depuis le dashboard.

create table if not exists public.landing_page_content (
  key varchar primary key,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

grant usage on schema public to anon, authenticated;
grant select on public.landing_page_content to anon, authenticated;
grant insert, update, delete on public.landing_page_content to authenticated;

alter table public.landing_page_content enable row level security;

drop policy if exists landing_page_content_public_select on public.landing_page_content;
create policy landing_page_content_public_select
on public.landing_page_content
for select
to anon, authenticated
using (true);

drop policy if exists landing_page_content_admin_insert on public.landing_page_content;
create policy landing_page_content_admin_insert
on public.landing_page_content
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists landing_page_content_admin_update on public.landing_page_content;
create policy landing_page_content_admin_update
on public.landing_page_content
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists landing_page_content_admin_delete on public.landing_page_content;
create policy landing_page_content_admin_delete
on public.landing_page_content
for delete
to authenticated
using (public.current_user_is_admin());

insert into public.landing_page_content (key, content)
values ('main', '{}'::jsonb)
on conflict (key) do nothing;
