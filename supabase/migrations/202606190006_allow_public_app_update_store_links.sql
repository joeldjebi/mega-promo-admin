-- MegaPromo Web - Lecture publique des liens stores
-- A executer dans Supabase SQL Editor.
--
-- Objectif:
-- - permettre a la landing page publique de lire les liens Google Play et
--   App Store renseignes par le Super Admin dans "Mise a jour app";
-- - conserver l'ecriture reservee au back-office.

do $$
begin
  if to_regclass('public.app_update_config') is not null then
    grant select on public.app_update_config to anon, authenticated;
    grant select on public.app_update_config to service_role;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'app_update_config'
        and policyname = 'app_update_config_public_select'
    ) then
      execute $policy$
        create policy "app_update_config_public_select"
        on public.app_update_config
        for select
        to anon, authenticated
        using (key = 'main' and coalesce(is_active, true) = true)
      $policy$;
    end if;
  end if;
end;
$$;

create or replace function public.get_public_app_store_links()
returns table (
  android_store_url text,
  ios_store_url text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.app_update_config') is null then
    return query
    select
      ''::text as android_store_url,
      ''::text as ios_store_url;
    return;
  end if;

  return query
  select
    coalesce(app_update_config.android_store_url, '')::text as android_store_url,
    coalesce(app_update_config.ios_store_url, '')::text as ios_store_url
  from public.app_update_config
  where app_update_config.key = 'main'
    and coalesce(app_update_config.is_active, true) = true
  limit 1;

  if not found then
    return query
    select
      ''::text as android_store_url,
      ''::text as ios_store_url;
  end if;
end;
$$;

grant execute on function public.get_public_app_store_links()
to anon, authenticated, service_role;

notify pgrst, 'reload schema';
