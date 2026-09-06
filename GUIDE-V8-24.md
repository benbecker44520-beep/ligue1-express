# Foot Français Express V8.24 — articles automatiques contrôlés

## Fonctionnement

1. Le cron LIVE existant continue d'appeler `/api/live-notifications/check`.
2. Toutes les 10 minutes au maximum, le serveur recherche les matchs français terminés durant les dernières 48 heures.
3. Un seul brouillon est créé par match avec le score, les buts, les cartons rouges et un commentaire sur le scénario.
4. Le brouillon reste invisible du public avec le statut **À relire**.
5. Les administrateurs abonnés aux notifications reçoivent une alerte ouvrant l'administration.
6. Le bouton **Valider et publier** publie l'article, puis envoie les posts Facebook et X uniquement si leurs accès sont configurés.

## Étape SQL obligatoire

Exécuter une seule fois le fichier `supabase-v8-24-automatic-articles.sql` dans le SQL Editor de Supabase.

## Variables Vercel

Déjà utilisées par le projet :

- `CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APIFOOTBALL_API_KEY`
- clés VAPID existantes

À vérifier :

- `AUTOMATIC_ARTICLES_ENABLED=true`
- `NEXT_PUBLIC_SITE_URL=https://foot-francais-express.vercel.app`
- `VAPID_SUBJECT=https://foot-francais-express.vercel.app`

Pour Facebook :

- `FACEBOOK_PAGE_ID`
- `FACEBOOK_PAGE_ACCESS_TOKEN`

Pour X :

- `X_API_KEY`
- `X_API_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`

Sans les clés sociales, la validation publie bien l'article sur le site et affiche simplement **Facebook non configuré** / **X non configuré**.

## Sécurité éditoriale

- aucun article automatique n'est publié sans action de l'administrateur ;
- les clés sociales restent exclusivement côté serveur ;
- l'endpoint de validation exige une session administrateur ;
- l'index SQL empêche la création de plusieurs articles pour le même match.
