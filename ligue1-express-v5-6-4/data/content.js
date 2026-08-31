export const articles = [
  {
    slug: "debrief-express-journee",
    category: "À LA UNE",
    title: "Le débrief express : les 5 choses à retenir de la journée",
    excerpt: "Les faits marquants, les joueurs qui ont brillé et les tendances à surveiller en Ligue 1.",
    body: [
      "Bienvenue dans le Débrief Express. Cette première version du site utilise du contenu de démonstration afin de valider le design et la navigation.",
      "L'objectif de Ligue 1 Express est simple : aller droit à l'essentiel, sans perdre le contexte. Les articles pourront accompagner les vidéos TikTok avec des analyses plus détaillées, des statistiques et les informations à retenir.",
      "La prochaine étape sera de connecter les résultats et le classement à une source de données football, puis d'ajouter une véritable interface d'administration."
    ],
    accent: "hero"
  },
  {
    slug: "joueur-a-suivre",
    category: "ACTUALITÉS",
    title: "Le joueur à suivre ce week-end",
    excerpt: "Forme, rôle tactique et statistiques : pourquoi il peut faire la différence.",
    body: [
      "Un format court pensé pour compléter les vidéos Ligue 1 Express.",
      "Ici pourront apparaître les statistiques clés du joueur, son importance dans le système de son équipe et les duels à surveiller."
    ],
    accent: "blue"
  },
  {
    slug: "mercato-trois-dossiers",
    category: "MERCATO",
    title: "Mercato : trois dossiers à surveiller",
    excerpt: "Les mouvements et rumeurs qui pourraient animer les prochaines semaines.",
    body: [
      "Cette rubrique accueillera les informations mercato avec une distinction claire entre officiel, rumeur et information à confirmer.",
      "Le format permettra également d'intégrer une vidéo TikTok directement dans l'article."
    ],
    accent: "red"
  },
  {
    slug: "analyse-tactique",
    category: "ANALYSES",
    title: "Analyse : pourquoi ce système pose autant de problèmes",
    excerpt: "Une lecture simple du plan de jeu, avec les clés tactiques à retenir.",
    body: [
      "Ligue 1 Express pourra proposer des analyses accessibles, avec des schémas et des séquences vidéo.",
      "Le but n'est pas de rendre le football compliqué, mais de montrer rapidement ce qui fait basculer un match."
    ],
    accent: "yellow"
  }
];

export const results = [
  { home: "Paris SG", away: "Marseille", hs: 3, as: 1, status: "Terminé" },
  { home: "Lille", away: "Lens", hs: 2, as: 0, status: "Terminé" },
  { home: "Lyon", away: "Monaco", hs: 1, as: 1, status: "Terminé" }
];

export const standings = [
  { pos: 1, team: "Paris SG", pts: 21, played: 8 },
  { pos: 2, team: "Marseille", pts: 17, played: 8 },
  { pos: 3, team: "Monaco", pts: 16, played: 8 },
  { pos: 4, team: "Lille", pts: 15, played: 8 },
  { pos: 5, team: "Nice", pts: 14, played: 8 }
];
