import { getPublishedArticles } from "@/lib/articles";
import { getStandings } from "@/lib/football";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap() {
  const base = getSiteUrl();
  const now = new Date();
  const staticPaths = ["", "/actualites", "/resultats", "/classement", "/stats", "/mercato", "/analyses"];
  const entries = staticPaths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" ? "hourly" : "daily",
    priority: path === "" ? 1 : 0.8
  }));

  try {
    const articles = await getPublishedArticles({ limit: 100 });
    for (const article of articles) {
      entries.push({
        url: `${base}/article/${article.slug}`,
        lastModified: new Date(article.updated_at || article.published_at || now),
        changeFrequency: "weekly",
        priority: 0.7
      });
    }
  } catch {}

  try {
    const standings = await getStandings();
    if (standings.ok) {
      for (const club of standings.data) {
        entries.push({
          url: `${base}/club/${club.teamId}`,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.65
        });
      }
    }
  } catch {}

  return entries;
}
