import { getSiteUrl } from "@/lib/site";

export default function robots() {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/connexion", "/mon-profil-supporter", "/mon-club", "/mes-alertes"]
    },
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
