# Ligue 1 Express — V8.14

## Nouveautés

- Nouvel espace personnel `/mon-profil-supporter`
- Historique des pronostics : gagnés, perdus et en attente
- Points, taux de réussite, rang général et rang hebdomadaire
- Série actuelle et meilleur record
- Collection de badges et progression vers le prochain objectif
- Accès rapide depuis Pronostics et le classement

## Base de données

Aucun nouveau script SQL n'est nécessaire. Cette version utilise le système installé avec `supabase-v8-13-supporter-ranking.sql`.

## Installation

Copier le contenu de l'archive dans le projet en conservant `.git` et `.env.local`, puis exécuter :

```powershell
npm run build
git add .
git commit -m "Ajout espace personnel supporter V8.14"
git push origin main
```

## Vérifications

1. Créer un pseudo depuis `/prono` si nécessaire.
2. Ouvrir `/mon-profil-supporter`.
3. Vérifier les statistiques et l'historique.
4. Ouvrir la page sur mobile.
