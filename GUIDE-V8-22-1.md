# Ligue 1 Express V8.22.1 — statistiques fiables

## Corrections

- Filtrage des robots et navigateurs automatisés connus.
- Exclusion des visites lorsque l'utilisateur connecté est administrateur.
- Une même page actualisée plusieurs fois rapidement n'est plus recomp­tée.
- Unicité renforcée côté Supabase par tranche de dix minutes.
- Calcul de « aujourd'hui » selon le fuseau Europe/Paris.
- Suppression des anciennes statistiques contaminées afin de repartir à zéro.

## Ordre d'installation

1. Exécuter `supabase-v8-22-1-analytics-fix.sql` dans Supabase SQL Editor.
2. Copier les fichiers de la mise à jour dans le projet.
3. Lancer `npm.cmd run build` puis publier avec Git.
