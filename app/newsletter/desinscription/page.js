import Link from "next/link";

export default async function UnsubscribePage({ searchParams }) {
  const params = await searchParams;
  const status = params?.status;
  const ok = status === "ok";
  return <div className="page-shell unsubscribe-page">
    <span className="eyebrow">NEWSLETTER</span>
    <h1>{ok ? "Désinscription confirmée" : "Lien de désinscription invalide"}</h1>
    <p>{ok ? "Ton adresse ne recevra plus les newsletters Ligue 1 Express." : "Ce lien n'est plus valide ou une erreur est survenue."}</p>
    <Link className="primary-button" href="/">Retour à l'accueil</Link>
  </div>;
}
