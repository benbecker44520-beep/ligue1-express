import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/newsletter-server";
import { publishArticleToSocials } from "@/lib/automatic-articles";

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

    const social = await publishArticleToSocials({ ...article, status: "published", published_at: publishedAt });
    await supabase.from("articles").update({ social_publications: social }).eq("id", article.id);

    return NextResponse.json({ ok: true, articleId: article.id, social });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Publication impossible." }, { status: 500 });
  }
}
