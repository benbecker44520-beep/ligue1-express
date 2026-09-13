import { unstable_cache } from "next/cache";

const ESPN_SITE = "https://site.api.espn.com";
const ESPN_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
  "User-Agent": "Mozilla/5.0 (compatible; FootFrancaisExpress/1.0; +https://foot-francais-express.vercel.app/)"
};

export const FREE_COMPETITIONS = [
  { key: "l1", espn: "fra.1", slug: "ligue-1", name: "Ligue 1", shortName: "L1", frenchOnly: false },
  { key: "l2", espn: "fra.2", slug: "ligue-2", name: "Ligue 2", shortName: "L2", frenchOnly: false },
  { key: "l3", espn: "fra.3", slug: "ligue-3", name: "Ligue 3", shortName: "L3", frenchOnly: false },
  { key: "cdf", espn: "fra.coupe_de_france", slug: "coupe-de-france", name: "Coupe de France", shortName: "CDF", frenchOnly: false },
  { key: "ldc", espn: "uefa.champions", slug: "ligue-des-champions", name: "Ligue des champions", shortName: "LDC", frenchOnly: true, european: true },
  { key: "uel", espn: "uefa.europa", slug: "europa-league", name: "Europa League", shortName: "UEL", frenchOnly: true, european: true },
  { key: "uecl", espn: "uefa.europa.conf", slug: "conference-league", name: "Conference League", shortName: "UECL", frenchOnly: true, european: true }
];

const BY_KEY = new Map(FREE_COMPETITIONS.map((c) => [c.key, c]));
const FRENCH_CLUB_ALIASES = [
  "paris saint germain", "psg", "marseille", "olympique marseille", "monaco", "lille", "losc",
  "lyon", "olympique lyonnais", "nice", "ogc nice", "rennes", "stade rennais", "lens", "rc lens",
  "strasbourg", "rc strasbourg", "nantes", "fc nantes", "toulouse", "brest", "stade brestois", "auxerre",
  "lorient", "le havre", "metz", "reims", "saint etienne", "angers", "paris fc", "montpellier",
  "bordeaux", "caen", "guingamp", "amiens", "nancy", "sochaux"
];

function n(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function clean(value) { return String(value ?? "").trim(); }
function ymd(date) { return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`; }
function dateRange(daysBefore = 1, daysAfter = 1) { const now = new Date(); const a = new Date(now); const b = new Date(now); a.setUTCDate(a.getUTCDate() - daysBefore); b.setUTCDate(b.getUTCDate() + daysAfter); return `${ymd(a)}-${ymd(b)}`; }
function normalize(value) { return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(fc|afc|sc|ac|rc|as|club|football|foot|stade)\b/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function isFrenchClub(value) { const name = normalize(value); return Boolean(name && FRENCH_CLUB_ALIASES.some((club) => { const c = normalize(club); return c === name || c.includes(name) || name.includes(c); })); }
function frenchSide(match) { const home = isFrenchClub(match?.home?.name); const away = isFrenchClub(match?.away?.name); return home ? "home" : away ? "away" : null; }
function teamLogo(team) { return team?.logos?.[0]?.href || team?.logo || null; }
function competitorSide(competition, side) { return (competition?.competitors || []).find((c) => c?.homeAway === side) || null; }
function scoreValue(competitor) { const raw = competitor?.score?.value ?? competitor?.score?.displayValue ?? competitor?.score; if (raw === null || raw === undefined || raw === "") return null; const value = Number(raw); return Number.isFinite(value) ? value : null; }

async function espnFetch(path, timeout = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${ESPN_SITE}${path}`, { headers: ESPN_HEADERS, cache: "no-store", signal: controller.signal });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json || typeof json !== "object") throw new Error(`ESPN HTTP ${response.status}`);
    return json;
  } finally { clearTimeout(timer); }
}

function parseCompositeId(id) {
  const text = clean(id);
  const match = text.match(/^([a-z0-9]+):(\d+)$/i);
  if (!match) return null;
  const competition = BY_KEY.get(match[1]);
  return competition ? { competition, eventId: match[2] } : null;
}

function statusInfo(event, competition) {
  const type = event?.status?.type || competition?.status?.type || {};
  const state = clean(type.state).toLowerCase();
  const name = clean(type.name).toLowerCase();
  const completed = Boolean(type.completed) || state === "post" || name.includes("final");
  const live = state === "in" || name.includes("progress") || name.includes("halftime");
  const status = completed ? "FINISHED" : live ? "IN_PLAY" : "SCHEDULED";
  const detail = clean(event?.status?.displayClock || competition?.status?.displayClock || type.shortDetail || type.detail || type.description);
  const statusText = completed ? "TERMINÉ" : live ? (detail || "EN DIRECT") : (detail || "À VENIR");
  return { status, statusText, matchLive: live };
}

