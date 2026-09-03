# Ligue 1 Express V8.21.1

## Correction des faits marquants

La page Résultats retrouve désormais les événements APIfootball du LIVE grâce
à la date et aux deux équipes. Les buts, cartons et remplacements restent donc
visibles après le coup de sifflet final, même lorsque les fournisseurs utilisent
des identifiants de match différents.

ESPN et SofaScore restent disponibles comme sources de secours.

## Installation

1. Copier le contenu du dossier de mise à jour dans le projet.
2. Lancer `npm.cmd run build`.
3. Publier les quatre fichiers modifiés avec Git.

Aucun SQL et aucune nouvelle variable Vercel ne sont nécessaires.
