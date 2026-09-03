import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchById, getStandings, getTeamById } from "@/lib/football";
import { createSupabaseClient } from "@/lib/supabase";
import { scoreWithScorerFallback } from "@/lib/match-score";
import { getEspnMatchIncidents } from "@/lib/espn";
import { getMatchIncidents as getSofaMatchIncidents } from "@/lib/sofascore";
import { getApiFootballMatchIncidents } from "@/lib/apifootball";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await getMatchById(id);
  if (!result.ok) return { title: "Match Ligue 1", robots: result.notFound ? { index: false } : undefined };
  const m = result.data;
  const score = m.score.home != null && m.score.away != null ? ` ${m.score.home}-${m.score.away}` : "";
  return {
    title: `${m.home.shortName || m.home.name} - ${m.away.shortName || m.away.name}${score}`,
    description: `Fiche du match ${m.home.name} - ${m.away.name}, journée ${m.matchday || ""} de Ligue 1.`,
    alternates: { canonical: `/match/${id}` }
  };
}

function formatDate(utcDate) {
  if (!utcDate) return "Date à confirmer";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris"
  }).format(new Date(utcDate));
}

function statusLabel(status) {
  if (status === "FINISHED") return "Match terminé";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) return "🔴 En direct";
  if (status === "POSTPONED") return "Match reporté";
  if (status === "CANCELLED") return "Match annulé";
  return "À venir";
}

