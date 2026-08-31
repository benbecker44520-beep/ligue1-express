import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamById, getTeamDetails, getScorers } from "@/lib/football";
import { getPublishedArticles } from "@/lib/articles";
import { getTransfers } from "@/lib/transfers";
import { sameEntityName } from "@/lib/content-links";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await getTeamById(id);
  if (!result.ok) return { title: "Club Ligue 1", robots: result.notFound ? { index: false } : undefined };
  const club = result.data.club;
  return {
    title: `${club.team} — effectif, résultats, mercato et actualités`,
    description: `Fiche de ${club.team} : classement, forme, matchs, effectif, buteurs, mercato et actualités.`,
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
  const map = {France:"France",Germany:"Allemagne",Spain:"Espagne",Italy:"Italie",Portugal:"Portugal",England:"Angleterre",Scotland:"Écosse",Wales:"Pays de Galles",Ireland:"Irlande",Netherlands:"Pays-Bas",Belgium:"Belgique",Switzerland:"Suisse",Austria:"Autriche",Finland:"Finlande",Sweden:"Suède",Norway:"Norvège",Denmark:"Danemark",Poland:"Pologne",Croatia:"Croatie",Serbia:"Serbie",Slovenia:"Slovénie",Slovakia:"Slovaquie",Ukraine:"Ukraine",Brazil:"Brésil",Argentina:"Argentine",Uruguay:"Uruguay",Colombia:"Colombie",Chile:"Chili",Senegal:"Sénégal",Morocco:"Maroc",Algeria:"Algérie",Tunisia:"Tunisie",Mali:"Mali",Cameroon:"Cameroun",Ghana:"Ghana",Nigeria:"Nigeria",Guinea:"Guinée","Ivory Coast":"Côte d’Ivoire",Japan:"Japon","South Korea":"Corée du Sud",USA:"États-Unis",Canada:"Canada",Mexico:"Mexique",Turkey:"Turquie",Greece:"Grèce",Georgia:"Géorgie",Russia:"Russie",Australia:"Australie"};
  return map[value] || value || "Nationalité —";
}
function groupPosition(position) {
  if (position === "Goalkeeper") return "Gardiens";
  if (position === "Defence") return "Défenseurs";
  if (position === "Midfield") return "Milieux";
  if (position === "Offence") return "Attaquants";
  return "Autres";
}
const transferStatus = { official:"OFFICIEL", advanced:"DOSSIER AVANCÉ", rumour:"RUMEUR" };

