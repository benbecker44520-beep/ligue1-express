import { NextResponse } from "next/server";
import { broadcastPush, serviceSupabase } from "@/lib/push-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const articleId = String(body?.article_id || body?.id || "").trim();
    if (!articleId) return NextResponse.json({ error: "Article manquant." }, { status: 400 });

    const supabase = serviceSupabase();
    const { data: article, error } = await supabase
      .from("articles")
      .select("id,slug,title,status,published_at")
      .eq("id", articleId)
      .maybeSingle();
    if (error) throw error;
    if (!article) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    if (article.status !== "published") return NextResponse.json({ ok: true, skipped: "not_published" });

    const eventKey = `article:${article.id}:published`;
    const { error: markerError } = await supabase.from("live_notification_events").insert({
      event_key: eventKey,
      match_id: null,
      event_type: "article_published",
      payload: { article_id: article.id, slug: article.slug, title: article.title }
    });

    if (markerError?.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    if (markerError) throw markerError;

    const push = await broadcastPush({
      title: "📰 Nouvel article en ligne",
      body: article.title,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      type: "article_published",
      url: `/article/${article.slug}`,
      tag: eventKey
    });

    return NextResponse.json({ ok: true, articleId: article.id, push });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Notification article impossible." }, { status: 500 });
  }
}