export default async function MatchPage({ params }) {
  const { id } = await params;
  const matchResult = await getMatchById(id);
  if (matchResult.notFound) notFound();

  if (!matchResult.ok) {
    return <div className="page-shell listing-page"><span className="eyebrow">LIGUE 1 · MATCH</span><h1>Fiche match</h1><div className="football-setup-box"><h2>Données indisponibles</h2><p>{matchResult.error}</p></div></div>;
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
  // Le LIVE est alimenté par APIfootball. On le consulte en premier afin que
  // les actions du direct restent visibles dans la fiche Résultats, même si
  // les identifiants football-data.org / ESPN / SofaScore sont différents.
  let incidentsResult = await getApiFootballMatchIncidents(match);
  if (!incidentsResult.ok || !incidentsResult.data?.length) {
    incidentsResult = await getEspnMatchIncidents(match, "fra.1");
  }
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
        goal: ["⚽", "But"],
        disallowed_goal: ["🚫", "But refusé / VAR"],
        yellow_card: ["🟨", "Carton jaune"],
        red_card: ["🟥", "Carton rouge"],
        substitution: ["🔄", "Remplacement"]
      };
      const [icon, label] = labels[event.event_type] || ["•", "Fait de match"];
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

  // V8.1 · Centre Match : contexte avant/après match sans inventer de données.
  const [homeContext, awayContext] = await Promise.all([
    match.home.id ? getTeamById(match.home.id) : Promise.resolve({ ok: false }),
    match.away.id ? getTeamById(match.away.id) : Promise.resolve({ ok: false })
  ]);

  function formFor(context, teamId) {
    if (!context?.ok) return [];
    return (context.data?.recent || []).slice(0, 5).reverse().map((m) => {
      const isHome = String(m.home.id) === String(teamId);
      const gf = isHome ? m.score.home : m.score.away;
      const ga = isHome ? m.score.away : m.score.home;
      return gf > ga ? "V" : gf < ga ? "D" : "N";
    });
  }

  const homeForm = formFor(homeContext, match.home.id);
  const awayForm = formFor(awayContext, match.away.id);
  const homeRecent = homeContext?.ok ? (homeContext.data?.recent || []).filter((m) => String(m.id) !== String(match.id)).slice(0, 3) : [];
  const awayRecent = awayContext?.ok ? (awayContext.data?.recent || []).filter((m) => String(m.id) !== String(match.id)).slice(0, 3) : [];
  const isUpcoming = !["FINISHED", "IN_PLAY", "PAUSED", "LIVE"].includes(match.status);

  function compactDate(utcDate) {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "Europe/Paris" }).format(new Date(utcDate));
  }

  function contextMatchRow(m, teamId) {
    const isHome = String(m.home.id) === String(teamId);
    const opponent = isHome ? m.away : m.home;
    const gf = isHome ? m.score.home : m.score.away;
    const ga = isHome ? m.score.away : m.score.home;
    const result = gf > ga ? "V" : gf < ga ? "D" : "N";
    return { opponent, gf, ga, result };
  }

  return (
    <div className="page-shell listing-page match-detail-page">
      <span className="eyebrow">LIGUE 1 · JOURNÉE {match.matchday || "—"}</span>
      <div className="match-back"><Link href={`/resultats${match.matchday ? `?journee=${match.matchday}` : ""}`}>← Retour aux résultats</Link></div>

      <section className="match-hero-card">
        <div className="match-meta"><span>{statusLabel(match.status)}</span><strong>{formatDate(match.utcDate)}</strong></div>
        <div className="match-hero-grid">
          <div className="match-club match-club-home">
            {match.home.logo && <Image src={match.home.logo} alt="" width={96} height={96} unoptimized />}
            <h1>{match.home.id ? <Link className="match-club-link" href={`/club/${match.home.id}`}>{match.home.name}</Link> : match.home.name}</h1>
            {homeStanding && <p>{homeStanding.rank}<sup>e</sup> · {homeStanding.points} pts</p>}
          </div>
          <div className="match-big-score">
            {hasScore ? <strong>{displayScore.home}<span>-</span>{displayScore.away}</strong> : <strong className="match-vs">VS</strong>}
            <small>{match.status === "FINISHED" ? "Score final" : match.status === "SCHEDULED" || match.status === "TIMED" ? "Ligue 1" : statusLabel(match.status)}</small>
          </div>
          <div className="match-club match-club-away">
            {match.away.logo && <Image src={match.away.logo} alt="" width={96} height={96} unoptimized />}
            <h1>{match.away.id ? <Link className="match-club-link" href={`/club/${match.away.id}`}>{match.away.name}</Link> : match.away.name}</h1>
            {awayStanding && <p>{awayStanding.rank}<sup>e</sup> · {awayStanding.points} pts</p>}
          </div>
        </div>
      </section>

      {scorers.length > 0 && (
        <section className="match-scorers-card">
          <div className="match-scorers-title">
            <span>⚽ BUTEURS</span>
            <strong>{scorers.length} but{scorers.length > 1 ? "s" : ""}</strong>
          </div>
          <div className="match-scorers-grid">
            <div className="match-scorer-team home">
              <h2>{match.home.shortName || match.home.name}</h2>
              {homeScorers.length === 0 ? <p>—</p> : homeScorers.map((scorer) => (
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
              {awayScorers.length === 0 ? <p>—</p> : awayScorers.map((scorer) => (
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
        <div className="match-info-card"><span>COMPÉTITION</span><strong>Ligue 1</strong></div>
        <div className="match-info-card"><span>JOURNÉE</span><strong>{match.matchday || "—"}</strong></div>
        <div className="match-info-card"><span>STATUT</span><strong>{statusLabel(match.status)}</strong></div>
      </section>

      <section className="match-center-v81">
        <div className="match-center-head-v81">
          <div><span className="eyebrow">CENTRE MATCH</span><h2>{isUpcoming ? "Avant-match" : "Le match en contexte"}</h2></div>
          <Link href={`/resultats${match.matchday ? `?journee=${match.matchday}` : ""}`}>Voir la journée →</Link>
        </div>
        <div className="match-context-grid-v81">
          {[
            { team: match.home, standing: homeStanding, form: homeForm, recent: homeRecent },
            { team: match.away, standing: awayStanding, form: awayForm, recent: awayRecent }
          ].map((side) => (
            <article className="match-team-context-v81" key={side.team.id || side.team.name}>
              <div className="match-context-team-v81">
                {side.team.logo && <Image src={side.team.logo} alt="" width={44} height={44} unoptimized />}
                <div><strong>{side.team.shortName || side.team.name}</strong><span>{side.standing ? `${side.standing.rank}e · ${side.standing.points} pts` : "Classement indisponible"}</span></div>
              </div>
              <div className="match-form-v81"><span>FORME</span><div>{side.form.length ? side.form.map((r, i) => <i className={`form-${r.toLowerCase()}`} key={`${r}-${i}`}>{r}</i>) : <small>À venir</small>}</div></div>
              <div className="match-recent-v81">
                <span>3 DERNIERS MATCHS</span>
                {side.recent.length ? side.recent.map((m) => { const row = contextMatchRow(m, side.team.id); return (
                  <Link href={`/match/${m.id}`} key={m.id}>
                    <b className={`form-${row.result.toLowerCase()}`}>{row.result}</b>
                    {row.opponent.logo && <Image src={row.opponent.logo} alt="" width={22} height={22} unoptimized />}
                    <strong>{row.opponent.shortName || row.opponent.name}</strong>
                    <em>{row.gf} - {row.ga}</em><small>{compactDate(m.utcDate)}</small>
                  </Link>
                )}) : <p>Aucun résultat récent.</p>}
              </div>
              {side.team.id && <Link className="match-context-club-link-v81" href={`/club/${side.team.id}`}>Voir la fiche du club →</Link>}
            </article>
          ))}
        </div>
      </section>

      <section className="match-timeline-card">
        <div className="match-timeline-heading">
          <div><span className="eyebrow">RÉSULTAT · FIL DU MATCH</span><h2>Les faits marquants</h2></div>
          <div className="match-event-legend"><span>⚽ But</span><span>🚫 But refusé</span><span>🟨 Jaune</span><span>🟥 Rouge</span><span>🔄 Remplacement</span></div>
        </div>
        {incidents.length ? (
          <div className="match-timeline-list">
            {incidents.map((incident) => (
              <div className={`match-timeline-row ${incident.isHome ? "home" : "away"} ${incident.type}`} key={incident.id}>
                <div className="match-event-minute">{incident.minute || "—"}</div>
                <div className="match-event-icon">{incident.icon}</div>
                <div className="match-event-copy">
                  <strong>{incident.label}{incident.manual && <small className="match-event-manual-badge">Ajout rédaction</small>}</strong>
                  {incident.type === "substitution" ? (
                    <span>{incident.playerOut ? `${incident.playerOut} sort` : "Sortie"} · {incident.playerIn ? `${incident.playerIn} entre` : "Entrée"}</span>
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
          <div className="match-timeline-empty">Les cartons, remplacements et décisions VAR ne sont pas encore disponibles pour ce match.</div>
        )}
      </section>
    </div>
  );
}
