# Ligue 1 Express V8.19 — Notifications LIVE

## Ce que contient la mise à jour

- Web Push Android et iPhone, même navigateur fermé ou écran verrouillé.
- Activation séparée sur chaque téléphone depuis `Mes alertes`.
- Préférences : but, faute importante, hors-jeu et carton rouge.
- Priorité au club favori.
- Notification de test réellement envoyée par le serveur.
- Clic sur la notification vers le Centre Match LIVE.
- Anti-doublon en base de données.
- Suppression automatique des abonnements expirés.

Les buts et cartons rouges sont fournis par le flux actuel. Les fautes et hors-jeu sont prêts techniquement, mais ne seront envoyés que lorsqu'une source LIVE fournit ces événements individuellement.

## 1. SQL

Exécuter `supabase-v8-19-live-push.sql` dans le SQL Editor Supabase.

## 2. Générer les clés Web Push

Après avoir copié la mise à jour dans le projet :

```powershell
npm install
npm run push:keys
```

La commande affiche une clé publique et une clé privée. Ne jamais publier la clé privée.

## 3. Variables Vercel

Dans Vercel > Project > Settings > Environment Variables, ajouter pour Production :

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` : clé publique générée.
- `VAPID_PRIVATE_KEY` : clé privée générée, marquée sensible.
- `VAPID_SUBJECT` : `https://ligue1-express.vercel.app`.
- `SUPABASE_SERVICE_ROLE_KEY` : clé serveur `service_role`/secret récupérée dans Supabase > Project Settings > API Keys. Ne jamais utiliser cette clé côté navigateur.
- `CRON_SECRET` : une longue valeur aléatoire. PowerShell peut en produire une avec `[guid]::NewGuid().ToString("N")`.

Redéployer le site après l'ajout des variables.

## 4. Déclencher la surveillance LIVE

L'URL protégée est :

`https://ligue1-express.vercel.app/api/live-notifications/check`

Elle doit être appelée chaque minute par un planificateur (Vercel Cron compatible avec le forfait utilisé, ou cron-job.org). Ajouter l'en-tête HTTP :

`Authorization: Bearer VALEUR_DE_CRON_SECRET`

Sans cet en-tête exact, la route refuse l'accès. Le secret ne doit jamais apparaître dans une URL publique.

## 5. Test Android

1. Ouvrir le site avec Chrome et se connecter.
2. Choisir son club favori ou désactiver `Priorité à mon club`.
3. Ouvrir `Mes alertes`.
4. Appuyer sur `Activer sur ce téléphone` et accepter Android.
5. Appuyer sur `Envoyer un test`.
6. Fermer Chrome et vérifier la réception de la notification.

## 6. Test iPhone

1. Ouvrir le site dans Safari.
2. Partager > Sur l'écran d'accueil.
3. Ouvrir Ligue 1 Express depuis l'icône installée.
4. Se connecter puis activer les notifications dans `Mes alertes`.

## Sécurité

- Les abonnements appartiennent à l'utilisateur connecté grâce aux règles RLS.
- L'envoi global utilise uniquement la clé serveur stockée dans Vercel.
- Le contrôleur LIVE exige `CRON_SECRET`.
- Une clé unique par événement empêche les envois répétés.
