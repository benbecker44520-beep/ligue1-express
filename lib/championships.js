import { unstable_cache } from "next/cache";
import { getFixtures, getScorers, getStandings } from "@/lib/football";

const SOFA_BASE = "https://api.sofascore.com/api/v1";
const TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/123";

export const CHAMPIONSHIPS = {
  "ligue-1": {
    slug: "ligue-1",
    name: "Ligue 1",
    shortName: "L1",
    level: "1er échelon",
    teamCount: 18,
    provider: "football-data.org"
  },
  "ligue-2": {
    slug: "ligue-2",
    name: "Ligue 2",
    shortName: "L2",
    level: "2e échelon",
    teamCount: 18,
    provider: "Sofascore",
    sofaTournamentId: 182,
    tsdbId: "4401"
  },
  "ligue-3": {
    slug: "ligue-3",
    name: "Ligue 3",
    subtitle: "Championnat professionnel FFF",
    shortName: "L3",
    level: "3e échelon",
    teamCount: 18,
    provider: "Sofascore",
    sofaTournamentId: 183,
    // Ancien National dans TheSportsDB : uniquement utilisé comme secours.
    tsdbId: "4637"
  }
};

export function normalizeChampionshipSlug(slug) {
  return slug === "national" ? "ligue-3" : slug;
}

export function getChampionshipConfig(slug) {
  return CHAMPIONSHIPS[normalizeChampionshipSlug(slug)] || null;
}

