import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChampionshipConfig, normalizeChampionshipSlug } from "@/lib/championships";
import { getFutPythonTraderMatchSnapshot, secondaryTeamHref } from "@/lib/futpythontrader";

export const revalidate = 0;
function formatDate(date){if(!date)return "Date à confirmer";return new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Paris"}).format(new Date(date));}
function statusLabel(status){return status === "FINISHED" ? "Match terminé" : "À venir";}

export default async function SecondaryMatchPage({ params }) {
  const { slug, id } = await params;
  const normalizedSlug = normalizeChampionshipSlug(slug);
  const config = getChampionshipConfig(normalizedSlug);
  if (!config || normalizedSlug === "ligue-1") notFound();
  const data = await getFutPythonTraderMatchSnapshot(config.fptLeague, id, config.teamCount);
  if (!data) notFound();
  const m=data.match; const hasScore=m.score.home!=null&&m.score.away!=null;
  return <div className="page-shell listing-page match-detail-page">
    <span className="eyebrow">{config.name.toUpperCase()} · {m.matchday ? `JOURNÉE ${m.matchday}` : `SAISON ${data.season}`}</span>
    <div className="match-back"><Link href={`/championnats/${normalizedSlug}`}>← Retour à {config.name}</Link></div>
    <section className="match-hero-card"><div className="match-meta"><span>{statusLabel(m.status)}</span><strong>{formatDate(m.utcDate)}</strong></div><div className="match-hero-grid">
      <div className="match-club match-club-home">{m.home.logo&&<Image src={m.home.logo} alt="" width={96} height={96} unoptimized/>}<h1><Link className="match-club-link" href={secondaryTeamHref(normalizedSlug,m.home.name)}>{m.home.name}</Link></h1>{data.homeStanding&&<p>{data.homeStanding.rank}<sup>e</sup> · {data.homeStanding.points} pts</p>}</div>
      <div className="match-big-score">{hasScore?<strong>{m.score.home}<span>-</span>{m.score.away}</strong>:<strong className="match-vs">VS</strong>}<small>{hasScore?"Score final":config.name}</small></div>
      <div className="match-club match-club-away">{m.away.logo&&<Image src={m.away.logo} alt="" width={96} height={96} unoptimized/>}<h1><Link className="match-club-link" href={secondaryTeamHref(normalizedSlug,m.away.name)}>{m.away.name}</Link></h1>{data.awayStanding&&<p>{data.awayStanding.rank}<sup>e</sup> · {data.awayStanding.points} pts</p>}</div>
    </div></section>
    <section className="match-info-grid"><div className="match-info-card"><span>COMPÉTITION</span><strong>{config.name}</strong></div><div className="match-info-card"><span>JOURNÉE</span><strong>{m.matchday||"—"}</strong></div><div className="match-info-card"><span>STATUT</span><strong>{statusLabel(m.status)}</strong></div></section>
    <section className="secondary-source-card"><span>SOURCE DES DONNÉES</span><strong>FutPythonTrader</strong><p>Cette fiche est générée automatiquement à partir du dataset {config.name}. Les informations disponibles dépendent des champs fournis par la source.</p></section>
  </div>;
}
