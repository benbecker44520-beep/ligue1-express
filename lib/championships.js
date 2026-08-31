import { unstable_cache } from "next/cache";
import { getFixtures, getScorers, getStandings } from "@/lib/football";

const TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/123";

export const CHAMPIONSHIPS = {
  "ligue-1": {
    slug: "ligue-1",
    name: "Ligue 1",
    shortName: "L1",
    level: "1er échelon",
    provider: "football-data.org"
  },
  "ligue-2": {
    slug: "ligue-2",
    name: "Ligue 2",
    shortName: "L2",
    level: "2e échelon",
    provider: "TheSportsDB",
    tsdbId: "4401"
  },
  national: {
    slug: "national",
    name: "National",
    subtitle: "Championnat de France",
    shortName: "NAT",
    level: "3e échelon",
    provider: "TheSportsDB",
    tsdbId: "4637"
  }
};

export function getChampionshipConfig(slug) {
  return CHAMPIONSHIPS[slug] || null;
}

async function tsdb(path) {
  try {
    const response = await fetch(`${TSDB_BASE}/${path}`, { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`TheSportsDB HTTP ${response.status}`);
    return json;
  } catch (error) {
    throw new Error(error?.message || "Données championnat indisponibles");
  }
}

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
  const homeScore = event.intHomeScore === null || event.intHomeScore === "" || event.intHomeScore === undefined ? null : n(event.intHomeScore);
  const awayScore = event.intAwayScore === null || event.intAwayScore === "" || event.intAwayScore === undefined ? null : n(event.intAwayScore);
  const hasScore = homeScore !== null && awayScore !== null;
  const statusText = String(event.strStatus || "").toLowerCase();
  const finished = hasScore || ["match finished", "finished", "ft"].includes(statusText);

  return {
    id: event.idEvent,
    utcDate,
    dateLabel: event.dateEvent || null,
    timeLabel: event.strTime ? event.strTime.slice(0, 5) : null,
    timestamp: utcDate ? Math.floor(new Date(utcDate).getTime() / 1000) : 0,
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
    score: { home: homeScore, away: awayScore }
  };
}

async function getTsdbSnapshotUncached(config) {
  const league = await tsdb(`lookupleague.php?id=${config.tsdbId}`);
  const leagueInfo = league?.leagues?.[0] || {};
  const season = leagueInfo.strCurrentSeason || "";
  const seasonQuery = season ? `&s=${encodeURIComponent(season)}` : "";

  const [tableJson, previousJson, nextJson] = await Promise.all([
    tsdb(`lookuptable.php?l=${config.tsdbId}${seasonQuery}`).catch(() => ({ table: [] })),
    tsdb(`eventspastleague.php?id=${config.tsdbId}`).catch(() => ({ events: [] })),
    tsdb(`eventsnextleague.php?id=${config.tsdbId}`).catch(() => ({ events: [] }))
  ]);

  const table = (tableJson?.table || []).map(mapTsdbTable);
  const previous = (previousJson?.events || []).map(mapTsdbEvent).sort((a, b) => b.timestamp - a.timestamp);
  const upcoming = (nextJson?.events || []).map(mapTsdbEvent).sort((a, b) => a.timestamp - b.timestamp);

  return {
    ok: true,
    config,
    season: season || "Dernière saison disponible",
    standings: table,
    recent: previous,
    upcoming,
    scorers: [],
    source: "TheSportsDB",
    limited: table.length > 0 && table.length < 10,
    note: "Les données Ligue 2 / National dépendent de la couverture disponible sur l’API gratuite."
  };
}

const cachedLigue2 = unstable_cache(
  () => getTsdbSnapshotUncached(CHAMPIONSHIPS["ligue-2"]),
  ["ligue1-express-champ-ligue2-v55"],
  { revalidate: 3600 }
);

const cachedNational = unstable_cache(
  () => getTsdbSnapshotUncached(CHAMPIONSHIPS.national),
  ["ligue1-express-champ-national-v55"],
  { revalidate: 3600 }
);

export async function getChampionshipSnapshot(slug) {
  const config = getChampionshipConfig(slug);
  if (!config) return { ok: false, notFound: true, error: "Championnat introuvable" };

  if (slug === "ligue-1") {
    const [standings, fixtures, scorers] = await Promise.all([getStandings(), getFixtures(), getScorers()]);
    if (!standings.ok || !fixtures.ok) {
      return { ok: false, config, error: standings.error || fixtures.error || "Données Ligue 1 indisponibles" };
    }
    const finished = fixtures.data.filter((m) => m.status === "FINISHED").sort((a, b) => b.timestamp - a.timestamp);
    const upcoming = fixtures.data.filter((m) => m.status !== "FINISHED" && m.timestamp >= Math.floor(Date.now() / 1000)).sort((a, b) => a.timestamp - b.timestamp);
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

  try {
    return slug === "ligue-2" ? await cachedLigue2() : await cachedNational();
  } catch (error) {
    return { ok: false, config, error: error?.message || "Données championnat indisponibles" };
  }
}