async function jsonFetch(base, path, sourceName) {
  try {
    const response = await fetch(`${base}/${path}`, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${sourceName} HTTP ${response.status}`);
    return json;
  } catch (error) {
    throw new Error(error?.message || `Données ${sourceName} indisponibles`);
  }
}

function sofa(path) {
  return jsonFetch(SOFA_BASE, path, "Sofascore");
}

function tsdb(path) {
  return jsonFetch(TSDB_BASE, path, "TheSportsDB");
}

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currentFootballSeasonLabel() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const startYear = now.getUTCMonth() >= 6 ? year : year - 1;
  return `${String(startYear).slice(-2)}/${String(startYear + 1).slice(-2)}`;
}

function chooseSofaSeason(seasons = []) {
  const wanted = currentFootballSeasonLabel();
  return (
    seasons.find((season) => String(season.year || "").trim() === wanted) ||
    seasons.find((season) => String(season.name || "").includes(wanted)) ||
    seasons[0] ||
    null
  );
}

function sofaTeamLogo(teamId) {
  return teamId ? `https://img.sofascore.com/api/v1/team/${teamId}/image` : null;
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
    played: n(row.matches),
    win: n(row.wins),
    draw: n(row.draws),
    lose: n(row.losses),
    goalsFor,
    goalsAgainst,
    diff,
    points: n(row.points)
  };
}

function mapSofaEvent(event) {
  const startTimestamp = n(event.startTimestamp);
  const utcDate = startTimestamp ? new Date(startTimestamp * 1000).toISOString() : null;
  const type = String(event.status?.type || "").toLowerCase();
  const code = n(event.status?.code);
  const finished = code === 100 || ["finished", "afterpenalties", "afterextra", "canceled", "cancelled"].includes(type);
  const live = ["inprogress", "paused", "halftime"].includes(type);

  const homeValue = event.homeScore?.current ?? event.homeScore?.normaltime;
  const awayValue = event.awayScore?.current ?? event.awayScore?.normaltime;
  const homeScore = homeValue === null || homeValue === undefined || homeValue === "" ? null : n(homeValue);
  const awayScore = awayValue === null || awayValue === undefined || awayValue === "" ? null : n(awayValue);

  return {
    id: event.id,
    utcDate,
    timestamp: startTimestamp,
    status: finished ? "FINISHED" : live ? "IN_PLAY" : "SCHEDULED",
    matchday: n(event.roundInfo?.round) || null,
    home: {
      id: event.homeTeam?.id || null,
      name: event.homeTeam?.name || "Équipe",
      shortName: event.homeTeam?.shortName || event.homeTeam?.name || "Équipe",
      logo: sofaTeamLogo(event.homeTeam?.id)
    },
    away: {
      id: event.awayTeam?.id || null,
      name: event.awayTeam?.name || "Équipe",
      shortName: event.awayTeam?.shortName || event.awayTeam?.name || "Équipe",
      logo: sofaTeamLogo(event.awayTeam?.id)
    },
    score: {
      home: finished || live ? homeScore : null,
      away: finished || live ? awayScore : null
    }
  };
}

async function getSofaSnapshotUncached(config) {
  const seasonJson = await sofa(`unique-tournament/${config.sofaTournamentId}/seasons`);
  const season = chooseSofaSeason(seasonJson?.seasons || []);
  if (!season?.id) throw new Error(`Saison ${currentFootballSeasonLabel()} introuvable`);

  const [standingsJson, previousJson, nextJson] = await Promise.all([
    sofa(`unique-tournament/${config.sofaTournamentId}/season/${season.id}/standings/total`),
    sofa(`unique-tournament/${config.sofaTournamentId}/season/${season.id}/events/last/0`).catch(() => ({ events: [] })),
    sofa(`unique-tournament/${config.sofaTournamentId}/season/${season.id}/events/next/0`).catch(() => ({ events: [] }))
  ]);

  const total = (standingsJson?.standings || []).find((table) => table.type === "total") || standingsJson?.standings?.[0];
  const standings = (total?.rows || []).map(mapSofaTable).sort((a, b) => a.rank - b.rank);
  if (!standings.length) throw new Error("Classement complet indisponible");

  const now = Math.floor(Date.now() / 1000);
  const previous = (previousJson?.events || [])
    .map(mapSofaEvent)
    .filter((match) => match.status === "FINISHED" && (!match.timestamp || match.timestamp <= now))
    .sort((a, b) => b.timestamp - a.timestamp);
  const upcoming = (nextJson?.events || [])
    .map(mapSofaEvent)
    .filter((match) => match.status !== "FINISHED" && (!match.timestamp || match.timestamp >= now - 3 * 60 * 60))
    .sort((a, b) => a.timestamp - b.timestamp);

  return {
    ok: true,
    config,
    season: season.year || season.name || currentFootballSeasonLabel(),
    standings,
    recent: previous.slice(0, 10),
    upcoming: upcoming.slice(0, 10),
    scorers: [],
    source: "Sofascore",
    limited: standings.length < config.teamCount,
    note: standings.length < config.teamCount
      ? `Le flux n’a renvoyé que ${standings.length} équipes sur ${config.teamCount}.`
      : null
  };
}

function mapTsdbTable(row, index) {
  return {
    rank: n(row.intRank) || index + 1,
    teamId: row.idTeam || row.id || null,
    team: row.strTeam || "Équipe",
    shortName: row.strTeamShort || row.strTeam || "Équipe",
    logo: row.strBadge || row.strTeamBadge || null,
    played: n(row.intPlayed),
    win: n(row.intWin),
    draw: n(row.intDraw),
    lose: n(row.intLoss),
    goalsFor: n(row.intGoalsFor),
    goalsAgainst: n(row.intGoalsAgainst),
    diff: row.intGoalDifference != null ? n(row.intGoalDifference) : n(row.intGoalsFor) - n(row.intGoalsAgainst),
    points: n(row.intPoints)
  };
}

function eventDate(event) {
  if (event.strTimestamp) return event.strTimestamp;
  if (!event.dateEvent) return null;
  const time = (event.strTime || "12:00:00").slice(0, 8);
  return `${event.dateEvent}T${time}Z`;
}

function mapTsdbEvent(event) {
  const utcDate = eventDate(event);
  const timestamp = utcDate ? Math.floor(new Date(utcDate).getTime() / 1000) : 0;
  const homeScore = event.intHomeScore === null || event.intHomeScore === "" || event.intHomeScore === undefined ? null : n(event.intHomeScore);
  const awayScore = event.intAwayScore === null || event.intAwayScore === "" || event.intAwayScore === undefined ? null : n(event.intAwayScore);
  const hasScore = homeScore !== null && awayScore !== null;
  const statusText = String(event.strStatus || "").trim().toLowerCase();
  const knownFinished = ["match finished", "finished", "ft", "aet", "after extra time", "pen", "after penalties"].includes(statusText);
  const oldEnoughWithScore = hasScore && timestamp > 0 && timestamp < Math.floor(Date.now() / 1000) - 4 * 60 * 60;
  const finished = knownFinished || oldEnoughWithScore;

  return {
    id: event.idEvent,
    utcDate,
    timestamp,
    status: finished ? "FINISHED" : "SCHEDULED",
    matchday: n(event.intRound) || null,
    home: {
      id: event.idHomeTeam,
      name: event.strHomeTeam,
      shortName: event.strHomeTeam,
      logo: event.strHomeTeamBadge || null
    },
    away: {
      id: event.idAwayTeam,
      name: event.strAwayTeam,
      shortName: event.strAwayTeam,
      logo: event.strAwayTeamBadge || null
    },
    score: {
      home: finished ? homeScore : null,
      away: finished ? awayScore : null
    }
  };
}

async function getTsdbSnapshotUncached(config, fallbackReason = null) {
  const league = await tsdb(`lookupleague.php?id=${config.tsdbId}`);
  const leagueInfo = league?.leagues?.[0] || {};
  const season = leagueInfo.strCurrentSeason || "";
  const seasonQuery = season ? `&s=${encodeURIComponent(season)}` : "";

  const [tableJson, previousJson, nextJson] = await Promise.all([
    tsdb(`lookuptable.php?l=${config.tsdbId}${seasonQuery}`).catch(() => ({ table: [] })),
    tsdb(`eventspastleague.php?id=${config.tsdbId}`).catch(() => ({ events: [] })),
    tsdb(`eventsnextleague.php?id=${config.tsdbId}`).catch(() => ({ events: [] }))
  ]);

  const now = Math.floor(Date.now() / 1000);
  const table = (tableJson?.table || []).map(mapTsdbTable);
  const previous = (previousJson?.events || [])
    .map(mapTsdbEvent)
    .filter((match) => match.status === "FINISHED" && (!match.timestamp || match.timestamp <= now))
    .sort((a, b) => b.timestamp - a.timestamp);
  const upcoming = (nextJson?.events || [])
    .map(mapTsdbEvent)
    .filter((match) => match.status !== "FINISHED" && (!match.timestamp || match.timestamp >= now - 3 * 60 * 60))
    .sort((a, b) => a.timestamp - b.timestamp);

  const reason = fallbackReason ? ` (${fallbackReason})` : "";
  return {
    ok: true,
    config,
    season: season || "Dernière saison disponible",
    standings: table,
    recent: previous,
    upcoming,
    scorers: [],
    source: "TheSportsDB (secours)",
    limited: true,
    note: `Mode de secours${reason} : l’offre gratuite TheSportsDB limite le classement à 5 équipes et le calendrier à quelques matchs.`
  };
}

function cachedSofa(config) {
  return unstable_cache(
    () => getSofaSnapshotUncached(config),
    [`ligue1-express-champ-sofa-${config.slug}-v551`],
    { revalidate: 900 }
  );
}

const cachedLigue2Sofa = cachedSofa(CHAMPIONSHIPS["ligue-2"]);
const cachedLigue3Sofa = cachedSofa(CHAMPIONSHIPS["ligue-3"]);

const cachedLigue2Tsdb = unstable_cache(
  () => getTsdbSnapshotUncached(CHAMPIONSHIPS["ligue-2"]),
  ["ligue1-express-champ-tsdb-ligue2-v551"],
  { revalidate: 1800 }
);

const cachedLigue3Tsdb = unstable_cache(
  () => getTsdbSnapshotUncached(CHAMPIONSHIPS["ligue-3"]),
  ["ligue1-express-champ-tsdb-ligue3-v551"],
  { revalidate: 1800 }
);

async function getSecondaryChampionship(slug) {
  const config = CHAMPIONSHIPS[slug];
  const primary = slug === "ligue-2" ? cachedLigue2Sofa : cachedLigue3Sofa;
  const fallback = slug === "ligue-2" ? cachedLigue2Tsdb : cachedLigue3Tsdb;

  try {
    return await primary();
  } catch (error) {
    try {
      const result = await fallback();
      return {
        ...result,
        note: `Mode de secours (${error?.message || "source principale indisponible"}) : l’offre gratuite TheSportsDB limite le classement à 5 équipes et le calendrier à quelques matchs.`
      };
    } catch (fallbackError) {
      return {
        ok: false,
        config,
        error: fallbackError?.message || error?.message || "Données championnat indisponibles"
      };
    }
  }
}

export async function getChampionshipSnapshot(slug) {
  const normalizedSlug = normalizeChampionshipSlug(slug);
  const config = getChampionshipConfig(normalizedSlug);
  if (!config) return { ok: false, notFound: true, error: "Championnat introuvable" };

  if (normalizedSlug === "ligue-1") {
    const [standings, fixtures, scorers] = await Promise.all([getStandings(), getFixtures(), getScorers()]);
    if (!standings.ok || !fixtures.ok) {
      return { ok: false, config, error: standings.error || fixtures.error || "Données Ligue 1 indisponibles" };
    }
    const now = Math.floor(Date.now() / 1000);
    const finished = fixtures.data
      .filter((m) => m.status === "FINISHED")
      .sort((a, b) => b.timestamp - a.timestamp);
    const upcoming = fixtures.data
      .filter((m) => m.status !== "FINISHED" && m.timestamp >= now - 3 * 60 * 60)
      .sort((a, b) => a.timestamp - b.timestamp);
    return {
      ok: true,
      config,
      season: standings.season || "Actuelle",
      standings: standings.data,
      recent: finished.slice(0, 10),
      upcoming: upcoming.slice(0, 10),
      scorers: scorers.ok ? scorers.data.slice(0, 10) : [],
      source: "football-data.org",
      limited: false,
      note: null
    };
  }

  return getSecondaryChampionship(normalizedSlug);
}
