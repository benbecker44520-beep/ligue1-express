# Ligue 1 Express — V8.9.3

## Nettoyage avant V9.0
- Fil Express retiré du site public, de l'administration, des alertes et de la PWA.
- La table Supabase `express_feed` n'est pas supprimée : aucune donnée n'est détruite.
- La bannière Mon Club est retirée de l'accueil ; Mon Club conserve sa page dédiée `/mon-club` et son onglet mobile.
- Un bandeau « Match à suivre » prend la place sur l'accueil avec accès au Centre Match.
- Navigation mobile : Fil est remplacé par Stats.
- Mon Club conserve matchs, classement, mercato, actualités et alertes.
- Aucun SQL à exécuter et aucune nouvelle variable Vercel.
