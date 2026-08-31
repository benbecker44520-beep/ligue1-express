import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchById, getStandings } from "@/lib/football";
import { createSupabaseClient } from "@/lib/supabase";
import { scoreWithScorerFallback } from "@/lib/match-score";
import { getEspnMatchIncidents } from "@/lib/espn";
import { getMatchIncidents as getSofaMatchIncidents } from "@/lib/sofascore";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await getMatchById(id);
  if (!result.ok) return { title: "Match Ligue 1", robots: result.notFound ? { index: false } : undefined };
  const m = result.data;
  const score = m.score.home != null && m.score.away != null ? ` ${m.score.home}-${m.score.away}` : "";
  return {
    title: `${m.home.shortName || m.home.name} - ${m.away.shortName || m.away.name}${score}`,
    description: `Fiche du match ${m.home.name} - ${m.away.name}, journÃ©e ${m.matchday || ""} de Ligue 1.`,
    alternates: { canonical: `/match/${id}` }
  };
}

function formatDate(utcDate) {
  if (!utcDate) return "Date Ã  confirmer";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris"
  }).format(new Date(utcDate));
}

function statusLabel(status) {
  if (status === "FINISHED") return "Match terminÃ©";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) return "ðŸ”´ En direct";
  if (status === "POSTPONED") return "Match reportÃ©";
  if (status === "CANCELLED") return "Match annulÃ©";
  return "Ã€ venir";
}

