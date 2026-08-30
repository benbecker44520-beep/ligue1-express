import ArticleCard from "@/components/ArticleCard";
import { getPublishedArticles } from "@/lib/articles";

export const revalidate = 0;

export default async function Page() {
  const articles = await getPublishedArticles({ category: "ANALYSES", limit: 30});
  return (
    <div className="page-shell listing-page">
      <span className="eyebrow">DÉBRIEFS & TACTIQUE</span>
      <h1>Analyses</h1>
      <p>Comprendre rapidement ce qui fait basculer les matchs.</p>
      <div className="cards-grid">
        {articles.map(a => <ArticleCard key={a.slug} article={a} />)}
      </div>
    </div>
  );
}
