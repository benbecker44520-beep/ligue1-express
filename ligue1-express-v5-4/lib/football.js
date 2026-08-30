import { unstable_cache } from "next/cache";

const API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "FL1";

export function hasFootballDataToken() {
  return Boolean(process.env.FOOTBALL_DATA_TOKEN);
}

async function footballData(path) {
  const token = process.env.FOOTBALL_DATA_TOKEN;

  if (!token) {
    return {
      ok: false,
      setupRequired: true,
      error: "FOOTBALL_DATA_TOKEN manquant"
    };
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "X-Auth-Token": token
      },
      cache: "no-store"
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        error: json?.message || `football-data.org HTTP ${response.status}`
      };
    }

    return { ok: true, data: json };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

const cachedStandings = unstable_cache(
  async () => {
    const result = await footballData(`/competitions/${COMPETITION}/standings`);
    if (!result.ok) throw new Error(result.error || "Données classement indisponibles");

    const totalTable =
      result.data?.standings?.find((s) => s.type === "TOTAL")?.table ||
      result.data?.standings?.[0]?.table ||
      [];

    return {
      ok: true,
      season: result.data?.season?.startDate?.slice(0, 4) || "",
      data: totalTable.map((row) => ({
        rank: row.position,
        teamId: row.team?.id,
        team: row.team?.name,
        shortName: row.team?.shortName,
        logo: row.team?.crest,
        played: row.playedGames ?? 0,
        win: row.won ?? 0,
        draw: row.draw ?? 0,
        lose: row.lost ?? 0,
        goalsFor: row.goalsFor ?? 0,
        goalsAgainst: row.goalsAgainst ?? 0,
        diff: row.goalDifference ?? 0,
        points: row.points ?? 0
      }))
    };
  },
  ["ligue1-footballdata-standings"],
  { revalidate: 900 }
);

const cachedMatches = unstable_cache(
  async () => {
    const result = await footballData(`/competitions/${COMPETITION}/matches`);
    if (!result.ok) throw new Error(result.error || "Données matchs indisponibles");

    const matches = (result.data?.matches || []).map((m) => ({
      id: m.id,
      utcDate: m.utcDate,
      timestamp: m.utcDate ? Math.floor(new Date(m.utcDate).getTime() / 1000) : 0,
      status: m.status,
      matchday: m.matchday,
      stage: m.stage,
      home: {
        id: m.homeTeam?.id,
        name: m.homeTeam?.name,
        shortName: m.homeTeam?.shortName,
        logo: m.homeTeam?.crest
      },
      away: {
        id: m.awayTeam?.id,
        name: m.awayTeam?.name,
        shortName: m.awayTeam?.shortName,
        logo: m.awayTeam?.crest
      },
      score: {
        home: m.score?.fullTime?.home,
        away: m.score?.fullTime?.away
      }
    })).sort((a, b) => a.timestamp - b.timestamp);

    return {
      ok: true,
      season: result.data?.competition?.name || "Ligue 1",
      data: matches
    };
  },
  ["ligue1-footballdata-matches"],
  { revalidate: 600 }
);

export async function getStandings() {
  try {
    return await cachedStandings();
  } catch (error) {
    return { ok: false, error: error?.message || "Données classement temporairement indisponibles" };
  }
}

export async function getFixtures() {
  try {
    return await cachedMatches();
  } catch (error) {
    return { ok: false, error: error?.message || "Données matchs temporairement indisponibles" };
  }
}

export async function getHomeSnapshot() {
  const result = await getFixtures();
  if (!result.ok) return result;

  const now = Math.floor(Date.now() / 1000);
  const liveStatuses = new Set(["IN_PLAY", "PAUSED", "LIVE"]);
  const finished = result.data
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => b.timestamp - a.timestamp);
  const live = result.data
    .filter((m) => liveStatuses.has(m.status))
    .sort((a, b) => a.timestamp - b.timestamp);
  const upcoming = result.data
    .filter((m) => m.status !== "FINISHED" && !liveStatuses.has(m.status) && m.timestamp >= now)
    .sort((a, b) => a.timestamp - b.timestamp);

  return {
    ok: true,
    data: {
      latest: finished[0] || null,
      live: live[0] || null,
      next: upcoming[0] || null
    }
  };
}

export async function getHomeFixtures(limit = 3) {
  const result = await getFixtures();
  if (!result.ok) return result;

  const now = Math.floor(Date.now() / 1000);
  const liveStatuses = new Set(["IN_PLAY", "PAUSED", "LIVE"]);
  const finishedStatuses = new Set(["FINISHED"]);

  const live = result.data.filter((m) => liveStatuses.has(m.status));
  const recent = result.data
    .filter((m) => finishedStatuses.has(m.status))
    .sort((a, b) => b.timestamp - a.timestamp);

  const upcoming = result.data
    .filter((m) => !finishedStatuses.has(m.status) && !liveStatuses.has(m.status) && m.timestamp >= now)
    .sort((a, b) => a.timestamp - b.timestamp);

  let chosen;
  if (live.length) {
    chosen = [...live, ...recent.slice(0, 1), ...upcoming.slice(0, 1)];
  } else {
    const recentCount = Math.max(1, Math.ceil(limit / 2));
    chosen = [...recent.slice(0, recentCount), ...upcoming.slice(0, Math.max(0, limit - recentCount))];
  }
  chosen = chosen
    .filter((m, index, arr) => arr.findIndex((x) => x.id === m.id) === index)
    .slice(0, limit);

  return { ok: true, data: chosen };
}

