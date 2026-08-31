import { unstable_cache } from "next/cache";
import { getFixtures, getScorers, getStandings } from "@/lib/football";
import { sofaFetch, sofaTeamLogo } from "@/lib/sofascore";

const TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/123";

export const CHAMPIONSHIPS = {
  "ligue-1": { slug: "ligue-1", name: "Ligue 1", shortName: "L1", level: "1er échelon", teamCount: 18, provider: "football-data.org" },
  "ligue-2": { slug: "ligue-2", name: "Ligue 2", shortName: "L2", level: "2e échelon", teamCount: 18, provider: "Sofascore", sofaTournamentId: 182, tsdbId: "4401" },
  "ligue-3": { slug: "ligue-3", name: "Ligue 3", subtitle: "Championnat professionnel FFF", shortName: "L3", level: "3e échelon", teamCount: 18, provider: "Sofascore", sofaTournamentId: 183, tsdbId: "4637" }
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
function currentStartYear() { const now = new Date(); return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1; }
function currentFootballSeasonLabel() { const year = currentStartYear(); return `${String(year).slice(-2)}/${String(year + 1).slice(-2)}`; }

function chooseSofaSeason(seasons = []) {
  const start = currentStartYear();
  const short = `${String(start).slice(-2)}/${String(start + 1).slice(-2)}`;
  const long = `${start}/${start + 1}`;
  return seasons.find((s) => [s.year, s.name].some((v) => String(v || "").includes(short) || String(v || "").includes(long))) || seasons[0] || null;
}

function mapSofaTable(row, index) {
  const team = row.team || {};
  const goalsFor = n(row.scoresFor);
  const goalsAgainst = n(row.scoresAgainst);
  let diff = goalsFor - goalsAgainst;
  if (typeof row.scoreDiffFormatted === "string" && row.scoreDiffFormatted.trim()) {
    const parsed = Number(row.scoreDiffFormatted.replace("+", ""));
    if (Number.isFinite(parsed)) diff = parsed;
  }
  return {
    rank: n(row.position) || index + 1,
    teamId: team.id || null,
    team: team.name || "Équipe",
    shortName: team.shortName || team.name || "Équipe",
    logo: sofaTeamLogo(team.id),
    played: n(row.matches), win: n(row.wins), draw: n(row.draws), lose: n(row.losses),
    goalsFor, goalsAgainst, diff, points: n(row.points)
  };
}

function mapSofaEvent(event) {
  const timestamp = n(event.startTimestamp);
  const type = String(event.status?.type || "").toLowerCase();
  const code = n(event.status?.code);
  const finished = code === 100 || ["finished", "afterpenalties", "afterextra", "canceled", "cancelled"].includes(type);
  const live = ["inprogress", "paused", "halftime"].includes(type);
  const hv = event.homeScore?.current ?? event.homeScore?.normaltime;
  const av = event.awayScore?.current ?? event.awayScore?.normaltime;
  return {
    id: event.id,
    utcDate: timestamp ? new Date(timestamp * 1000).toISOString() : null,
    timestamp,
    status: finished ? "FINISHED" : live ? "IN_PLAY" : "SCHEDULED",
    matchday: n(event.roundInfo?.round) || null,
    home: { id: event.homeTeam?.id || null, name: event.homeTeam?.name || "Équipe", shortName: event.homeTeam?.shortName || event.homeTeam?.name || "Équipe", logo: sofaTeamLogo(event.homeTeam?.id) },
    away: { id: event.awayTeam?.id || null, name: event.awayTeam?.name || "Équipe", shortName: event.awayTeam?.shortName || event.awayTeam?.name || "Équipe", logo: sofaTeamLogo(event.awayTeam?.id) },
    score: { home: finished || live ? (hv == null ? null : n(hv)) : null, away: finished || live ? (av == null ? null : n(av)) : null }
  };
}

function extractSofaScorers(json) {
  const top = json?.topPlayers || {};
  const list = top.goals || top.goalsScored || top.goal || [];
  return (Array.isArray(list) ? list : []).map((item) => {
    const player = item.player || item.statistics?.player || {};
    const team = item.team || player.team || item.statistics?.team || {};
    const stats = item.statistics || {};
    return {
      playerId: player.id || null,
      name: player.name || player.shortName || "Joueur",
      teamId: team.id || null,
      teamName: team.shortName || team.name || "",
      logo: sofaTeamLogo(team.id),
      goals: n(stats.goals ?? item.goals ?? item.value)
    };
  }).filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals);
}

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

