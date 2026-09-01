# V8.9 — Mode App / PWA

## Objectif
Préparer Ligue 1 Express à devenir une vraie application mobile sans casser le site actuel.

## Nouveautés
- Service worker `public/sw.js` enregistré automatiquement.
- Page `/offline` pour les coupures réseau.
- Installation PWA : bannière Android/Chrome + aide iPhone/iPad.
- Navigation mobile fixe : Accueil / Live / Fil / Actus / Mon Club.
- Manifest enrichi : id, scope, orientation, catégories et raccourcis.
- Safe areas iOS et comportement standalone.

## Déploiement
Aucun SQL Supabase et aucune variable Vercel supplémentaire.

## Test après Vercel
1. Ouvrir le site sur téléphone.
2. Vérifier la barre de navigation mobile en bas.
3. Installer l'app depuis la bannière (Android/Chrome) ou Partager > Sur l'écran d'accueil (iPhone/iPad).
4. Ouvrir depuis l'icône : le site doit fonctionner en mode standalone.
5. Après une première visite de `/offline`, couper le réseau et vérifier la page de secours.
