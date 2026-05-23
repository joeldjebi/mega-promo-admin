-- MegaPromo - Seed messages d'information mobile
-- A executer apres docs/sql/20260522_create_mobile_info_and_device_session.sql
-- Script idempotent : cree 3 messages actifs pour le carousel de la page home.

insert into public.mobile_info_messages (
  title,
  body,
  cta_label,
  cta_url,
  background_color,
  text_color,
  is_active,
  order_index
)
values
  (
    'Quiz Live MegaPromo',
    'Entre en salle d’attente avant le départ et joue en direct avec tous les participants.',
    'Voir les jeux',
    '/contests',
    '#F7C4AD',
    '#4B1609',
    true,
    1
  ),
  (
    'Forfaits joueurs',
    'Active un forfait pour profiter de plus de participations et accéder aux meilleurs concours.',
    'Choisir un forfait',
    '/subscriptions',
    '#DCD8FF',
    '#20145C',
    true,
    2
  ),
  (
    'Notifications importantes',
    'Garde les notifications actives pour ne manquer aucun rappel de Quiz Live ni annonce de gain.',
    'Mes notifications',
    '/notifications',
    '#D7F7E7',
    '#0F432B',
    true,
    3
  )
on conflict do nothing;
