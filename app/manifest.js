export default function manifest() {
  return {
    name: "Ligue 1 Express",
    short_name: "L1 Express",
    description: "Actualités, résultats, classement, statistiques, clubs et joueurs de Ligue 1.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#f7f8fb",
    theme_color: "#071a46",
    lang: "fr",
    categories: ["sports", "news"],
    shortcuts: [
      { name: "LIVE", short_name: "LIVE", url: "/live" },
      { name: "Mes alertes", short_name: "Alertes", url: "/mes-alertes" }
    ],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
