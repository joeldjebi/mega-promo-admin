# MegaPromo Web - Plan d'implementation Super Admin

## Objectif

Construire l'espace Super Admin pour piloter toute la plateforme MegaPromo :
utilisateurs, partenaires, concours, gagnants, paiements, boosts et notifications.

## Etape 1 - Socle technique

- Installer le routing React.
- Definir les layouts `PublicLayout`, `AuthLayout`, `SuperAdminLayout`.
- Creer le theme MegaPromo web : couleurs, boutons, cards, tables, forms.
- Ajouter la configuration Supabase : URL, anon key, client navigateur.
- Ajouter la gestion `.env`.

## Etape 2 - Authentification Super Admin

- Page de connexion admin.
- Verification du role `admin` dans la table `users`.
- Protection des routes Super Admin.
- Gestion de session et deconnexion.
- Ecran d'acces refuse si role non autorise.

## Etape 3 - Dashboard SA

- KPIs globaux : joueurs, partenaires, concours actifs, gains en attente.
- Graphiques simples : participations par jour, concours par statut.
- Liste des alertes : partenaires en attente, concours a valider, gains a traiter.
- Filtres par periode.

## Etape 4 - Gestion partenaires

- Liste des partenaires.
- Detail partenaire.
- Validation / suspension.
- Edition des informations principales.
- Vue abonnement partenaire et expiration.

## Etape 5 - Gestion concours

- Liste des concours avec statut.
- Detail concours.
- Validation / rejet / suspension.
- Controle des dates, gains, categorie, type.
- Vue questions pour les quiz.

## Etape 6 - Gestion gagnants

- Liste des gagnants.
- Statuts : en attente, valide, envoye, recu, annule.
- Mise a jour du moyen de paiement et numero.
- Historique des envois.

## Etape 7 - Notifications

- Creation de notifications in-app.
- Ciblage : tous, joueurs, partenaire, utilisateur precis.
- Historique des notifications.
- Preparation future pour FCM.

## Etape 8 - Parametres plateforme

- Categories.
- Badges.
- Limites de participation.
- Configuration premium.
- Parametres de boosts.

## Etape 9 - Qualite et securite

- RLS Supabase verifiee.
- Logs d'actions admin.
- Etats loading / empty / error sur tous les ecrans.
- Validation des formulaires.
- Tests des flux critiques.
