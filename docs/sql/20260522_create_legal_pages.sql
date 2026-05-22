-- MegaPromo - Legal pages content management
-- A executer dans Supabase SQL Editor.
-- Script idempotent : cree les pages CGU et politique de confidentialite,
-- lisibles par l'app mobile et modifiables par le Super Admin.

create table if not exists public.legal_pages (
  key varchar primary key,
  title varchar not null,
  content text not null default '',
  is_active bool not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

grant usage on schema public to anon, authenticated;
grant select on public.legal_pages to anon, authenticated;
grant insert, update, delete on public.legal_pages to authenticated;

alter table public.legal_pages enable row level security;

drop policy if exists legal_pages_public_select_active on public.legal_pages;
create policy legal_pages_public_select_active
on public.legal_pages
for select
to anon, authenticated
using (coalesce(is_active, true) = true or public.current_user_is_admin());

drop policy if exists legal_pages_admin_insert on public.legal_pages;
create policy legal_pages_admin_insert
on public.legal_pages
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists legal_pages_admin_update on public.legal_pages;
create policy legal_pages_admin_update
on public.legal_pages
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists legal_pages_admin_delete on public.legal_pages;
create policy legal_pages_admin_delete
on public.legal_pages
for delete
to authenticated
using (public.current_user_is_admin());

insert into public.legal_pages (key, title, content, is_active)
values
  (
    'terms',
    'Conditions générales d’utilisation',
    'Bienvenue sur MegaPromo.

En utilisant MegaPromo, tu acceptes de participer aux concours dans le respect des règles affichées dans l’application.

Un compte joueur est personnel. Toute tentative de fraude, d’utilisation abusive ou de création de comptes multiples peut entraîner une suspension.

Les gains sont attribués selon les règles de chaque concours et après vérification par l’équipe MegaPromo.',
    true
  ),
  (
    'privacy',
    'Politique de confidentialité',
    'MegaPromo collecte les informations nécessaires au fonctionnement du service : numéro de téléphone, profil joueur, participations, gains, informations techniques du device et localisation lorsque l’autorisation est donnée.

Ces données servent à sécuriser les concours, prévenir la fraude, améliorer l’expérience et contacter les gagnants.

MegaPromo ne vend pas les données personnelles des joueurs.

Tu peux contacter l’équipe MegaPromo pour toute demande liée à tes données.',
    true
  )
on conflict (key) do update set
  title = excluded.title,
  content = coalesce(nullif(public.legal_pages.content, ''), excluded.content),
  is_active = true,
  updated_at = now();

