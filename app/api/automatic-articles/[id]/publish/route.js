import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/newsletter-server";
import { publishArticleToFacebook } from "@/lib/facebook";
import { broadcastPush } from "@/lib/push-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request, { params }) {
  try {
    const { supabase, user } = await requireAdmin(request);
    const { id } = await params;
    const { data: article, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!article) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    if (!article.auto_generated) return NextResponse.json({ error: "Cet article n’est pas un brouillon automatique." }, { status: 400 });

    if (article.status === "published") {
      return NextResponse.json({ ok: true, articleId: article.id, alreadyPublished: true, social: article.social_publications || {}, push: { skipped: true } });
    }

    const publishedAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("articles").update({
      status: "published",
      review_status: "approved",
      reviewed_at: publishedAt,
      reviewed_by: user.id,
      published_at: publishedAt,
      updated_at: publishedAt
    }).eq("id", article.id);
    if (updateError) throw updateError;

    const publishedArticle = { ...article, status: "published", published_at: publishedAt };

    // Facebook est le seul réseau publié automatiquement.
    // X reste volontairement en publication manuelle pour éviter l’API payante.
    const facebook = await publishArticleToFacebook(publishedArticle);
    const social = {
      facebook: facebook.ok
        ? { status: "published", id: facebook.postId || null }
        : facebook.configured === false
          ? { status: "not_configured", error: facebook.error || null }
          : { status: "failed", error: facebook.error || "Publication Facebook impossible" },
      x: { status: "manual" }
    };

    await supabase.from("articles").update({ social_publications: social }).eq("id", article.id);

    let push = null;
    const eventKey = `article:${article.id}:published`;
    const { error: markerError } = await supabase.from("live_notification_events").insert({
      event_key: eventKey,
      match_id: `article:${article.id}`,
      event_type: "article_published",
      payload: { article_id: article.id, slug: article.slug, title: article.title, facebook: social.facebook }
    });

    if (!markerError) {
      try {
        push = await broadcastPush({
          title: "🔥 À la une sur FF Express",
          body: `${article.title} · Appuie pour lire l’article.`,
          icon: "/icon-192.png",
          image: article.image_url || undefined,
          type: "article_published",
          url: `/article/${article.slug}`,
          tag: eventKey
        });
      } catch (pushError) {
        push = { error: pushError?.message || "Notification article impossible" };
      }
    } else if (markerError.code === "23505") {
      push = { duplicate: true };
    } else {
      push = { error: markerError.message || "Marqueur notification impossible" };
    }

    return NextResponse.json({ ok: true, articleId: article.id, social, push });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Publication impossible." }, { status: 500 });
  }
}
