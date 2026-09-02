import { createSupabaseClient } from "@/lib/supabase";

const CHOICES = ["1", "N", "2"];

function buildPercentages(counts, total) {
  if (!total) return { "1": 0, "N": 0, "2": 0 };
  const parts = CHOICES.map((selection) => {
    const exact = (counts[selection] || 0) * 100 / total;
    return { selection, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let missing = 100 - parts.reduce((sum, part) => sum + part.value, 0);
  [...parts].sort((a, b) => b.remainder - a.remainder).forEach((part) => {
    if (missing > 0) { part.value += 1; missing -= 1; }
  });
  return Object.fromEntries(parts.map((part) => [part.selection, part.value]));
}

function finishStats(matchId, counts) {
  const total = CHOICES.reduce((sum, choice) => sum + (counts[choice] || 0), 0);
  const percentages = buildPercentages(counts, total);
  const highest = Math.max(...CHOICES.map((choice) => counts[choice] || 0));
  const leaders = highest > 0 ? CHOICES.filter((choice) => counts[choice] === highest) : [];
  const majority = leaders.length === 1 ? leaders[0] : null;
  return { matchId, counts, percentages, total, majority, majorityPercentage: majority ? percentages[majority] : 0 };
}

export async function getAllSupporterPredictionStats() {
  const supabase = createSupabaseClient();
  if (!supabase) return {};
  const { data, error } = await supabase.rpc("get_all_supporter_prediction_stats");
  if (error) {
    console.error("Supabase supporter stats error:", error.message);
    return {};
  }
  const grouped = {};
  for (const row of data || []) {
    const matchId = String(row.match_id);
    grouped[matchId] ||= { "1": 0, "N": 0, "2": 0 };
    grouped[matchId][row.selection] = Number(row.vote_count) || 0;
  }
  return Object.fromEntries(Object.entries(grouped).map(([matchId, counts]) => [matchId, finishStats(matchId, counts)]));
}
