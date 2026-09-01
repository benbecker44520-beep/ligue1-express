import Image from "next/image";
import Link from "next/link";
import { getPublishedArticles } from "@/lib/articles";
import { getStandings, getScorers, getLeaguePlayers } from "@/lib/football";

export const revalidate = 0;

export const metadata = {
  title: "Recherche",
  description: "Recherchez un club, un joueur ou une actualité sur Ligue 1 Express.",
  robots: { index: false, follow: true }
};

function norm(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function matches(value, query) { return norm(value).includes(norm(query)); }

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = String(params?.q || "").trim();
  const [articles, standings, scorers, leaguePlayers] = await Promise.all([
    getPublishedArticles({ limit: 100 }), getStandings(), getScorers(), getLeaguePlayers()
  ]);

  const articleResults = q ? articles.filter(a => [a.title, a.excerpt, a.category, ...(a.body || [])].some(v => matches(v, q))).slice(0, 12) : [];
  const clubResults = q && standings.ok ? standings.data.filter(c => matches(c.team, q) || matches(c.shortName, q)).slice(0, 8) : [];
  const scorerByPlayer = new Map((scorers.ok ? scorers.data : []).map((p) => [String(p.playerId), p]));
  const searchablePlayers = leaguePlayers.ok && leaguePlayers.data.length ? leaguePlayers.data : (scorers.ok ? scorers.data : []);
  const playerResults = q ? searchablePlayers
    .filter((p) => matches(p.name, q) || matches(p.teamName, q))
    .map((p) => ({ ...p, ...(scorerByPlayer.get(String(p.playerId)) || {}) }))
    .slice(0, 12) : [];
  const total = articleResults.length + clubResults.length + playerResults.length;

  return <div className="page-shell listing-page global-search-page">
    <span className="eyebrow">LIGUE 1 EXPRESS · RECHERCHE</span>
    <h1>Recherche globale</h1>
    <form action="/recherche" className="global-search-form">
      <span aria-hidden="true">⌕</span>
      <input name="q" defaultValue={q} type="search" placeholder="PSG, Pogba, mercato…" autoFocus aria-label="Votre recherche" />
      <button type="submit">Rechercher</button>
    </form>

    {!q ? <div className="search-empty"><strong>Que cherchez-vous ?</strong><p>Retrouvez rapidement un joueur, un club ou une actualité.</p></div> : <>
      <div className="search-summary"><strong>{total}</strong> résultat{total > 1 ? "s" : ""} pour <b>« {q} »</b></div>
      {total === 0 && <div className="search-empty"><strong>Aucun résultat</strong><p>Essaie avec un autre nom de joueur, de club ou un mot-clé.</p></div>}

      {clubResults.length > 0 && <section className="search-section"><div className="search-section-title"><span>🛡️ CLUBS</span><strong>{clubResults.length}</strong></div><div className="search-club-grid">{clubResults.map(c => <Link href={`/club/${c.teamId}`} key={c.teamId}>{c.logo && <Image src={c.logo} width={48} height={48} alt="" unoptimized />}<div><strong>{c.team}</strong><span>{c.rank}e · {c.points} pts</span></div><b>Voir →</b></Link>)}</div></section>}

      {playerResults.length > 0 && <section className="search-section"><div className="search-section-title"><span>👤 JOUEURS</span><strong>{playerResults.length}</strong></div><div className="search-player-grid">{playerResults.map(p => <Link href={`/joueur/${p.playerId}?club=${p.teamId}`} key={p.playerId}><div><strong>{p.name}</strong><span>{p.teamName || "Ligue 1"}</span></div><em>{Number.isFinite(p.goals) ? `${p.goals} but${p.goals > 1 ? "s" : ""}` : (p.position || "Joueur")}</em><b>Voir →</b></Link>)}</div></section>}

      {articleResults.length > 0 && <section className="search-section"><div className="search-section-title"><span>📰 ACTUALITÉS</span><strong>{articleResults.length}</strong></div><div className="search-article-list">{articleResults.map(a => <Link href={`/article/${a.slug}`} key={a.slug}><span>{a.category}</span><strong>{a.title}</strong><small>Lire l’article →</small></Link>)}</div></section>}
    </>}
  </div>;
}
