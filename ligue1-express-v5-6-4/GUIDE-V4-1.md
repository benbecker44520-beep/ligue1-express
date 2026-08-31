# Ligue 1 Express — V4.1

Cette version remplace API-Football par football-data.org pour la Ligue 1 actuelle.

## Pourquoi
Le plan gratuit API-Football bloque les saisons récentes.
football-data.org fonctionne avec la Ligue 1 actuelle sur ton compte.

## Installation
1. Garde ta V4 comme sauvegarde.
2. Décompresse la V4.1.
3. Copie `.env.local` de ta V4 dans la V4.1.
4. Vérifie qu'il contient :
   FOOTBALL_DATA_TOKEN=TON_TOKEN
5. `npm.cmd install`
6. `npm.cmd run dev`

## Ce qui fonctionne
- classement Ligue 1 réel
- logos clubs
- J / G / N / P / différence / points
- résultats et calendrier
- 3 matchs sur l'accueil
- cache serveur pour limiter les appels API
- clé gardée côté serveur

Aucun nouveau SQL Supabase n'est nécessaire.
