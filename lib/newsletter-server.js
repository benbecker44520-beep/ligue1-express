import { createClient } from "@supabase/supabase-js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://ligue1-express.vercel.app";
}

export function serverSupabase(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configuration Supabase absente.");
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } });
}

export async function requireAdmin(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Authentification requise.");
  const supabase = serverSupabase(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new Error("Session administrateur invalide.");
  return { supabase, user: data.user };
}

export async function loadNewsletterArticles(supabase, articleIds = []) {
  if (!Array.isArray(articleIds) || !articleIds.length) return [];
  const { data, error } = await supabase.from("articles").select("id,slug,title,category,excerpt,image_url,status").in("id", articleIds).eq("status", "published");
  if (error) throw new Error(error.message);
  const byId = new Map((data || []).map((article) => [article.id, article]));
  return articleIds.map((id) => byId.get(id)).filter(Boolean);
}

export function renderNewsletterHtml({ subject, intro, articles, unsubscribeToken = null }) {
  const base = siteUrl();
  const articleHtml = articles.map((article) => {
    const link = `${base}/article/${encodeURIComponent(article.slug)}`;
    const image = article.image_url ? `<img src="${escapeHtml(article.image_url)}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px 12px 0 0;display:block">` : "";
    return `<div style="margin:18px 0;border:1px solid #e4e8f0;border-radius:12px;overflow:hidden;background:#fff">${image}<div style="padding:18px"><div style="font-size:11px;font-weight:800;color:#8a7600;letter-spacing:.06em">${escapeHtml(article.category)}</div><h2 style="margin:6px 0 8px;font-size:20px;line-height:1.2;color:#081b44">${escapeHtml(article.title)}</h2><p style="margin:0 0 14px;color:#606b7c;line-height:1.55;font-size:14px">${escapeHtml(article.excerpt || "")}</p><a href="${link}" style="display:inline-block;background:#ffd719;color:#081b44;text-decoration:none;font-weight:900;padding:10px 14px;border-radius:8px">Lire l'article</a></div></div>`;
  }).join("");
  const unsubscribe = unsubscribeToken ? `<p style="margin:24px 0 0;font-size:11px;color:#9aa3b2;text-align:center">Tu reçois cet e-mail car tu es inscrit à Ligue 1 Express. <a href="${base}/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}" style="color:#6f7785">Se désinscrire</a>.</p>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f6fa;font-family:Arial,sans-serif;color:#081b44"><div style="max-width:640px;margin:0 auto;padding:28px 16px"><div style="background:#081b44;border-radius:16px;padding:20px 22px;color:#fff"><div style="font-size:22px;font-weight:900">LIGUE 1 <span style="color:#ffd719">EXPRESS</span></div><div style="margin-top:4px;color:#bdc8dc;font-size:12px">L'actualité du football français</div></div><div style="background:white;margin-top:14px;border-radius:16px;padding:24px"><h1 style="margin:0 0 12px;font-size:28px;line-height:1.15">${escapeHtml(subject)}</h1><p style="margin:0 0 18px;color:#596577;line-height:1.6">${escapeHtml(intro).replace(/\n/g, "<br>")}</p>${articleHtml || '<p style="color:#7b8495">Aucun article sélectionné.</p>'}</div>${unsubscribe}</div></body></html>`;
}

export async function sendWithResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY absente de Vercel.");
  const from = process.env.NEWSLETTER_FROM_EMAIL || "Ligue 1 Express <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message || `Resend HTTP ${response.status}`);
  return json;
}
