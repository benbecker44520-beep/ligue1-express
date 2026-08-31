# Ligue 1 Express — V5.5

## Ce qui change

### 1. Correction du faux « EN DIRECT »
- Le cache des matchs passe à 5 minutes.
- Nouvelle clé de cache V5.5 pour ne pas réutiliser l'ancien statut.
- Sécurité supplémentaire : si l'API laisse un match en statut LIVE plus de 4 heures après le coup d'envoi et qu'un score est présent, le site le considère comme terminé.

### 2. Nouvel onglet « Championnats »
Routes :
- `/championnats`
- `/championnats/ligue-1`
- `/championnats/ligue-2`
- `/championnats/national`

La Ligue 1 reste alimentée par football-data.org.
La Ligue 2 et le National utilisent TheSportsDB en complément. Si l'API gratuite ne fournit pas un classement complet ou une saison à jour, la page affiche proprement les données disponibles au lieu de casser le site.

### 3. Nouvel onglet « Prono »
Route : `/prono`

Fonctions :
- pronostic simple 1 / N / 2 ;
- commentaire / analyse de la rédaction ;
- brouillon ou publication ;
- historique ;
- résultat évalué automatiquement à partir du score final Ligue 1 ;
- camembert de réussite mis à jour automatiquement ;
- compteur réussis / ratés / en attente ;
- mise en avant du prochain prono sur la page d'accueil.

### 4. Partage social
Sur chaque article public :
- Facebook ;
- X ;
- Instagram via le menu de partage natif quand disponible ;
- copier le lien.

Dans l'Admin, chaque article publié possède aussi les boutons de partage pour préparer rapidement sa publication sur les réseaux.

> La publication totalement automatique sur une Page Facebook ou un compte X sans ouvrir leur interface nécessite ensuite de connecter les API/OAuth des comptes du média. Cette V5.5 ne stocke donc aucun mot de passe ou jeton social dans le code.

---

## Étape obligatoire Supabase pour les pronos

Dans Supabase :
1. Ouvrir **SQL Editor**.
2. Créer une nouvelle requête.
3. Copier tout le contenu du fichier `supabase-v5-5-pronos.sql`.
4. Cliquer sur **Run**.

Aucune autre migration n'est nécessaire.

---

## Variables d'environnement

Aucune nouvelle clé secrète n'est nécessaire.

Variables existantes :

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
FOOTBALL_DATA_TOKEN=...
NEXT_PUBLIC_SITE_URL=https://ligue1-express.vercel.app
```

TheSportsDB utilise sa clé publique gratuite intégrée pour les informations Ligue 2 / National.

---

## Mise à jour GitHub / Vercel

La méthode la plus simple est de conserver le dossier Git déjà connecté à GitHub, puis de remplacer ses fichiers par ceux de la V5.5.

Après remplacement :

```powershell
git status
git add .
git commit -m "Ligue 1 Express V5.5"
git push
```

Vercel redéploiera automatiquement la branche `main`.

Avant le push, vérifier que `.env.local` n'apparaît pas dans `git status`.

---

## Contrôles après déploiement

- accueil : le match terminé ne doit plus rester « EN DIRECT » ;
- `/championnats` : les trois compétitions sont visibles ;
- `/championnats/ligue-1` ;
- `/championnats/ligue-2` ;
- `/championnats/national` ;
- `/prono` ;
- Admin : création d'un prono 1/N/2 ;
- article public : boutons Facebook / X / Instagram / Copier le lien ;
- Admin : boutons de partage sur les articles publiés.
