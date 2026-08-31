import { unstable_cache } from "next/cache";

const BASE_URL = "https://futpythontrader.com.br/api/download";
const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/123";

async function fetchTeamBadge(name) {
  try {
    const r = await fetch(`${SPORTSDB_BASE}/searchteams.php?t=${encodeURIComponent(name)}`, { next: { revalidate: 604800 } });
    if (!r.ok) return null;
    const data = await r.json();
    const team = data?.teams?.find((t) => String(t.strTeam || "").toLowerCase() === String(name).toLowerCase()) || data?.teams?.[0];
    return team?.strBadge || team?.strLogo || null;
  } catch { return null; }
}


function parseCsv(text = "") {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (quoted && next === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some((value) => String(value).trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];

  const headers = rows[0].map((h) => String(h || "").replace(/^\uFEFF/, "").trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((h, index) => [h, values[index] ?? ""])));
}

function numberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(rawDate, rawTime = "") {
  const d = String(rawDate || "").trim();
  const t = String(rawTime || "").trim();
  if (!d) return null;

  let year; let month; let day;
  let match = d.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (match) [, year, month, day] = match;
  else {
    match = d.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (match) [, day, month, year] = match;
  }
  if (!year) return null;

  const timeMatch = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const hh = timeMatch ? timeMatch[1].padStart(2, "0") : "12";
  const mm = timeMatch ? timeMatch[2] : "00";
  const ss = timeMatch?.[3] || "00";

  // Les horaires du dataset sont des horaires locaux de la compétition.
  // On garde une ISO sans décalage explicite; l'affichage Europe/Paris reste cohérent.
  const localIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hh}:${mm}:${ss}`;
  const date = new Date(localIso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function matchStatus(row, utcDate, homeScore, awayScore) {
  const hasScore = homeScore !== null && awayScore !== null;
  if (hasScore) return "FINISHED";
  if (!utcDate) return "SCHEDULED";
  const diff = Date.now() - new Date(utcDate).getTime();
  // Le CSV n'est pas une source live : un match sans score reste programmé.
  return diff > 3 * 60 * 60 * 1000 ? "SCHEDULED" : "SCHEDULED";
}

function mapMatch(row, index) {
  const homeScore = numberOrNull(row.Home_Score);
  const awayScore = numberOrNull(row.Away_Score);
  const utcDate = normalizeDate(row.Date, row.Time);
  const timestamp = utcDate ? Math.floor(new Date(utcDate).getTime() / 1000) : 0;
  const status = matchStatus(row, utcDate, homeScore, awayScore);
  return {
    id: row.Match_ID || `fpt-${index}-${row.Home}-${row.Away}-${row.Date}`,
    utcDate,
    timestamp,
    status,
    matchday: numberOrNull(row.Round),
    home: { id: null, name: row.Home || "Équipe", shortName: row.Home || "Équipe", logo: null },
    away: { id: null, name: row.Away || "Équipe", shortName: row.Away || "Équipe", logo: null },
    score: { home: status === "FINISHED" ? homeScore : null, away: status === "FINISHED" ? awayScore : null }
  };
}

function buildStandings(rows = []) {
  const teams = new Map();
  const ensure = (name) => {
    const key = String(name || "").trim();
    if (!key) return null;
    if (!teams.has(key)) teams.set(key, { teamId: key, team: key, shortName: key, logo: null, played: 0, win: 0, draw: 0, lose: 0, goalsFor: 0, goalsAgainst: 0, diff: 0, points: 0, form: [] });
    return teams.get(key);
  };

  // Inclut aussi les équipes présentes uniquement dans le calendrier à venir.
  rows.forEach((row) => { ensure(row.Home); ensure(row.Away); });

  rows.forEach((row) => {
    const hs = numberOrNull(row.Home_Score);
    const as = numberOrNull(row.Away_Score);
    if (hs === null || as === null) return;
    const home = ensure(row.Home); const away = ensure(row.Away);
    if (!home || !away) return;
    home.played += 1; away.played += 1;
    home.goalsFor += hs; home.goalsAgainst += as;
    away.goalsFor += as; away.goalsAgainst += hs;
    if (hs > as) { home.win += 1; away.lose += 1; home.points += 3; home.form.push("V"); away.form.push("D"); }
    else if (hs < as) { away.win += 1; home.lose += 1; away.points += 3; home.form.push("D"); away.form.push("V"); }
    else { home.draw += 1; away.draw += 1; home.points += 1; away.points += 1; home.form.push("N"); away.form.push("N"); }
  });

  return [...teams.values()]
    .map((team) => ({ ...team, diff: team.goalsFor - team.goalsAgainst, form: team.form.slice(-5) }))
    .sort((a, b) => b.points - a.points || b.diff - a.diff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team, "fr"))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

async function fetchDataset(leagueSlug, season = "2026-2027") {
  const apiKey = process.env.FUTPYTHONTRADER_API_KEY;
  if (!apiKey) throw new Error("Clé FutPythonTrader absente dans Vercel");

  const response = await fetch(`${BASE_URL}/france/${leagueSlug}/${season}?api_key=${encodeURIComponent(apiKey)}`, {
    headers: { Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8", "User-Agent": "Ligue1Express/1.0" },
    cache: "no-store"
  });
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 401) throw new Error("Clé FutPythonTrader invalide ou non autorisée");
    throw new Error(`FutPythonTrader HTTP ${response.status}`);
  }
  const rows = parseCsv(text);
  if (!rows.length || !rows.some((row) => row.Home && row.Away)) throw new Error("Dataset FutPythonTrader vide ou invalide");
  return rows;
}

export async function getFutPythonTraderSnapshotUncached(leagueSlug, expectedTeams = 18, season = "2026-2027") {
  const rows = await fetchDataset(leagueSlug, season);
  let standings = buildStandings(rows);
  if (standings.length < expectedTeams) throw new Error(`FutPythonTrader n'a renvoyé que ${standings.length} équipes sur ${expectedTeams}`);

  // Logos mis en cache longtemps : TheSportsDB ne sert ici que d'enrichissement visuel.
  const badgeEntries = await Promise.all(standings.map(async (team) => [team.team, await fetchTeamBadge(team.team)]));
  const badges = new Map(badgeEntries);
  standings = standings.map((team) => ({ ...team, logo: badges.get(team.team) || null }));
  const events = rows.map(mapMatch).map((m) => ({ ...m, home: { ...m.home, logo: badges.get(m.home.name) || null }, away: { ...m.away, logo: badges.get(m.away.name) || null } }));
  const now = Math.floor(Date.now() / 1000);
  const recent = events.filter((m) => m.status === "FINISHED" && (!m.timestamp || m.timestamp <= now)).sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  const upcoming = events.filter((m) => m.status !== "FINISHED" && (!m.timestamp || m.timestamp >= now - 3 * 3600)).sort((a, b) => a.timestamp - b.timestamp).slice(0, 20);

  return { standings, recent, upcoming, season: season.replace("-", "/"), source: "FutPythonTrader", limited: false, note: null };
}

export function getFutPythonTraderSnapshot(leagueSlug, expectedTeams = 18, cacheKey = leagueSlug) {
  return unstable_cache(
    () => getFutPythonTraderSnapshotUncached(leagueSlug, expectedTeams),
    [`ligue1-express-futpythontrader-${cacheKey}-v563`],
    { revalidate: 300 }
  )();
}
