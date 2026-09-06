import MyClubSpace from "@/components/MyClubSpace";

export const metadata = {
  title: "Mon Club | Foot Français Express",
  description: "Ton espace supporter personnalisé : matchs, classement, actualités, mercato et alertes.",
  robots: { index: false, follow: false, nocache: true }
};

export default function MonClubPage() {
  return <main className="page-shell club-space-page"><MyClubSpace /></main>;
}
