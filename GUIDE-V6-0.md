# Ligue 1 Express — V6.0

## V6.0 : le cap média

### Pronostics totalement repensés
- Choix écrit en toutes lettres : « Victoire de Lille OSC », « Match nul », etc.
- Légende pédagogique 1 / N / 2.
- Indice de confiance sur 10 avec jauge.
- Pari complémentaire distinct du choix principal.
- Bloc « Analyse Express » clairement identifié.
- Cartes GAGNÉ / PERDU / EN ATTENTE plus lisibles.
- Forme des 5 derniers pronostics dans le bilan.
- Admin enrichi pour saisir confiance et pari complémentaire.

### Nouveau Centre Mercato
- Tableau des mouvements séparant OFFICIEL / DOSSIER AVANCÉ / RUMEUR.
- Club de départ → club d'arrivée, joueur, poste, montant, type de transfert et note.
- Dashboard avec compteurs mercato.
- Articles mercato conservés sous le tableau live.
- Nouvelle section Admin « Mercato » pour gérer les mouvements sans toucher au code.

## IMPORTANT — SQL obligatoire
Avant d'utiliser les nouvelles fonctions Admin, exécuter `supabase-v6-0.sql` dans Supabase > SQL Editor.

Ce script enrichit la table `predictions` et crée la table `transfers` avec les règles RLS nécessaires.
