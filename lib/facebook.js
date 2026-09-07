import { getSiteUrl } from "@/lib/site";

function facebookConfig() {
  const pageId = String(process.env.FACEBOOK_PAGE_ID || "").trim();
  const accessToken = String(process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "").trim();
  return { pageId, accessToken, configured: Boolean(pageId && accessToken) };
}

export function isFacebookConfigured() {
  return facebookConfig().configured;
}

export async function getFacebookPageIdentity() {
  const { pageId, accessToken, configured } = facebookConfig();
  if (!configured) return { ok: false, configured: false, error: "Facebook n'est pas configuré." };

  try {
    const url = new URL(`https://graph.facebook.com/${encodeURIComponent(pageId)}`);
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", accessToken);
    const response = await fetch(url, { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.error) {
      return {
        ok: false,
        configured: true,
        error: json?.error?.message || `Facebook HTTP ${response.status}`,
        code: json?.error?.code || null
      };
    }
    return { ok: true, configured: true, id: json.id, name: json.name };
  } catch (error) {
    return { ok: false, configured: true, error: error?.message || "Vérification Facebook impossible." };
  }
}

export async function publishArticleToFacebook(article) {
  const { pageId, accessToken, configured } = facebookConfig();
  if (!configured) return { ok: false, skipped: true, configured: false, error: "Facebook n'est pas configuré." };
  if (!article?.slug || !article?.title) return { ok: false, skipped: true, configured: true, error: "Article incomplet." };

  const siteUrl = getSiteUrl();
  const articleUrl = `${siteUrl}/article/${encodeURIComponent(article.slug)}`;
  const excerpt = String(article.excerpt || "").trim();
  const message = [
    "📰 NOUVEL ARTICLE · FF EXPRESS",
    "",
    String(article.title).trim(),
    excerpt ? `\n${excerpt}` : "",
    "",
    "Lire l'article complet 👇"
  ].filter((line, index, arr) => !(line === "" && arr[index - 1] === "")).join("\n").trim();

  try {
    const body = new URLSearchParams();
    body.set("message", message);
    body.set("link", articleUrl);
    body.set("access_token", accessToken);

    const response = await fetch(`https://graph.facebook.com/${encodeURIComponent(pageId)}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      cache: "no-store"
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.error) {
      return {
        ok: false,
        configured: true,
        error: json?.error?.message || `Facebook HTTP ${response.status}`,
        code: json?.error?.code || null,
        subcode: json?.error?.error_subcode || null
      };
    }

    return { ok: true, configured: true, postId: json.id || null, url: articleUrl };
  } catch (error) {
    return { ok: false, configured: true, error: error?.message || "Publication Facebook impossible." };
  }
}
