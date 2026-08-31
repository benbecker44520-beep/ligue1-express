import { getFixtures, getScorers, getStandings } from "@/lib/football";
import { getFutPythonTraderSnapshot } from "@/lib/futpythontrader";

const TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/123";

export const CHAMPIONSHIPS = {
  "ligue-1": { slug: "ligue-1", name: "Ligue 1", shortName: "L1", level: "1er échelon", teamCount: 18, provider: "football-data.org" },
  "ligue-2": { slug: "ligue-2", name: "Ligue 2", shortName: "L2", level: "2e échelon", teamCount: 18, provider: "FutPythonTrader", fptLeague: "ligue-2" },
  "ligue-3": { slug: "ligue-3", name: "Ligue 3", subtitle: "Championnat professionnel FFF", shortName: "L3", level: "3e échelon", teamCount: 18, provider: "FutPythonTrader", fptLeague: "ligue-3" }
};

export function normalizeChampionshipSlug(slug) { return slug === "national" ? "ligue-3" : slug; }
export function getChampionshipConfig(slug) { return CHAMPIONSHIPS[normalizeChampionshipSlug(slug)] || null; }

async function tsdb(path) {
  const response = await fetch(`${TSDB_BASE}/${path}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`TheSportsDB HTTP ${response.status}`);
  return json;
}

function n(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function championshipMetrics(standings = []) {
  if (!standings.length) return null;
  const playedRows = standings.filter((r) => r.played > 0);
  const base = playedRows.length ? playedRows : standings;
  const bestAttack = [...base].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const bestDefense = [...base].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  const totalGoals = base.reduce((sum, r) => sum + r.goalsFor, 0);
  const totalMatches = base.reduce((sum, r) => sum + r.played, 0) / 2;
  return {
    leader: standings[0] || null,
    bestAttack,
    bestDefense,
    totalGoals,
    goalAverage: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : "0.00"
  };
}

function mapTsdbTable(row, index) {
  return { rank: n(row.intRank) || index + 1, teamId: row.idTeam || row.id || null, team: row.strTeam || "Équipe", shortName: row.strTeamShort || row.strTeam || "Équipe", logo: row.strBadge || row.strTeamBadge || null, played: n(row.intPlayed), win: n(row.intWin), draw: n(row.intDraw), lose: n(row.intLoss), goalsFor: n(row.intGoalsFor), goalsAgainst: n(row.intGoalsAgainst), diff: row.intGoalDifference != null ? n(row.intGoalDifference) : n(row.intGoalsFor) - n(row.intGoalsAgainst), points: n(row.intPoints) };
}
function eventDate(event) { if (event.strTimestamp) return event.strTimestamp; if (!event.dateEvent) return null; return `${event.dateEvent}T${(event.strTime || "12:00:00").slice(0, 8)}Z`; }
function mapTsdbEvent(event) {
  const utcDate = eventDate(event); const timestamp = utcDate ? Math.floor(new Date(utcDate).getTime() / 1000) : 0;
  const hs = event.intHomeScore == null || event.intHomeScore === "" ? null : n(event.intHomeScore); const as = event.intAwayScore == null || event.intAwayScore === "" ? null : n(event.intAwayScore);
  const status = String(event.strStatus || "").toLowerCase(); const finished = ["match finished", "finished", "ft", "aet", "pen"].includes(status) || (hs != null && as != null && timestamp < Math.floor(Date.now() / 1000) - 4 * 3600);
  return { id: event.idEvent, utcDate, timestamp, status: finished ? "FINISHED" : "SCHEDULED", matchday: n(event.intRound) || null, home: { id: event.idHomeTeam, name: event.strHomeTeam, shortName: event.strHomeTeam, logo: event.strHomeTeamBadge || null }, away: { id: event.idAwayTeam, name: event.strAwayTeam, shortName: event.strAwayTeam, logo: event.strAwayTeamBadge || null }, score: { home: finished ? hs : null, away: finished ? as : null } };
}

async function getTsdbSnapshotUncached(config, fallbackReason = null) {
  const league = await tsdb(`lookupleague.php?id=${config.tsdbId}`);
  const season = league?.leagues?.[0]?.strCurrentSeason || "";
  const q = season ? `&s=${encodeURIComponent(season)}` : "";
  const [tableJson, previousJson, nextJson] = await Promise.all([
    tsdb(`lookuptable.php?l=${config.tsdbId}${q}`).catch(() => ({ table: [] })),
    tsdb(`eventspastleague.php?id=${config.tsdbId}`).catch(() => ({ events: [] })),
    tsdb(`eventsnextleague.php?id=${config.tsdbId}`).catch(() => ({ events: [] }))
  ]);
  const now = Math.floor(Date.now() / 1000);
  const standings = (tableJson?.table || []).map(mapTsdbTable);
  const recent = (previousJson?.events || []).map(mapTsdbEvent).filter((m) => m.status === "FINISHED" && (!m.timestamp || m.timestamp <= now)).sort((a,b) => b.timestamp-a.timestamp);
  const upcoming = (nextJson?.events || []).map(mapTsdbEvent).filter((m) => m.status !== "FINISHED").sort((a,b) => a.timestamp-b.timestamp);
  const complete = standings.length >= config.teamCount;
  return {
    ok: complete,
    config,
    season: season || "Dernière saison disponible",
    standings: complete ? standings : [],
    recent,
    upcoming,
    scorers: [],
    metrics: complete ? championshipMetrics(standings) : null,
    source: "TheSportsDB (secours)",
    limited: !complete,
    note: complete ? null : `Source de secours incomplète : ${standings.length} équipe${standings.length > 1 ? "s" : ""} sur ${config.teamCount}. Ligue 1 Express préfère masquer un classement tronqué plutôt que d'afficher de fausses statistiques.`,
    error: complete ? null : `Classement complet temporairement indisponible (${fallbackReason || "ESPN indisponible"}).`
  };
}

