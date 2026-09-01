import { unstable_cache } from "next/cache";

const ESPN_SITE = "https://site.api.espn.com";

const ESPN_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
  "User-Agent": "Mozilla/5.0 (compatible; Ligue1Express/1.0; +https://ligue1-express.vercel.app/)"
};

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currentStartYear() {
  const now = new Date();
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

function seasonLabel(start = currentStartYear()) {
  return `${start}/${start + 1}`;
}

async function espnFetch(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${ESPN_SITE}${path}`, {
      headers: ESPN_HEADERS,
      cache: "no-store",
      signal: controller.signal
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`ESPN HTTP ${response.status}`);
    if (!json || typeof json !== "object") throw new Error("Réponse ESPN invalide");
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function findStandingEntries(node, depth = 0) {
  if (!node || depth > 7) return [];
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findStandingEntries(item, depth + 1);
      if (found.length) return found;
    }
    return [];
  }
  if (typeof node !== "object") return [];
  if (Array.isArray(node.entries) && node.entries.length && node.entries.some((x) => x?.team)) return node.entries;
  for (const key of ["children", "groups", "standings", "content", "items"]) {
    const found = findStandingEntries(node[key], depth + 1);
    if (found.length) return found;
  }
  return [];
}

function statValue(entry, aliases, fallback = 0) {
  const stats = Array.isArray(entry?.stats) ? entry.stats : [];
  const normalizedAliases = aliases.map((x) => String(x).toLowerCase());
  const found = stats.find((stat) => {
    const candidates = [stat?.name, stat?.abbreviation, stat?.displayName, stat?.shortDisplayName]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase());
    return candidates.some((candidate) => normalizedAliases.includes(candidate));
  });
  if (!found) return fallback;
  const value = found.value ?? found.displayValue;
  const parsed = Number(String(value ?? "").replace("+", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function teamLogo(team) {
  return team?.logos?.[0]?.href || team?.logo || null;
}

function mapStandingEntry(entry, index) {
  const team = entry?.team || {};
  const played = statValue(entry, ["gamesplayed", "gp", "games", "pld"], 0);
  const win = statValue(entry, ["wins", "w"], 0);
  const draw = statValue(entry, ["ties", "draws", "t", "d"], 0);
  const lose = statValue(entry, ["losses", "l"], 0);
  const goalsFor = statValue(entry, ["pointsfor", "goalsfor", "f", "gf"], 0);
  const goalsAgainst = statValue(entry, ["pointsagainst", "goalsagainst", "a", "ga"], 0);
  const diff = statValue(entry, ["pointdifferential", "goaldifference", "gd", "diff"], goalsFor - goalsAgainst);
  const points = statValue(entry, ["points", "pts", "p"], 0);
  const rank = statValue(entry, ["rank", "rk", "position"], n(entry?.position) || index + 1);
  return {
    rank: rank || index + 1,
    teamId: team.id || null,
    team: team.displayName || team.name || team.shortDisplayName || "Équipe",
    shortName: team.shortDisplayName || team.name || team.displayName || "Équipe",
    logo: teamLogo(team),
    played,
    win,
    draw,
    lose,
    goalsFor,
    goalsAgainst,
    diff,
    points
  };
}

function competitorSide(competition, side) {
  return (competition?.competitors || []).find((competitor) => competitor?.homeAway === side) || null;
}

function competitionScore(competitor) {
  const raw = competitor?.score?.value ?? competitor?.score?.displayValue ?? competitor?.score;
  if (raw === null || raw === undefined || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapEspnEvent(event) {
  const competition = event?.competitions?.[0] || {};
  const home = competitorSide(competition, "home");
  const away = competitorSide(competition, "away");
  const statusType = event?.status?.type || competition?.status?.type || {};
  const state = String(statusType.state || "").toLowerCase();
  const name = String(statusType.name || "").toLowerCase();
  const completed = Boolean(statusType.completed) || state === "post" || name.includes("final");
  const live = state === "in" || name.includes("progress") || name.includes("halftime");
  const utcDate = event?.date || competition?.date || null;
  const timestamp = utcDate ? Math.floor(new Date(utcDate).getTime() / 1000) : 0;
  const hs = competitionScore(home);
  const as = competitionScore(away);
  return {
    id: event?.id || competition?.id,
    utcDate,
    timestamp,
    status: completed ? "FINISHED" : live ? "IN_PLAY" : "SCHEDULED",
    matchday: n(event?.week?.number || competition?.week?.number) || null,
    home: {
      id: home?.team?.id || null,
      name: home?.team?.displayName || home?.team?.name || "Équipe",
      shortName: home?.team?.shortDisplayName || home?.team?.name || home?.team?.displayName || "Équipe",
      logo: teamLogo(home?.team)
    },
    away: {
      id: away?.team?.id || null,
      name: away?.team?.displayName || away?.team?.name || "Équipe",
      shortName: away?.team?.shortDisplayName || away?.team?.name || away?.team?.displayName || "Équipe",
      logo: teamLogo(away?.team)
    },
    score: {
      home: completed || live ? hs : null,
      away: completed || live ? as : null
    }
  };
}

function ymd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function dateRange(daysBefore = 40, daysAfter = 40) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setUTCDate(start.getUTCDate() - daysBefore);
  end.setUTCDate(end.getUTCDate() + daysAfter);
  return `${ymd(start)}-${ymd(end)}`;
}

function dedupeEvents(events = []) {
  const seen = new Set();
  return events.filter((event) => {
    const key = String(event.id || `${event.utcDate}-${event.home?.name}-${event.away?.name}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getEspnChampionshipSnapshotUncached(league, expectedTeams = 18) {
  const start = currentStartYear();
  const standingsJson = await espnFetch(`/apis/v2/sports/soccer/${league}/standings?season=${start}`);
  const scoreboardJson = await espnFetch(`/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${dateRange()}`).catch(() => ({ events: [] }));

  const entries = findStandingEntries(standingsJson);
  const standings = entries.map(mapStandingEntry).sort((a, b) => a.rank - b.rank);
  if (standings.length < expectedTeams) {
    throw new Error(`ESPN n'a renvoyé que ${standings.length} équipe${standings.length > 1 ? "s" : ""} sur ${expectedTeams}`);
  }

  const now = Math.floor(Date.now() / 1000);
  const events = dedupeEvents((scoreboardJson?.events || []).map(mapEspnEvent));
  const recent = events
    .filter((m) => m.status === "FINISHED" && (!m.timestamp || m.timestamp <= now))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12);
  const upcoming = events
    .filter((m) => m.status !== "FINISHED" && (!m.timestamp || m.timestamp >= now - 3 * 3600))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 12);

  return {
    standings,
    recent,
    upcoming,
    season: seasonLabel(start),
    source: "ESPN",
    limited: false,
    note: null
  };
}


