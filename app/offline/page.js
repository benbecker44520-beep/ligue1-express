import Link from "next/link";

export const metadata = { title: "Hors connexion" };

export default function OfflinePage() {
  return (
    <div className="container offline-page">
      <section className="offline-card">
        <span>📡 HORS CONNEXION</span>
        <h1>Le match reprend dès que le réseau revient.</h1>
        <p>Impossible de charger de nouvelles données pour le moment. Les pages déjà mises en cache peuvent rester accessibles.</p>
        <div className="offline-actions">
          <Link href="/">Retour à l’accueil</Link>
          <Link href="/fil-express" className="is-secondary">Fil Express</Link>
        </div>
      </section>
    </div>
  );
}
