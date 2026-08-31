# Ligue 1 Express — V4.4

## Nouveau : fiches match
- Les matchs de la page Résultats sont cliquables.
- Les matchs affichés sur l'accueil sont cliquables.
- Nouvelle route : `/match/[id]`.
- La fiche affiche les clubs, écussons, score ou VS, date/heure, journée, statut et position/points actuels quand disponibles.
- Design responsive cohérent avec l'identité Ligue 1 Express.

## Installation
Conserve ton `.env.local` local avec `FOOTBALL_DATA_TOKEN` et tes variables Supabase, puis :

```powershell
npm.cmd install
npm.cmd run dev
```
