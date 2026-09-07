import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/newsletter-server";
import { broadcastPush } from "@/lib/push-server";
import { publishArticleToFacebook } from "@/lib/facebook";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const { supabase } = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "Article manquant." }, { status: 400 });

    const { data: article, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!article) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });

    // Sécurité anti-doublon : un second clic sur Publier ne renvoie ni push ni post Facebook.
    if (article.status === "published") {
      return NextResponse.json({
        ok: true,
        articleId: article.id,
        alreadyPublished: true,
        push: { skipped: true },
        facebook: { skipped: true }
      });
    }

    const publishedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("articles")
      .update({ status: "published", published_at: publishedAt, updated_at: publishedAt })
      .eq("id", id);
    if (updateError) throw updateError;

    let push = null;
    try {
      push = await broadcastPush({
        title: "📰 Nouvel article en ligne",
        body: article.title,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        type: "article_published",
        url: `/article/${article.slug}`,
        tag: `article-${article.id}`
      });
    } catch (pushError) {
      push = { ok: false, error: pushError?.message || "Notification article impossible" };
    }

    let facebook = null;
    try {
      facebook = await publishArticleToFacebook({ ...article, status: "published", published_at: publishedAt });
    } catch (facebookError) {
      facebook = { ok: false, error: facebookError?.message || "Publication Facebook impossible" };
    }

    try {
      await supabase.from("live_notification_events").insert({
        event_key: `article:${article.id}`,
        match_id: null,
        event_type: "article_published",
        payload: {
          article_id: article.id,
          slug: article.slug,
          title: article.title,
          facebook: facebook?.ok ? { ok: true, post_id: facebook.postId || null } : { ok: false, error: facebook?.error || null }
        }
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      articleId: article.id,
      push,
      facebook
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Publication impossible." }, { status: 500 });
  }
}
