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

## Déployer les fonctions

SMS depuis le Super Admin :

```bash
supabase functions deploy send-sms-mtarget
```

SMS OTP de Supabase Auth :

```bash
supabase functions deploy auth-sms-mtarget --no-verify-jwt
```

Le `--no-verify-jwt` est volontaire pour le hook Auth, car l'appel vient de Supabase Auth et non d'une session utilisateur du dashboard.

## Configurer Supabase Auth

Dans Supabase Dashboard :

1. Va dans `Authentication` > `Hooks`.
2. Active le hook `Send SMS`.
3. Choisis un hook HTTP.
4. Mets l'URL de la fonction :

```text
https://<PROJECT_REF>.supabase.co/functions/v1/auth-sms-mtarget
```

5. Clique sur `Generate secret`, copie la valeur complète qui commence par `v1,whsec_`, puis enregistre la même valeur dans le secret Supabase `SEND_SMS_HOOK_SECRET`.

Supabase enverra un payload signé contenant notamment `user.phone` et `sms.otp`. La fonction vérifie la signature avec `SEND_SMS_HOOK_SECRET`, envoie ensuite le SMS via mTarget et retourne une réponse vide en `200` si tout est bon.

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
