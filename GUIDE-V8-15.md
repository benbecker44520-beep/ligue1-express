# Ligue 1 Express — V8.15

## Nouveauté

Le profil supporter n'est plus limité à un seul navigateur. Chaque supporter peut générer un code personnel depuis `/mon-profil-supporter`, puis récupérer sur un autre appareil :

- son pseudo ;
- ses anciens pronostics ;
- ses points et ses statistiques ;
- son classement et ses badges.

Aucun e-mail ni mot de passe n'est demandé. La création d'un nouveau code invalide automatiquement l'ancien.

## Étape obligatoire — Supabase

Exécuter entièrement `supabase-v8-15-profile-recovery.sql` dans le SQL Editor de Supabase avant de déployer le site.

## Installation

```powershell
npm run build
git add .
git commit -m "Ajout récupération profil supporter V8.15"
git push origin main
```

## Test conseillé

1. Sur l'appareil actuel, ouvrir `/mon-profil-supporter` et créer un code personnel.
2. Ouvrir une fenêtre privée.
3. Aller sur `/mon-profil-supporter` et saisir le code.
4. Vérifier que le pseudo et l'historique réapparaissent.
