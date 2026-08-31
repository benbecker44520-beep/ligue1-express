# Ligue 1 Express V5.6.2 — Ligue 2 / Ligue 3 FutPythonTrader

## Changement principal
- Ligue 2 et Ligue 3 utilisent désormais FutPythonTrader en source serveur.
- Le classement des 18 équipes est recalculé automatiquement à partir des résultats du dataset CSV.
- Résultats récents et prochains matchs sont construits depuis le même dataset.
- Plus de dépendance ESPN/Sofascore/TheSportsDB pour les pages Ligue 2 / Ligue 3.

## Variable Vercel obligatoire
`FUTPYTHONTRADER_API_KEY`

La valeur doit rester secrète et ne doit jamais être envoyée sur GitHub.

## Déploiement
Après avoir ajouté la variable dans Vercel :
1. copier la V5.6.2 dans le dossier Git propre ;
2. `git add .`
3. `git commit -m "Ligue 1 Express V5.6.2 FutPythonTrader"`
4. `git push origin main`
5. attendre le statut Ready sur Vercel.

Aucune migration Supabase nécessaire.
