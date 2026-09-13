import {
  getFrenchLiveMatches as getFreeLiveMatches,
  getRecentlyFinishedFrenchMatches as getFreeFinishedMatches,
  getFreeMatch,
  getFreeFootballStatistics
} from "@/lib/free-football";
import { getEspnCupMatches } from "@/lib/espn";

// Couche de compatibilité historique.
// Aucun appel à apiv3.apifootball.com n'est effectué : les données proviennent
// désormais de sources gratuites utilisées par Foot Français Express.

export function mapApiFootballMatch(raw = {}) {
  return raw;
}

export async function getFrenchLiveMatches() {
  return getFreeLiveMatches();
}

export async function getRecentlyFinishedFrenchMatches(options = {}) {
  return getFreeFinishedMatches(options);
}

export async function getApiFootballMatch(matchId) {
  return getFreeMatch(matchId);
}

export async function getApiFootballStatistics(matchId) {
  return getFreeFootballStatistics(matchId);
}

export async function getApiFootballMatchIncidents(match) {
  if (!match?.id) return { ok: false, configured: true, error: "Match introuvable", data: [] };
  const result = await getFreeMatch(match.id);
  if (!result.ok) return { ok: false, configured: true, error: result.error, data: [] };
  const data = (result.data?.events || []).map((event) => ({
    ...event,
    id: `free-${event.id}`,
    minute: event.minuteLabel || (event.minute != null ? `${event.minute}'` : "—"),
    minuteValue: Number(event.minute) || 0,
    isHome: event.side === "home",
    label: event.type === "goal" ? "But" : event.type === "red_card" ? "Carton rouge" : event.type === "yellow_card" ? "Carton jaune" : event.type === "substitution" ? "Remplacement" : "Fait de match",
    icon: event.type === "goal" ? "⚽" : event.type === "red_card" ? "🟥" : event.type === "yellow_card" ? "🟨" : event.type === "substitution" ? "🔄" : "•"
  }));
  return { ok: true, configured: true, eventId: result.data.id, data };
}

export async function getFrenchCupMatches() {
  try {
    const result = await getEspnCupMatches();
    if (!result?.ok) return result || { ok: false, configured: true, error: "Coupe de France indisponible", data: [] };
    const data = (result.data || []).map((match) => ({
      ...match,
      id: String(match.id).includes(":") ? String(match.id) : `cdf:${match.id}`,
      provider: "espn-free",
      source: "ESPN",
      sourceFree: true,
      league: { slug: "coupe-de-france", name: "Coupe de France", shortName: "CDF", european: false },
      leagueId: "fra.coupe_de_france",
      leagueName: "Coupe de France",
      statusText: match.status === "FINISHED" ? "TERMINÉ" : match.status === "IN_PLAY" ? "EN DIRECT" : "À VENIR",
      matchLive: match.status === "IN_PLAY",
      events: Array.isArray(match.events) ? match.events : []
    }));
    return { ...result, ok: true, configured: true, provider: "espn-free", data };
  } catch (error) {
    return { ok: false, configured: true, error: error?.message || "Coupe de France indisponible", data: [] };
  }
}

export async function getApiFootballPlayerProfile(playerName) {
  const name = String(playerName || "").trim();
  if (!name) return { ok: false, configured: true, error: "Joueur manquant" };
  return {
    ok: false,
    configured: true,
    freeProvider: true,
    error: "La fiche détaillée de ce joueur n'est pas disponible dans les sources gratuites pour le moment."
  };
}
