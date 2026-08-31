# Ligue 1 Express V5.6 — Stats complètes & Match Center

## Nouveautés

### Ligue 2 / Ligue 3
- priorité à Sofascore avec en-têtes navigateur et double URL de secours ;
- classement complet attendu sur 18 clubs ;
- colonnes : J, G, N, P, BP, BC, Diff, Pts ;
- cartes Leader / Meilleure attaque / Meilleure défense / Moyenne de buts ;
- meilleurs buteurs lorsque le flux les fournit ;
- TheSportsDB reste seulement un secours et affiche clairement sa limite si Sofascore est indisponible.

### Articles
- nouvelle sélection « Clubs concernés » dans l'admin ;
- les clubs sélectionnés s'affichent sur l'article ;
- clic sur un club = fiche `/club/[id]`.

### Match Center Ligue 1
- nouveau bloc « Résultat · Fil du match » sur les fiches matchs ;
- buts ;
- buts refusés / VAR ;
- cartons jaunes ;
- cartons rouges ;
- remplacements.

Les incidents détaillés sont récupérés depuis le flux public Sofascore et associés au match Ligue 1 par date + équipes.

## SQL obligatoire
Dans Supabase > SQL Editor, exécuter :

`supabase-v5-6-related-clubs.sql`

Aucune autre migration n'est nécessaire.

## Mise à jour
Copier cette version dans le dossier Git propre en excluant `.git`, `.env.local`, `.next` et `node_modules`, puis :

```powershell
git add .
git commit -m "Ligue 1 Express V5.6"
git push origin main
```

Vercel redéploiera automatiquement.

## Remarque source de données
Sofascore n'est pas une API commerciale officiellement documentée. Cette intégration est utilisée sans clé et avec un mécanisme de secours. Pour une garantie contractuelle de disponibilité à long terme, une API sportive payante dédiée reste préférable.
