-- MegaPromo - Contest brand logo
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute le logo de marque par concours et configure un bucket public.

alter table public.contests
add column if not exists brand_logo_url text,
add column if not exists brand_name varchar;

grant select, insert, update on public.contests to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'brand-assets',
  'brand-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.current_user_can_manage_brand_assets()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('admin', 'partner')
      and coalesce(is_active, true) = true
  );
$$;

grant execute on function public.current_user_can_manage_brand_assets() to authenticated;

drop policy if exists brand_assets_public_read on storage.objects;
create policy brand_assets_public_read
on storage.objects
for select
to public
using (bucket_id = 'brand-assets');

drop policy if exists brand_assets_authenticated_insert on storage.objects;
create policy brand_assets_authenticated_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'brand-assets'
  and public.current_user_can_manage_brand_assets()
);

drop policy if exists brand_assets_authenticated_update on storage.objects;
create policy brand_assets_authenticated_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'brand-assets'
  and public.current_user_can_manage_brand_assets()
)
with check (
  bucket_id = 'brand-assets'
  and public.current_user_can_manage_brand_assets()
);

drop policy if exists brand_assets_authenticated_delete on storage.objects;
create policy brand_assets_authenticated_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'brand-assets'
  and public.current_user_can_manage_brand_assets()
);