export async function getMatchById(id) {
  const result = await getFixtures();
  if (!result.ok) return result;

  const match = result.data.find((m) => String(m.id) === String(id));
  if (!match) return { ok: false, notFound: true, error: "Match introuvable" };

  return { ok: true, data: match };
}


export async function getTeamById(id) {
  const [standings, fixtures] = await Promise.all([getStandings(), getFixtures()]);
  if (!standings.ok) return standings;
  if (!fixtures.ok) return fixtures;

  const row = standings.data.find((r) => String(r.teamId) === String(id));
  if (!row) return { ok: false, notFound: true, error: "Club introuvable" };

  const matches = fixtures.data.filter((m) =>
    String(m.home.id) === String(id) || String(m.away.id) === String(id)
  );
  const finished = matches.filter((m) => m.status === "FINISHED").sort((a,b) => b.timestamp-a.timestamp);
  const upcoming = matches.filter((m) => m.status !== "FINISHED" && m.timestamp >= Math.floor(Date.now()/1000)).sort((a,b) => a.timestamp-b.timestamp);

  return { ok: true, data: { club: row, recent: finished.slice(0,5), upcoming: upcoming.slice(0,5) } };
}


const cachedScorers = unstable_cache(
  async () => {
    const result = await footballData(`/competitions/${COMPETITION}/scorers?limit=20`);
    if (!result.ok) throw new Error(result.error || "Données buteurs indisponibles");
    return {
      ok: true,
      data: (result.data?.scorers || []).map((s) => ({
        playerId: s.player?.id,
        name: s.player?.name,
        teamId: s.team?.id,
        teamName: s.team?.shortName || s.team?.name,
        logo: s.team?.crest,
        goals: s.goals ?? 0,
        assists: s.assists ?? null,
        penalties: s.penalties ?? null
      }))
    };
  },
  ["ligue1-footballdata-scorers"],
  { revalidate: 900 }
);

export async function getScorers() {
  try {
    return await cachedScorers();
  } catch (error) {
    return { ok: false, error: error?.message || "Données buteurs temporairement indisponibles" };
  }
}

export async function getTeamDetails(id) {
  try {
    return await unstable_cache(
      async () => {
        const result = await footballData(`/teams/${id}`);
        if (!result.ok) throw new Error(result.error || "Données du club indisponibles");
        const t = result.data || {};
        return {
          ok: true,
          data: {
            id: t.id,
            name: t.name,
            shortName: t.shortName,
            tla: t.tla,
            crest: t.crest,
            address: t.address,
            website: t.website,
            founded: t.founded,
            clubColors: t.clubColors,
            venue: t.venue,
            coach: t.coach?.name || null,
            squad: (t.squad || []).map((p) => ({
              id: p.id,
              name: p.name,
              position: p.position,
              dateOfBirth: p.dateOfBirth,
              nationality: p.nationality
            }))
          }
        };
      },
      [`ligue1-footballdata-team-v54-${id}`],
      { revalidate: 43200 }
    )();
  } catch (error) {
    return { ok: false, error: error?.message || "Données du club temporairement indisponibles" };
  }
}

async function getPersonDirect(id) {
  try {
    return await unstable_cache(
      async () => {
        const result = await footballData(`/persons/${id}`);
        // Important en production : une erreur 429/5xx ne doit jamais entrer dans le cache.
        if (!result.ok) throw new Error(result.error || "Fiche joueur temporairement indisponible");
        const p = result.data || {};
        return {
          ok: true,
          data: {
            id: p.id,
            name: p.name,
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: p.dateOfBirth,
            nationality: p.nationality,
            position: p.position,
            shirtNumber: p.shirtNumber,
            currentTeam: p.currentTeam ? {
              id: p.currentTeam.id,
              name: p.currentTeam.name,
              shortName: p.currentTeam.shortName,
              crest: p.currentTeam.crest
            } : null
          }
        };
      },
      [`ligue1-footballdata-person-v54-${id}`],
      { revalidate: 86400 }
    )();
  } catch (error) {
    return { ok: false, error: error?.message || "Fiche joueur temporairement indisponible" };
  }
}

// V5.4 : lorsqu'on arrive depuis une fiche club (ou les stats), on réutilise
// le cache de l'effectif du club au lieu de consommer une requête /persons par joueur.
export async function getPersonDetails(id, teamId = null) {
  if (teamId) {
    const team = await getTeamDetails(teamId);
    if (team.ok) {
      const player = (team.data?.squad || []).find((p) => String(p.id) === String(id));
      if (player) {
        return {
          ok: true,
          data: {
            ...player,
            firstName: null,
            lastName: null,
            shirtNumber: null,
            currentTeam: {
              id: team.data.id,
              name: team.data.name,
              shortName: team.data.shortName,
              crest: team.data.crest
            }
          }
        };
      }
    } else {
      // Ne pas doubler immédiatement les appels API quand football-data est limité.
      return team;
    }
  }

  return getPersonDirect(id);
}
