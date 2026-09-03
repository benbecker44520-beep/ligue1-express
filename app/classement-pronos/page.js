import Link from "next/link";
import { getPublishedPredictions } from "@/lib/predictions";
import { getSupporterLeaderboards } from "@/lib/supporter-leaderboard";
import SupporterLeaderboard from "@/components/SupporterLeaderboard";

export const revalidate = 0;
export const metadata = { title: "Classement des pronostiqueurs", description: "Le classement hebdomadaire et général des supporters de Ligue 1 Express." };

export default async function SupporterRankingPage() {
  const predictions = await getPublishedPredictions();
  const { general, weekly, weekStart } = await getSupporterLeaderboards(predictions);
  const weekLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(weekStart);
  return <main className="page-shell supporter-ranking-page">
    <section className="ranking-hero"><div><span>🏆 LA COMMUNAUTÉ</span><h1>Classement des pronostiqueurs</h1><p>Chaque bon résultat rapporte <strong>3 points</strong>. Enchaîne les bons pronostics et grimpe au classement !</p></div><div className="ranking-hero-actions"><Link href="/mon-profil-supporter">Mon espace</Link><Link href="/prono">Faire mes pronostics →</Link></div></section>
    <section className="ranking-rules"><div><strong>+3</strong><span>Bon pronostic</span></div><div><strong>🔥</strong><span>Série en cours</span></div><div><strong>{general.length}</strong><span>Pronostiqueur{general.length > 1 ? "s" : ""} classé{general.length > 1 ? "s" : ""}</span></div><div><strong>{weekLabel}</strong><span>Début de la semaine</span></div></section>
    <section className="ranking-board"><div className="ranking-board-title"><span>TABLEAU D’HONNEUR</span><h2>Qui sera le meilleur cette saison ?</h2></div><SupporterLeaderboard general={general} weekly={weekly} /></section>
    <section className="ranking-badges"><h2>Badges à débloquer</h2><div><span>⚽ <b>Premier prono</b><small>Un résultat évalué</small></span><span>🎯 <b>Œil du coach</b><small>Trois bons résultats</small></span><span>👑 <b>Expert Ligue 1</b><small>70 % sur au moins 10 pronos</small></span><span>🔥 <b>Série de 5</b><small>Cinq bons résultats consécutifs</small></span></div></section>
  </main>;
}
