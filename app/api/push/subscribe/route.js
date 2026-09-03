import { NextResponse } from "next/server";
import { authenticatedSupabase } from "@/lib/push-server";

export const runtime = "nodejs";

function bearer(request) {
  return String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

export async function POST(request) {
  try {
    const token = bearer(request);
    const supabase = authenticatedSupabase(token);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    const body = await request.json();
    const endpoint = String(body?.endpoint || "").trim();
    const p256dh = String(body?.keys?.p256dh || "").trim();
    const auth = String(body?.keys?.auth || "").trim();
    if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });
    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id: authData.user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: String(request.headers.get("user-agent") || "").slice(0, 500),
      updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Inscription impossible." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const token = bearer(request);
    const supabase = authenticatedSupabase(token);
    const { data: authData } = await supabase.auth.getUser(token);
    if (!authData?.user) return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    const body = await request.json();
    const endpoint = String(body?.endpoint || "").trim();
    if (endpoint) await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", authData.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Désactivation impossible." }, { status: 500 });
  }
}

