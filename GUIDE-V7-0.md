# Ligue 1 Express — V7.0 Clubs & Joueurs

## Objectif
Transformer les fiches Clubs et Joueurs en véritables centres de navigation interconnectés.

## Nouveautés
- Fiche club enrichie : forme, calendrier, buteurs, effectif, mercato, actualités liées.
- Fiche joueur enrichie : portrait, infos, stats buteurs quand disponibles, matchs du club, mercato, articles liés.
- Centre Mercato : liens automatiques vers les fiches clubs et, pour les joueurs reconnus dans le classement des buteurs, vers la fiche joueur.
- Articles : détection automatique des joueurs du Top buteurs cités dans le contenu et liens vers leurs fiches.
- Navigation interne renforcée entre clubs, joueurs, matchs, mercato et articles.
- Aucune donnée sportive inventée : les blocs restent vides/proprement indiqués lorsque la source ne fournit rien.

## Base de données
Aucun nouveau SQL requis pour V7.0.

## Déploiement
Copier les fichiers sur le projet local en conservant `.git` et `.env.local`, puis vérifier `git status` avant commit.
