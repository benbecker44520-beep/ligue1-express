# Ligue 1 Express — V8.17 Sécurité

1. Exécuter `supabase-v8-17-admin-security.sql` dans Supabase.
2. Attribuer le rôle administrateur depuis le SQL Editor :

```sql
select public.promote_member_to_admin('TON-ADRESSE-EMAIL');
```

3. Vérifier que Supabase répond `admin enabled`.
4. Installer les fichiers, puis exécuter `npm run build` et envoyer sur GitHub.

L'administration est ensuite invisible et inaccessible aux membres ordinaires. Les politiques RLS protègent également les écritures directement dans Supabase.
