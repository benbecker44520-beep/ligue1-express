const API_BASE = "https://apiv3.apifootball.com/";

export const APIFOOTBALL_FRENCH_LEAGUES = {
  "168": { id: "168", slug: "ligue-1", name: "Ligue 1", shortName: "L1" },
  "164": { id: "164", slug: "ligue-2", name: "Ligue 2", shortName: "L2" },
  "167": { id: "167", slug: "ligue-3", name: "National", shortName: "N1" },
  "165": { id: "165", slug: "coupe-de-france", name: "Coupe de France", shortName: "CDF" }
};

function apiKey() {
  return String(process.env.APIFOOTBALL_API_KEY || "").trim();
}

function numberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanStatus(value) {
  return String(value || "").trim();
}

function normalizedStatus(value) {
  const status = cleanStatus(value).toLowerCase();
  if (status === "half time" || status === "half-time" || status === "ht") return "PAUSED";
  if (status === "finished" || status === "after et" || status === "after pen.") return "FINISHED";
  return "LIVE";
}

function statusLabel(value) {
  const status = cleanStatus(value);
  if (!status) return "EN DIRECT";
  if (/^\d+['’]?$/.test(status)) return status.replace(/[’']?$/, "'");
  if (status.toLowerCase() === "half time") return "MI-TEMPS";
  return status.toUpperCase();
}

