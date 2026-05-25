-- MegaPromo - Liens stores pour les messages de mise a jour
-- A executer apres docs/sql/20260522_create_app_update_config.sql
-- Configure le lien Android et conserve le lien iOS existant si deja renseigne.
-- Important : remplace ios_store_url par le lien App Store exact des que
-- l'application iOS est publiee.

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
  is_active,
  updated_at
)
values (
  'main',
  1,
  2,
  1,
  2,
  'https://play.google.com/store/apps/details?id=com.moyoo.megapromo',
  null,
  'Mise à jour disponible',
  'Une nouvelle version de MegaPromo est disponible avec des améliorations importantes.',
  false,
  true,
  now()
)
on conflict (key) do update set
  latest_android_build = greatest(
    public.app_update_config.latest_android_build,
    excluded.latest_android_build
  ),
  latest_ios_build = greatest(
    public.app_update_config.latest_ios_build,
    excluded.latest_ios_build
  ),
  android_store_url = excluded.android_store_url,
  ios_store_url = coalesce(
    nullif(public.app_update_config.ios_store_url, ''),
    excluded.ios_store_url
  ),
  title = excluded.title,
  message = excluded.message,
  force_update = excluded.force_update,
  is_active = true,
  updated_at = now();

select
  key,
  latest_android_build,
  latest_ios_build,
  android_store_url,
  ios_store_url,
  is_active
from public.app_update_config
where key = 'main';
