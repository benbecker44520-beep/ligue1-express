import { articles as demoArticles } from "@/data/content";
import { createSupabaseClient } from "@/lib/supabase";

function categoryAccent(category) {
  if (category === "MERCATO") return "red";
  if (category === "ANALYSES") return "yellow";
  return "blue";
}

function normalizeArticle(a) {
  return {
    ...a,
    body: a.content ? a.content.split(/\n\n+/).filter(Boolean) : (a.body || []),
    accent: categoryAccent(a.category)
  };
}

export async function getPublishedArticles({ category = null, limit = 12 } = {}) {
  const supabase = createSupabaseClient();

  if (!supabase) {
    let items = [...demoArticles];
    if (category) items = items.filter((a) => a.category === category);
    return items.slice(0, limit).map(normalizeArticle);
  }

  let query = supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);

  const { data, error } = await query;

  if (error) {
    console.error("Supabase articles error:", error.message);
    return [];
  }

  return (data || []).map(normalizeArticle);
}

export async function getFeaturedArticle() {
  const supabase = createSupabaseClient();

  if (!supabase) {
    const demo = demoArticles[0];
    return demo ? normalizeArticle(demo) : null;
  }

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .eq("is_featured", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Supabase featured article error:", error.message);
    return null;
  }

  return data ? normalizeArticle(data) : null;
}

export async function getArticleBySlug(slug) {
  const supabase = createSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (!error && data) return normalizeArticle(data);
  }

  const demo = demoArticles.find((a) => a.slug === slug);
  return demo ? normalizeArticle(demo) : null;
}
