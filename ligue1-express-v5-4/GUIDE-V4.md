# Ligue 1 Express — V4

La V4 ajoute :
- bouton ⭐ Mettre à la Une dans l'administration
- une seule Une éditoriale à la fois
- vrais matchs Ligue 1 via API-Football
- vrai classement Ligue 1
- logos des clubs
- page Résultats & calendrier dynamique
- page Classement dynamique
- cache serveur pour limiter les appels API
- clé API Football conservée côté serveur

## 1. Migration Supabase (une seule fois)

Dans Supabase > SQL Editor > New query :
ouvre `supabase-v4-featured.sql`, copie tout, puis Run.

Tu dois obtenir `Success. No rows returned`.

## 2. Créer un compte API-Football

Va sur https://www.api-football.com/
Crée un compte et active le plan Free.

Le plan Free fournit actuellement 100 requêtes/jour et inclut notamment Fixtures, Livescore, Standings et Teams.

## 3. Récupérer la clé

Dans le dashboard API-Football, copie ta clé API.

Ne la partage pas et ne la mets jamais dans une variable `NEXT_PUBLIC_`.

## 4. Modifier .env.local

Copie le `.env.local` de ta V3.1 dans la V4 puis ajoute une troisième ligne :

API_FOOTBALL_KEY=TA_VRAIE_CLE

Ton fichier doit donc contenir :

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
API_FOOTBALL_KEY=...

## 5. Lancer

npm.cmd install
npm.cmd run dev

Puis ouvre le port indiqué.

## 6. Test À LA UNE

Dans Admin > Mes articles :
- un article publié possède `⭐ Mettre à la Une`
- clique dessus
- recharge l'accueil
- le nouvel article reste en Une même si tu publies ensuite une petite news

## 7. Test football

Ouvre :
- `/resultats`
- `/classement`

L'accueil affiche également 3 matchs et le top 5 du classement.

## Notes API

La V4 utilise :
- Ligue 1 API-Football ID : 61
- saison calculée automatiquement à partir de la date
- cache 10 minutes sur les matchs
- cache 15 minutes sur le classement

La clé API est appelée uniquement côté serveur et n'est pas exposée au navigateur.
