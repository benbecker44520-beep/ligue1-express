import Link from "next/link";

export const metadata = { title: "Page introuvable", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <div className="page-shell system-page">
      <span className="system-code">404</span>
      <span className="eyebrow">LIGUE 1 EXPRESS</span>
      <h1>Cette page est hors-jeu.</h1>
      <p>Le contenu demandé n’existe plus ou l’adresse est incorrecte.</p>
      <div className="system-actions">
        <Link className="primary-button" href="/">Retour à l’accueil</Link>
        <Link className="secondary-button" href="/actualites">Voir les actualités</Link>
      </div>
    </div>
  );
}
