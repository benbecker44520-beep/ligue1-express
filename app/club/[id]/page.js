import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamById, getTeamDetails } from "@/lib/football";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await getTeamById(id);
  if (!result.ok) return { title: "Club Ligue 1", robots: result.notFound ? { index: false } : undefined };
  const club = result.data.club;
  return {
    title: `${club.team} — effectif, résultats et classement`,
    description: `Fiche de ${club.team} : classement, points, derniers résultats, prochains matchs et effectif.`,
    alternates: { canonical: `/club/${id}` },
    openGraph: { title: club.team, description: `Toute l’actualité sportive de ${club.team} sur Ligue 1 Express.`, images: club.logo ? [{ url: club.logo }] : undefined }
  };
}

function dateLabel(date) {
  const d = new Date(date);
  const time = new Intl.DateTimeFormat("fr-FR", { hour:"2-digit", minute:"2-digit", hour12:false, timeZone:"Europe/Paris" }).format(d);
  const day = new Intl.DateTimeFormat("fr-FR", { day:"2-digit", month:"short", timeZone:"Europe/Paris" }).format(d);
  return time === "02:00" ? `${day} · Horaire à confirmer` : `${day}, ${time}`;
}
function opponent(match, id) { return String(match.home.id) === String(id) ? match.away : match.home; }
function resultFor(match, id) {
  const home = String(match.home.id) === String(id);
  const gf = home ? match.score.home : match.score.away;
  const ga = home ? match.score.away : match.score.home;
  if (gf == null || ga == null) return "—";
  return gf > ga ? "V" : gf < ga ? "D" : "N";
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
  const map = {
    France:"France", Germany:"Allemagne", Spain:"Espagne", Italy:"Italie", Portugal:"Portugal",
    England:"Angleterre", Scotland:"Écosse", Wales:"Pays de Galles", Ireland:"Irlande",
    Netherlands:"Pays-Bas", Belgium:"Belgique", Switzerland:"Suisse", Austria:"Autriche",
    Finland:"Finlande", Sweden:"Suède", Norway:"Norvège", Denmark:"Danemark", Poland:"Pologne",
    Croatia:"Croatie", Serbia:"Serbie", Slovenia:"Slovénie", Slovakia:"Slovaquie", Ukraine:"Ukraine",
    Brazil:"Brésil", Argentina:"Argentine", Uruguay:"Uruguay", Colombia:"Colombie", Chile:"Chili",
    Senegal:"Sénégal", Morocco:"Maroc", Algeria:"Algérie", Tunisia:"Tunisie", Mali:"Mali",
    Cameroon:"Cameroun", Ghana:"Ghana", Nigeria:"Nigeria", Guinea:"Guinée", "Ivory Coast":"Côte d’Ivoire",
    Japan:"Japon", "South Korea":"Corée du Sud", USA:"États-Unis", Canada:"Canada", Mexico:"Mexique",
    Turkey:"Turquie", Greece:"Grèce", Georgia:"Géorgie", Russia:"Russie", Australia:"Australie"
  };
  return map[value] || value || "Nationalité —";
}
function groupPosition(position) {
  if (position === "Goalkeeper") return "Gardiens";
  if (position === "Defence") return "Défenseurs";
  if (position === "Midfield") return "Milieux";
  if (position === "Offence") return "Attaquants";
  return "Autres";
}

