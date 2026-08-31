# Ligue 1 Express V5.8 — Newsletter complète

## Nouveautés
- Admin Newsletter avec composition, sélection d’articles et aperçu.
- Bouton d’envoi de test via Resend.
- Envoi individuel aux abonnés actifs via Resend (adresses jamais exposées entre abonnés).
- Historique technique des éditions dans `newsletter_editions`.
- Lien de désinscription unique et sécurisé pour chaque abonné.
- Page publique de confirmation de désinscription.

## Variables Vercel
- `RESEND_API_KEY` : obligatoire, déjà créée côté Resend.
- `NEWSLETTER_FROM_EMAIL` : facultative pour les tests. À renseigner avec une adresse d’un domaine vérifié avant l’envoi réel à tous les abonnés.
- `NEXT_PUBLIC_SITE_URL` : facultative, valeur conseillée `https://ligue1-express.vercel.app`.

## SQL à exécuter
Exécuter `supabase-v5-8-newsletter.sql` une seule fois dans Supabase SQL Editor.

## Important
Le domaine de test `onboarding@resend.dev` est prévu pour les essais. Pour une vraie diffusion à tous les abonnés, vérifie un domaine dans Resend puis ajoute `NEWSLETTER_FROM_EMAIL` dans Vercel.