export default async function MatchPage({ params }) {
  const { id } = await params;
  const matchResult = await getMatchById(id);
  if (matchResult.notFound) notFound();

  if (!matchResult.ok) {
    return <div className="page-shell listing-page"><span className="eyebrow">LIGUE 1 Â· MATCH</span><h1>Fiche match</h1><div className="football-setup-box"><h2>DonnÃ©es indisponibles</h2><p>{matchResult.error}</p></div></div>;
  }

  const match = matchResult.data;
  const standings = await getStandings();
  const homeStanding = standings.ok ? standings.data.find((r) => r.team === match.home.name || r.shortName === match.home.shortName) : null;
  const awayStanding = standings.ok ? standings.data.find((r) => r.team === match.away.name || r.shortName === match.away.shortName) : null;
  let scorers = [];
  const supabase = createSupabaseClient();
  if (supabase && match.status === "FINISHED") {
    const { data } = await supabase
      .from("match_scorers")
      .select("*")
      .eq("match_id", String(match.id))
      .order("minute", { ascending: true })
      .order("created_at", { ascending: true });
    scorers = data || [];
  }
  const homeScorers = scorers.filter((s) => s.team_side === "home");
  const awayScorers = scorers.filter((s) => s.team_side === "away");
  const displayScore = scoreWithScorerFallback(match, scorers);
  const hasScore = displayScore.home !== null && displayScore.away !== null;
  let incidentsResult = await getEspnMatchIncidents(match, "fra.1");
  if (!incidentsResult.ok || !incidentsResult.data?.length) {
    const sofaFallback = await getSofaMatchIncidents(match, 34);
    if (sofaFallback.ok && sofaFallback.data?.length) incidentsResult = sofaFallback;
  }
  const automaticIncidents = incidentsResult.ok ? incidentsResult.data : [];

  let manualEvents = [];
  if (supabase) {
    const { data } = await supabase
      .from("match_events")
      .select("*")
      .eq("match_id", String(match.id))
      .order("minute", { ascending: true })
      .order("created_at", { ascending: true });
    manualEvents = (data || []).map((event) => {
      const labels = {
        goal: ["âš½", "But"],
        disallowed_goal: ["ðŸš«", "But refusÃ© / VAR"],
        yellow_card: ["ðŸŸ¨", "Carton jaune"],
        red_card: ["ðŸŸ¥", "Carton rouge"],
        substitution: ["ðŸ”„", "Remplacement"]
      };
      const [icon, label] = labels[event.event_type] || ["â€¢", "Fait de match"];
      return {
        id: `manual-${event.id}`,
        minute: `${event.minute}'`,
        minuteValue: Number(event.minute) || 0,
        type: event.event_type,
        icon,
        label,
        isHome: event.team_side === "home",
        player: event.player_name,
        playerIn: event.player_in,
        playerOut: event.player_out,
        reason: event.reason,
        manual: true
      };
    });
  }

  const incidents = [...automaticIncidents, ...manualEvents].sort((a, b) => {
    const minuteA = a.minuteValue ?? (parseInt(String(a.minute || "0"), 10) || 0);
    const minuteB = b.minuteValue ?? (parseInt(String(b.minute || "0"), 10) || 0);
    return minuteA - minuteB;
  });

  return (
    <div className="page-shell listing-page match-detail-page">
      <span className="eyebrow">LIGUE 1 Â· JOURNÃ‰E {match.matchday || "â€”"}</span>
      <div className="match-back"><Link href={`/resultats${match.matchday ? `?journee=${match.matchday}` : ""}`}>â† Retour aux rÃ©sultats</Link></div>

      <section className="match-hero-card">
        <div className="match-meta"><span>{statusLabel(match.status)}</span><strong>{formatDate(match.utcDate)}</strong></div>
        <div className="match-hero-grid">
          <div className="match-club match-club-home">
            {match.home.logo && <Image src={match.home.logo} alt="" width={96} height={96} unoptimized />}
            <h1>{match.home.id ? <Link className="match-club-link" href={`/club/${match.home.id}`}>{match.home.name}</Link> : match.home.name}</h1>
            {homeStanding && <p>{homeStanding.rank}<sup>e</sup> Â· {homeStanding.points} pts</p>}
          </div>
          <div className="match-big-score">
            {hasScore ? <strong>{displayScore.home}<span>-</span>{displayScore.away}</strong> : <strong className="match-vs">VS</strong>}
            <small>{match.status === "FINISHED" ? "Score final" : match.status === "SCHEDULED" || match.status === "TIMED" ? "Ligue 1" : statusLabel(match.status)}</small>
          </div>
          <div className="match-club match-club-away">
            {match.away.logo && <Image src={match.away.logo} alt="" width={96} height={96} unoptimized />}
            <h1>{match.away.id ? <Link className="match-club-link" href={`/club/${match.away.id}`}>{match.away.name}</Link> : match.away.name}</h1>
            {awayStanding && <p>{awayStanding.rank}<sup>e</sup> Â· {awayStanding.points} pts</p>}
          </div>
        </div>
      </section>

      {scorers.length > 0 && (
        <section className="match-scorers-card">
          <div className="match-scorers-title">
            <span>âš½ BUTEURS</span>
            <strong>{scorers.length} but{scorers.length > 1 ? "s" : ""}</strong>
          </div>
          <div className="match-scorers-grid">
            <div className="match-scorer-team home">
              <h2>{match.home.shortName || match.home.name}</h2>
              {homeScorers.length === 0 ? <p>â€”</p> : homeScorers.map((scorer) => (
                <div className="match-scorer-line" key={scorer.id}>
                  <strong>{scorer.player_name}</strong>
                  <span>{scorer.minute}'</span>
                  {scorer.goal_type === "penalty" && <small>PEN.</small>}
                  {scorer.goal_type === "own_goal" && <small>CSC</small>}
                </div>
              ))}
            </div>
            <div className="match-scorers-divider" />
            <div className="match-scorer-team away">
              <h2>{match.away.shortName || match.away.name}</h2>
              {awayScorers.length === 0 ? <p>â€”</p> : awayScorers.map((scorer) => (
                <div className="match-scorer-line" key={scorer.id}>
                  <strong>{scorer.player_name}</strong>
                  <span>{scorer.minute}'</span>
                  {scorer.goal_type === "penalty" && <small>PEN.</small>}
                  {scorer.goal_type === "own_goal" && <small>CSC</small>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="match-info-grid">
        <div className="match-info-card"><span>COMPÃ‰TITION</span><strong>Ligue 1</strong></div>
        <div className="match-info-card"><span>JOURNÃ‰E</span><strong>{match.matchday || "â€”"}</strong></div>
        <div className="match-info-card"><span>STATUT</span><strong>{statusLabel(match.status)}</strong></div>
      </section>

      <section className="match-timeline-card">
        <div className="match-timeline-heading">
          <div><span className="eyebrow">RÃ‰SULTAT Â· FIL DU MATCH</span><h2>Les faits marquants</h2></div>
          <div className="match-event-legend"><span>âš½ But</span><span>ðŸš« But refusÃ©</span><span>ðŸŸ¨ Jaune</span><span>ðŸŸ¥ Rouge</span><span>ðŸ”„ Remplacement</span></div>
        </div>
        {incidents.length ? (
          <div className="match-timeline-list">
            {incidents.map((incident) => (
              <div className={`match-timeline-row ${incident.isHome ? "home" : "away"} ${incident.type}`} key={incident.id}>
                <div className="match-event-minute">{incident.minute || "â€”"}</div>
                <div className="match-event-icon">{incident.icon}</div>
                <div className="match-event-copy">
                  <strong>{incident.label}{incident.manual && <small className="match-event-manual-badge">Ajout rÃ©daction</small>}</strong>
                  {incident.type === "substitution" ? (
                    <span>{incident.playerOut ? `${incident.playerOut} sort` : "Sortie"} Â· {incident.playerIn ? `${incident.playerIn} entre` : "EntrÃ©e"}</span>
                  ) : (
                    <span>{incident.player || incident.reason || (incident.isHome ? match.home.shortName || match.home.name : match.away.shortName || match.away.name)}</span>
                  )}
                  {incident.reason && incident.player && <small>{incident.reason}</small>}
                </div>
                <div className="match-event-team">{incident.isHome ? match.home.shortName || match.home.name : match.away.shortName || match.away.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="match-timeline-empty">Les cartons, remplacements et dÃ©cisions VAR ne sont pas encore disponibles pour ce match.</div>
        )}
      </section>
    </div>
  );
}

