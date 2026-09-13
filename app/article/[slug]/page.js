import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug } from "@/lib/articles";
import ShareButtons from "@/components/ShareButtons";
import Image from "next/image";
import { getStandings, getScorers } from "@/lib/football";
import { articleMentions } from "@/lib/content-links";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article introuvable", robots: { index: false } };

  const description = article.excerpt || "Actualité du football français sur Foot Français Express.";
  const articlePath = `/article/${slug}`;
  const socialImage = article.image_url || "/icon-512.png";

  return {
    title: article.title,
    description,
    alternates: { canonical: articlePath },
    openGraph: {
      type: "article",
      locale: "fr_FR",
      siteName: "Foot Français Express",
      url: articlePath,
      title: article.title,
      description,
      images: [{
        url: socialImage,
        width: 1200,
        height: 630,
        alt: article.title
      }],
      publishedTime: article.published_at || undefined,
      modifiedTime: article.updated_at || undefined
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [socialImage]
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
  let relatedPlayers = [];
  const relatedIds = (article.related_club_ids || []).map(String);
  if (relatedIds.length) {
    const standings = await getStandings();
    if (standings.ok) relatedClubs = standings.data.filter((club) => relatedIds.includes(String(club.teamId)));
  }
  const scorers = await getScorers();
  if (scorers.ok) relatedPlayers = scorers.data.filter((player) => articleMentions(article, player.name)).slice(0, 5);

  return (
    <div className="article-page article-page-v3 page-shell">
      <Link href="/" className="back-link">← Retour à l'accueil</Link>

      <header className="article-header-v3">
        <span className="tag">{article.category}</span>
        <h1>{article.title}</h1>
        <p className="article-lead">{article.excerpt}</p>
      </header>

      {article.image_url ? (
        <div className="article-cover article-cover-v3 has-image" style={{aspectRatio:"1200 / 630",height:"auto",background:"#071a46",overflow:"hidden"}}>
          <img src={article.image_url} alt={article.title} style={{display:"block",width:"100%",height:"100%",objectFit:"contain",objectPosition:"center"}} />
        </div>
      ) : (
        <div className={`article-cover article-cover-v3 ${article.accent || "blue"}`}><span>⚽</span></div>
      )}

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
          {relatedPlayers.length > 0 && (
            <div className="article-related-clubs article-related-players">
              <span>JOUEURS CITÉS</span>
              <div className="article-related-club-list">
                {relatedPlayers.map((player) => (
                  <Link href={`/joueur/${player.playerId}${player.teamId ? `?club=${player.teamId}` : ""}`} key={player.playerId}>
                    {player.logo && <Image src={player.logo} alt="" width={22} height={22} unoptimized />}
                    {player.name}
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
