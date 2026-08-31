import Link from "next/link";
import { getPublishedArticles, getFeaturedArticle } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";
import { ResultsPanel, StandingsPanel } from "@/components/ScorePanel";
import { getPublishedPredictions } from "@/lib/predictions";

export const revalidate = 0;

function EmptyState({ title, text, href, cta }) {
  return (
    <div className="editorial-empty">
      <span className="eyebrow">LIGUE 1 EXPRESS</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <Link href={href} className="text-link">{cta} →</Link>
    </div>
  );
}

export default async function HomePage() {
  const allArticles = await getPublishedArticles({ limit: 12 });
  const featuredArticle = await getFeaturedArticle();
  const mercato = await getPublishedArticles({ category: "MERCATO", limit: 3 });
  const analyses = await getPublishedArticles({ category: "ANALYSES", limit: 3 });
  const predictions = await getPublishedPredictions();
  const featuredPrediction = [...predictions]
    .filter((prediction) => prediction.verdict === "pending")
    .sort((a, b) => new Date(a.match_date || 0) - new Date(b.match_date || 0))[0] || predictions[0] || null;

  const hero = featuredArticle || allArticles[0] || {
    slug: "debrief-express-journee",
    title: "Ligue 1 Express",
    excerpt: "L'actualité de la Ligue 1, en un clin d'œil."
  };

  const secondary = allArticles.filter((a) => a.slug !== hero.slug).slice(0, 3);
  const latest = allArticles.filter((a) => a.slug !== hero.slug).slice(3, 9);

  return (
    <div className="page-shell">
      <section className="top-grid">
        <div
          className={`hero ${hero.image_url ? "has-hero-image" : ""}`}
          style={hero.image_url ? { backgroundImage: `url("${hero.image_url}")` } : undefined}
        >
          <div className="hero-overlay"></div>
          {!hero.image_url && <div className="hero-ball">⚽</div>}
          <div className="hero-content">
            <span className="tag tag-yellow">À LA UNE</span>
            <span className="eyebrow">LIGUE 1 · EXPRESS</span>
            <h1>{hero.title}</h1>
            <p>{hero.excerpt}</p>
            <Link href={`/article/${hero.slug}`} className="primary-button">Lire l'article →</Link>
          </div>
        </div>

        <aside className="sidebar">
          <ResultsPanel />
          <StandingsPanel />
        </aside>
      </section>

      {secondary.length > 0 && (
        <section className="home-headlines" aria-label="À suivre">
          <div className="home-headlines-label">À SUIVRE</div>
          <div className="home-headlines-grid">
            {secondary.map((article) => (
              <Link href={`/article/${article.slug}`} className="home-headline" key={article.slug}>
                <div
                  className={`home-headline-image ${article.image_url ? "has-image" : ""}`}
                  style={article.image_url ? { backgroundImage: `url("${article.image_url}")` } : undefined}
                >
                  {!article.image_url && <span>L1</span>}
                </div>
                <div className="home-headline-copy">
                  <span>{article.category || "ACTUALITÉ"}</span>
                  <strong>{article.title}</strong>
                </div>
                <b>→</b>
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav className="media-shortcuts" aria-label="Accès rapides Ligue 1">
        <Link href="/actualites" className="media-shortcut"><div><span>À LA UNE</span><strong>Dernières actualités</strong></div><b>→</b></Link>
        <Link href="/resultats" className="media-shortcut"><div><span>MATCHS</span><strong>Résultats & calendrier</strong></div><b>→</b></Link>
        <Link href="/championnats" className="media-shortcut"><div><span>FRANCE</span><strong>L1 · L2 · Ligue 3</strong></div><b>→</b></Link>
        <Link href="/stats" className="media-shortcut"><div><span>DATA</span><strong>Stats & buteurs</strong></div><b>→</b></Link>
      </nav>

      {featuredPrediction && (
        <section className="home-prono-card">
          <div>
            <span className="eyebrow">LE PRONO LIGUE 1 EXPRESS</span>
            <h2>{featuredPrediction.home_team} - {featuredPrediction.away_team}</h2>
            <p>{featuredPrediction.comment || "Le choix de la rédaction pour ce match."}</p>
          </div>
          <div className="home-prono-choice">
            <span>Notre prono</span>
            <strong>{featuredPrediction.selection}</strong>
            <Link href="/prono">Voir les pronos →</Link>
          </div>
        </section>
      )}

      <section className="content-section">
        <div className="section-title">
          <div>
            <span className="eyebrow section-eyebrow">FIL INFO</span>
            <h2>Dernières actualités</h2>
          </div>
          <Link href="/actualites">Voir toutes les actus →</Link>
        </div>

        {latest.length > 0 ? (
          <div className="cards-grid">
            {latest.map((a) => <ArticleCard key={a.slug} article={a} />)}
          </div>
        ) : (
          <EmptyState
            title="La rédaction attend ton prochain article"
            text="Publie un deuxième article depuis l'admin : il apparaîtra ici automatiquement."
            href="/admin"
            cta="Publier un article"
          />
        )}
      </section>

      <section className="editorial-grid">
        <div className="editorial-column">
          <div className="section-title">
            <div>
              <span className="eyebrow section-eyebrow">TRANSFERTS</span>
              <h2>Mercato</h2>
            </div>
            <Link href="/mercato">Voir tout →</Link>
          </div>

          {mercato.length > 0 ? (
            <div className="stacked-cards">
              {mercato.map((a) => <ArticleCard key={a.slug} article={a} />)}
            </div>
          ) : (
            <EmptyState
              title="Aucune info mercato publiée"
              text="Les articles classés Mercato remonteront automatiquement ici."
              href="/admin"
              cta="Ajouter une info mercato"
            />
          )}
        </div>

        <div className="editorial-column">
          <div className="section-title">
            <div>
              <span className="eyebrow section-eyebrow">DÉBRIEF & TACTIQUE</span>
              <h2>Analyses</h2>
            </div>
            <Link href="/analyses">Voir tout →</Link>
          </div>

          {analyses.length > 0 ? (
            <div className="stacked-cards">
              {analyses.map((a) => <ArticleCard key={a.slug} article={a} />)}
            </div>
          ) : (
            <EmptyState
              title="Aucune analyse publiée"
              text="Les articles classés Analyses apparaîtront automatiquement ici."
              href="/admin"
              cta="Publier une analyse"
            />
          )}
        </div>
      </section>

      <section className="cta editorial-cta home-league-cta">
        <div>
          <span className="eyebrow">TOUTE LA LIGUE 1</span>
          <h2>Matchs, clubs, joueurs et statistiques.</h2>
          <p>Retrouve les données essentielles du championnat et navigue directement vers les fiches détaillées.</p>
        </div>
        <div className="home-cta-links">
          <Link href="/resultats" className="primary-button">Voir les matchs →</Link>
          <Link href="/stats" className="home-cta-secondary">Explorer les stats</Link>
        </div>
      </section>
    </div>
  );
}
