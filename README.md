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
