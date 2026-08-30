# PASSAGE V2 → V3

1. Garde ta V2 comme sauvegarde.
2. Décompresse `ligue1-express-v3.zip`.
3. Copie le fichier `.env.local` de ta V2 vers la racine du dossier V3.
4. Ouvre PowerShell dans le dossier V3.
5. Lance :
   npm.cmd install
6. Puis :
   npm.cmd run dev
7. Ouvre `/admin`.

La base Supabase est la même : aucun nouveau script SQL n'est nécessaire.

Test conseillé :
- ouvre un article existant dans Admin
- clique `Modifier`
- ajoute une vraie image
- enregistre
- recharge l'accueil
- ouvre l'article sur mobile
