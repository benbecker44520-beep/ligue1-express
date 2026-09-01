import NotificationCenter from "@/components/NotificationCenter";

export const metadata = {
  title: "Mes alertes | Ligue 1 Express",
  description: "Personnalise tes alertes Ligue 1 Express et prépare ton expérience mobile."
};

export default function AlertsPage() {
  return <main className="page-shell alerts-page"><NotificationCenter /></main>;
}