export default async function ClubPage({ params }) {
  const { id } = await params;
  const [result, detailsResult] = await Promise.all([getTeamById(id), getTeamDetails(id)]);
  if (result.notFound) notFound();
  if (!result.ok) return <div className="page-shell listing-page"><span className="eyebrow">LIGUE 1 · CLUB</span><h1>Fiche club</h1><div className="football-setup-box"><h2>Données indisponibles</h2><p>{result.error}</p></div></div>;
  const { club, recent, upcoming } = result.data;
  const details = detailsResult.ok ? detailsResult.data : null;
  const groups = ["Gardiens","Défenseurs","Milieux","Attaquants","Autres"].map(label => ({label, players:(details?.squad || []).filter(p => groupPosition(p.position) === label)})).filter(g => g.players.length);
  return <div className="page-shell listing-page club-detail-page">
    <div className="club-back"><Link href="/classement">← Retour au classement</Link></div>
    <section className="club-hero-card">
      {club.logo && <Image src={club.logo} alt="" width={120} height={120} unoptimized />}
      <div><span className="eyebrow">LIGUE 1 · SAISON ACTUELLE</span><h1>{club.team}</h1><p>{club.rank}<sup>e</sup> du classement · <strong>{club.points} points</strong></p></div>
    </section>
    <section className="club-stats-grid">
      <div><span>MATCHS</span><strong>{club.played}</strong></div><div><span>VICTOIRES</span><strong>{club.win}</strong></div><div><span>NULS</span><strong>{club.draw}</strong></div><div><span>DÉFAITES</span><strong>{club.lose}</strong></div><div><span>DIFF. BUTS</span><strong>{club.diff > 0 ? `+${club.diff}` : club.diff}</strong></div><div><span>POINTS</span><strong>{club.points}</strong></div>
    </section>
    <div className="club-fixtures-grid">
      <section className="club-list-card"><div className="club-section-title"><span>DERNIERS MATCHS</span><strong>Forme récente</strong></div>{recent.length ? recent.map(m=>{const o=opponent(m,id); return <Link href={`/match/${m.id}`} className="club-match-row" key={m.id}><span className={`form-badge form-${resultFor(m,id).toLowerCase()}`}>{resultFor(m,id)}</span>{o.logo&&<Image src={o.logo} alt="" width={28} height={28} unoptimized/>}<strong>{o.shortName||o.name}</strong><b>{m.score.home} - {m.score.away}</b><small>J{m.matchday}</small></Link>}) : <p className="club-empty">Aucun match terminé.</p>}</section>
      <section className="club-list-card"><div className="club-section-title"><span>PROCHAINS MATCHS</span><strong>Calendrier</strong></div>{upcoming.length ? upcoming.map(m=>{const o=opponent(m,id); return <Link href={`/match/${m.id}`} className="club-match-row" key={m.id}>{o.logo&&<Image src={o.logo} alt="" width={28} height={28} unoptimized/>}<strong>{o.shortName||o.name}</strong><b>{dateLabel(m.utcDate)}</b><small>J{m.matchday}</small></Link>}) : <p className="club-empty">Aucun match à venir.</p>}</section>
    </div>
    {details && <>
      <section className="club-info-card">
        <div className="club-section-title"><span>INFOS DU CLUB</span><strong>Données automatiques</strong></div>
        <div className="club-info-grid">
          <div><span>STADE</span><strong>{details.venue || "—"}</strong></div>
          <div><span>COULEURS</span><strong>{details.clubColors || "—"}</strong></div>
          {details.founded && <div><span>FONDATION</span><strong>{details.founded}</strong></div>}
          {details.coach && <div><span>ENTRAÎNEUR</span><strong>{details.coach}</strong></div>}
        </div>
      </section>
      <section className="club-squad-card">
        <div className="club-section-title"><span>EFFECTIF</span><strong>{details.squad.length} joueurs</strong></div>
        <div className="squad-groups">{groups.map(group => <div className="squad-group" key={group.label}><h2>{group.label}</h2><div className="squad-list">{group.players.map(player => <Link href={`/joueur/${player.id}`} className="squad-player" key={player.id}><strong>{player.name}</strong><span>{nationalityFr(player.nationality)}</span><b>{ageOf(player.dateOfBirth) != null ? `${ageOf(player.dateOfBirth)} ans` : "Âge —"}</b></Link>)}</div></div>)}</div>
      </section>
    </>}
  </div>;
}