async function getSecondaryChampionship(slug) {
  const config = CHAMPIONSHIPS[slug];
  try {
    const fpt = await getFutPythonTraderSnapshot(config.fptLeague, config.teamCount, slug);
    return {
      ok: true,
      config,
      season: fpt.season,
      standings: fpt.standings,
      recent: fpt.recent,
      upcoming: fpt.upcoming,
      scorers: [],
      metrics: championshipMetrics(fpt.standings),
      source: "FutPythonTrader",
      currentMatchday: fpt.currentMatchday,
      limited: false,
      note: null
    };
  } catch (error) {
    return { ok: false, config, error: error?.message || "Données championnat indisponibles" };
  }
}

export async function getChampionshipSnapshot(slug) {
  const normalized = normalizeChampionshipSlug(slug); const config = getChampionshipConfig(normalized);
  if (!config) return { ok: false, notFound: true, error: "Championnat introuvable" };
  if (normalized !== "ligue-1") return getSecondaryChampionship(normalized);

  const [standings, fixtures, scorers] = await Promise.all([getStandings(), getFixtures(), getScorers()]);
  if (!standings.ok || !fixtures.ok) return { ok: false, config, error: standings.error || fixtures.error || "Données Ligue 1 indisponibles" };
  const now = Math.floor(Date.now() / 1000);
  const recent = fixtures.data.filter((m) => m.status === "FINISHED").sort((a,b) => b.timestamp-a.timestamp);
  const upcoming = fixtures.data.filter((m) => m.status !== "FINISHED" && m.timestamp >= now - 3 * 3600).sort((a,b) => a.timestamp-b.timestamp);
  return { ok: true, config, season: standings.season || "Actuelle", standings: standings.data, recent: recent.slice(0,12), upcoming: upcoming.slice(0,12), scorers: scorers.ok ? scorers.data.slice(0,10) : [], metrics: championshipMetrics(standings.data), source: "football-data.org", limited: false, note: null };
}