export async function getEspnCupMatches(daysBefore = 120, daysAfter = 120) {
  const scoreboardJson = await espnFetch(`/apis/site/v2/sports/soccer/fra.coupe_de_france/scoreboard?dates=${dateRange(daysBefore, daysAfter)}`).catch(() => ({ events: [] }));
  const events = dedupeEvents((scoreboardJson?.events || []).map(mapEspnEvent));
  const start = currentStartYear();
  return {
    ok: true,
    season: seasonLabel(start),
    data: events.map((event) => ({
      ...event,
      provider: "espn",
      leagueId: "165",
      leagueName: "Coupe de France",
      round: event.matchday ? `Tour ${event.matchday}` : ""
    }))
  };
}

export async function getEspnCupLiveMatches() {
  const today = ymd(new Date());
  const scoreboardJson = await espnFetch(`/apis/site/v2/sports/soccer/fra.coupe_de_france/scoreboard?dates=${today}`).catch(() => ({ events: [] }));
  return dedupeEvents((scoreboardJson?.events || []).map(mapEspnEvent))
    .filter((event) => event.status === "IN_PLAY")
    .map((event) => ({
      ...event,
      provider: "espn",
      leagueId: "165",
      leagueName: "Coupe de France",
      statusText: "EN DIRECT"
    }));
}
export function getEspnChampionshipSnapshot(league, expectedTeams = 18, cacheKey = league) {
  return unstable_cache(
    () => getEspnChampionshipSnapshotUncached(league, expectedTeams),
    [`ligue1-express-espn-champ-${cacheKey}-v561`],
    { revalidate: 300 }
  )();
}

