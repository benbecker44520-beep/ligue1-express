import { createSupabaseClient } from "@/lib/supabase";

export function scoreWithScorerFallback(match, scorers = []) {
  const original = match?.score || { home: null, away: null };
  if (!match || match.status !== "FINISHED" || !scorers.length) return original;

  const home = scorers.filter((s) => s.team_side === "home").length;
  const away = scorers.filter((s) => s.team_side === "away").length;
  const manualTotal = home + away;

  const apiHome = Number(original.home);
  const apiAway = Number(original.away);
  const apiValid = Number.isFinite(apiHome) && Number.isFinite(apiAway);
  const apiTotal = apiValid ? apiHome + apiAway : -1;

  // Les buteurs sont saisis manuellement. On ne les utilise comme filet de
  // sécurité que s'ils prouvent qu'il manque au moins un but dans le score API.
  if (manualTotal > 0 && (!apiValid || manualTotal > apiTotal)) {
    return { home, away };
  }

  return original;
}

export async function reconcileFinishedMatchScores(matches = []) {
  const list = [...matches];
  const finishedIds = list
    .filter((match) => match?.status === "FINISHED")
    .map((match) => String(match.id));

  if (!finishedIds.length) return list;

  const supabase = createSupabaseClient();
  if (!supabase) return list;

  const { data, error } = await supabase
    .from("match_scorers")
    .select("match_id,team_side")
    .in("match_id", finishedIds);

  if (error || !data?.length) return list;

  const byMatch = new Map();
  for (const scorer of data) {
    const key = String(scorer.match_id);
    if (!byMatch.has(key)) byMatch.set(key, []);
    byMatch.get(key).push(scorer);
  }

  return list.map((match) => {
    if (!match) return match;
    const scorers = byMatch.get(String(match.id)) || [];
    const score = scoreWithScorerFallback(match, scorers);
    return score === match.score ? match : { ...match, score, scoreFallback: "match_scorers" };
  });
}
