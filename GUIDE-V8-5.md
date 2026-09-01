# Ligue 1 Express — V8.5 Mon Club

## Nouveauté principale
La page d'accueil accueille désormais **Mon Club**, un espace supporter personnalisé.

Le visiteur peut choisir son club parmi la Ligue 1, la Ligue 2 et la Ligue 3 / National. Le choix est mémorisé uniquement dans son navigateur via `localStorage` : aucun compte et aucune donnée personnelle ne sont nécessaires.

Une fois le club choisi, l'accueil affiche automatiquement :
- classement et nombre de points ;
- nombre de victoires ;
- forme sur les 5 derniers matchs ;
- dernier résultat ;
- prochain match ;
- actualité ou mouvement mercato lié au club ;
- accès direct à la fiche du club.

## Fichiers principaux
- `components/MyClubHome.js`
- `app/api/my-club/route.js`
- `app/page.js`
- `app/globals.css`

## Base de données
Aucun nouveau SQL à exécuter.

## Confidentialité
Le club favori est conservé dans le navigateur du visiteur sous la clé `ligue1-express-my-club-v1`. Il n'est pas enregistré dans Supabase et n'est pas associé à une identité.

## Déploiement
Copier la V8.5 dans le projet existant, vérifier `git status`, commit puis push sur `main`. Vercel déploie ensuite automatiquement.
