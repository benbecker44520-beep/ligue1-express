import { unstable_cache } from "next/cache";

const SOFA_BASES = [
  "https://www.sofascore.com/api/v1",
  "https://api.sofascore.com/api/v1"
];

const SOFA_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
  Referer: "https://www.sofascore.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
};

export async function sofaFetch(path) {
  let lastError = null;
  for (const base of SOFA_BASES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(`${base}/${path}`, {
        headers: SOFA_HEADERS,
        cache: "no-store",
        signal: controller.signal
      });
      const contentType = response.headers.get("content-type") || "";
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Sofascore HTTP ${response.status}`);
      if (!contentType.includes("json") || !json || typeof json !== "object" || Array.isArray(json)) throw new Error("Réponse Sofascore invalide");
      return json;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(lastError?.message || "Données Sofascore indisponibles");
}

export function sofaTeamLogo(teamId) {
  return teamId ? `https://img.sofascore.com/api/v1/team/${teamId}/image` : null;
}

function stripAccents(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeTeamName(value = "") {
  return stripAccents(String(value))
    .toLowerCase()
    .replace(/paris saint[- ]germain/g, "psg")
    .replace(/olympique de marseille/g, "marseille")
    .replace(/olympique lyonnais/g, "lyon")
    .replace(/as monaco(?: fc)?/g, "monaco")
    .replace(/losc lille/g, "lille")
    .replace(/stade rennais(?: fc)?/g, "rennes")
    .replace(/racing club de lens/g, "lens")
    .replace(/rc lens/g, "lens")
    .replace(/ogc nice/g, "nice")
    .replace(/fc nantes/g, "nantes")
    .replace(/stade brestois 29/g, "brest")
    .replace(/le havre ac/g, "le havre")
    .replace(/fc lorient/g, "lorient")
    .replace(/toulouse fc/g, "toulouse")
    .replace(/angers sco/g, "angers")
    .replace(/aj auxerre/g, "auxerre")
    .replace(/es troyes ac/g, "troyes")
    .replace(/rc strasbourg alsace/g, "strasbourg")
    .replace(/\b(fc|ac|sc|rc|as|ogc|stade|club|football)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function teamNamesMatch(a, b) {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(" ").filter((x) => x.length > 2));
  const tb = new Set(nb.split(" ").filter((x) => x.length > 2));
  let overlap = 0;
  for (const token of ta) if (tb.has(token)) overlap += 1;
  return overlap >= Math.min(2, Math.max(1, Math.min(ta.size, tb.size)));
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function dateCandidates(utcDate) {
  const base = utcDate ? new Date(utcDate) : new Date();
  return [-1, 0, 1].map((offset) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + offset);
    return dateKey(d);
  });
}

async function findSofaEventUncached({ utcDate, homeName, awayName, tournamentId = 34 }) {
  for (const date of dateCandidates(utcDate)) {
    let json;
    try {
      json = await sofaFetch(`sport/football/scheduled-events/${date}`);
    } catch {
      continue;
    }
    const events = json?.events || [];
    const direct = events.find((event) => {
      const tid = event?.tournament?.uniqueTournament?.id;
      if (tournamentId && Number(tid) !== Number(tournamentId)) return false;
      return teamNamesMatch(event?.homeTeam?.name, homeName) && teamNamesMatch(event?.awayTeam?.name, awayName);
    });
    if (direct) return direct;
  }
  return null;
}

export async function findSofaEvent(match, tournamentId = 34) {
  const key = [
    "ligue1-express-sofa-event-v56",
    String(match?.id || "unknown"),
    String(tournamentId),
    String(match?.utcDate || "")
  ];
  try {
    return await unstable_cache(
      () => findSofaEventUncached({
        utcDate: match?.utcDate,
        homeName: match?.home?.name || match?.home?.shortName,
        awayName: match?.away?.name || match?.away?.shortName,
        tournamentId
      }),
      key,
      { revalidate: 1800 }
    )();
  } catch {
    return null;
  }
}

function incidentMinute(incident) {
  const minute = Number(incident?.time);
  const added = Number(incident?.addedTime);
  if (!Number.isFinite(minute)) return null;
  return added > 0 ? `${minute}+${added}'` : `${minute}'`;
}

function includesCancel(value) {
  const s = String(value || "").toLowerCase();
  return s.includes("cancel") || s.includes("disallow") || s.includes("no goal") || s.includes("goal cancelled");
}

function getPlayerName(value) {
  return value?.shortName || value?.name || null;
}

export function mapSofaIncident(incident) {
  const incidentType = String(incident?.incidentType || "").toLowerCase();
  const incidentClass = String(incident?.incidentClass || "").toLowerCase();
  const varDecision = String(incident?.varDecision || incident?.decision || "").toLowerCase();
  const base = {
    id: String(incident?.id || `${incidentType}-${incident?.time}-${incident?.player?.id || incident?.playerIn?.id || incident?.playerName || "event"}`),
    minute: incidentMinute(incident),
    minuteValue: Number(incident?.time) || 0,
    isHome: Boolean(incident?.isHome),
    player: getPlayerName(incident?.player) || incident?.playerName || null,
    reason: incident?.reason || null
  };

  if (incident?.reversed === true || (incidentType.includes("var") && (includesCancel(incidentClass) || includesCancel(varDecision)))) {
    return { ...base, type: "disallowed_goal", label: "But refusé", icon: "🚫" };
  }

  if (incidentType === "goal") {
    return {
      ...base,
      type: "goal",
      label: incidentClass.includes("penalty") ? "But sur penalty" : incidentClass.includes("own") ? "But contre son camp" : "But",
      icon: "⚽"
    };
  }

  if (incidentType === "card") {
    const red = incidentClass.includes("red") || incidentClass.includes("secondyellow") || incidentClass.includes("yellowred");
    return { ...base, type: red ? "red_card" : "yellow_card", label: red ? "Carton rouge" : "Carton jaune", icon: red ? "🟥" : "🟨" };
  }

  if (incidentType === "substitution") {
    return {
      ...base,
      type: "substitution",
      label: "Remplacement",
      icon: "🔄",
      playerIn: getPlayerName(incident?.playerIn),
      playerOut: getPlayerName(incident?.playerOut)
    };
  }

  if (incidentType.includes("var") && (varDecision.includes("goal") || incidentClass.includes("goal"))) {
    return { ...base, type: "var", label: "Décision VAR", icon: "📺" };
  }

  return null;
}

async function getMatchIncidentsUncached(match, tournamentId) {
  const event = await findSofaEventUncached({
    utcDate: match?.utcDate,
    homeName: match?.home?.name || match?.home?.shortName,
    awayName: match?.away?.name || match?.away?.shortName,
    tournamentId
  });
  if (!event?.id) return { ok: false, error: "Événement détaillé introuvable", data: [] };
  const json = await sofaFetch(`event/${event.id}/incidents`);
  const data = (json?.incidents || [])
    .map(mapSofaIncident)
    .filter(Boolean)
    .sort((a, b) => a.minuteValue - b.minuteValue);
  return { ok: true, eventId: event.id, data };
}

export async function getMatchIncidents(match, tournamentId = 34) {
  const isLive = ["IN_PLAY", "LIVE", "PAUSED"].includes(match?.status);
  const recent = Math.abs(Date.now() - new Date(match?.utcDate || 0).getTime()) < 3 * 24 * 60 * 60 * 1000;
  const revalidate = isLive ? 60 : recent ? 300 : 21600;
  try {
    return await unstable_cache(
      () => getMatchIncidentsUncached(match, tournamentId),
      ["ligue1-express-sofa-incidents-v56", String(match?.id || "unknown"), String(tournamentId)],
      { revalidate }
    )();
  } catch (error) {
    return { ok: false, error: error?.message || "Fil du match indisponible", data: [] };
  }
}
