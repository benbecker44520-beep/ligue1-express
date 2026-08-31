import { getPublishedPredictions } from "@/lib/predictions";

export const revalidate = 0;
export const metadata = { title: "Pronostics", description: "Les pronostics football de la rédaction Ligue 1 Express, expliqués clairement et suivis après chaque match." };

function formatDate(value) { if (!value) return "Date à confirmer"; return new Intl.DateTimeFormat("fr-FR", { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", timeZone:"Europe/Paris" }).format(new Date(value)); }
function verdictLabel(v) { return v === "won" ? "✅ GAGNÉ" : v === "lost" ? "❌ PERDU" : "⏳ EN ATTENTE"; }
function pickLabel(p) { return p.selection === "1" ? `Victoire de ${p.home_team}` : p.selection === "2" ? `Victoire de ${p.away_team}` : "Match nul"; }

export default async function PronoPage() {
  const predictions = await getPublishedPredictions();
  const settled = predictions.filter(p => p.verdict !== "pending");
  const won = settled.filter(p => p.verdict === "won").length;
  const lost = settled.length - won;
  const pending = predictions.length - settled.length;
  const successRate = settled.length ? Math.round(won / settled.length * 100) : 0;
  const lastFive = settled.slice(0,5);
  return <div className="page-shell listing-page prono-page">
    <span className="eyebrow">LES CHOIX DE LA RÉDACTION</span><h1>Pronostics</h1>
    <p className="prono-intro">Un choix clair, notre lecture du match et un indice de confiance. Après le coup de sifflet final, le bilan se met à jour automatiquement.</p>
    <section className="prono-summary prono-summary-v6">
      <div className="prono-pie" style={{"--success":`${successRate}%`}}><div><strong>{successRate}%</strong><span>réussite</span></div></div>
      <div className="prono-summary-copy"><span className="eyebrow">BILAN DE LA RÉDACTION</span><h2>{settled.length ? `${won} gagnant${won>1?"s":""} sur ${settled.length} évalué${settled.length>1?"s":""}` : "Le bilan démarre avec les prochains résultats"}</h2>
        <div className="prono-kpis"><div><strong>{won}</strong><span>Gagnés</span></div><div><strong>{lost}</strong><span>Perdus</span></div><div><strong>{pending}</strong><span>En attente</span></div></div>
        {lastFive.length > 0 && <div className="prono-form"><span>5 derniers</span>{lastFive.map(p=><i key={p.id} className={p.verdict}>{p.verdict === "won" ? "G" : "P"}</i>)}</div>}
      </div>
    </section>
    <div className="prono-legend"><strong>Comprendre le 1 / N / 2</strong><span><b>1</b> Domicile</span><span><b>N</b> Match nul</span><span><b>2</b> Extérieur</span></div>
    <section className="prono-list-section"><div className="section-title"><div><span className="eyebrow section-eyebrow">NOS CHOIX</span><h2>Pronostics publiés</h2></div></div>
      {predictions.length === 0 ? <div className="editorial-empty"><h3>Aucun pronostic publié</h3><p>Les prochains choix de la rédaction apparaîtront ici.</p></div> : <div className="prono-grid prono-grid-v6">{predictions.map(p => {
        const m=p.match, hs=m?.score?.home, as=m?.score?.away, has=Number.isFinite(hs)&&Number.isFinite(as);
        return <article className={`prono-card prono-card-v6 prono-${p.verdict}`} key={p.id}>
          <div className="prono-card-top"><span>{p.competition||"Ligue 1"}</span><strong className={`prono-verdict ${p.verdict}`}>{verdictLabel(p.verdict)}</strong></div>
          <div className="prono-match"><strong>{p.home_team}</strong><div className="prono-score"><b>{has?`${hs} - ${as}`:"VS"}</b><small>{formatDate(p.match_date)}</small></div><strong>{p.away_team}</strong></div>
          <div className="prono-main-pick"><span>🎯 NOTRE PRONOSTIC</span><h3>{pickLabel(p)}</h3><small>Choix {p.selection} · {p.selection==="1"?"équipe à domicile":p.selection==="2"?"équipe à l’extérieur":"aucun vainqueur"}</small></div>
          {(p.confidence || p.secondary_bet) && <div className="prono-details">{p.confidence && <div><span>🔥 Indice de confiance</span><strong>{p.confidence}/10</strong><div className="confidence-track"><i style={{width:`${p.confidence*10}%`}} /></div></div>}{p.secondary_bet && <div><span>⚽ Pari complémentaire</span><strong>{p.secondary_bet}</strong></div>}</div>}
          {p.comment && <div className="prono-analysis"><span>📝 L'ANALYSE EXPRESS</span><p>{p.comment}</p></div>}
        </article>})}</div>}
    </section>
  </div>;
}
