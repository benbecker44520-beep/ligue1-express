import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import LiveAutoRefresh from "@/components/LiveAutoRefresh";
import { getApiFootballMatch, getApiFootballStatistics } from "@/lib/apifootball";
import FollowMatchButton from "@/components/FollowMatchButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await getApiFootballMatch(id);
  if (!result.ok) return { title: "Centre Match LIVE" };
  return { title: `${result.data.home.name} - ${result.data.away.name} · LIVE` };
}

function EventIcon({ type }) {
  if (type === "goal") return "⚽";
  if (type === "red_card") return "🟥";
  if (type === "yellow_card") return "🟨";
  if (type === "substitution") return "🔄";
  return "•";
}

function EventText({ event }) {
  if (event.type === "goal") return <><strong>{event.player}</strong>{event.assist ? <span>Passe : {event.assist}</span> : null}{event.score ? <b>{event.score}</b> : null}</>;
  if (event.type === "substitution") return <><strong>{event.playerIn || "Entrée"}</strong><span>remplace {event.playerOut || "un joueur"}</span></>;
  return <><strong>{event.player}</strong><span>{event.type === "red_card" ? "Carton rouge" : "Carton jaune"}</span></>;
}

export default async function ApiFootballLiveMatchPage({ params }) {
  const { id } = await params;
  const result = await getApiFootballMatch(id);
  if (!result.ok) notFound();
  const match = result.data;
  const statisticsResult = await getApiFootballStatistics(id);
  const statistics = statisticsResult.ok ? statisticsResult.data : [];
  const updatedAt = new Intl.DateTimeFormat("fr-FR", { hour:"2-digit", minute:"2-digit", timeZone:"Europe/Paris" }).format(new Date());

  return (
    <div className="container live-v83-match-page">
      <LiveAutoRefresh seconds={60} />
      <Link href="/live" className="live-v83-back">← Retour au LIVE</Link>

      <section className="live-v83-match-hero">
        <div className="live-v83-match-meta">
          <span className="live-v82-pulse"><i /> {match.statusText}</span>
          <b>{match.leagueName}</b>
          {match.round ? <span>{match.round}</span> : null}
        </div>
        <div className="live-v83-scoreline">
          <div className="live-v83-side">
            {match.home.logo ? <Image src={match.home.logo} width={76} height={76} alt="" /> : <span>⚽</span>}
            <strong>{match.home.name}</strong>
          </div>
          <div className="live-v83-score"><b>{match.score.home ?? "-"}</b><i>:</i><b>{match.score.away ?? "-"}</b><small>{match.statusText}</small></div>
          <div className="live-v83-side away">
            {match.away.logo ? <Image src={match.away.logo} width={76} height={76} alt="" /> : <span>⚽</span>}
            <strong>{match.away.name}</strong>
          </div>
        </div>
        {(match.stadium || match.referee) && <div className="live-v83-details">{match.stadium ? <span>🏟️ {match.stadium}</span> : null}{match.referee ? <span>👤 Arbitre : {match.referee}</span> : null}</div>}
        <div className="live-v83-follow"><FollowMatchButton match={{ ...match, href:`/live/match/${match.id}` }} /></div>
      </section>

      <nav className="live-v821-nav" aria-label="Sections du Centre Match"><a href="#fil-du-match">⚡ Fil du match</a><a href="#statistiques-live">📊 Statistiques</a></nav>

      <section className="live-v821-statistics" id="statistiques-live">
        <div className="live-v83-section-head"><div><h2>Statistiques en direct</h2><small>Dernière actualisation à {updatedAt}</small></div><span>AUTO · 60 S</span></div>
        <div className="live-v821-stat-head"><strong>{match.home.shortName || match.home.name}</strong><span>VS</span><strong>{match.away.shortName || match.away.name}</strong></div>
        {statistics.length ? <div className="live-v821-stat-list">{statistics.map((stat) => { const total=stat.home+stat.away; const homeWidth=total ? Math.round(stat.home/total*100) : 50; return <div className="live-v821-stat" key={stat.key}><div><b>{stat.homeDisplay}</b><strong>{stat.label}</strong><b>{stat.awayDisplay}</b></div><div className="live-v821-stat-bar"><i style={{width:`${homeWidth}%`}}/><i style={{width:`${100-homeWidth}%`}}/></div></div>; })}</div> : <div className="live-v821-stats-empty"><span>📊</span><strong>Statistiques en attente</strong><p>La source LIVE n’a pas encore publié les chiffres de cette rencontre.</p></div>}
      </section>

      <section className="live-v83-timeline" id="fil-du-match">
        <div className="live-v83-section-head"><h2>Fil du match</h2><span>AUTO · 60 S</span></div>
        {match.events.length ? (
          <div className="live-v83-events">
            <div className="live-v83-events-teams" aria-hidden="true"><strong>{match.home.shortName || match.home.name}</strong><span>MIN.</span><strong>{match.away.shortName || match.away.name}</strong></div>
            {match.events.map((event) => (
              <div className={`live-v83-event side-${event.side}`} key={event.id}>
                <div className="live-v83-event-action"><EventText event={event} /></div>
                <div className="live-v83-event-marker"><time>{event.minuteLabel || `${event.minute}'`}</time><i><EventIcon type={event.type} /></i></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="live-v82-empty live-v83-event-empty"><div className="live-v82-ball">⚽</div><h2>Le match est en cours</h2><p>Les événements disponibles apparaîtront ici automatiquement.</p></div>
        )}
      </section>
    </div>
  );
}
