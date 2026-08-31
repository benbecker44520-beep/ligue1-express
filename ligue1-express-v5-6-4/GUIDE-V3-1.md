# Ligue 1 Express — V3.1

Cette version termine la partie éditoriale dynamique de l'accueil.

## Nouveautés
- suppression des blocs de démonstration TikTok / analyse de la page d'accueil
- dernières actualités 100 % dynamiques
- section Mercato dynamique
- section Analyses dynamique
- meilleure carte de secours quand un article n'a pas encore d'image
- chaque article publié va automatiquement dans la bonne rubrique
- aucun nouveau script SQL nécessaire

## Passage depuis la V3
1. Décompresse `ligue1-express-v3-1.zip`
2. Copie ton `.env.local` de la V3 dans le nouveau dossier
3. Ouvre PowerShell dans le dossier
4. `npm.cmd install`
5. `npm.cmd run dev`
6. Ouvre le port indiqué par Next.js

Ta base Supabase, tes utilisateurs, tes articles et tes images restent inchangés.
