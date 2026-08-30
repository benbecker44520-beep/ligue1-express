# Ligue 1 Express — V4.7

## Nouveautés
- Nouvelle page `/stats` accessible depuis le menu principal.
- Top 5 des meilleures attaques.
- Top 5 des meilleures défenses.
- Top 5 des différences de buts.
- Forme récente des clubs (jusqu'aux 5 derniers matchs).
- Classement des buteurs basé sur les buteurs saisis dans l'admin V4.5.
- Fiches clubs : les horaires techniques `02:00` sont remplacés par `Horaire à confirmer`.

## Installation
Conserver/copier le `.env.local` de la version précédente puis :

```powershell
npm.cmd install
npm.cmd run dev
```

Aucune nouvelle migration Supabase n'est nécessaire.
