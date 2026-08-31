# Ligue 1 Express V5.5.2 — Live & Scores

Correctif dédié à la fraîcheur des scores Ligue 1.

## Ce qui change

- calendrier complet Football-Data mis en cache 15 minutes ;
- fenêtre de matchs récents (J-2 à J+2) rafraîchie toutes les 60 secondes ;
- les données récentes écrasent automatiquement les anciennes données du calendrier de saison ;
- fiche d'un match récent rafraîchie via `/matches/{id}` toutes les 60 secondes ;
- en cas d'échec du flux récent (quota/API), le site conserve les dernières données valides et tente un rafraîchissement ciblé du match affiché ;
- les erreurs Football-Data ne sont pas enregistrées comme une bonne réponse dans le cache ;
- nouvelle clé de cache V5.5.2 afin de ne pas réutiliser le score bloqué des versions précédentes.

## Installation

Aucune migration Supabase n'est nécessaire.

Copier cette version dans le dossier Git du projet en conservant `.git` et `.env.local`, puis :

```powershell
git add .
git commit -m "Ligue 1 Express V5.5.2 Live Scores"
git push origin main
```

Vercel redéploiera automatiquement.

## Filet de sécurité score

Si Football-Data fournit encore momentanément un score incomplet mais que les buteurs ont déjà été saisis dans `match_scorers`, le site compare les deux. Le score dérivé des buteurs n'est utilisé que lorsque leur nombre prouve qu'il manque au moins un but dans le score API. Ce fallback s'applique à l'accueil, aux résultats et à la fiche match.