function eventMinute(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function mapGoals(rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows.map((goal, index) => {
    const home = String(goal?.home_scorer || "").trim();
    const away = String(goal?.away_scorer || "").trim();
    return {
      id: `goal-${index}-${goal?.time || ""}-${home || away}`,
      type: "goal",
      minute: eventMinute(goal?.time),
      minuteLabel: goal?.time ? `${String(goal.time).replace(/[’']$/, "")}'` : "",
      side: home ? "home" : "away",
      player: home || away || "Buteur",
      assist: String(home ? goal?.home_assist || "" : goal?.away_assist || "").trim(),
      score: String(goal?.score || "").trim()
    };
  });
}

function mapCards(rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows.map((card, index) => {
    const home = String(card?.home_fault || "").trim();
    const away = String(card?.away_fault || "").trim();
    const cardName = String(card?.card || "").toLowerCase();
    return {
      id: `card-${index}-${card?.time || ""}-${home || away}`,
      type: cardName.includes("red") ? "red_card" : "yellow_card",
      minute: eventMinute(card?.time),
      minuteLabel: card?.time ? `${String(card.time).replace(/[’']$/, "")}'` : "",
      side: home ? "home" : "away",
      player: home || away || "Joueur"
    };
  });
}

function mapSubstitutions(raw = {}) {
  const output = [];
  for (const side of ["home", "away"]) {
    const rows = Array.isArray(raw?.[side]) ? raw[side] : [];
    rows.forEach((sub, index) => {
      const parts = String(sub?.substitution || "").split("|").map((value) => value.trim()).filter(Boolean);
      output.push({
        id: `sub-${side}-${index}-${sub?.time || ""}`,
        type: "substitution",
        minute: eventMinute(sub?.time),
        minuteLabel: sub?.time ? `${String(sub.time).replace(/[’']$/, "")}'` : "",
        side,
        playerOut: parts[0] || "",
        playerIn: parts[1] || ""
      });
    });
  }
  return output;
}

export function mapApiFootballMatch(raw = {}) {
  const league = APIFOOTBALL_FRENCH_LEAGUES[String(raw.league_id)] || null;
  const rawStatus = cleanStatus(raw.match_status);
  const utcDate = raw.match_date
    ? `${raw.match_date}T${String(raw.match_time || "12:00").slice(0, 5)}:00+02:00`
    : null;

  const events = [
    ...mapGoals(raw.goalscorer),
    ...mapCards(raw.cards),
    ...mapSubstitutions(raw.substitutions)
  ].sort((a, b) => a.minute - b.minute);

  return {
    id: String(raw.match_id || ""),
    provider: "apifootball",
    league,
    leagueId: String(raw.league_id || ""),
    leagueName: league?.name || raw.league_name || "Championnat",
    status: normalizedStatus(rawStatus),
    statusText: statusLabel(rawStatus),
    matchLive: String(raw.match_live || "") === "1",
    utcDate,
    timestamp: utcDate ? Math.floor(new Date(utcDate).getTime() / 1000) : 0,
    stadium: String(raw.match_stadium || "").trim(),
    referee: String(raw.match_referee || "").trim(),
    round: String(raw.match_round || "").trim(),
    home: {
      id: String(raw.match_hometeam_id || ""),
      name: raw.match_hometeam_name || "Équipe domicile",
      shortName: raw.match_hometeam_name || "Domicile",
      logo: raw.team_home_badge || null
    },
    away: {
      id: String(raw.match_awayteam_id || ""),
      name: raw.match_awayteam_name || "Équipe extérieure",
      shortName: raw.match_awayteam_name || "Extérieur",
      logo: raw.team_away_badge || null
    },
    score: {
      home: numberOrNull(raw.match_hometeam_score),
      away: numberOrNull(raw.match_awayteam_score)
    },
    halftime: {
      home: numberOrNull(raw.match_hometeam_halftime_score),
      away: numberOrNull(raw.match_awayteam_halftime_score)
    },
    events,
    raw
  };
}

async function request(params) {
  const key = apiKey();
  if (!key) return { ok: false, configured: false, error: "APIFOOTBALL_API_KEY absente" };

  const search = new URLSearchParams({
    ...params,
    timezone: "Europe/Paris",
    APIkey: key
  });

  try {
    const response = await fetch(`${API_BASE}?${search.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) return { ok: false, configured: true, error: `APIfootball HTTP ${response.status}` };
    if (!Array.isArray(json)) {
      const message = json?.error || json?.message || "Réponse APIfootball inattendue";
      return { ok: false, configured: true, error: String(message) };
    }
    return { ok: true, configured: true, data: json };
  } catch (error) {
    return { ok: false, configured: true, error: error?.message || "APIfootball indisponible" };
  }
}

export async function getFrenchLiveMatches() {
  // Un seul appel par minute pour les trois championnats : on récupère uniquement
  // les matchs live du compte, puis on filtre France côté serveur.
  const result = await request({ action: "get_events", match_live: "1" });
  if (!result.ok) return result;

  const matches = result.data
    .filter((raw) => APIFOOTBALL_FRENCH_LEAGUES[String(raw?.league_id)])
    .map(mapApiFootballMatch)
    .filter((match) => match.id && match.status !== "FINISHED");

  return { ok: true, configured: true, data: matches };
}

export async function getApiFootballMatch(matchId) {
  const id = String(matchId || "").trim();
  if (!id) return { ok: false, configured: Boolean(apiKey()), error: "Match introuvable" };
  const result = await request({ action: "get_events", match_id: id });
  if (!result.ok) return result;
  const raw = result.data.find((item) => String(item?.match_id || "") === id) || result.data[0];
  if (!raw) return { ok: false, configured: true, error: "Match introuvable" };
  const match = mapApiFootballMatch(raw);
  if (!match.league) return { ok: false, configured: true, error: "Compétition non prise en charge" };
  return { ok: true, configured: true, data: match };
}


export async function getFrenchCupMatches() {
  const now = new Date();
  const seasonStartYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const from = `${seasonStartYear}-07-01`;
  const to = `${seasonStartYear + 1}-06-30`;
  const result = await request({ action: "get_events", league_id: "165", from, to });
  if (!result.ok) return result;
  const matches = result.data.map(mapApiFootballMatch).filter((match) => match.id);
  return { ok: true, configured: true, season: `${seasonStartYear}/${seasonStartYear + 1}`, data: matches };
}
