import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug } from "@/lib/articles";
import ShareButtons from "@/components/ShareButtons";
import Image from "next/image";
import { getStandings } from "@/lib/football";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article introuvable", robots: { index: false } };
  return {
    title: article.title,
    description: article.excerpt || "Actualité Ligue 1 sur Ligue 1 Express.",
    alternates: { canonical: `/article/${slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt || "Actualité Ligue 1 sur Ligue 1 Express.",
      images: article.image_url ? [{ url: article.image_url }] : undefined,
      publishedTime: article.published_at || undefined,
      modifiedTime: article.updated_at || undefined
    }
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const paragraphs = article.body?.length
    ? article.body
    : (article.content || "").split(/\n\n+/).filter(Boolean);

  let relatedClubs = [];
  const relatedIds = (article.related_club_ids || []).map(String);
  if (relatedIds.length) {
    const standings = await getStandings();
    if (standings.ok) relatedClubs = standings.data.filter((club) => relatedIds.includes(String(club.teamId)));
  }

  return (
    <div className="article-page article-page-v3 page-shell">
      <Link href="/" className="back-link">← Retour à l'accueil</Link>

      <header className="article-header-v3">
        <span className="tag">{article.category}</span>
        <h1>{article.title}</h1>
        <p className="article-lead">{article.excerpt}</p>
      </header>

      <div
        className={`article-cover article-cover-v3 ${article.accent || "blue"} ${article.image_url ? "has-image" : ""}`}
        style={article.image_url ? { backgroundImage: `url("${article.image_url}")` } : undefined}
      >
        {!article.image_url && <span>⚽</span>}
      </div>

      <div className="article-layout-v3">
        <article className="article-copy article-copy-v3">
          {relatedClubs.length > 0 && (
            <div className="article-related-clubs">
              <span>CLUBS CONCERNÉS</span>
              <div className="article-related-club-list">
                {relatedClubs.map((club) => (
                  <Link href={`/club/${club.teamId}`} key={club.teamId}>
                    {club.logo && <Image src={club.logo} alt="" width={22} height={22} unoptimized />}
                    {club.shortName || club.team}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </article>

        <aside className="article-side-v3">
          <div className="share-box">
            <strong>Partager l'article</strong>
            <p>Envoie cette info à tes proches.</p>
            <ShareButtons title={article.title} path={`/article/${article.slug}`} />
          </div>

          {article.tiktok_url && (
            <div className="tiktok-box-v3">
              <span className="tag tag-dark">TIKTOK</span>
              <h3>Voir la vidéo associée</h3>
              <a className="primary-button" href={article.tiktok_url} target="_blank" rel="noreferrer">
                Ouvrir TikTok ↗
              </a>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