function minuteValue(detail) {
  const text = clean(detail?.clock?.displayValue || detail?.time?.displayValue || detail?.clock || detail?.time);
  const found = text.match(/\d+/);
  return found ? Number(found[0]) : 0;
}

function involvedName(detail, index = 0) {
  const athlete = detail?.athletesInvolved?.[index] || detail?.participants?.[index]?.athlete || detail?.participants?.[index];
  return clean(athlete?.displayName || athlete?.shortName || athlete?.fullName || athlete?.name);
}

function mapDetail(detail, index, homeId, awayId) {
  const label = clean(detail?.type?.text || detail?.type?.name || detail?.text || detail?.description).toLowerCase();
  const minute = minuteValue(detail);
  const minuteLabel = clean(detail?.clock?.displayValue || detail?.time?.displayValue) || (minute ? `${minute}'` : "");
  const teamId = clean(detail?.team?.id || detail?.teamId);
  const side = teamId && teamId === clean(homeId) ? "home" : teamId && teamId === clean(awayId) ? "away" : "home";
  const base = { id: `espn-event-${clean(detail?.id) || `${index}-${minute}`}`, minute, minuteLabel, side, player: involvedName(detail, 0) || "Joueur" };
  if (detail?.redCard || label.includes("red card") || label.includes("sent off")) return { ...base, type: "red_card" };
  if (detail?.yellowCard || label.includes("yellow card") || label.includes("booked")) return { ...base, type: "yellow_card" };
  if (detail?.scoringPlay || label.includes("goal") || label.includes("penalty - scored")) return { ...base, type: "goal", assist: involvedName(detail, 1) };
  if (label.includes("substitut")) return { ...base, type: "substitution", playerIn: involvedName(detail, 0), playerOut: involvedName(detail, 1) };
  return null;
}

function collectEventDetails(event, competition) {
  const rows = [competition?.details, event?.details, event?.keyEvents, event?.plays].find((list) => Array.isArray(list) && list.length) || [];
  const home = competitorSide(competition, "home");
  const away = competitorSide(competition, "away");
  return rows.map((row, index) => mapDetail(row, index, home?.team?.id, away?.team?.id)).filter(Boolean).sort((a, b) => a.minute - b.minute);
}

function mapEspnEvent(event, league) {
  const competition = event?.competitions?.[0] || {};
  const home = competitorSide(competition, "home");
  const away = competitorSide(competition, "away");
  if (!home || !away) return null;
  const status = statusInfo(event, competition);
  const utcDate = event?.date || competition?.date || null;
  const venue = competition?.venue || event?.venue || {};
  const referee = (competition?.officials || []).find((item) => /referee/i.test(clean(item?.position?.name || item?.position?.displayName))) || competition?.officials?.[0];
  const mapped = {
    id: `${league.key}:${event?.id || competition?.id}`,
    provider: "espn-free",
    source: "ESPN",
    sourceFree: true,
    league: { slug: league.slug, name: league.name, shortName: league.shortName, european: Boolean(league.european) },
    leagueId: league.espn,
    leagueName: league.name,
    european: Boolean(league.european),
    ...status,
    utcDate,
    timestamp: utcDate ? Math.floor(new Date(utcDate).getTime() / 1000) : 0,
    stadium: clean(venue?.fullName || venue?.name),
    referee: clean(referee?.fullName || referee?.displayName || referee?.name),
    round: clean(competition?.notes?.[0]?.headline || competition?.type?.abbreviation || event?.season?.slug || event?.week?.text || (event?.week?.number ? `J${event.week.number}` : "")),
    home: { id: clean(home?.team?.id), name: home?.team?.displayName || home?.team?.name || "Équipe domicile", shortName: home?.team?.shortDisplayName || home?.team?.abbreviation || home?.team?.name || "Domicile", logo: teamLogo(home?.team) },
    away: { id: clean(away?.team?.id), name: away?.team?.displayName || away?.team?.name || "Équipe extérieure", shortName: away?.team?.shortDisplayName || away?.team?.abbreviation || away?.team?.name || "Extérieur", logo: teamLogo(away?.team) },
    score: { home: status.status === "SCHEDULED" ? null : scoreValue(home), away: status.status === "SCHEDULED" ? null : scoreValue(away) },
    events: collectEventDetails(event, competition),
    raw: event
  };
  if (league.frenchOnly) mapped.frenchClubSide = frenchSide(mapped);
  return mapped;
}

