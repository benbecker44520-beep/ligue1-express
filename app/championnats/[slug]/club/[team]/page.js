import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChampionshipConfig, normalizeChampionshipSlug } from "@/lib/championships";
import { getFutPythonTraderTeamSnapshot, secondaryMatchHref } from "@/lib/futpythontrader";

export const revalidate = 0;

function dateLabel(date) {
  if (!date) return "Horaire à confirmer";
  return new Intl.DateTimeFormat("fr-FR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", timeZone:"Europe/Paris" }).format(new Date(date));
}
function resultFor(match, team) {
  const home = match.home.name === team;
  const gf = home ? match.score.home : match.score.away;
  const ga = home ? match.score.away : match.score.home;
  if (gf == null || ga == null) return "—";
  return gf > ga ? "V" : gf < ga ? "D" : "N";
}

export async function generateMetadata({ params }) {
  const { slug, team } = await params;
  const config = getChampionshipConfig(normalizeChampionshipSlug(slug));
  return { title: `${decodeURIComponent(team)} — ${config?.name || "Championnat"}` };
}

export default async function SecondaryClubPage({ params }) {
  const { slug, team } = await params;
  const normalizedSlug = normalizeChampionshipSlug(slug);
  const config = getChampionshipConfig(normalizedSlug);
  if (!config || normalizedSlug === "ligue-1") notFound();
  const data = await getFutPythonTraderTeamSnapshot(config.fptLeague, team, config.teamCount);
  if (!data) notFound();
  const s = data.standing;
  return <div className="page-shell listing-page secondary-club-page">
    <div className="match-back"><Link href={`/championnats/${normalizedSlug}`}>← Retour à {config.name}</Link></div>
    <section className="secondary-club-hero">
      <div className="secondary-club-logo">{data.logo ? <Image src={data.logo} alt="" width={110} height={110} unoptimized /> : <span>{data.teamName.slice(0,2).toUpperCase()}</span>}</div>
      <div><span className="eyebrow">{config.name.toUpperCase()} · SAISON {data.season}</span><h1>{data.teamName}</h1><p>{s.rank}<sup>e</sup> · {s.points} points · {s.played} matchs joués</p></div>
    </section>
    <section className="secondary-club-kpis">
      <div><span>VICTOIRES</span><strong>{s.win}</strong></div><div><span>NULS</span><strong>{s.draw}</strong></div><div><span>DÉFAITES</span><strong>{s.lose}</strong></div><div><span>DIFFÉRENCE</span><strong>{s.diff > 0 ? `+${s.diff}` : s.diff}</strong></div><div><span>BUTS</span><strong>{s.goalsFor}</strong></div><div><span>ENCAISSÉS</span><strong>{s.goalsAgainst}</strong></div>
    </section>
    <div className="secondary-club-grid">
      <section className="championship-panel"><div className="panel-heading"><h2>5 derniers matchs</h2></div>{data.recent.length ? data.recent.map(m => <Link className="secondary-club-match" href={secondaryMatchHref(normalizedSlug,m.id)} key={m.id}><span className={`secondary-form form-${resultFor(m,data.teamName).toLowerCase()}`}>{resultFor(m,data.teamName)}</span><b>{m.home.name}</b><strong>{m.score.home} - {m.score.away}</strong><b>{m.away.name}</b><small>{dateLabel(m.utcDate)}</small></Link>) : <div className="champ-empty">Aucun résultat disponible.</div>}</section>
      <section className="championship-panel"><div className="panel-heading"><h2>Prochains matchs</h2></div>{data.upcoming.length ? data.upcoming.map(m => <Link className="secondary-club-match" href={secondaryMatchHref(normalizedSlug,m.id)} key={m.id}><span className="secondary-form">•</span><b>{m.home.name}</b><strong>VS</strong><b>{m.away.name}</b><small>{dateLabel(m.utcDate)}</small></Link>) : <div className="champ-empty">Aucun match à venir disponible dans la source actuelle.</div>}</section>
    </div>
  </div>;
}
