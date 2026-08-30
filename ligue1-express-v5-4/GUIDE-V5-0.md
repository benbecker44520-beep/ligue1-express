# Ligue 1 Express V5.0 — Fiches joueurs

## Nouveautés
- Les joueurs sont cliquables depuis l'effectif d'une fiche club.
- Nouvelle route `/joueur/[id]` alimentée automatiquement par football-data.org.
- Fiche joueur : nom, club, poste, âge, date de naissance, nationalité et numéro lorsqu'il est fourni.
- Les nationalités des effectifs et fiches joueurs sont affichées en français.
- Retour direct vers la fiche du club.

## Installation
Copier le fichier `.env.local` de la version précédente dans ce dossier, puis :

```powershell
npm.cmd install
npm.cmd run dev
```

Aucune migration Supabase n'est nécessaire.