async function competitionEvents(league, dates) {
  try {
    const json = await espnFetch(`/apis/site/v2/sports/soccer/${league.espn}/scoreboard?dates=${dates}`);
    return (json?.events || []).map((event) => mapEspnEvent(event, league)).filter(Boolean).filter((match) => !league.frenchOnly || match.frenchClubSide);
  } catch { return []; }
}

async function freeLiveUncached() {
  const today = ymd(new Date());
  const groups = await Promise.all(FREE_COMPETITIONS.map((league) => competitionEvents(league, today)));
  const data = groups.flat().filter((match) => match.status === "IN_PLAY");
  return { ok: true, configured: true, provider: "espn-free", data };
}

export async function getFrenchLiveMatches() {
  try {
    return await unstable_cache(freeLiveUncached, ["ffe-free-live-v1"], { revalidate: 45 })();
  } catch (error) { return { ok: false, configured: true, provider: "espn-free", error: error?.message || "Source LIVE gratuite indisponible", data: [] }; }
}

async function recentFinishedUncached(days) {
  const range = dateRange(days, 0);
  const groups = await Promise.all(FREE_COMPETITIONS.map((league) => competitionEvents(league, range)));
  return groups.flat().filter((match) => match.status === "FINISHED").sort((a, b) => b.timestamp - a.timestamp);
}

export async function getRecentlyFinishedFrenchMatches({ days = 1 } = {}) {
  const safeDays = Math.max(0, Math.min(7, Number(days) || 1));
  try {
    const data = await unstable_cache(() => recentFinishedUncached(safeDays), ["ffe-free-finished-v1", String(safeDays)], { revalidate: 300 })();
    return { ok: true, configured: true, provider: "espn-free", data };
  } catch (error) { return { ok: false, configured: true, error: error?.message || "Résultats gratuits indisponibles", data: [] }; }
}

async function fetchSummary(competition, eventId) {
  return espnFetch(`/apis/site/v2/sports/soccer/${competition.espn}/summary?event=${eventId}`);
}

function eventFromSummary(summary, eventId) {
  const header = summary?.header || {};
  const competition = header?.competitions?.find((item) => String(item?.id) === String(eventId)) || header?.competitions?.[0] || null;
  if (!competition) return null;
  return { id: header?.id || eventId, date: header?.date || competition?.date, status: header?.status || competition?.status, competitions: [competition] };
}

export async function getFreeMatch(matchId) {
  const parsed = parseCompositeId(matchId);
  if (!parsed) return { ok: false, error: "Identifiant de match gratuit invalide" };
  try {
    const summary = await unstable_cache(() => fetchSummary(parsed.competition, parsed.eventId), ["ffe-free-summary-v1", parsed.competition.key, parsed.eventId], { revalidate: 45 })();
    const event = eventFromSummary(summary, parsed.eventId);
    if (!event) return { ok: false, error: "Match introuvable" };
    const match = mapEspnEvent(event, parsed.competition);
    if (!match || (parsed.competition.frenchOnly && !match.frenchClubSide)) return { ok: false, error: "Match non pris en charge" };
    const details = [summary?.keyEvents, summary?.details, summary?.plays, summary?.scoringPlays, summary?.header?.competitions?.[0]?.details].find((rows) => Array.isArray(rows) && rows.length) || [];
    const homeId = match.home.id, awayId = match.away.id;
    match.events = details.map((row, index) => mapDetail(row, index, homeId, awayId)).filter(Boolean).sort((a, b) => a.minute - b.minute);
    return { ok: true, configured: true, data: match, summary };
  } catch (error) { return { ok: false, configured: true, error: error?.message || "Centre Match gratuit indisponible" }; }
}

const STAT_DEFS = [
  { key: "possessionPct", label: "Possession", percent: true, aliases: ["possessionPct", "possession"] },
  { key: "totalShots", label: "Tirs", aliases: ["totalShots", "shots"] },
  { key: "shotsOnTarget", label: "Tirs cadrés", aliases: ["shotsOnTarget", "shotsOnGoal"] },
  { key: "wonCorners", label: "Corners", aliases: ["wonCorners", "cornerKicks"] },
  { key: "foulsCommitted", label: "Fautes", aliases: ["foulsCommitted", "fouls"] },
  { key: "offsides", label: "Hors-jeu", aliases: ["offsides", "offsidesCommitted"] }
];
function statFromCompetitor(competitor, aliases) { const rows = competitor?.statistics || []; const wanted = aliases.map((x) => x.toLowerCase()); const row = rows.find((s) => wanted.includes(clean(s?.name || s?.abbreviation).toLowerCase())); const value = Number(row?.value ?? row?.displayValue); return Number.isFinite(value) ? value : null; }

