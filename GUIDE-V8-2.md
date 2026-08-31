# V8.2 — Centre LIVE

## Nouveautés
- Nouvel onglet 🔴 LIVE dans la navigation desktop et mobile.
- Nouvelle page `/live` dédiée aux matchs en direct.
- Ligue 1 : scores issus de football-data.org, actualisés automatiquement toutes les 60 secondes.
- Accès direct de chaque rencontre au Centre Match.
- État vide propre lorsqu'aucun match n'est en cours.
- État des sources affiché clairement : Ligue 1 active ; Ligue 2/Ligue 3 prêtes pour une future vraie source live.
- Aucun score L2/L3 n'est inventé à partir du CSV FutPythonTrader, qui n'est pas un flux temps réel.
- Aucun SQL supplémentaire.

## Déploiement
Copier les fichiers de cette version dans le projet, vérifier `git status`, puis commit/push comme d'habitude.
