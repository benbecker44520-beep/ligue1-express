"use client";

export default function GlobalError({ reset }) {
  return (
    <div className="page-shell system-page">
      <span className="system-code">!</span>
      <span className="eyebrow">LIGUE 1 EXPRESS</span>
      <h1>Un incident s’est produit.</h1>
      <p>La page n’a pas pu être chargée correctement. Tu peux réessayer immédiatement.</p>
      <div className="system-actions">
        <button className="primary-button" onClick={() => reset()}>Réessayer</button>
        <a className="secondary-button" href="/">Retour à l’accueil</a>
      </div>
    </div>
  );
}
