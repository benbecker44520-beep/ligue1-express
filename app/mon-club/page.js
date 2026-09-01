import MyClubSpace from "@/components/MyClubSpace";

export const metadata = {
  title: "Mon Club | Ligue 1 Express",
  description: "Ton espace supporter personnalisé : matchs, classement, actualités, mercato et Fil Express."
};

export default function MonClubPage() {
  return <main className="page-shell club-space-page"><MyClubSpace /></main>;
}
