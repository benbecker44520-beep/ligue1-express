import NotificationCenter from "@/components/NotificationCenter";

export const metadata = {
  title: "Mes alertes | Foot Français Express",
  description: "Personnalise tes alertes Foot Français Express et prépare ton expérience mobile.",
  robots: { index: false, follow: false, nocache: true }
};

export default function AlertsPage() {
  return <main className="page-shell alerts-page"><NotificationCenter /></main>;
}
