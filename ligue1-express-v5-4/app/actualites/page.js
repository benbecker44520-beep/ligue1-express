import ArticleCard from "@/components/ArticleCard";
import { getPublishedArticles } from "@/lib/articles";

export const revalidate = 0;

export default async function Page() {
  const articles = await getPublishedArticles({ limit: 30});
  return (
    <div className="page-shell listing-page">
      <span className="eyebrow">LIGUE 1 EXPRESS</span>
      <h1>Actualités</h1>
      <p>Les informations à retenir, sans détour.</p>
      <div className="cards-grid">
        {articles.map(a => <ArticleCard key={a.slug} article={a} />)}
      </div>
    </div>
  );
}
