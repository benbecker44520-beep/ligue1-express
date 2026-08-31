import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonDetails, getScorers, getTeamById } from "@/lib/football";
import { getPlayerPhoto } from "@/lib/player-media";
import { getPublishedArticles } from "@/lib/articles";
import { getTransfers } from "@/lib/transfers";
import { articleMentions, sameEntityName } from "@/lib/content-links";

export const revalidate = 0;

export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const result = await getPersonDetails(id, query?.club);
  if (!result.ok) return { title: "Joueur Ligue 1", robots: result.notFound ? { index: false } : undefined };
  const p = result.data;
  return { title: `${p.name} — stats, club, matchs et mercato`, description: `${p.name} : fiche joueur, statistiques Ligue 1, club, matchs, mercato et actualités.`, alternates: { canonical: `/joueur/${id}` }, openGraph: { title: p.name, description: `Fiche joueur de ${p.name}${p.currentTeam?.name ? ` — ${p.currentTeam.name}` : ""}.` } };
}
function ageOf(date) { if (!date) return null; const birth = new Date(date); const now = new Date(); let age = now.getFullYear() - birth.getFullYear(); const m = now.getMonth() - birth.getMonth(); if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--; return age; }
function nationalityFr(value) { const map = {France:"France",Germany:"Allemagne",Spain:"Espagne",Italy:"Italie",Portugal:"Portugal",England:"Angleterre",Scotland:"Écosse",Wales:"Pays de Galles",Ireland:"Irlande",Netherlands:"Pays-Bas",Belgium:"Belgique",Switzerland:"Suisse",Austria:"Autriche",Finland:"Finlande",Sweden:"Suède",Norway:"Norvège",Denmark:"Danemark",Poland:"Pologne",Croatia:"Croatie",Serbia:"Serbie",Slovenia:"Slovénie",Slovakia:"Slovaquie",Ukraine:"Ukraine",Brazil:"Brésil",Argentina:"Argentine",Uruguay:"Uruguay",Colombia:"Colombie",Chile:"Chili",Senegal:"Sénégal",Morocco:"Maroc",Algeria:"Algérie",Tunisia:"Tunisie",Mali:"Mali",Cameroon:"Cameroun",Ghana:"Ghana",Nigeria:"Nigeria",Guinea:"Guinée","Ivory Coast":"Côte d’Ivoire",Japan:"Japon","South Korea":"Corée du Sud",USA:"États-Unis",Canada:"Canada",Mexico:"Mexique",Turkey:"Turquie",Greece:"Grèce",Georgia:"Géorgie",Russia:"Russie",Australia:"Australie"}; return map[value] || value || "—"; }
function positionFr(value) { return ({Goalkeeper:"Gardien",Defence:"Défenseur",Midfield:"Milieu",Offence:"Attaquant"})[value] || value || "—"; }
function birthFr(value) { if (!value) return "—"; return new Intl.DateTimeFormat("fr-FR", {day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(value)); }
function opponent(match, teamId) { return String(match.home.id) === String(teamId) ? match.away : match.home; }
function resultFor(match, teamId) { const home=String(match.home.id)===String(teamId); const gf=home?match.score.home:match.score.away; const ga=home?match.score.away:match.score.home; if(gf==null||ga==null)return "—"; return gf>ga?"V":gf<ga?"D":"N"; }

export default async function PlayerPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const result = await getPersonDetails(id, query?.club);
  if (result.notFound) notFound();
  if (!result.ok) return <div className="page-shell listing-page"><span className="eyebrow">LIGUE 1 · JOUEUR</span><h1>Fiche joueur</h1><div className="football-setup-box"><h2>Données indisponibles</h2><p>Les données du joueur sont temporairement indisponibles. Réessaie dans quelques instants.</p></div></div>;
  const p = result.data;
  const [photoResult, scorersResult, teamResult, articles, transfers] = await Promise.all([
    getPlayerPhoto(p.name), getScorers(), p.currentTeam?.id ? getTeamById(p.currentTeam.id) : Promise.resolve({ok:false}), getPublishedArticles({limit:50}), getTransfers()
  ]);
  const playerPhoto = photoResult.ok ? photoResult.data?.image : null;
  const age = ageOf(p.dateOfBirth);
  const scorer = scorersResult.ok ? scorersResult.data.find(s => String(s.playerId) === String(id)) : null;
  const relatedArticles = articles.filter(a => articleMentions(a, p.name)).slice(0,4);
  const playerTransfers = transfers.filter(t => sameEntityName(t.player_name, p.name)).slice(0,5);
  const recent = teamResult.ok ? teamResult.data.recent.slice(0,5) : [];
  const upcoming = teamResult.ok ? teamResult.data.upcoming.slice(0,3) : [];

  return <div className="page-shell listing-page player-detail-page player-detail-v7">
    <div className="club-back">{p.currentTeam?.id ? <Link href={`/club/${p.currentTeam.id}`}>← Retour à {p.currentTeam.shortName || p.currentTeam.name}</Link> : <Link href="/classement">← Retour aux clubs</Link>}</div>
    <section className={`player-hero-card player-hero-v7 ${playerPhoto ? "has-player-photo" : ""}`}>
      <div className="player-photo-stage">{playerPhoto ? <img src={playerPhoto} alt={`Portrait de ${p.name}`} className="player-photo" /> : <div className="player-avatar">{p.currentTeam?.crest ? <Image src={p.currentTeam.crest} alt="" width={92} height={92} unoptimized /> : <span>{p.name?.slice(0,1)}</span>}</div>}</div>
      <div className="player-hero-copy"><span className="eyebrow">LIGUE 1 · CENTRE JOUEUR</span><h1>{p.name}</h1><p>{positionFr(p.position)}{p.currentTeam?.name ? <> · <Link href={`/club/${p.currentTeam.id}`}>{p.currentTeam.name}</Link></> : null}</p>{scorer && <div className="player-v7-highlight"><strong>{scorer.goals}</strong><span>but{scorer.goals>1?"s":""} en Ligue 1</span>{scorer.assists != null && <><strong>{scorer.assists}</strong><span>passe{scorer.assists>1?"s":""} décisive{scorer.assists>1?"s":""}</span></>}</div>}</div>
      {p.currentTeam?.crest && <div className="player-hero-crest"><Image src={p.currentTeam.crest} alt={`Logo ${p.currentTeam.name}`} width={76} height={76} unoptimized /></div>}
    </section>
    <section className="player-info-card"><div><span>POSTE</span><strong>{positionFr(p.position)}</strong></div><div><span>NATIONALITÉ</span><strong>{nationalityFr(p.nationality)}</strong></div><div><span>ÂGE</span><strong>{age != null ? `${age} ans` : "—"}</strong></div><div><span>DATE DE NAISSANCE</span><strong>{birthFr(p.dateOfBirth)}</strong></div>{p.shirtNumber != null && <div><span>NUMÉRO</span><strong>#{p.shirtNumber}</strong></div>}</section>

    {p.currentTeam && <section className="player-club-card"><div className="club-section-title"><span>CLUB ACTUEL</span><strong>Ligue 1</strong></div><Link href={`/club/${p.currentTeam.id}`} className="player-club-link">{p.currentTeam.crest && <Image src={p.currentTeam.crest} alt="" width={54} height={54} unoptimized />}<div><strong>{p.currentTeam.name}</strong><span>Voir le centre du club →</span></div></Link></section>}

    {(recent.length > 0 || upcoming.length > 0) && <div className="player-v7-match-grid">
      <section className="club-v7-panel"><div className="club-section-title"><span>📊 DERNIERS MATCHS DU CLUB</span><strong>Forme</strong></div>{recent.map(m=>{const o=opponent(m,p.currentTeam.id); return <Link className="player-v7-match-row" href={`/match/${m.id}`} key={m.id}><span className={`form-badge form-${resultFor(m,p.currentTeam.id).toLowerCase()}`}>{resultFor(m,p.currentTeam.id)}</span>{o.logo&&<Image src={o.logo} alt="" width={25} height={25} unoptimized/>}<strong>{o.shortName||o.name}</strong><b>{m.score.home} - {m.score.away}</b></Link>})}</section>
      <section className="club-v7-panel"><div className="club-section-title"><span>📅 À VENIR</span><strong>Prochains rendez-vous</strong></div>{upcoming.length ? upcoming.map(m=>{const o=opponent(m,p.currentTeam.id); return <Link className="player-v7-match-row" href={`/match/${m.id}`} key={m.id}>{o.logo&&<Image src={o.logo} alt="" width={25} height={25} unoptimized/>}<strong>{o.shortName||o.name}</strong><b>J{m.matchday}</b></Link>}) : <p className="club-empty">Calendrier à venir.</p>}</section>
    </div>}

    <div className="club-v7-two-cols">
      <section className="club-v7-panel"><div className="club-section-title"><span>🔁 MERCATO</span><strong>Historique suivi</strong></div>{playerTransfers.length ? <div className="player-transfer-list">{playerTransfers.map(t=><article key={t.id}><span>{t.transfer_status === "official" ? "✅ OFFICIEL" : t.transfer_status === "advanced" ? "🔥 AVANCÉ" : "👀 RUMEUR"}</span><strong>{t.from_club || "Libre"} → {t.to_club || "À définir"}</strong>{t.fee && <b>{t.fee}</b>}{t.note && <p>{t.note}</p>}</article>)}</div> : <p className="club-empty">Aucun mouvement mercato associé à ce joueur.</p>}<Link className="club-panel-link" href="/mercato">Voir le Centre Mercato →</Link></section>
      <section className="club-v7-panel"><div className="club-section-title"><span>📰 ACTUALITÉS</span><strong>{relatedArticles.length ? "Articles liés" : "À venir"}</strong></div>{relatedArticles.length ? <div className="club-article-mini-list">{relatedArticles.map(a=><Link href={`/article/${a.slug}`} key={a.slug}><span>{a.category}</span><strong>{a.title}</strong><small>Lire l’article →</small></Link>)}</div> : <p className="club-empty">Aucun article ne mentionne encore directement ce joueur.</p>}</section>
    </div>
    <div className="player-note">Les données sportives proviennent de football-data.org. Les portraits sont enrichis via TheSportsDB lorsqu’ils sont disponibles. Les contenus associés proviennent de Ligue 1 Express.</div>
  </div>;
}
