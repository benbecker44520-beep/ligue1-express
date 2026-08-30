# LIGUE 1 EXPRESS — ÉTAPE 2 : VRAI BACK-OFFICE

Cette V2 ajoute une vraie base de données, une connexion administrateur, la publication d'articles et l'envoi d'images.

## 1 — Remplacer la V1 par la V2

Décompresse `ligue1-express-v2.zip`.

Tu peux garder la V1 à côté comme sauvegarde.

## 2 — Créer un projet Supabase

1. Va sur https://supabase.com/
2. Crée un compte puis un nouveau projet.
3. Choisis un mot de passe de base de données et garde-le précieusement.
4. Attends que le projet soit prêt.

## 3 — Créer les tables et le stockage

Dans Supabase :
1. Ouvre `SQL Editor`.
2. Clique `New query`.
3. Ouvre le fichier `supabase-setup.sql` fourni dans le projet.
4. Copie tout son contenu dans l'éditeur SQL.
5. Clique sur `Run`.

Cela crée :
- la table `articles`
- les règles de sécurité
- le stockage `article-images`

## 4 — Créer TON compte administrateur

Dans Supabase :
1. Va dans `Authentication`
2. Ouvre `Users`
3. Crée un utilisateur avec ton adresse e-mail et ton mot de passe.

Important : pour ce projet, n'active pas d'inscription publique sur le site.

## 5 — Récupérer les deux informations de connexion

Dans Supabase, ouvre le panneau `Connect` / les réglages API de ton projet.

Il te faut :
- `Project URL`
- `Publishable key`

Ne mets jamais une `service_role key` dans le site.

## 6 — Créer le fichier .env.local

À la racine du dossier `ligue1-express-v2`, crée un fichier exactement nommé :

`.env.local`

Mets dedans :

NEXT_PUBLIC_SUPABASE_URL=https://TON-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TA_CLE_PUBLISHABLE

Remplace les valeurs par celles de ton projet.

## 7 — Installer la V2

Ouvre PowerShell dans le dossier V2 et tape :

npm.cmd install

Puis :

npm.cmd run dev

Ouvre :

http://localhost:3000

## 8 — Tester l'administration

Ouvre :

http://localhost:3000/admin

Connecte-toi avec le compte créé dans Supabase.

Tu peux maintenant :
- écrire un article
- choisir Actualités / Mercato / Analyses
- ajouter une image
- ajouter un lien TikTok
- enregistrer en brouillon
- publier
- dépublier
- supprimer

Un article publié apparaît automatiquement sur le site.

## Sécurité

La V2 utilise les règles RLS de Supabase :
- le public ne peut lire que les articles publiés
- seuls les utilisateurs authentifiés peuvent créer/modifier/supprimer
- les images du site sont publiques
- seuls les utilisateurs authentifiés peuvent envoyer/modifier/supprimer des images

Avant la mise en production finale, nous renforcerons encore l'accès admin en limitant explicitement les droits à ton compte.
