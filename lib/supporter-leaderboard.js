import { createSupabaseClient } from "@/lib/supabase";

function mondayStart(date = new Date()) {
  const value = new Date(date);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function badgeFor(player) {
  if (player.bestStreak >= 5) return "🔥 Série de 5";
  if (player.played >= 10 && player.successRate >= 70) return "👑 Expert Ligue 1";
  if (player.wins >= 3) return "🎯 Œil du coach";
  if (player.played >= 1) return "⚽ Premier prono";
  return "🆕 Nouveau";
}

function buildRanking(entries, predictions, filter = () => true) {
  const matches = new Map(predictions.filter((prediction) => prediction.outcome && filter(prediction)).map((prediction) => [String(prediction.match_id), prediction]));
  const players = new Map();
  for (const entry of entries) {
    const prediction = matches.get(String(entry.match_id));
    if (!prediction) continue;
    const id = String(entry.profile_id);
    if (!players.has(id)) players.set(id, { id, nickname: entry.nickname, played: 0, wins: 0, points: 0, results: [] });
    const player = players.get(id);
    const won = entry.selection === prediction.outcome;
    player.played += 1;
    player.wins += won ? 1 : 0;
    player.points += won ? 3 : 0;
    player.results.push({ won, date: prediction.match_date });
  }
  return [...players.values()].map((player) => {
    const ordered = player.results.sort((a, b) => new Date(b.date) - new Date(a.date));
    let currentStreak = 0;
    for (const result of ordered) { if (!result.won) break; currentStreak += 1; }
    let bestStreak = 0, running = 0;
    for (const result of [...ordered].reverse()) { running = result.won ? running + 1 : 0; bestStreak = Math.max(bestStreak, running); }
    const successRate = player.played ? Math.round(player.wins * 100 / player.played) : 0;
    const complete = { ...player, currentStreak, bestStreak, successRate };
    return { ...complete, badge: badgeFor(complete) };
  }).sort((a, b) => b.points - a.points || b.wins - a.wins || b.successRate - a.successRate || a.nickname.localeCompare(b.nickname, "fr"));
}

export async function getSupporterLeaderboards(predictions) {
  const supabase = createSupabaseClient();
  if (!supabase) return { general: [], weekly: [], weekStart: mondayStart() };
  const { data, error } = await supabase.rpc("get_public_supporter_prediction_entries");
  if (error) {
    console.error("Supabase leaderboard error:", error.message);
    return { general: [], weekly: [], weekStart: mondayStart() };
  }
  const weekStart = mondayStart();
  return {
    general: buildRanking(data || [], predictions),
    weekly: buildRanking(data || [], predictions, (prediction) => new Date(prediction.match_date) >= weekStart),
    weekStart
  };
}
