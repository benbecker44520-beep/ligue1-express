import { createSupabaseClient } from "@/lib/supabase";
import { getFixtures } from "@/lib/football";

export function matchOutcome(match) {
  if (!match || match.status !== "FINISHED") return null;
  const home = Number(match.score?.home);
  const away = Number(match.score?.away);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  if (home > away) return "1";
  if (home < away) return "2";
  return "N";
}

export async function getPublishedPredictions() {
  const supabase = createSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("status", "published")
    .order("match_date", { ascending: false });

  if (error) {
    console.error("Supabase predictions error:", error.message);
    return [];
  }

  const fixtures = await getFixtures();
  const fixtureMap = new Map((fixtures.ok ? fixtures.data : []).map((m) => [String(m.id), m]));

  return (data || []).map((prediction) => {
    const match = fixtureMap.get(String(prediction.match_id));
    const outcome = matchOutcome(match);
    let verdict = "pending";
    if (outcome) verdict = outcome === prediction.selection ? "won" : "lost";

    return {
      ...prediction,
      match: match || null,
      outcome,
      verdict
    };
  });
}