export async function getFreeFootballStatistics(matchId) {
  const result = await getFreeMatch(matchId);
  if (!result.ok) return { ok: false, error: result.error, data: [] };
  const competition = result.summary?.header?.competitions?.[0] || result.data?.raw?.competitions?.[0] || {};
  const home = competitorSide(competition, "home");
  const away = competitorSide(competition, "away");
  const data = STAT_DEFS.map((def) => {
    const h = statFromCompetitor(home, def.aliases), a = statFromCompetitor(away, def.aliases);
    if (h === null || a === null) return null;
    return { key: def.key, label: def.label, home: h, away: a, homeDisplay: def.percent ? `${h}%` : String(h), awayDisplay: def.percent ? `${a}%` : String(a) };
  }).filter(Boolean);
  return { ok: true, data };
}

function rosterPlayer(row, index) {
  const athlete = row?.athlete || row?.player || row;
  const name = clean(athlete?.displayName || athlete?.fullName || athlete?.shortName || athlete?.name);
  if (!name) return null;
  return { id: clean(athlete?.id) || `${index}-${name}`, name, number: clean(athlete?.jersey || row?.jersey), position: clean(athlete?.position?.abbreviation || athlete?.position?.name || row?.position?.abbreviation || row?.position?.name) };
}

function parseRosterSide(block = {}) {
  const rows = Array.isArray(block?.roster) ? block.roster : Array.isArray(block?.players) ? block.players : [];
  const starters = [], substitutes = [];
  rows.forEach((row, index) => { const player = rosterPlayer(row, index); if (!player) return; const starter = row?.starter === true || row?.starter === "true" || row?.starter === 1; (starter ? starters : substitutes).push(player); });
  return { formation: clean(block?.formation || block?.formationName), coach: clean(block?.coach?.displayName || block?.coach?.name), starters, substitutes };
}

export async function getFreeMatchLineups(matchId) {
  const parsed = parseCompositeId(matchId);
  if (!parsed) return { ok: false, error: "Match invalide" };
  try {
    const summary = await fetchSummary(parsed.competition, parsed.eventId);
    const rosters = Array.isArray(summary?.rosters) ? summary.rosters : [];
    const event = eventFromSummary(summary, parsed.eventId);
    const match = event ? mapEspnEvent(event, parsed.competition) : null;
    const byId = new Map(rosters.map((row) => [clean(row?.team?.id), row]));
    const home = parseRosterSide(byId.get(clean(match?.home?.id)) || rosters[0] || {});
    const away = parseRosterSide(byId.get(clean(match?.away?.id)) || rosters[1] || {});
    const available = home.starters.length >= 7 && away.starters.length >= 7;
    return { ok: true, data: { ...(match || { id: matchId, provider: "espn-free" }), lineups: { available, home, away } } };
  } catch (error) { return { ok: false, error: error?.message || "Compositions gratuites indisponibles" }; }
}

export async function getFrenchLineupCandidates() {
  const live = await getFrenchLiveMatches();
  if (!live.ok) return { ok: false, error: live.error, data: [] };
  const now = Date.now();
  const candidates = (live.data || []).filter((match) => !match.utcDate || Math.abs(now - new Date(match.utcDate).getTime()) <= 4 * 60 * 60 * 1000);
  const results = await Promise.all(candidates.map((match) => getFreeMatchLineups(match.id)));
  return { ok: true, data: results.filter((r) => r.ok && r.data?.lineups?.available).map((r) => r.data) };
}

export async function getFrenchEuropeanMatches() {
  const europe = FREE_COMPETITIONS.filter((c) => c.european);
  try {
    const range = dateRange(60, 150);
    const groups = await Promise.all(europe.map((league) => competitionEvents(league, range)));
    const data = groups.flat().sort((a, b) => a.timestamp - b.timestamp);
    return { ok: true, configured: true, provider: "espn-free", data, competitions: europe.map(({ slug, name, shortName }) => ({ slug, name, shortName })) };
  } catch (error) { return { ok: false, configured: true, error: error?.message || "Données européennes gratuites indisponibles", data: [], competitions: europe.map(({ slug, name, shortName }) => ({ slug, name, shortName })) }; }
}

export function groupEuropeanMatches(matches = []) {
  return FREE_COMPETITIONS.filter((c) => c.european).map((competition) => ({ ...competition, matches: matches.filter((match) => match.league?.slug === competition.slug) }));
}
