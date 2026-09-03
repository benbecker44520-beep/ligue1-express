# Ligue 1 Express — V8.16 Comptes membres

## Fonctionnement

Le contenu public reste accessible sans compte : actualités, mercato, matchs, résultats, LIVE, classements, statistiques et pronostics de la rédaction.

La connexion est demandée uniquement pour :

- voter aux pronostics supporters ;
- choisir un club préféré ;
- enregistrer les alertes ;
- accéder au profil, aux points et aux badges.

## 1. SQL obligatoire

Exécuter intégralement `supabase-v8-16-member-accounts.sql` dans le SQL Editor de Supabase.

## 2. Réglages Supabase Auth

Dans **Authentication → Providers → Email**, vérifier que le fournisseur Email est activé.

Dans **Authentication → URL Configuration** :

- Site URL : `https://ligue1-express.vercel.app`
- Redirect URLs : ajouter `https://ligue1-express.vercel.app/connexion`
- Pour les essais locaux, ajouter aussi `http://localhost:3000/connexion`

La confirmation par e-mail peut rester activée. En production, un SMTP personnalisé pourra être relié au futur nom de domaine.

## 3. Migration des profils existants

Lorsqu'un visiteur crée son compte depuis son navigateur habituel, son ancien pseudo, ses votes, son club et ses préférences sont automatiquement rattachés au compte.

## 4. Installation

```powershell
npm run build
git add .
git commit -m "Ajout comptes membres V8.16"
git push origin main
```

## 5. Vérifications

1. Créer un compte depuis `/connexion` sur le navigateur contenant le profil existant.
2. Confirmer l'adresse e-mail si l'option est active.
3. Se connecter et vérifier `/mon-profil-supporter`.
4. Vérifier un vote dans `/prono`.
5. Choisir un club dans `/mon-club`, puis se reconnecter depuis un autre appareil.
6. Tester « Mot de passe oublié ».
