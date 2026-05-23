-- MegaPromo - Message d'information mobile mise a jour
-- A executer apres docs/sql/20260522_create_mobile_info_and_device_session.sql
-- Script idempotent : cree ou met a jour un message d'information qui redirige
-- les joueurs vers la mise a jour de l'application selon leur device.
-- Important : app-update://store est resolu par l'app mobile avec les liens
-- android_store_url / ios_store_url de public.app_update_config.

insert into public.mobile_info_messages (
  id,
  title,
  body,
  cta_label,
  cta_url,
  background_color,
  text_color,
  is_active,
  order_index,
  updated_at
)
values (
  '20260522-0000-4000-9000-000000000701'::uuid,
  'Mise à jour MegaPromo',
  'Une nouvelle version de l’application est disponible. Mets MegaPromo à jour pour profiter des dernières améliorations.',
  'Mettre à jour',
  'app-update://store',
  '#DCD8FF',
  '#20145C',
  true,
  0,
  now()
)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  cta_label = excluded.cta_label,
  cta_url = excluded.cta_url,
  background_color = excluded.background_color,
  text_color = excluded.text_color,
  is_active = excluded.is_active,
  order_index = excluded.order_index,
  updated_at = now();

select
  id,
  title,
  cta_label,
  cta_url,
  is_active,
  order_index
from public.mobile_info_messages
where id = '20260522-0000-4000-9000-000000000701'::uuid;
