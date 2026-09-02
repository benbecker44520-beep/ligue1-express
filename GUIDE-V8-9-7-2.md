# Ligue 1 Express — V8.9.7.2

Correction ciblée de la fiche joueur.

- Portrait joueur robuste : essaie successivement les visuels TheSportsDB disponibles puis affiche proprement le logo du club si aucun visuel ne charge.
- Plus de texte alternatif cassé visible dans le hero.
- Statistiques Ligue 1 enrichies via l'endpoint matchs du joueur de football-data.org : matchs joués, titularisations, minutes, buts, passes décisives et penalties lorsque l'API les fournit.
- Fallback propre si les statistiques détaillées ne sont pas disponibles avec le plan/API courant.
- Aucun SQL.
- Aucune nouvelle variable Vercel.
