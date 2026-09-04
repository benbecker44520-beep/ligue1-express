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

function comparableTeamName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|afc|sc|osc|ac|club|football|foot|olympique|stade)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameTeam(left, right) {
  const a = comparableTeamName(left);
  const b = comparableTeamName(right);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
}

function apiFootballIncident(event) {
  const labels = {
    goal: ["But", "⚽"],
    yellow_card: ["Carton jaune", "🟨"],
    red_card: ["Carton rouge", "🟥"],
    substitution: ["Remplacement", "🔄"]
  };
  const [label, icon] = labels[event.type] || ["Fait de match", "•"];
  return {
    ...event,
    id: `apifootball-${event.id}`,
    minute: event.minuteLabel || (event.minute != null ? `${event.minute}'` : "—"),
    minuteValue: Number(event.minute) || 0,
    isHome: event.side === "home",
    label,
    icon
  };
}

export async function getApiFootballMatchIncidents(match) {
  if (!match?.utcDate) return { ok: false, configured: Boolean(apiKey()), error: "Date du match absente", data: [] };

  const matchDate = new Date(match.utcDate);
  if (Number.isNaN(matchDate.getTime())) return { ok: false, configured: Boolean(apiKey()), error: "Date du match invalide", data: [] };

  // La fiche Résultats utilise l'identifiant football-data.org, différent de
  // celui du LIVE. On retrouve donc le match APIfootball par date + équipes.
  const days = [-1, 0, 1].map((offset) => {
    const date = new Date(matchDate);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
  const responses = await Promise.all(days.map((day) => request({
    action: "get_events",
    league_id: "168",
    from: day,
    to: day
  })));
  const rows = responses.filter((result) => result.ok).flatMap((result) => result.data || []);
  const raw = rows.find((item) =>
    sameTeam(item?.match_hometeam_name, match?.home?.name || match?.home?.shortName) &&
    sameTeam(item?.match_awayteam_name, match?.away?.name || match?.away?.shortName)
  );

  if (!raw) return { ok: false, configured: Boolean(apiKey()), error: "Match APIfootball introuvable", data: [] };
  const apiMatch = mapApiFootballMatch(raw);
  return {
    ok: true,
    configured: true,
    eventId: apiMatch.id,
    data: apiMatch.events.map(apiFootballIncident).sort((a, b) => a.minuteValue - b.minuteValue)
  };
}

function comparablePlayerName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function getApiFootballPlayerProfile(playerName) {
  const name = String(playerName || "").trim();
  if (!name) return { ok: false, configured: Boolean(apiKey()), error: "Joueur manquant" };
  let result = await request({ action: "get_players", player_name: name });
  if (!result.ok) return result;
  const expected = comparablePlayerName(name);
  const expectedSurname = expected.split(" ").at(-1);
  // APIfootball utilise souvent un prénom abrégé (ex. « O. Dembélé »).
  // Si le nom complet ne renvoie rien, une seconde recherche par nom de
  // famille permet de retrouver le joueur sans afficher les stats d'un homonyme.
  if (!result.data.length && expectedSurname && expectedSurname !== expected) {
    result = await request({ action: "get_players", player_name: expectedSurname });
    if (!result.ok) return result;
  }
  const expectedInitial = expected.split(" ")[0]?.[0] || "";
  const player = result.data.find((row) => comparablePlayerName(row?.player_name) === expected)
    || result.data.find((row) => {
      const parts = comparablePlayerName(row?.player_name).split(" ").filter(Boolean);
      return parts.at(-1) === expectedSurname && (!expectedInitial || !parts[0]?.[0] || parts[0][0] === expectedInitial);
    });
  if (!player) return { ok: false, configured: true, error: "Joueur APIfootball introuvable" };
  const injuredValue = String(player.player_injured ?? "").trim().toLowerCase();
  return {
    ok: true,
    configured: true,
    data: {
      goals: numberOrNull(player.player_goals),
      yellowCards: numberOrNull(player.player_yellow_cards),
      redCards: numberOrNull(player.player_red_cards),
      appearances: numberOrNull(player.player_match_played),
      injured: ["yes", "true", "1", "oui"].includes(injuredValue),
      injuryKnown: injuredValue !== ""
    }
  };
}

const STATISTICS = [
  { key: "possession", label: "Possession", names: ["ball possession", "possession"] },
  { key: "shots", label: "Tirs", names: ["shots total", "goal attempts", "total shots"] },
  { key: "shotsOnTarget", label: "Tirs cadrés", names: ["shots on goal", "shots on target"] },
  { key: "corners", label: "Corners", names: ["corner kicks", "corners"] },
  { key: "fouls", label: "Fautes", names: ["fouls"] },
  { key: "offsides", label: "Hors-jeu", names: ["offsides", "offside"] },
  { key: "yellowCards", label: "Cartons jaunes", names: ["yellow cards"] },
  { key: "redCards", label: "Cartons rouges", names: ["red cards"] },
  { key: "saves", label: "Arrêts", names: ["goalkeeper saves", "saves"] }
];

function statisticNumber(value) {
  const number = Number(String(value ?? "").replace("%", "").trim());
  return Number.isFinite(number) ? number : 0;
}

export async function getApiFootballStatistics(matchId) {
  const id = String(matchId || "").trim();
  const key = apiKey();
  if (!id || !key) return { ok:false, data:[], error:"Statistiques non configurées" };
  const search = new URLSearchParams({ action:"get_statistics", match_id:id, APIkey:key });
  try {
    const response = await fetch(`${API_BASE}?${search.toString()}`, { headers:{ Accept:"application/json" }, cache:"no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) return { ok:false, data:[], error:`APIfootball HTTP ${response.status}` };
    const block = json?.[id] || json?.[Object.keys(json || {})[0]];
    const rows = Array.isArray(block?.statistics) ? block.statistics : [];
    const normalizedRows = rows.map((row) => ({ ...row, normalizedType:String(row?.type || "").trim().toLowerCase() }));
    const data = STATISTICS.map((config) => {
      const row = normalizedRows.find((item) => config.names.includes(item.normalizedType));
      if (!row) return null;
      const home = statisticNumber(row.home);
      const away = statisticNumber(row.away);
      const isPercent = String(row.home || "").includes("%") || config.key === "possession";
      return { key:config.key, label:config.label, home, away, homeDisplay:isPercent ? `${home}%` : String(home), awayDisplay:isPercent ? `${away}%` : String(away) };
    }).filter(Boolean);
    return { ok:Boolean(data.length), data, error:data.length ? null : "Statistiques en attente" };
  } catch (error) {
    return { ok:false, data:[], error:error?.message || "Statistiques indisponibles" };
  }
}


function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export async function getFrenchCupMatches() {
  const now = new Date();
  const seasonStartYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;

  // APIfootball limite les recherches de matchs à de petites plages de dates.
  // Pour la page Coupe, on charge une fenêtre utile autour d'aujourd'hui par blocs
  // de 15 jours au lieu de demander toute la saison en un seul appel.
  const windowStart = addUtcDays(now, -45);
  const windowEnd = addUtcDays(now, 60);
  const chunks = [];
  let cursor = windowStart;

  while (cursor <= windowEnd) {
    const chunkEnd = addUtcDays(cursor, 14);
    const toDate = chunkEnd > windowEnd ? windowEnd : chunkEnd;
    chunks.push([isoDate(cursor), isoDate(toDate)]);
    cursor = addUtcDays(toDate, 1);
  }

  const results = await Promise.all(
    chunks.map(([from, to]) => request({ action: "get_events", league_id: "165", from, to }))
  );

  const successful = results.filter((result) => result.ok);
  if (!successful.length) {
    return results[0] || { ok: false, configured: Boolean(apiKey()), error: "Données Coupe de France indisponibles" };
  }

  const byId = new Map();
  successful.flatMap((result) => result.data).forEach((raw) => {
    const match = mapApiFootballMatch(raw);
    if (match.id) byId.set(match.id, match);
  });

  return {
    ok: true,
    configured: true,
    season: `${seasonStartYear}/${seasonStartYear + 1}`,
    data: [...byId.values()],
    partial: successful.length !== results.length
  };
}
