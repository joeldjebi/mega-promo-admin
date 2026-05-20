# SQL Supabase MegaPromo Web

Chaque changement Supabase doit avoir son propre fichier SQL date.

Convention :

```text
YYYYMMDD_nom_du_changement.sql
```

Regles :

- Ne pas utiliser `drop table` dans ces scripts sans demande explicite.
- Preferer `create table if not exists`.
- Preferer `insert ... on conflict ... do update` pour les donnees de reference.
- Garder les policies/grants proches de la fonctionnalite concernee.
- Executer uniquement le fichier demande dans Supabase SQL Editor.
