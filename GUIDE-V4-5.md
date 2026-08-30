# Ligue 1 Express — V4.5

## Nouveau : buteurs manuels

1. Dans Supabase > SQL Editor, exécute une seule fois `supabase-v4-5-scorers.sql`.
2. Redémarre le site avec `npm.cmd run dev`.
3. Connecte-toi à `/admin`.
4. En bas de l’administration, ouvre **Buteurs des matchs terminés**.
5. Choisis le match, l’équipe, la minute, le nom du buteur et le type de but, puis clique sur **Ajouter le buteur**.
6. Les buteurs apparaissent automatiquement sur `/match/[id]`.

`.env.local` n’est volontairement pas inclus dans le ZIP. Copie celui de ta V4.4 dans le dossier V4.5.
