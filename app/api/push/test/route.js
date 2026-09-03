import { NextResponse } from "next/server";
import { authenticatedSupabase, sendPush } from "@/lib/push-server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const token = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const supabase = authenticatedSupabase(token);
    const { data: authData } = await supabase.auth.getUser(token);
    if (!authData?.user) return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    const { data, error } = await supabase.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", authData.user.id);
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: "Aucun téléphone activé." }, { status: 404 });
    const results = await Promise.allSettled(data.map((subscription) => sendPush(subscription, {
      title: "Ligue 1 Express",
      body: "Tes notifications LIVE sont prêtes ! ⚽",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      url: "/live",
      tag: "ligue1-express-test"
    })));
    return NextResponse.json({ ok: true, sent: results.filter((result) => result.status === "fulfilled").length });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Test impossible." }, { status: 500 });
  }
}

