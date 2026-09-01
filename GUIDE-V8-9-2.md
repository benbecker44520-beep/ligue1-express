# Ligue 1 Express — V8.9.2

## Fiabilisation Mon Club

Correctif ciblé de l'espace supporter :

- Paris FC et Paris Saint-Germain ne peuvent plus être confondus par la comparaison de noms.
- Les correspondances de clubs utilisent désormais une égalité canonique stricte au lieu d'une correspondance partielle.
- Lorsqu'un ancien favori contient un identifiant incohérent, le nom du club enregistré est prioritaire afin de retrouver la bonne équipe.
- Le logo affiché dans Mon Club et sur le bandeau d'accueil est repris des données du club réellement résolu par l'API.
- Les matchs, résultats, forme et prochain match sont filtrés avec la même correspondance stricte.

Aucun SQL Supabase.
Aucune nouvelle variable Vercel.