async function getSofaSnapshotUncached(config) {
  const seasonJson = await sofaFetch(`unique-tournament/${config.sofaTournamentId}/seasons`);
  const season = chooseSofaSeason(seasonJson?.seasons || []);
  if (!season?.id) throw new Error(`Saison ${currentFootballSeasonLabel()} introuvable`);

  const [standingsJson, previousJson, nextJson, topPlayersJson] = await Promise.all([
    sofaFetch(`unique-tournament/${config.sofaTournamentId}/season/${season.id}/standings/total`),
    sofaFetch(`unique-tournament/${config.sofaTournamentId}/season/${season.id}/events/last/0`).catch(() => ({ events: [] })),
    sofaFetch(`unique-tournament/${config.sofaTournamentId}/season/${season.id}/events/next/0`).catch(() => ({ events: [] })),
    sofaFetch(`unique-tournament/${config.sofaTournamentId}/season/${season.id}/top-players/regularSeason`).catch(() => ({}))
  ]);

  const total = (standingsJson?.standings || []).find((table) => table.type === "total") || standingsJson?.standings?.[0];
  const standings = (total?.rows || []).map(mapSofaTable).sort((a, b) => a.rank - b.rank);
  if (!standings.length) throw new Error("Classement complet indisponible");

  const now = Math.floor(Date.now() / 1000);
  const recent = (previousJson?.events || []).map(mapSofaEvent).filter((m) => m.status === "FINISHED" && (!m.timestamp || m.timestamp <= now)).sort((a, b) => b.timestamp - a.timestamp);
  const upcoming = (nextJson?.events || []).map(mapSofaEvent).filter((m) => m.status !== "FINISHED" && (!m.timestamp || m.timestamp >= now - 3 * 60 * 60)).sort((a, b) => a.timestamp - b.timestamp);

  return {
    ok: true, config,
    season: season.year || season.name || currentFootballSeasonLabel(),
    standings,
    recent: recent.slice(0, 12),
    upcoming: upcoming.slice(0, 12),
    scorers: extractSofaScorers(topPlayersJson).slice(0, 10),
    metrics: championshipMetrics(standings),
    source: "Sofascore",
    limited: standings.length < config.teamCount,
    note: standings.length < config.teamCount ? `Le flux principal n'a renvoyé que ${standings.length} équipes sur ${config.teamCount}.` : null
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
  return { ok: true, config, season: season || "Dernière saison disponible", standings, recent, upcoming, scorers: [], metrics: championshipMetrics(standings), source: "TheSportsDB (secours)", limited: true, note: `Mode de secours${fallbackReason ? ` (${fallbackReason})` : ""} : l'offre gratuite TheSportsDB est limitée à 5 équipes. Le flux Sofascore complet sera réessayé automatiquement.` };
}

function cachedSofa(config) { return unstable_cache(() => getSofaSnapshotUncached(config), [`ligue1-express-champ-sofa-${config.slug}-v56`], { revalidate: 600 }); }
const cachedLigue2Sofa = cachedSofa(CHAMPIONSHIPS["ligue-2"]);
const cachedLigue3Sofa = cachedSofa(CHAMPIONSHIPS["ligue-3"]);
const cachedLigue2Tsdb = unstable_cache(() => getTsdbSnapshotUncached(CHAMPIONSHIPS["ligue-2"]), ["ligue1-express-champ-tsdb-ligue2-v56"], { revalidate: 1800 });
const cachedLigue3Tsdb = unstable_cache(() => getTsdbSnapshotUncached(CHAMPIONSHIPS["ligue-3"]), ["ligue1-express-champ-tsdb-ligue3-v56"], { revalidate: 1800 });

async function getSecondaryChampionship(slug) {
  const config = CHAMPIONSHIPS[slug];
  try { return await (slug === "ligue-2" ? cachedLigue2Sofa : cachedLigue3Sofa)(); }
  catch (error) {
    try { return await getTsdbSnapshotUncached(config, error?.message || "source principale indisponible"); }
    catch (fallbackError) { return { ok: false, config, error: fallbackError?.message || error?.message || "Données championnat indisponibles" }; }
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
