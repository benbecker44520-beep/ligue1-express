# Ligue 1 Express — V5.5.1

> Version actuelle : **V5.5** — Championnats, Prono et partage social.

# Ligue 1 Express — V4.1

V4.1 utilise football-data.org pour les vraies données Ligue 1.

Avant de lancer :
- copier `.env.local`
- ajouter `FOOTBALL_DATA_TOKEN=...`
- `npm.cmd install`
- `npm.cmd run dev`

Aucun nouveau SQL Supabase.

## V5.5.2 — Live & Scores

La V5.5.2 sépare désormais le calendrier de saison des matchs récents : les rencontres autour de la date du jour sont rafraîchies toutes les 60 secondes et remplacent les anciennes valeurs du cache long. Les fiches de matchs récents sont également rafraîchies de manière ciblée.

## V5.6
- Classements Ligue 2 / Ligue 3 complets via flux Sofascore prioritaire.
- Tableau détaillé J/G/N/P/BP/BC/Diff/Pts + indicateurs de championnat.
- Clubs concernés sur les articles avec liens vers fiches clubs.
- Match Center : buts refusés, cartons jaunes/rouges et remplacements.
- Migration : `supabase-v5-6-related-clubs.sql`.

## V5.6.2
Ligue 2 et Ligue 3 alimentées par FutPythonTrader via variable serveur `FUTPYTHONTRADER_API_KEY`.
