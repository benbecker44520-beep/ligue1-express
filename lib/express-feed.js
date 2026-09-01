import { createSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";

export const EXPRESS_CATEGORIES = {
  mercato: { label: "MERCATO", icon: "🔁" },
  officiel: { label: "OFFICIEL", icon: "✅" },
  match: { label: "MATCH", icon: "⚽" },
  blessure: { label: "BLESSURE", icon: "🚑" },
  declaration: { label: "DÉCLARATION", icon: "🎙️" },
  coupe: { label: "COUPE DE FRANCE", icon: "🏆" },
  club: { label: "CLUB", icon: "🏟️" },
  info: { label: "INFO", icon: "⚡" }
};

export async function getExpressFeed({ limit = 50 } = {}) {
  if (!hasSupabaseConfig()) return [];
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("express_feed")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return error ? [] : (data || []);
}

export function expressMeta(category) {
  return EXPRESS_CATEGORIES[category] || EXPRESS_CATEGORIES.info;
}
