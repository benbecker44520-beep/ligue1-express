import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonDetails } from "@/lib/football";
import { getPlayerPhoto } from "@/lib/player-media";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await getPersonDetails(id);
  if (!result.ok) return { title: "Joueur Ligue 1", robots: result.notFound ? { index: false } : undefined };
  const p = result.data;
  return {
    title: `${p.name} — fiche joueur`,
    description: `${p.name} : poste, âge, nationalité et club actuel sur Ligue 1 Express.`,
    alternates: { canonical: `/joueur/${id}` },
    openGraph: { title: p.name, description: `Fiche joueur de ${p.name}${p.currentTeam?.name ? ` — ${p.currentTeam.name}` : ""}.` }
  };
}

function ageOf(date) {
  if (!date) return null;
  const birth = new Date(date); const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
function nationalityFr(value) {
  const map = {France:"France",Germany:"Allemagne",Spain:"Espagne",Italy:"Italie",Portugal:"Portugal",England:"Angleterre",Scotland:"Écosse",Wales:"Pays de Galles",Ireland:"Irlande",Netherlands:"Pays-Bas",Belgium:"Belgique",Switzerland:"Suisse",Austria:"Autriche",Finland:"Finlande",Sweden:"Suède",Norway:"Norvège",Denmark:"Danemark",Poland:"Pologne",Croatia:"Croatie",Serbia:"Serbie",Slovenia:"Slovénie",Slovakia:"Slovaquie",Ukraine:"Ukraine",Brazil:"Brésil",Argentina:"Argentine",Uruguay:"Uruguay",Colombia:"Colombie",Chile:"Chili",Senegal:"Sénégal",Morocco:"Maroc",Algeria:"Algérie",Tunisia:"Tunisie",Mali:"Mali",Cameroon:"Cameroun",Ghana:"Ghana",Nigeria:"Nigeria",Guinea:"Guinée","Ivory Coast":"Côte d’Ivoire",Japan:"Japon","South Korea":"Corée du Sud",USA:"États-Unis",Canada:"Canada",Mexico:"Mexique",Turkey:"Turquie",Greece:"Grèce",Georgia:"Géorgie",Russia:"Russie",Australia:"Australie"};
  return map[value] || value || "—";
}
function positionFr(value) {
  return ({Goalkeeper:"Gardien",Defence:"Défenseur",Midfield:"Milieu",Offence:"Attaquant"})[value] || value || "—";
}
function birthFr(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(value));
}

export default async function PlayerPage({ params }) {
  const { id } = await params;
  const result = await getPersonDetails(id);
  if (result.notFound) notFound();
  if (!result.ok) return <div className="page-shell listing-page"><span className="eyebrow">LIGUE 1 · JOUEUR</span><h1>Fiche joueur</h1><div className="football-setup-box"><h2>Données indisponibles</h2><p>{result.error}</p></div></div>;
  const p = result.data;
  const photoResult = await getPlayerPhoto(p.name);
  const playerPhoto = photoResult.ok ? photoResult.data?.image : null;
  const age = ageOf(p.dateOfBirth);
  return <div className="page-shell listing-page player-detail-page">
    <div className="club-back">{p.currentTeam?.id ? <Link href={`/club/${p.currentTeam.id}`}>← Retour à {p.currentTeam.shortName || p.currentTeam.name}</Link> : <Link href="/classement">← Retour aux clubs</Link>}</div>
    <section className={`player-hero-card ${playerPhoto ? "has-player-photo" : ""}`}>
      <div className="player-photo-stage">
        {playerPhoto ? <img src={playerPhoto} alt={`Portrait de ${p.name}`} className="player-photo" /> : <div className="player-avatar">{p.currentTeam?.crest ? <Image src={p.currentTeam.crest} alt="" width={92} height={92} unoptimized /> : <span>{p.name?.slice(0,1)}</span>}</div>}
      </div>
      <div className="player-hero-copy"><span className="eyebrow">LIGUE 1 · FICHE JOUEUR</span><h1>{p.name}</h1><p>{positionFr(p.position)}{p.currentTeam?.name ? <> · <Link href={`/club/${p.currentTeam.id}`}>{p.currentTeam.name}</Link></> : null}</p></div>
      {p.currentTeam?.crest && <div className="player-hero-crest"><Image src={p.currentTeam.crest} alt={`Logo ${p.currentTeam.name}`} width={76} height={76} unoptimized /></div>}
    </section>
    <section className="player-info-card">
      <div><span>POSTE</span><strong>{positionFr(p.position)}</strong></div>
      <div><span>NATIONALITÉ</span><strong>{nationalityFr(p.nationality)}</strong></div>
      <div><span>ÂGE</span><strong>{age != null ? `${age} ans` : "—"}</strong></div>
      <div><span>DATE DE NAISSANCE</span><strong>{birthFr(p.dateOfBirth)}</strong></div>
      {p.shirtNumber != null && <div><span>NUMÉRO</span><strong>#{p.shirtNumber}</strong></div>}
    </section>
    {p.currentTeam && <section className="player-club-card"><div className="club-section-title"><span>CLUB ACTUEL</span><strong>Ligue 1</strong></div><Link href={`/club/${p.currentTeam.id}`} className="player-club-link">{p.currentTeam.crest && <Image src={p.currentTeam.crest} alt="" width={54} height={54} unoptimized />}<div><strong>{p.currentTeam.name}</strong><span>Voir la fiche du club →</span></div></Link></section>}
    <div className="player-note">Les informations sportives sont synchronisées avec football-data.org. Le portrait est chargé automatiquement via TheSportsDB lorsqu’il est disponible.</div>
  </div>;
}
