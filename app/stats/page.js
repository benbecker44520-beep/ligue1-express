import Image from "next/image";
import Link from "next/link";
import { getFixtures, getStandings, getScorers } from "@/lib/football";

export const revalidate = 0;

function teamLink(row) {
  return <Link href={`/club/${row.teamId}`} className="stats-team-link">
    {row.logo && <Image src={row.logo} alt="" width={28} height={28} unoptimized />}
    <strong>{row.shortName || row.team}</strong>
  </Link>;
}

function resultForTeam(match, teamId) {
  const homeId = match.home?.id ?? match.homeTeam?.id;
  const awayId = match.away?.id ?? match.awayTeam?.id;
  const score = match.score?.fullTime || match.score || {};
  const homeScore = score.home ?? null;
  const awayScore = score.away ?? null;
  const isHome = String(homeId) === String(teamId);
  const gf = isHome ? homeScore : awayScore;
  const ga = isHome ? awayScore : homeScore;
  if (!Number.isFinite(Number(gf)) || !Number.isFinite(Number(ga))) return null;
  return Number(gf) > Number(ga) ? "V" : Number(gf) < Number(ga) ? "D" : "N";
}

function formForTeam(matches, teamId) {
  return matches
    .filter(m => m.status === "FINISHED" && (String(m.home.id) === String(teamId) || String(m.away.id) === String(teamId)))
    .sort((a,b) => b.timestamp-a.timestamp)
    .slice(0,5)
    .map(m => resultForTeam(m, teamId))
    .filter(Boolean);
}

async function fetchFiveRealMatches(teamId, fallbackMatches) {
  const fallback = formForTeam(fallbackMatches, teamId);
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token || !teamId) return fallback;

  try {
    const from = new Date(Date.now() - 220 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    const response = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&dateFrom=${from}&dateTo=${to}&limit=20`,
      { headers: { "X-Auth-Token": token }, cache: "no-store" }
    );
    if (!response.ok) return fallback;
    const json = await response.json().catch(() => ({}));
    const results = (json.matches || [])
      .filter(m => m.status === "FINISHED")
      .sort((a,b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
      .map(m => resultForTeam(m, teamId))
      .filter(Boolean)
      .slice(0,5);
    return results.length === 5 ? results : fallback;
  } catch {
    return fallback;
  }
}

export default async function StatsPage() {
  const [standings, fixtures, scorersResult] = await Promise.all([getStandings(), getFixtures(), getScorers()]);
  if (!standings.ok || !fixtures.ok) return <div className="page-shell listing-page"><span className="eyebrow">LIGUE 1 · STATS</span><h1>Statistiques Ligue 1</h1><div className="football-setup-box"><h2>Données indisponibles</h2><p>{standings.error || fixtures.error}</p></div></div>;

  const rows = standings.data;
  const attacks = [...rows].sort((a,b) => b.goalsFor-a.goalsFor || b.points-a.points).slice(0,5);
  const defenses = [...rows].sort((a,b) => a.goalsAgainst-b.goalsAgainst || b.points-a.points).slice(0,5);
  const diffs = [...rows].sort((a,b) => b.diff-a.diff || b.points-a.points).slice(0,5);
  const topFormRows = rows.slice(0,10);
  const fiveMatchForms = await Promise.all(topFormRows.map(r => fetchFiveRealMatches(r.teamId, fixtures.data)));
  const forms = topFormRows.map((r, index) => ({ ...r, form: fiveMatchForms[index] }));

  const scorers = scorersResult.ok ? scorersResult.data.slice(0,10) : [];

  return <div className="page-shell listing-page stats-page">
    <span className="eyebrow">LIGUE 1 · SAISON {standings.season || "ACTUELLE"}</span>
    <h1>Statistiques Ligue 1</h1>
    <p className="stats-intro">Les chiffres essentiels du championnat, mis à jour avec les données de Foot Français Express.</p>

    <section className="stats-card stats-scorers stats-scorers-featured">
      <div className="stats-card-title">
        <span>🏆 MEILLEURS BUTEURS</span>
        <small>Top 10 · mise à jour automatique</small>
      </div>
      {scorers.length ? scorers.map((s,i)=><div className="stats-scorer-row stats-scorer-row-v48" key={`${s.name}-${s.teamId ?? i}`}>
        <b>{i+1}</b>
        <div className="stats-scorer-player">
          {s.playerId ? <Link href={`/joueur/${s.playerId}${s.teamId ? `?club=${s.teamId}` : ""}`}><strong>{s.name}</strong></Link> : <strong>{s.name}</strong>}
          <span className="stats-scorer-club">
            {s.logo && <Image src={s.logo} alt="" width={22} height={22} unoptimized />}
            {s.teamId ? <Link href={`/club/${s.teamId}`}>{s.teamName}</Link> : <span>{s.teamName}</span>}
          </span>
        </div>
        <strong className="stats-scorer-goals">{s.goals} <small>but{s.goals>1?"s":""}</small></strong>
      </div>) : <div className="stats-empty"><strong>Classement en construction</strong><p>Le classement des buteurs est momentanément indisponible.</p></div>}
    </section>

    <div className="stats-grid stats-grid-v48">
      <section className="stats-card stats-card-wide"><div className="stats-card-title"><span>⚽ MEILLEURES ATTAQUES</span><small>Buts marqués</small></div>{attacks.map((r,i)=><div className="stats-row" key={r.teamId}><b>{i+1}</b>{teamLink(r)}<strong>{r.goalsFor}</strong></div>)}</section>
      <section className="stats-card stats-card-wide"><div className="stats-card-title"><span>🛡️ MEILLEURES DÉFENSES</span><small>Buts encaissés</small></div>{defenses.map((r,i)=><div className="stats-row" key={r.teamId}><b>{i+1}</b>{teamLink(r)}<strong>{r.goalsAgainst}</strong></div>)}</section>
      <section className="stats-card"><div className="stats-card-title"><span>📈 DIFFÉRENCE DE BUTS</span><small>Top 5</small></div>{diffs.map((r,i)=><div className="stats-row" key={r.teamId}><b>{i+1}</b>{teamLink(r)}<strong>{r.diff>0?`+${r.diff}`:r.diff}</strong></div>)}</section>
      <section className="stats-card"><div className="stats-card-title"><span>🔥 FORME RÉCENTE</span><small>5 derniers matchs officiels</small></div>{forms.map(r=><div className="stats-form-row" key={r.teamId}>{teamLink(r)}<div className="stats-form">{r.form.length?r.form.map((x,i)=><span key={i} className={`form-badge form-${x.toLowerCase()}`}>{x}</span>):<small>—</small>}</div></div>)}</section>
    </div>
  </div>;
}
