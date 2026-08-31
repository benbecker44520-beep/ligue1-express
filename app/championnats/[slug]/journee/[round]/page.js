import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getChampionshipConfig, getChampionshipSnapshot, normalizeChampionshipSlug } from "@/lib/championships";
import { secondaryMatchHref } from "@/lib/futpythontrader";

export const revalidate = 0;

function formatDate(date) {
  if (!date) return "Horaire à confirmer";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(date));
}
function label(match) {
  if (match.status === "FINISHED") return "Terminé";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(match.status)) return "● EN DIRECT";
  if (match.status === "POSTPONED") return "Reporté";
  return formatDate(match.utcDate);
}
function href(slug, match) { return slug === "ligue-1" ? `/match/${match.id}` : secondaryMatchHref(slug, match.id); }

export async function generateMetadata({ params }) {
  const { slug, round } = await params; const config = getChampionshipConfig(slug);
  return config ? { title: `Journée ${round} - ${config.name}`, description: `Tous les matchs de la journée ${round} de ${config.name}.` } : {};
}

export default async function MatchdayPage({ params }) {
  const { slug, round } = await params;
  if (slug === "national") redirect(`/championnats/ligue-3/journee/${round}`);
  const normalized = normalizeChampionshipSlug(slug); const config = getChampionshipConfig(normalized); if (!config) notFound();
  const result = await getChampionshipSnapshot(normalized); if (!result.ok) return <div className="page-shell listing-page"><h1>Journée indisponible</h1><p>{result.error}</p></div>;
  const selected = Number(round); const all = result.matches || [...result.recent, ...result.upcoming];
  const rounds = [...new Set(all.map((m) => Number(m.matchday)).filter(Boolean))].sort((a,b)=>a-b); if (!rounds.includes(selected)) notFound();
  const matches = all.filter((m) => Number(m.matchday) === selected).sort((a,b)=>a.timestamp-b.timestamp);
  const idx = rounds.indexOf(selected); const previous = rounds[idx-1]; const next = rounds[idx+1];
  const finished = matches.filter((m)=>m.status === "FINISHED").length; const goals = matches.reduce((sum,m)=>sum+(Number(m.score?.home)||0)+(Number(m.score?.away)||0),0);
  return <div className="page-shell listing-page matchday-page">
    <span className="eyebrow">CENTRE JOURNÉE · {config.name.toUpperCase()}</span>
    <div className="matchday-title"><div><h1>Journée {selected}</h1><p>{matches.length} matchs · {finished} terminés · {goals} buts</p></div><Link href={`/championnats/${normalized}`}>Voir le championnat →</Link></div>
    <nav className="matchday-round-nav">{previous?<Link href={`/championnats/${normalized}/journee/${previous}`}>← J{previous}</Link>:<span/>}<strong>JOURNÉE {selected}</strong>{next?<Link href={`/championnats/${normalized}/journee/${next}`}>J{next} →</Link>:<span/>}</nav>
    <section className="matchday-scoreboard">{matches.map((m)=><Link href={href(normalized,m)} className={`matchday-game ${["IN_PLAY","PAUSED","LIVE"].includes(m.status)?"is-live":""}`} key={m.id}>
      <div className="matchday-game-status"><span>{label(m)}</span><small>{m.utcDate ? new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"2-digit",timeZone:"Europe/Paris"}).format(new Date(m.utcDate)) : ""}</small></div>
      <div className="matchday-team home">{m.home.logo&&<Image src={m.home.logo} alt="" width={38} height={38} unoptimized/>}<strong>{m.home.shortName||m.home.name}</strong></div>
      <div className="matchday-score">{m.score?.home!=null&&m.score?.away!=null?<><b>{m.score.home}</b><i>-</i><b>{m.score.away}</b></>:<strong>VS</strong>}</div>
      <div className="matchday-team away"><strong>{m.away.shortName||m.away.name}</strong>{m.away.logo&&<Image src={m.away.logo} alt="" width={38} height={38} unoptimized/>}</div>
      <span className="matchday-open">Fiche match →</span>
    </Link>)}</section>
    <div className="matchday-footer-note">Données actualisées automatiquement · Source : {result.source}</div>
  </div>;
}
