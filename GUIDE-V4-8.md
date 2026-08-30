# Ligue 1 Express — V4.8

## Nouveautés
- Le classement **Meilleurs buteurs** est désormais placé en haut de la page `/stats` pour être visible immédiatement.
- Classement Top 10 alimenté automatiquement par les buteurs saisis dans l'admin.
- Chaque ligne affiche le joueur, son club, l'écusson et le nombre de buts.
- Le club est cliquable vers sa fiche club lorsqu'il peut être identifié depuis le match.
- Les CSC ne sont pas comptabilisés au classement des buteurs.
- Les autres blocs statistiques restent inchangés : attaques, défenses, différence de buts et forme récente.

## Installation
Conserver/copier le `.env.local` de la version précédente puis :

```powershell
npm.cmd install
npm.cmd run dev
```

Aucune nouvelle migration Supabase n'est nécessaire.
