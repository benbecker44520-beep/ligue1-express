# Ligue 1 Express — V5.5.1

Correctif ciblé des pages Championnats.

## Changements

- `National` devient officiellement `Ligue 3` pour la saison 2026/27.
- Nouvelle URL : `/championnats/ligue-3`.
- L'ancienne URL `/championnats/national` redirige automatiquement vers la Ligue 3.
- Ligue 2 et Ligue 3 utilisent désormais un flux de données plus complet pour le classement et les matchs.
- TheSportsDB reste en secours si la source principale est momentanément indisponible.
- En mode de secours, l'interface indique clairement qu'il ne s'agit que d'un aperçu partiel.
- Les matchs non terminés ne peuvent plus apparaître dans « Derniers résultats » simplement parce qu'un score est présent.
- Les horaires sont systématiquement affichés dans le fuseau `Europe/Paris` à partir du timestamp du match.
- Cache des championnats secondaires : 15 minutes pour limiter les appels externes.

## Mise à jour

Aucune migration Supabase supplémentaire n'est nécessaire par rapport à la V5.5.

Copier cette version dans le dépôt Git local, puis :

```powershell
git add .
git commit -m "Ligue 1 Express V5.5.1"
git push origin main
```

Vercel redéploiera automatiquement.

## Important

Le flux principal utilisé pour Ligue 2 / Ligue 3 est un endpoint public externe qui peut évoluer. Le code conserve donc TheSportsDB comme repli automatique afin d'éviter une page totalement vide.
