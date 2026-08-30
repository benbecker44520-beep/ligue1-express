import Link from "next/link";

export default function ArticleCard({ article }) {
  return (
    <article className="article-card">
      <Link
        href={`/article/${article.slug}`}
        className={`card-visual ${article.accent || "blue"} ${article.image_url ? "has-image" : ""}`}
        style={article.image_url ? { backgroundImage: `url("${article.image_url}")` } : undefined}
        aria-label={article.title}
      >
        {!article.image_url && (
          <div className="no-image-brand">
            <span>L1</span>
            <strong>EXPRESS</strong>
          </div>
        )}
      </Link>

      <div className="card-body">
        <span className="tag">{article.category}</span>
        <h3><Link href={`/article/${article.slug}`}>{article.title}</Link></h3>
        <p>{article.excerpt}</p>
        <Link href={`/article/${article.slug}`} className="text-link">Lire l'article →</Link>
      </div>
    </article>
  );
}
