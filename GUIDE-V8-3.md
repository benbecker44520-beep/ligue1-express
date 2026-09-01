# Ligue 1 Express — V8.3 · LIVE étendu

## Nouveautés
- APIfootball branchée côté serveur avec `APIFOOTBALL_API_KEY`.
- Centre LIVE pour Ligue 1 (#168), Ligue 2 (#164) et National (#167).
- Un seul appel `get_events&match_live=1` toutes les 60 secondes, puis filtrage des 3 compétitions côté serveur.
- Score + minute/statut live + logos APIfootball.
- Nouveau Centre Match LIVE `/live/match/[id]` avec buts, cartons et remplacements quand APIfootball les fournit.
- Secours Ligue 1 automatique via football-data.org si APIfootball est indisponible.
- Aucun score live n'est inventé à partir du CSV FutPythonTrader.

## Variable Vercel
La variable doit déjà exister dans Vercel :

`APIFOOTBALL_API_KEY`

Ne jamais mettre la clé dans Git ni dans `.env.example`.

## Base de données
Aucun SQL à exécuter pour cette version.
