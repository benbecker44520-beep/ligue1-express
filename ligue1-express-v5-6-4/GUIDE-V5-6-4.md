# Ligue 1 Express V5.6.4

## Nouveau menu Admin
L'administration est maintenant séparée en 4 espaces :
- Articles
- Pronostics
- Buteurs
- Faits marquants

## Faits marquants manuels
Dans Admin > Faits marquants, sélectionner un match terminé puis ajouter :
- but
- but refusé / VAR
- carton jaune
- carton rouge
- remplacement

Les événements sont affichés sur la fiche match et fusionnés avec les événements automatiques lorsqu'ils sont disponibles.

## SQL obligatoire
Exécuter une seule fois le fichier `supabase-v5-6-4-match-events.sql` dans Supabase SQL Editor avant d'utiliser la rubrique Faits marquants.

Aucune clé API n'est présente dans cette archive.