function stripAccents(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeTeamName(value = "") {
  return stripAccents(value)
    .toLowerCase()
    .replace(/paris saint[- ]germain/g, "psg")
    .replace(/olympique de marseille/g, "marseille")
    .replace(/olympique lyonnais/g, "lyon")
    .replace(/as monaco(?: fc)?/g, "monaco")
    .replace(/losc lille/g, "lille")
    .replace(/stade rennais(?: fc)?/g, "rennes")
    .replace(/\b(fc|ac|sc|rc|as|ogc|stade|club|football)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function namesMatch(a, b) {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function findEspnEventForMatch(match, league = "fra.1") {
  const date = new Date(match?.utcDate || Date.now());
  const queries = [-1, 0, 1].map((offset) => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + offset);
    return ymd(d);
  });
  for (const day of queries) {
    try {
      const json = await espnFetch(`/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${day}`);
      const found = (json?.events || []).find((event) => {
        const mapped = mapEspnEvent(event);
        return namesMatch(mapped.home.name, match?.home?.name || match?.home?.shortName) && namesMatch(mapped.away.name, match?.away?.name || match?.away?.shortName);
      });
      if (found) return found;
    } catch {}
  }
  return null;
}

function eventMinute(item) {
  const display = item?.clock?.displayValue || item?.time?.displayValue || item?.period?.displayValue || null;
  if (display) return String(display).replace(/\s/g, "");
  const value = Number(item?.clock?.value ?? item?.time);
  return Number.isFinite(value) ? `${Math.floor(value / 60)}'` : "—";
}

function participantName(item, index = 0) {
  const p = item?.participants?.[index]?.athlete || item?.participants?.[index] || null;
  return p?.shortName || p?.displayName || p?.name || null;
}

function parseEspnIncident(item, homeId, awayId, index) {
  const typeText = String(item?.type?.text || item?.type?.name || item?.type || "").toLowerCase();
  const text = String(item?.text || item?.shortText || item?.description || "");
  const lower = `${typeText} ${text}`.toLowerCase();
  const teamId = String(item?.team?.id || item?.teamId || "");
  const isHome = teamId ? teamId === String(homeId) : false;
  const base = {
    id: String(item?.id || `espn-${index}-${eventMinute(item)}-${typeText}`),
    minute: eventMinute(item),
    minuteValue: n(String(eventMinute(item)).split("+")[0].replace("'", "")),
    isHome,
    player: participantName(item, 0),
    reason: text || null
  };

  if (/disallow|ruled out|no goal|goal cancelled|goal canceled/.test(lower)) return { ...base, type: "disallowed_goal", label: "But refusé", icon: "🚫" };
  if (/goal/.test(lower) && !/goal kick/.test(lower)) return { ...base, type: "goal", label: /penalty/.test(lower) ? "But sur penalty" : "But", icon: "⚽" };
  if (/red card|sent off/.test(lower)) return { ...base, type: "red_card", label: "Carton rouge", icon: "🟥" };
  if (/yellow card|booked/.test(lower)) return { ...base, type: "yellow_card", label: "Carton jaune", icon: "🟨" };
  if (/substitut|substitution/.test(lower)) {
    const matchSub = text.match(/(.+?)\s+substituted\s+in\s+for\s+(.+?)(?:\.|$)/i);
    return {
      ...base,
      type: "substitution",
      label: "Remplacement",
      icon: "🔄",
      playerIn: matchSub?.[1]?.trim() || participantName(item, 0),
      playerOut: matchSub?.[2]?.trim() || participantName(item, 1)
    };
  }
  return null;
}

function collectSummaryItems(summary) {
  const candidates = [summary?.keyEvents, summary?.details, summary?.plays, summary?.scoringPlays, summary?.header?.competitions?.[0]?.details];
  return candidates.find((arr) => Array.isArray(arr) && arr.length) || [];
}

async function getEspnMatchIncidentsUncached(match, league = "fra.1") {
  const event = await findEspnEventForMatch(match, league);
  if (!event?.id) return { ok: false, error: "Événement ESPN introuvable", data: [] };
  const mapped = mapEspnEvent(event);
  const summary = await espnFetch(`/apis/site/v2/sports/soccer/${league}/summary?event=${event.id}`);
  const items = collectSummaryItems(summary);
  const data = items
    .map((item, index) => parseEspnIncident(item, mapped.home.id, mapped.away.id, index))
    .filter(Boolean)
    .sort((a, b) => a.minuteValue - b.minuteValue);
  return { ok: true, eventId: event.id, data };
}

export async function getEspnMatchIncidents(match, league = "fra.1") {
  const isLive = ["IN_PLAY", "LIVE", "PAUSED"].includes(match?.status);
  const recent = Math.abs(Date.now() - new Date(match?.utcDate || 0).getTime()) < 3 * 24 * 60 * 60 * 1000;
  const revalidate = isLive ? 60 : recent ? 300 : 21600;
  try {
    return await unstable_cache(
      () => getEspnMatchIncidentsUncached(match, league),
      ["ligue1-express-espn-incidents-v561", String(match?.id || "unknown"), league],
      { revalidate }
    )();
  } catch (error) {
    return { ok: false, error: error?.message || "Fil du match indisponible", data: [] };
  }
}
