# Ligue 1 Express V5.3 — Préparation mise en ligne

Cette version prépare le projet pour un futur déploiement public sans changer le design validé.

## Ajouts
- SEO global avec titres structurés et métadonnées Open Graph.
- Métadonnées dynamiques pour articles, clubs, joueurs et matchs.
- `robots.txt` et `sitemap.xml` générés par Next.js.
- `/admin` exclu de l’indexation des moteurs de recherche.
- Page 404, page d’erreur et écran de chargement aux couleurs Ligue 1 Express.
- En-têtes HTTP de sécurité de base.
- Suppression de l’en-tête `X-Powered-By`.
- Manifest web + icônes pour favoris/mobile.
- Améliorations clavier/accessibilité et respect de `prefers-reduced-motion`.

## Variable recommandée avant mise en ligne
Ajouter dans l’environnement de production :

```env
NEXT_PUBLIC_SITE_URL=https://votre-domaine.fr
```

En local, l’application utilise automatiquement `http://localhost:3000`.

## Démarrage local
Copier `.env.local` depuis la version précédente puis :

```powershell
npm.cmd install
npm.cmd run dev
```

Aucune migration Supabase n’est nécessaire pour cette version.
