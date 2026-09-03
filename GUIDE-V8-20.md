# Ligue 1 Express V8.20 — Suivre ce match

## Installation

1. Copier le contenu de la mise à jour dans le projet.
2. Exécuter `supabase-v8-20-followed-matches.sql` dans Supabase.
3. Lancer `npm.cmd run build`.
4. Publier les fichiers avec Git.

## Fonctionnement

- Le bouton `Suivre ce match` apparaît sur les matchs alimentés par APIfootball.
- Le choix est enregistré dans le compte membre et synchronisé entre appareils.
- Un match suivi reçoit les notifications même s'il ne concerne pas le club favori.
- `Mes alertes` affiche les rencontres suivies et permet de les retirer.
- Un match qui n'est plus LIVE ne génère naturellement plus aucune alerte.
- Le cron V8.19, les clés VAPID et les variables Vercel restent inchangés.
