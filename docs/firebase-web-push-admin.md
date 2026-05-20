# MegaPromo - Push navigateur Super Admin

Pour que le SA reçoive les push navigateur, le dashboard web doit enregistrer
son `fcm_token` dans `public.users`.

## Variables `.env` requises

Ajoute la configuration Firebase Web dans `.env` :

```env
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="megapromo-18c9b.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="megapromo-18c9b"
VITE_FIREBASE_STORAGE_BUCKET="megapromo-18c9b.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="288733119172"
VITE_FIREBASE_APP_ID="..."
VITE_FIREBASE_VAPID_KEY="..."
```

La `VITE_FIREBASE_VAPID_KEY` vient de Firebase Console :
Project settings > Cloud Messaging > Web Push certificates.

## Fonctionnement

Quand le SA se connecte :

1. Le navigateur demande la permission de notifications.
2. Firebase récupère le token FCM web.
3. Le dashboard met à jour `public.users.fcm_token`.
4. Les Edge Functions peuvent envoyer des push à ce SA.

Les logs navigateur utiles :

```text
[MegaPromo][FCM][web] permission
[MegaPromo][FCM][web] token enregistré
```
