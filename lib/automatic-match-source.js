import { getApiFootballMatch as getFreeMatch, getRecentlyFinishedFrenchMatches } from "@/lib/apifootball";

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function matchLocalDate(utcDate) {
  if (!utcDate) return "";
  const date = new Date(utcDate);
  if (Number.isNaN(date.getTime())) return String(utcDate).slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|afc|sc|ac|rc|as|club|football|foot|stade)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFootballDataMatch(match) {
  const homeScore = match?.score?.fullTime?.home ?? match?.score?.regularTime?.home ?? 0;
  const awayScore = match?.score?.fullTime?.away ?? match?.score?.regularTime?.away ?? 0;
  return {
    id: `fd:${match.id}`,
    provider: "football-data",
    source: "football-data.org",
    sourceFree: true,
    league: { slug: "ligue-1", name: "Ligue 1", shortName: "L1", european: false },
    leagueId: "FL1",
    leagueName: "Ligue 1",
    european: false,
    status: "FINISHED",
    statusText: "TERMINÉ",
    matchLive: false,
    utcDate: match.utcDate || null,
    timestamp: match.utcDate ? Math.floor(new Date(match.utcDate).getTime() / 1000) : 0,
    stadium: "",
    referee: Array.isArray(match.referees) ? (match.referees[0]?.name || "") : "",
    round: match.matchday ? `J${match.matchday}` : "",
    home: {
      id: String(match.homeTeam?.id || ""),
      name: match.homeTeam?.name || match.homeTeam?.shortName || "Équipe domicile",
      shortName: match.homeTeam?.shortName || match.homeTeam?.name || "Domicile",
      logo: match.homeTeam?.crest || null
    },
    away: {
      id: String(match.awayTeam?.id || ""),
      name: match.awayTeam?.name || match.awayTeam?.shortName || "Équipe extérieure",
      shortName: match.awayTeam?.shortName || match.awayTeam?.name || "Extérieur",
      logo: match.awayTeam?.crest || null
    },
    score: { home: Number(homeScore) || 0, away: Number(awayScore) || 0 },
    events: [],
    raw: match
  };
}

async function getFreshFootballDataFinished(days = 1) {
  const token = String(process.env.FOOTBALL_DATA_TOKEN || "").trim();
  if (!token) return [];

  const safeDays = Math.max(1, Math.min(14, Number(days) || 1));
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - safeDays);

  try {
    const params = new URLSearchParams({ dateFrom: isoDate(from), dateTo: isoDate(to) });
    const response = await fetch(`${FOOTBALL_DATA_BASE}/competitions/FL1/matches?${params.toString()}`, {
      headers: { "X-Auth-Token": token, Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return [];
    const json = await response.json().catch(() => ({}));
    return (json.matches || [])
      .filter((match) => String(match.status || "").toUpperCase() === "FINISHED")
      .map(normalizeFootballDataMatch);
  } catch {
    return [];
  }
}

function duplicateKey(match) {
  return [
    matchLocalDate(match.utcDate),
    normalizeName(match.home?.name),
    normalizeName(match.away?.name)
  ].join("|");
}

export async function getFinishedMatchesForAutomaticArticles({ days = 1 } = {}) {
  const safeDays = Math.max(1, Math.min(14, Number(days) || 1));
  const [espnResult, footballData] = await Promise.all([
    getRecentlyFinishedFrenchMatches({ days: Math.min(7, safeDays) }).catch(() => ({ ok: false, data: [] })),
    getFreshFootballDataFinished(safeDays)
  ]);

  const merged = [];
  const seen = new Set();
  for (const match of [...(espnResult?.data || []), ...footballData]) {
    const key = duplicateKey(match);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(match);
  }

  merged.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  if (merged.length || espnResult?.ok) return { ok: true, data: merged };
  return { ok: false, data: [], error: espnResult?.error || "Matchs terminés indisponibles" };
}

export async function getFinishedAutomaticMatchById(matchId) {
  const id = String(matchId || "").trim();
  if (!id) return { ok: false, error: "Identifiant de match manquant" };

  if (!id.startsWith("fd:")) {
    const detailed = await getFreeMatch(id).catch(() => ({ ok: false }));
    if (detailed?.ok && detailed.data?.status === "FINISHED") {
      return { ok: true, data: detailed.data };
    }
  }

  const recent = await getFinishedMatchesForAutomaticArticles({ days: 14 });
  if (!recent.ok) return recent;
  const match = (recent.data || []).find((item) => String(item.id) === id);
  return match ? { ok: true, data: match } : { ok: false, error: "Match terminé introuvable." };
}
