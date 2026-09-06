const API_BASE = "https://api.football-data.org/v4";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1";

function currentSeasonStartYear() {
  const now = new Date();
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

function toTimestamp(value) {
  return value ? Math.floor(new Date(value).getTime() / 1000) : 0;
}

function mapFootballDataMatch(m) {
  return {
    id: m.id,
    utcDate: m.utcDate,
    timestamp: toTimestamp(m.utcDate),
    status: m.status,
    home: {
      id: m.homeTeam?.id,
      name: m.homeTeam?.name,
      shortName: m.homeTeam?.shortName
    },
    away: {
      id: m.awayTeam?.id,
      name: m.awayTeam?.name,
      shortName: m.awayTeam?.shortName
    },
    score: {
      home: m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? null,
      away: m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? null
    }
  };
}

function mapEspnMatch(event) {
  const competition = event?.competitions?.[0] || {};
  const competitors = competition?.competitors || [];
  const home = competitors.find((c) => c?.homeAway === "home") || {};
  const away = competitors.find((c) => c?.homeAway === "away") || {};
  const scoreValue = (c) => {
    const raw = c?.score?.value ?? c?.score?.displayValue ?? c?.score;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  const completed = Boolean(event?.status?.type?.completed) || String(event?.status?.type?.state || "").toLowerCase() === "post";
  return {
    id: event?.id,
    utcDate: event?.date,
    timestamp: toTimestamp(event?.date),
    status: completed ? "FINISHED" : "SCHEDULED",
    home: {
      id: null,
      name: home?.team?.displayName || home?.team?.name,
      shortName: home?.team?.shortDisplayName || home?.team?.name
    },
    away: {
      id: null,
      name: away?.team?.displayName || away?.team?.name,
      shortName: away?.team?.shortDisplayName || away?.team?.name
    },
    score: { home: scoreValue(home), away: scoreValue(away) }
  };
}

async function footballDataPreviousSeason() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return [];
  const previousSeason = currentSeasonStartYear() - 1;
  try {
    const response = await fetch(`${API_BASE}/competitions/FL1/matches?season=${previousSeason}&status=FINISHED`, {
      headers: { "X-Auth-Token": token, Accept: "application/json" },
      next: { revalidate: 86400 }
    });
    if (!response.ok) return [];
    const json = await response.json().catch(() => ({}));
    return (json.matches || []).map(mapFootballDataMatch).filter((m) => m.status === "FINISHED");
  } catch {
    return [];
  }
}

async function espnPreviousSeason() {
  const previousSeason = currentSeasonStartYear() - 1;
  const currentStart = previousSeason + 1;
  const urls = [
    `${ESPN_BASE}/scoreboard?dates=${previousSeason}&limit=1000`,
    `${ESPN_BASE}/scoreboard?dates=${currentStart}&limit=1000`
  ];
  try {
    const responses = await Promise.all(urls.map((url) => fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; FootFrancaisExpress/1.0)" },
      next: { revalidate: 86400 }
    })));
    const payloads = await Promise.all(responses.map(async (r) => r.ok ? r.json().catch(() => ({})) : ({ events: [] })));
    const seasonStart = Date.UTC(previousSeason, 6, 1) / 1000;
    const seasonEnd = Date.UTC(currentStart, 6, 1) / 1000;
    const seen = new Set();
    return payloads.flatMap((p) => p.events || [])
      .map(mapEspnMatch)
      .filter((m) => m.status === "FINISHED" && m.timestamp >= seasonStart && m.timestamp < seasonEnd)
      .filter((m) => {
        const key = String(m.id || `${m.utcDate}-${m.home?.name}-${m.away?.name}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch {
    return [];
  }
}

export async function getPreviousLigue1Matches() {
  const fd = await footballDataPreviousSeason();
  if (fd.length) return fd;
  return espnPreviousSeason();
}
