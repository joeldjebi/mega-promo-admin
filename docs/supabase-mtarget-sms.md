# MegaPromo - SMS mTarget avec Supabase

Ce guide connecte mTarget à MegaPromo pour deux usages :

- envoyer des SMS depuis le tableau de bord Super Admin à un, plusieurs ou tous les joueurs ;
- remplacer l'envoi SMS OTP de Supabase Auth avec ton fournisseur mTarget.

## Secrets Supabase

Ne mets jamais les identifiants mTarget dans React. Ils doivent rester dans les secrets Supabase :

```bash
supabase secrets set MTARGET_URL="https://api-public-2.mtarget.fr/messages"
supabase secrets set MTARGET_USERNAME="TON_USERNAME"
supabase secrets set MTARGET_PASSWORD="TON_PASSWORD"
supabase secrets set MTARGET_SENDER="MEGAPROMO"
supabase secrets set MTARGET_AUTH_SENDER="MEGAPROMO"
supabase secrets set SEND_SMS_HOOK_SECRET="v1,whsec_<SECRET_GENERE_DANS_SUPABASE>"
```

Optionnel pour personnaliser le SMS OTP :

```bash
supabase secrets set MTARGET_AUTH_MESSAGE_TEMPLATE="Ton code MegaPromo est {{ otp }}. Ne le partage avec personne."
```

Optionnel pour documenter le compte de revue App Store / Play Store dans les logs du hook SMS :

```bash
supabase secrets set APP_REVIEW_OTP_PHONE="+2250700000000"
supabase secrets set APP_REVIEW_OTP_CODE="260493"
supabase secrets set APP_REVIEW_EMAIL="app-review@megapromo.ci"
supabase secrets set APP_REVIEW_PASSWORD="MOT_DE_PASSE_REVIEW_TRES_LONG"
```

Important : le téléphone et le code reviewer servent aussi au hook SMS pour reconnaître le numéro reviewer et afficher un warning clair si Supabase génère encore un OTP aléatoire. L'email et le mot de passe servent uniquement à la fonction `app-review-login`.

## Déployer les fonctions

SMS depuis le Super Admin :

```bash
supabase functions deploy send-sms-mtarget
```

SMS OTP de Supabase Auth :

```bash
supabase functions deploy auth-sms-mtarget --no-verify-jwt
```

Connexion reviewer sans dépendre du SMS :

```bash
supabase functions deploy app-review-login --no-verify-jwt
```

Le `--no-verify-jwt` est volontaire pour le hook Auth, car l'appel vient de Supabase Auth et non d'une session utilisateur du dashboard.

## Configurer Supabase Auth

Dans Supabase Dashboard :

1. Va dans `Authentication` > `Providers`.
2. Ouvre `Phone`.
3. Active le provider téléphone.
4. Enregistre.
5. Va dans `Authentication` > `Hooks`.
6. Active le hook `Send SMS`.
7. Choisis un hook HTTP.
8. Mets l'URL de la fonction :

```text
https://<PROJECT_REF>.supabase.co/functions/v1/auth-sms-mtarget
```

9. Clique sur `Generate secret`, copie la valeur complète qui commence par `v1,whsec_`, puis enregistre la même valeur dans le secret Supabase `SEND_SMS_HOOK_SECRET`.

Supabase enverra un payload signé contenant notamment `user.phone` et `sms.otp`. La fonction vérifie la signature avec `SEND_SMS_HOOK_SECRET`, envoie ensuite le SMS via mTarget et retourne une réponse vide en `200` si tout est bon.

Si l'app affiche dans les logs `phone_provider_disabled`, le provider téléphone n'est pas activé dans `Authentication` > `Providers` > `Phone`.

## OTP fixe pour App Store / Play Store

Pour permettre aux équipes Apple/Google de tester l'application sans dépendre d'un SMS réel, l'app intercepte ce couple numéro/code :

```text
+2250700000000 / 260493
```

et appelle la fonction Edge `app-review-login`. Cette fonction crée ou met à jour un compte reviewer email/password côté serveur, puis renvoie une session Supabase à l'app. Le mot de passe reviewer reste dans les secrets Supabase et n'est pas embarqué dans Flutter.

Tu peux aussi configurer le numéro reviewer directement dans Supabase Auth si ton projet le supporte :

```text
2250700000000:260493
```

Le numéro à saisir dans l'app reste :

```text
+2250700000000
```

Et le code à entrer est :

```text
260493
```

Pourquoi ce réglage est côté Supabase Auth : l'app Flutter appelle `verifyOTP()`, et Supabase ne crée une session valide que si le serveur Auth accepte le code. Le hook `auth-sms-mtarget` peut envoyer le SMS, mais il ne peut pas changer le code que Supabase attend.

Si ton projet est self-hosted ou géré via variables d'environnement Auth, utilise :

```env
SMS_TEST_OTP=2250700000000:260493
```

Si tu vois dans les logs :

```text
[MegaPromo][auth-sms-mtarget] review phone received a generated OTP
```

cela signifie que le numéro reviewer n'est pas encore configuré dans Supabase Auth Test OTP.

## Côté Super Admin

La page `Notifications` peut maintenant :

- créer une notification in-app ;
- déclencher le push FCM ;
- envoyer le même message, ou un message SMS court dédié, via mTarget.

Les numéros viennent de `public.users.phone`. Ils sont normalisés automatiquement avec un `+` si nécessaire.

## Logs

Dans les logs Supabase Functions :

- `[MegaPromo][sms-mtarget] payload`
- `[MegaPromo][sms-mtarget] response`
- `[MegaPromo][auth-sms-mtarget] payload`
- `[MegaPromo][auth-sms-mtarget] response`

Les logs affichent le nombre de destinataires, le sender, la longueur du message et les réponses HTTP mTarget. Le mot de passe mTarget n'est jamais loggé.
