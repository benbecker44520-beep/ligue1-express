# Ligue 1 Express — V8.4 Analytics

## Nouveautés
- Nouvelle section `📊 Statistiques` dans l'Admin.
- Pages vues aujourd'hui et sur 7 / 30 / 90 jours.
- Visiteurs uniques aujourd'hui et sur la période.
- Graphique des visites par jour.
- Top 10 des pages les plus vues.
- Répartition mobile / ordinateur / tablette.
- Principales sources de trafic.
- L'espace `/admin` n'est jamais comptabilisé.
- Respect du signal navigateur `Do Not Track`.
- Aucun nom, e-mail, adresse IP brute ou fingerprint n'est enregistré.

## Installation obligatoire
Dans Supabase > SQL Editor, exécuter une fois :

`supabase-v8-4-analytics.sql`

Aucune nouvelle variable d'environnement n'est nécessaire.

## Fonctionnement
Le navigateur crée un identifiant aléatoire anonyme local et un identifiant de session. Une ligne légère est envoyée dans `page_views` à chaque changement de page. Les statistiques sont agrégées dans Supabase par la fonction sécurisée `analytics_summary` et sont accessibles uniquement après connexion à l'Admin.

## Important
Les statistiques commencent à partir du déploiement de la V8.4 : les visites antérieures ne peuvent pas être reconstituées automatiquement.
