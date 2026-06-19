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

notify pgrst, 'reload schema';
