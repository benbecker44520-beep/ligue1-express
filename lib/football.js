import { unstable_cache } from "next/cache";

const API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "FL1";

const LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED", "LIVE"]);

function effectiveMatchStatus(status, utcDate, score) {
  const timestamp = utcDate ? new Date(utcDate).getTime() : 0;
  const ageMs = timestamp ? Date.now() - timestamp : 0;
  const fourHours = 4 * 60 * 60 * 1000;
  const hasScore = Number.isFinite(score?.home) && Number.isFinite(score?.away);

  // Certaines réponses de l'API peuvent rester temporairement bloquées en LIVE.
  // Au-delà de 4 h après le coup d'envoi, un match avec un score est considéré terminé.
  if (LIVE_STATUSES.has(status) && ageMs > fourHours && hasScore) return "FINISHED";

  return status;
}

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

function normalizeMatch(m) {
  const score = {
    home: m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? null,
    away: m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? null
  };

  return {
    id: m.id,
    utcDate: m.utcDate,
    timestamp: m.utcDate ? Math.floor(new Date(m.utcDate).getTime() / 1000) : 0,
    rawStatus: m.status,
    status: effectiveMatchStatus(m.status, m.utcDate, score),
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
    score
  };
}

function dateForApi(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

// Le calendrier complet change peu : on le garde en cache 15 minutes.
// Les matchs proches de la date du jour sont, eux, rafraîchis chaque minute.
// Le flux "chaud" écrase toujours les valeurs du calendrier complet afin
// qu'un score de match en cours / récemment terminé ne reste pas bloqué.
const cachedSeasonMatches = unstable_cache(
  async () => {
    const result = await footballData(`/competitions/${COMPETITION}/matches`);
    if (!result.ok) throw new Error(result.error || "Données matchs indisponibles");

    return {
      ok: true,
      season: result.data?.competition?.name || "Ligue 1",
      data: (result.data?.matches || []).map(normalizeMatch).sort((a, b) => a.timestamp - b.timestamp)
    };
  },
  ["ligue1-footballdata-season-matches-v552"],
  { revalidate: 900 }
);

const cachedHotMatches = unstable_cache(
  async () => {
    // 2 jours avant / 2 jours après : couvre le direct, le dernier résultat
    // et les prochains matchs sans requêter toute la saison chaque minute.
    const dateFrom = dateForApi(-2);
    const dateTo = dateForApi(2);
    const result = await footballData(
      `/competitions/${COMPETITION}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
    );
    if (!result.ok) throw new Error(result.error || "Actualisation des scores indisponible");

    return {
      ok: true,
      data: (result.data?.matches || []).map(normalizeMatch).sort((a, b) => a.timestamp - b.timestamp)
    };
  },
  ["ligue1-footballdata-hot-matches-v552"],
  { revalidate: 60 }
);

async function getFreshMatchById(id) {
  try {
    return await unstable_cache(
      async () => {
        const result = await footballData(`/matches/${id}`);
        if (!result.ok) throw new Error(result.error || "Actualisation du match indisponible");
        return { ok: true, data: normalizeMatch(result.data) };
      },
      [`ligue1-footballdata-match-v552-${id}`],
      { revalidate: 60 }
    )();
  } catch (error) {
    return { ok: false, error: error?.message || "Actualisation du match indisponible" };
  }
}

export async function getStandings() {
  try {
    return await cachedStandings();
  } catch (error) {
    return { ok: false, error: error?.message || "Données classement temporairement indisponibles" };
  }
}

export async function getFixtures() {
  const [seasonResult, hotResult] = await Promise.allSettled([
    cachedSeasonMatches(),
    cachedHotMatches()
  ]);

  const season = seasonResult.status === "fulfilled" ? seasonResult.value : null;
  const hot = hotResult.status === "fulfilled" ? hotResult.value : null;

  if (!season?.ok && !hot?.ok) {
    const seasonError = seasonResult.status === "rejected" ? seasonResult.reason?.message : null;
    const hotError = hotResult.status === "rejected" ? hotResult.reason?.message : null;
    return {
      ok: false,
      error: hotError || seasonError || "Données matchs temporairement indisponibles"
    };
  }

  // Le flux court et frais écrase le calendrier de saison sur les mêmes IDs.
  const merged = new Map();
  for (const match of season?.data || []) merged.set(String(match.id), match);
  for (const match of hot?.data || []) merged.set(String(match.id), match);

  return {
    ok: true,
    season: season?.season || "Ligue 1",
    hotAvailable: Boolean(hot?.ok),
    data: [...merged.values()].sort((a, b) => a.timestamp - b.timestamp)
  };
}

export async function getHomeSnapshot() {
  const result = await getFixtures();
  if (!result.ok) return result;

  const now = Math.floor(Date.now() / 1000);
  const finished = result.data
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => b.timestamp - a.timestamp);
  const live = result.data
    .filter((m) => LIVE_STATUSES.has(m.status))
    .sort((a, b) => a.timestamp - b.timestamp);
  const upcoming = result.data
    .filter((m) => m.status !== "FINISHED" && !LIVE_STATUSES.has(m.status) && m.timestamp >= now)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Si le flux récent n'a pas pu être récupéré (quota/API), on tente une seule
  // actualisation ciblée du match affiché. Cela évite de montrer un ancien score.
  let latest = finished[0] || null;
  let liveMatch = live[0] || null;
  if (!result.hotAvailable) {
    const candidate = liveMatch || latest;
    const isRecent = candidate && Math.abs(now - candidate.timestamp) <= 3 * 24 * 60 * 60;
    if (isRecent) {
      const fresh = await getFreshMatchById(candidate.id);
      if (fresh.ok) {
        if (LIVE_STATUSES.has(fresh.data.status)) liveMatch = fresh.data;
        else if (fresh.data.status === "FINISHED") {
          latest = fresh.data;
          if (liveMatch?.id === fresh.data.id) liveMatch = null;
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      latest,
      live: liveMatch,
      next: upcoming[0] || null
    }
  };
}

export async function getHomeFixtures(limit = 3) {
  const result = await getFixtures();
  if (!result.ok) return result;

  const now = Math.floor(Date.now() / 1000);
  const finishedStatuses = new Set(["FINISHED"]);

  const live = result.data.filter((m) => LIVE_STATUSES.has(m.status));
  const recent = result.data
    .filter((m) => finishedStatuses.has(m.status))
    .sort((a, b) => b.timestamp - a.timestamp);

  const upcoming = result.data
    .filter((m) => !finishedStatuses.has(m.status) && !LIVE_STATUSES.has(m.status) && m.timestamp >= now)
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
  if (!match) {
    const direct = await getFreshMatchById(id);
    if (direct.ok) return direct;
    return { ok: false, notFound: true, error: "Match introuvable" };
  }

  // Pour un match joué dans les 3 derniers jours, la fiche détaillée bénéficie
  // également d'un rafraîchissement ciblé toutes les 60 s.
  const now = Math.floor(Date.now() / 1000);
  const isRecent = Math.abs(now - match.timestamp) <= 3 * 24 * 60 * 60;
  if (isRecent || LIVE_STATUSES.has(match.status)) {
    const fresh = await getFreshMatchById(id);
    if (fresh.ok) return fresh;
  }

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

const cachedLeaguePlayers = unstable_cache(
  async () => {
    const result = await footballData(`/competitions/${COMPETITION}/teams`);
    if (!result.ok) throw new Error(result.error || "Effectifs Ligue 1 indisponibles");

    const players = [];
    for (const team of result.data?.teams || []) {
      for (const player of team.squad || []) {
        players.push({
          playerId: player.id,
          name: player.name,
          position: player.position || null,
          teamId: team.id,
          teamName: team.shortName || team.name,
          logo: team.crest || null
        });
      }
    }
    return { ok: true, data: players };
  },
  ["ligue1-footballdata-all-players-v8971"],
  { revalidate: 43200 }
);

export async function getLeaguePlayers() {
  try {
    return await cachedLeaguePlayers();
  } catch (error) {
    return { ok: false, error: error?.message || "Effectifs Ligue 1 temporairement indisponibles" };
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
