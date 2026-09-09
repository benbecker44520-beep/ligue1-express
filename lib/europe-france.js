import { mapApiFootballMatch } from "@/lib/apifootball";

const API_BASE = "https://apiv3.apifootball.com/";
const COMPETITIONS = [
  { slug: "ligue-des-champions", name: "Ligue des champions", shortName: "LDC", tests: ["champions league", "uefa champions"] },
  { slug: "europa-league", name: "Europa League", shortName: "UEL", tests: ["europa league", "uefa europa"] },
  { slug: "conference-league", name: "Conference League", shortName: "UECL", tests: ["conference league", "europa conference"] }
];

const FRENCH = [
  "paris saint germain", "psg", "marseille", "monaco", "lille", "lyon", "nice", "rennes",
  "lens", "strasbourg", "nantes", "toulouse", "brest", "auxerre", "lorient", "le havre",
  "metz", "montpellier", "reims", "saint etienne", "angers", "paris fc", "bordeaux", "caen",
  "guingamp", "amiens", "nancy", "sochaux"
];

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|afc|sc|osc|ac|club|football|foot|olympique|stade)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FRENCH_NORMALIZED = FRENCH.map(norm).filter(Boolean);

function competition(raw) {
  const name = norm(raw?.league_name);
  return COMPETITIONS.find((item) => item.tests.some((test) => name.includes(test))) || null;
}

function frenchSide(raw) {
  const home = norm(raw?.match_hometeam_name);
  const away = norm(raw?.match_awayteam_name);
  const isFrench = (name) => FRENCH_NORMALIZED.some((candidate) => candidate === name || candidate.includes(name) || name.includes(candidate));
  return isFrench(home) ? "home" : isFrench(away) ? "away" : null;
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(from, to, attempt = 0) {
  const key = String(process.env.APIFOOTBALL_API_KEY || "").trim();
  if (!key) return { ok: false, error: "APIfootball non configurée", status: 0 };

  const query = new URLSearchParams({
    action: "get_events",
    from,
    to,
    timezone: "Europe/Paris",
    APIkey: key
  });

  try {
    const response = await fetch(`${API_BASE}?${query.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    const json = await response.json().catch(() => null);

    // APIfootball peut parfois répondre 202 pendant la préparation d'une requête.
    // On retente brièvement au lieu d'afficher l'erreur brute au visiteur.
    if (response.status === 202 && attempt < 2) {
      await sleep(350 * (attempt + 1));
      return request(from, to, attempt + 1);
    }

    if (!response.ok || !Array.isArray(json)) {
      const apiMessage = json?.error || json?.message;
      return {
        ok: false,
        status: response.status,
        error: apiMessage ? String(apiMessage) : `APIfootball HTTP ${response.status}`
      };
    }

    return { ok: true, status: response.status, data: json };
  } catch (error) {
    return { ok: false, status: 0, error: error?.message || "APIfootball indisponible" };
  }
}

function buildWindows(start, end, chunkDays = 14) {
  const windows = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    const chunkEnd = addDays(cursor, chunkDays - 1);
    windows.push([iso(cursor), iso(chunkEnd > end ? end : chunkEnd)]);
    cursor = addDays(chunkEnd, 1);
  }
  return windows;
}

async function loadWindows(windows) {
  const results = [];
  const batchSize = 4;
  for (let index = 0; index < windows.length; index += batchSize) {
    const batch = windows.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map(([from, to]) => request(from, to)));
    results.push(...batchResults);
  }
  return results;
}

export async function getFrenchEuropeanMatches() {
  const now = new Date();
  const from = new Date(now);
  from.setUTCMonth(from.getUTCMonth() - 2);
  const to = new Date(now);
  to.setUTCMonth(to.getUTCMonth() + 5);

  // Une seule requête sur plusieurs mois provoquait des réponses 202.
  // On découpe désormais la période en petites fenêtres fiables.
  const windows = buildWindows(from, to, 14);
  const results = await loadWindows(windows);
  const successful = results.filter((result) => result.ok);

  if (!successful.length) {
    return {
      ok: false,
      error: "Les données européennes sont temporairement indisponibles. Réessaie dans quelques instants.",
      competitions: COMPETITIONS
    };
  }

  const byId = new Map();
  successful
    .flatMap((result) => result.data || [])
    .forEach((raw) => {
      const cup = competition(raw);
      const side = frenchSide(raw);
      if (!cup || !side) return;

      const match = mapApiFootballMatch(raw);
      if (!match.id) return;

      byId.set(match.id, {
        ...match,
        league: { ...match.league, ...cup, european: true },
        leagueName: cup.name,
        european: true,
        frenchClubSide: side
      });
    });

  const matches = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);

  return {
    ok: true,
    data: matches,
    competitions: COMPETITIONS,
    partial: successful.length !== results.length,
    note: successful.length !== results.length ? "Certaines périodes n'ont pas pu être actualisées, les données disponibles sont affichées." : null
  };
}
