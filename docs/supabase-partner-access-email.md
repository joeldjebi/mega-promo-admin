# MegaPromo - Envoi email accès partenaire

Le dashboard SA appelle la Edge Function Supabase `send-partner-access` après
création d'un partenaire, puis depuis le bouton `Envoyer accès`.

## Déploiement

```bash
supabase functions deploy send-partner-access
```

## Secrets requis

```bash
supabase secrets set RESEND_API_KEY="..."
supabase secrets set RESEND_FROM_EMAIL="onboarding@resend.dev"
supabase secrets set PARTNER_LOGIN_URL="https://votre-domaine.com/auth/partner"
```

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont disponibles automatiquement
dans l'environnement des Edge Functions Supabase.

## Fonctionnement

- Le SA crée un partenaire depuis le dashboard.
- La fonction vérifie que l'appelant est bien `users.role = admin`.
- Elle crée un compte Supabase Auth partenaire ou réinitialise son mot de passe
  si `partners.user_id` existe déjà.
- Si le SA saisit un mot de passe à la création, ce mot de passe est utilisé.
  Sinon, la fonction génère un mot de passe temporaire.
- Elle lie `partners.user_id`.
- Elle envoie un email HTML premium avec l'URL de connexion, l'email et un mot
  de passe temporaire.

Pour la production, remplacez `onboarding@resend.dev` par un domaine vérifié
Resend.
