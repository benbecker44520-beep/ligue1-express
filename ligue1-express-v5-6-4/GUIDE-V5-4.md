# Ligue 1 Express — V5.4 Production

Cette version réduit fortement les appels à football-data.org sur les fiches joueurs.

## Changements
- Les erreurs API (notamment limite 429) ne sont plus mises en cache.
- Depuis une fiche club, la fiche joueur réutilise le cache de l’effectif du club au lieu d’appeler `/persons/{id}`.
- Les liens joueurs transmettent le club pour limiter les requêtes.
- Cache club porté à 12 h et cache joueur direct à 24 h.
- Cache photo TheSportsDB porté à 7 jours, sans cache des erreurs.
- Message public propre en cas d’indisponibilité temporaire.
- `.env.local`, `.next`, `node_modules` et `.vercel` sont exclus de Git.

## Mise en ligne
Conserver les variables secrètes uniquement dans Vercel :
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- FOOTBALL_DATA_TOKEN
- NEXT_PUBLIC_SITE_URL

Aucune migration Supabase n’est nécessaire.
