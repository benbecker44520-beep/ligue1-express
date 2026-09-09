const API_BASE = "https://apiv3.apifootball.com/";
const FRENCH_LEAGUES = new Set(["168", "164", "167", "165"]);
const EUROPE_NAMES = ["champions league", "europa league", "conference league", "europa conference"];
const FRENCH_CLUBS = [
  "paris saint germain", "psg", "marseille", "monaco", "lille", "lyon", "nice", "rennes", "lens",
  "strasbourg", "nantes", "toulouse", "brest", "auxerre", "lorient", "le havre", "metz", "reims",
  "saint etienne", "angers", "paris fc", "bordeaux", "guingamp", "montpellier"
];

function key() { return String(process.env.APIFOOTBALL_API_KEY || "").trim(); }
function clean(value) { return String(value || "").trim(); }
function normalized(value) { return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function isEuropeanName(value) { const name = normalized(value); return EUROPE_NAMES.some((term) => name.includes(term)); }
function hasFrenchClub(match) { const names = [normalized(match?.home?.name), normalized(match?.away?.name)]; return names.some((name) => FRENCH_CLUBS.some((club) => name === club || name.includes(club) || club.includes(name))); }
function isFinishedStatus(value) { const status = clean(value).toLowerCase(); return status === "finished" || status === "after et" || status === "after pen."; }
function playerName(row) { return clean(row?.lineup_player || row?.player || row?.player_name || row?.name); }
function playerNumber(row) { return clean(row?.lineup_number || row?.number || row?.shirt_number); }
function playerPosition(row) { return clean(row?.lineup_position || row?.position); }
function playerId(row) { return clean(row?.player_key || row?.player_id || row?.id); }
function normalizePlayers(rows) { if (!Array.isArray(rows)) return []; return rows.map((row, index) => ({ id: playerId(row) || `${index}-${playerName(row)}`, name: playerName(row), number: playerNumber(row), position: playerPosition(row) })).filter((player) => player.name); }
function normalizeCoach(value) { const row = Array.isArray(value) ? value[0] : value; if (!row) return ""; return clean(row?.lineup_player || row?.coach || row?.coach_name || row?.name || row); }
function sideLineup(rawSide = {}) { const starters = rawSide?.starting_lineups || rawSide?.startingXI || rawSide?.starting_xi || rawSide?.starters || []; const substitutes = rawSide?.substitutes || rawSide?.subs || rawSide?.bench || []; return { formation: clean(rawSide?.formation || rawSide?.lineup_formation), coach: normalizeCoach(rawSide?.coach), starters: normalizePlayers(starters), substitutes: normalizePlayers(substitutes) }; }
export function extractLineups(raw = {}) { const block = raw?.lineup || raw?.lineups || raw?.match_lineup || {}; const home = sideLineup(block?.home || block?.localteam || block?.home_team || {}); const away = sideLineup(block?.away || block?.visitorteam || block?.away_team || {}); const available = home.starters.length >= 7 && away.starters.length >= 7; return { available, home, away }; }

async function request(params) {
  const apiKey = key();
  if (!apiKey) return { ok: false, error: "APIFOOTBALL_API_KEY absente", data: [] };
  const search = new URLSearchParams({ ...params, timezone: "Europe/Paris", APIkey: apiKey });
  try {
    const response = await fetch(`${API_BASE}?${search.toString()}`, { headers: { Accept: "application/json" }, cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(json)) return { ok: false, error: `APIfootball ${response.status}`, data: [] };
    return { ok: true, data: json };
  } catch (error) { return { ok: false, error: error?.message || "Compositions indisponibles", data: [] }; }
}

function matchIdentity(raw) {
  return {
    id: clean(raw?.match_id), provider: "apifootball", leagueId: clean(raw?.league_id), leagueName: clean(raw?.league_name) || "Football français",
    rawStatus: clean(raw?.match_status), utcDate: raw?.match_date ? `${raw.match_date}T${clean(raw?.match_time || "12:00").slice(0, 5)}:00+02:00` : null,
    home: { id: clean(raw?.match_hometeam_id), name: clean(raw?.match_hometeam_name), logo: raw?.team_home_badge || null },
    away: { id: clean(raw?.match_awayteam_id), name: clean(raw?.match_awayteam_name), logo: raw?.team_away_badge || null }
  };
}

function supported(match) { return FRENCH_LEAGUES.has(match.leagueId) || (isEuropeanName(match.leagueName) && hasFrenchClub(match)); }

export async function getMatchLineups(matchId) {
  const id = clean(matchId);
  if (!id) return { ok: false, error: "Match manquant" };
  const result = await request({ action: "get_events", match_id: id });
  if (!result.ok) return result;
  const raw = result.data.find((item) => clean(item?.match_id) === id) || result.data[0];
  if (!raw) return { ok: false, error: "Match introuvable" };
  const match = matchIdentity(raw);
  if (!supported(match)) return { ok: false, error: "Compétition non prise en charge" };
  return { ok: true, data: { ...match, lineups: extractLineups(raw) } };
}

export async function getFrenchLineupCandidates() {
  const now = new Date();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const result = await request({ action: "get_events", from: day, to: day });
  if (!result.ok) return result;
  const nowMs = Date.now();
  const matches = result.data
    .map((raw) => ({ ...matchIdentity(raw), lineups: extractLineups(raw) }))
    .filter((match) => supported(match) && !isFinishedStatus(match.rawStatus))
    .filter((match) => {
      if (!match.id || !match.lineups.available) return false;
      const kickoff = match.utcDate ? new Date(match.utcDate).getTime() : 0;
      return !kickoff || (kickoff >= nowMs - 3 * 60 * 60 * 1000 && kickoff <= nowMs + 3 * 60 * 60 * 1000);
    });
  return { ok: true, data: matches };
}
