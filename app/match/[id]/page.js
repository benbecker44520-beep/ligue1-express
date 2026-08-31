import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchById, getStandings } from "@/lib/football";
import { createSupabaseClient } from "@/lib/supabase";
import { scoreWithScorerFallback } from "@/lib/match-score";

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
    </div>
  );
}