export default async function ClubPage({ params }) {
  const { id } = await params;
  const [result, detailsResult, scorersResult, articles, transfers] = await Promise.all([
    getTeamById(id), getTeamDetails(id), getScorers(), getPublishedArticles({ limit: 40 }), getTransfers()
  ]);
  if (result.notFound) notFound();
  if (!result.ok) return <div className="page-shell listing-page"><span className="eyebrow">LIGUE 1 · CLUB</span><h1>Fiche club</h1><div className="football-setup-box"><h2>Données indisponibles</h2><p>{result.error}</p></div></div>;
  const { club, recent, upcoming } = result.data;
  const details = detailsResult.ok ? detailsResult.data : null;
  const groups = ["Gardiens","Défenseurs","Milieux","Attaquants","Autres"].map(label => ({label, players:(details?.squad || []).filter(p => groupPosition(p.position) === label)})).filter(g => g.players.length);
  const clubScorers = scorersResult.ok ? scorersResult.data.filter(s => String(s.teamId) === String(id)).slice(0,5) : [];
  const relatedArticles = articles.filter(a => (a.related_club_ids || []).map(String).includes(String(id))).slice(0,4);
  const clubTransfers = transfers.filter(t => sameEntityName(t.from_club, club.team) || sameEntityName(t.to_club, club.team) || sameEntityName(t.from_club, club.shortName) || sameEntityName(t.to_club, club.shortName)).slice(0,6);

  return <div className="page-shell listing-page club-detail-page club-detail-v7">
    <div className="club-back"><Link href="/classement">← Retour au classement</Link></div>
    <section className="club-hero-card club-hero-v7">
      {club.logo && <Image src={club.logo} alt="" width={120} height={120} unoptimized />}
      <div><span className="eyebrow">LIGUE 1 · CENTRE CLUB</span><h1>{club.team}</h1><p>{club.rank}<sup>e</sup> du classement · <strong>{club.points} points</strong></p><div className="club-hero-links"><a href="#effectif">Effectif</a><a href="#buteurs">Buteurs</a><a href="#mercato">Mercato</a><a href="#actualites">Actualités</a></div></div>
    </section>
    <section className="club-stats-grid">
      <div><span>MATCHS</span><strong>{club.played}</strong></div><div><span>VICTOIRES</span><strong>{club.win}</strong></div><div><span>NULS</span><strong>{club.draw}</strong></div><div><span>DÉFAITES</span><strong>{club.lose}</strong></div><div><span>DIFF. BUTS</span><strong>{club.diff > 0 ? `+${club.diff}` : club.diff}</strong></div><div><span>POINTS</span><strong>{club.points}</strong></div>
    </section>
    <div className="club-fixtures-grid">
      <section className="club-list-card"><div className="club-section-title"><span>DERNIERS MATCHS</span><strong>Forme récente</strong></div>{recent.length ? recent.map(m=>{const o=opponent(m,id); return <Link href={`/match/${m.id}`} className="club-match-row" key={m.id}><span className={`form-badge form-${resultFor(m,id).toLowerCase()}`}>{resultFor(m,id)}</span>{o.logo&&<Image src={o.logo} alt="" width={28} height={28} unoptimized/>}<strong>{o.shortName||o.name}</strong><b>{m.score.home} - {m.score.away}</b><small>J{m.matchday}</small></Link>}) : <p className="club-empty">Aucun match terminé.</p>}</section>
      <section className="club-list-card"><div className="club-section-title"><span>PROCHAINS MATCHS</span><strong>Calendrier</strong></div>{upcoming.length ? upcoming.map(m=>{const o=opponent(m,id); return <Link href={`/match/${m.id}`} className="club-match-row" key={m.id}>{o.logo&&<Image src={o.logo} alt="" width={28} height={28} unoptimized/>}<strong>{o.shortName||o.name}</strong><b>{dateLabel(m.utcDate)}</b><small>J{m.matchday}</small></Link>}) : <p className="club-empty">Aucun match à venir.</p>}</section>
    </div>

    {clubScorers.length > 0 && <section className="club-v7-panel" id="buteurs"><div className="club-section-title"><span>⚽ BUTEURS DU CLUB</span><strong>Saison actuelle</strong></div><div className="club-v7-scorers">{clubScorers.map((s,i)=><Link href={`/joueur/${s.playerId}?club=${id}`} key={s.playerId || s.name}><b>{i+1}</b><div><strong>{s.name}</strong><span>{s.assists != null ? `${s.assists} passe${s.assists>1?"s":""} décisive${s.assists>1?"s":""}` : "Statistiques Ligue 1"}</span></div><em>{s.goals} but{s.goals>1?"s":""}</em></Link>)}</div></section>}

    {details && <>
      <section className="club-info-card">
        <div className="club-section-title"><span>INFOS DU CLUB</span><strong>Données automatiques</strong></div>
        <div className="club-info-grid"><div><span>STADE</span><strong>{details.venue || "—"}</strong></div><div><span>COULEURS</span><strong>{details.clubColors || "—"}</strong></div>{details.founded && <div><span>FONDATION</span><strong>{details.founded}</strong></div>}{details.coach && <div><span>ENTRAÎNEUR</span><strong>{details.coach}</strong></div>}</div>
      </section>
      <section className="club-squad-card" id="effectif">
        <div className="club-section-title"><span>👥 EFFECTIF</span><strong>{details.squad.length} joueurs</strong></div>
        <div className="squad-groups">{groups.map(group => <div className="squad-group" key={group.label}><h2>{group.label}</h2><div className="squad-list">{group.players.map(player => {const scorer=clubScorers.find(s=>String(s.playerId)===String(player.id)); return <Link href={`/joueur/${player.id}?club=${id}`} className="squad-player squad-player-v7" key={player.id}><strong>{player.name}</strong><span>{nationalityFr(player.nationality)}</span><b>{scorer ? `${scorer.goals} but${scorer.goals>1?"s":""}` : ageOf(player.dateOfBirth) != null ? `${ageOf(player.dateOfBirth)} ans` : "Voir la fiche →"}</b></Link>})}</div></div>)}</div>
      </section>
    </>}

    <div className="club-v7-two-cols">
      <section className="club-v7-panel" id="mercato"><div className="club-section-title"><span>🔁 MERCATO</span><strong>{clubTransfers.length ? `${clubTransfers.length} mouvement${clubTransfers.length>1?"s":""}` : "Aucun mouvement"}</strong></div>{clubTransfers.length ? <div className="club-transfer-mini-list">{clubTransfers.map(t=><article key={t.id}><span>{transferStatus[t.transfer_status] || "RUMEUR"}</span><strong>{t.player_name}</strong><p>{t.from_club || "Libre"} → {t.to_club || "À définir"}</p>{t.fee && <b>{t.fee}</b>}</article>)}</div> : <p className="club-empty">Aucun mouvement suivi pour ce club.</p>}<Link className="club-panel-link" href="/mercato">Voir tout le Centre Mercato →</Link></section>
      <section className="club-v7-panel" id="actualites"><div className="club-section-title"><span>📰 ACTUALITÉS</span><strong>{relatedArticles.length ? "Dernières infos" : "À venir"}</strong></div>{relatedArticles.length ? <div className="club-article-mini-list">{relatedArticles.map(a=><Link href={`/article/${a.slug}`} key={a.slug}><span>{a.category}</span><strong>{a.title}</strong><small>Lire l’article →</small></Link>)}</div> : <p className="club-empty">Aucun article lié à ce club pour le moment.</p>}</section>
    </div>
  </div>;
}
