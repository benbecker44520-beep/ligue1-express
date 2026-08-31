# Ligue 1 Express V5.6.1 — Sources championnats

## Correctifs
- Ligue 2 : ESPN (`fra.2`) devient la source principale pour le classement complet et le calendrier.
- Ligue 3 : ESPN (`fra.3`) est essayé en source principale.
- Un classement incomplet (ex. 5/18 équipes) n'est plus présenté comme un vrai classement.
- TheSportsDB reste uniquement un secours de dernier niveau.
- Match Center Ligue 1 : ESPN est désormais essayé avant Sofascore pour les faits de match, afin de contourner les HTTP 403 observés depuis Vercel.
- Cache ESPN : 5 minutes pour les championnats, avec nouvelles clés V5.6.1.

Aucune migration Supabase supplémentaire n'est nécessaire.
