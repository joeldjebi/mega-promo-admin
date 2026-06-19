-- MegaPromo Web - Politique de suppression de compte
-- A executer dans Supabase SQL Editor.
--
-- Objectif:
-- - garantir la table public.legal_pages si elle n'existe pas;
-- - publier une page "Suppression de compte" accessible depuis le footer;
-- - permettre au Super Admin de modifier la politique depuis Paramètres;
-- - protéger l'écriture avec RLS afin qu'un joueur authentifié ne puisse pas
--   modifier les documents légaux.

create table if not exists public.legal_pages (
  key text primary key,
  title text not null,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_pages enable row level security;

grant select on public.legal_pages to anon, authenticated;
grant insert, update on public.legal_pages to authenticated;
grant select, insert, update on public.legal_pages to service_role;

drop policy if exists "legal_pages_public_select"
on public.legal_pages;

create policy "legal_pages_public_select"
on public.legal_pages
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "legal_pages_super_admin_select"
on public.legal_pages;

create policy "legal_pages_super_admin_select"
on public.legal_pages
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "legal_pages_super_admin_insert"
on public.legal_pages;

create policy "legal_pages_super_admin_insert"
on public.legal_pages
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists "legal_pages_super_admin_update"
on public.legal_pages;

create policy "legal_pages_super_admin_update"
on public.legal_pages
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

insert into public.legal_pages (
  key,
  title,
  content,
  is_active,
  created_at,
  updated_at
)
values
  (
    'terms',
    'Conditions générales d’utilisation',
    'Bienvenue sur MegaPromo.

MegaPromo est une plateforme promotionnelle gratuite qui permet aux utilisateurs de découvrir des marques, produits, services, campagnes et animations à travers l’application mobile et le site web.

La participation ne nécessite aucune mise, aucun pari et aucun achat obligatoire. Chaque campagne peut appliquer ses propres règles : durée, nombre de gagnants, score, critères de validation, disponibilité des récompenses et modalités de remise.

Le compte joueur est personnel. L’utilisateur s’engage à fournir des informations exactes, à ne pas créer de comptes multiples dans un but frauduleux et à respecter les règles affichées dans chaque campagne. Toute tentative de fraude, d’automatisation abusive, d’usurpation d’identité ou de contournement technique peut entraîner la suspension ou la suppression du compte.

Les récompenses proposées sont promotionnelles. Elles peuvent prendre la forme de bons, crédits, invitations, cadeaux, avantages partenaires ou autres lots indiqués dans l’application. MegaPromo peut vérifier l’identité du gagnant avant remise de la récompense.',
    true,
    now(),
    now()
  ),
  (
    'privacy',
    'Politique de confidentialité',
    'MegaPromo collecte uniquement les informations nécessaires au fonctionnement du service.

Les données traitées peuvent inclure l’identifiant du compte, le numéro de téléphone lorsqu’il est utilisé, l’adresse e-mail ou l’identifiant social lorsque la connexion Google ou Apple est activée, le pseudo, l’avatar, les participations, les scores, les réponses aux quiz, les récompenses, les notifications, les données techniques du device et certaines informations de sécurité.

Ces données servent à créer et sécuriser le compte, afficher les campagnes disponibles, enregistrer les participations, établir les classements, gérer les récompenses, envoyer des notifications utiles, prévenir la fraude, améliorer l’application et assurer le support utilisateur.

MegaPromo ne vend pas les données personnelles des utilisateurs. Certaines données peuvent être partagées avec des prestataires techniques ou partenaires uniquement lorsque cela est nécessaire à l’exécution du service, à la remise d’une récompense ou au respect d’une obligation légale.

L’utilisateur peut contacter l’équipe MegaPromo pour exercer ses droits d’accès, de rectification, d’opposition ou de suppression, sous réserve des obligations légales, comptables, de sécurité et de prévention de la fraude.',
    true,
    now(),
    now()
  ),
  (
    'account-deletion',
    'Suppression de compte',
    'Tu peux demander la suppression de ton compte MegaPromo à tout moment.

Cette page décrit le mécanisme prévu pour supprimer ton profil joueur, tes données d’identification et les informations personnelles rattachées à ton compte. Le lien vers cette page est disponible dans le footer du site MegaPromo afin que chaque utilisateur puisse consulter clairement la procédure avant d’effectuer sa demande.

1. Comment faire la demande

Tu peux lancer une demande de suppression depuis l’application mobile lorsque le parcours est disponible, ou contacter l’équipe MegaPromo via la page de contact du site. La demande doit permettre d’identifier le compte concerné : numéro de téléphone, adresse e-mail, compte Google, compte Apple, pseudo ou tout autre élément utile.

2. Vérification de l’identité du demandeur

Avant toute suppression, MegaPromo peut vérifier que la personne qui effectue la demande est bien titulaire du compte. Cette étape protège les utilisateurs contre les suppressions non autorisées, les erreurs de compte et les demandes malveillantes.

3. Traitement de la demande

Après validation, MegaPromo peut désactiver le compte, empêcher toute nouvelle connexion, supprimer ou anonymiser les données personnelles qui ne sont plus nécessaires, retirer les informations d’identification du profil public et limiter l’usage des données restantes aux besoins strictement nécessaires.

4. Données concernées

La suppression peut concerner le profil joueur, le pseudo, l’avatar, les coordonnées de connexion, les jetons de notification, les préférences, les informations de support et les données personnelles directement associées au compte.

5. Données pouvant être conservées temporairement

Certaines informations peuvent être conservées lorsqu’elles sont nécessaires à la sécurité, à la prévention de la fraude, à la preuve d’une participation, à la gestion d’une récompense déjà attribuée, au respect d’une obligation légale, comptable ou fiscale, ou au traitement d’un litige. Ces données sont limitées au strict nécessaire et ne sont plus utilisées pour animer commercialement le compte supprimé.

6. Effets de la suppression

La suppression est irréversible pour l’expérience joueur. L’historique de participation, les scores, les badges, les avantages, les récompenses non réclamées, les notifications et l’accès au compte peuvent ne plus être récupérables après traitement.

7. Délais et assistance

MegaPromo traite les demandes dans un délai raisonnable après réception des informations nécessaires. Si une vérification complémentaire est requise, l’équipe peut contacter l’utilisateur avant de finaliser la suppression.

Pour toute demande, utilise le formulaire de contact du site ou écris à l’équipe MegaPromo en précisant clairement que tu souhaites supprimer ton compte.',
    true,
    now(),
    now()
  )
on conflict (key) do update set
  title = excluded.title,
  content = case
    when public.legal_pages.content is null
      or length(trim(public.legal_pages.content)) = 0
      or public.legal_pages.key = 'account-deletion'
    then excluded.content
    else public.legal_pages.content
  end,
  is_active = true,
  updated_at = now();

notify pgrst, 'reload schema';
