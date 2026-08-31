import ArticleCard from "@/components/ArticleCard";
import { getPublishedArticles } from "@/lib/articles";

export const revalidate = 0;

export default async function Page() {
  const articles = await getPublishedArticles({ category: "MERCATO", limit: 30});
  return (
    <div className="page-shell listing-page">
      <span className="eyebrow">TRANSFERTS</span>
      <h1>Mercato</h1>
      <p>Officiels, rumeurs et dossiers à suivre.</p>
      <div className="cards-grid">
        {articles.map(a => <ArticleCard key={a.slug} article={a} />)}
      </div>
    </div>
  );
}
