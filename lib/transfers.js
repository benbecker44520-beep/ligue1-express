import { createSupabaseClient } from "@/lib/supabase";

export async function getTransfers() {
  const supabase = createSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("transfers").select("*").order("occurred_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(100);
  if (error) { console.error("Supabase transfers error:", error.message); return []; }
  return data || [];
}
