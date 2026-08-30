# Ligue 1 Express — V5.1

## Nouveautés

- Portraits des joueurs chargés automatiquement via TheSportsDB.
- Priorité aux images détourées quand elles sont disponibles, avec repli automatique sur la miniature.
- Nouvelle mise en scène des fiches joueurs avec portrait + écusson du club.
- Fallback conservé si aucune photo n'existe : écusson du club ou initiale du joueur.
- Accueil enrichi avec quatre accès rapides : Actualités, Résultats, Classement et Stats.
- Aucun abonnement supplémentaire et aucune nouvelle variable d'environnement nécessaire.

## Installation

Copier le `.env.local` de la version précédente dans ce dossier, puis :

```powershell
npm.cmd install
npm.cmd run dev
```

Tester ensuite une fiche joueur connue, par exemple Paul Pogba depuis la fiche de Monaco.
