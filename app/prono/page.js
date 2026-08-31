import { getPublishedPredictions } from "@/lib/predictions";

export const revalidate = 0;

export const metadata = {
  title: "Prono",
  description: "Les pronostics 1/N/2 de la rédaction Ligue 1 Express et notre bilan de réussite."
};

function formatDate(value) {
  if (!value) return "Date à confirmer";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris"
  }).format(new Date(value));
}

function verdictLabel(verdict) {
  if (verdict === "won") return "✅ Réussi";
  if (verdict === "lost") return "❌ Raté";
  return "⏳ En attente";
}

export default async function PronoPage() {
  const predictions = await getPublishedPredictions();
  const settled = predictions.filter((p) => p.verdict === "won" || p.verdict === "lost");
  const won = settled.filter((p) => p.verdict === "won").length;
  const lost = settled.filter((p) => p.verdict === "lost").length;
  const successRate = settled.length ? Math.round((won / settled.length) * 100) : 0;
  const pieStyle = { "--success": `${successRate}%` };

  return (
    <div className="page-shell listing-page prono-page">
      <span className="eyebrow">LIGUE 1 EXPRESS · 1 / N / 2</span>
      <h1>Prono</h1>
      <p className="prono-intro">Les choix de la rédaction, avec notre analyse et un bilan mis à jour automatiquement quand les matchs sont terminés.</p>

      <section className="prono-summary">
        <div className="prono-pie" style={pieStyle} role="img" aria-label={`${successRate}% de pronostics réussis`}>
          <div><strong>{successRate}%</strong><span>réussite</span></div>
        </div>
        <div className="prono-summary-copy">
          <span className="eyebrow">BILAN DE LA RÉDACTION</span>
          <h2>{settled.length} prono{settled.length > 1 ? "s" : ""} évalué{settled.length > 1 ? "s" : ""}</h2>
          <div className="prono-kpis">
            <div><strong>{won}</strong><span>Réussis</span></div>
            <div><strong>{lost}</strong><span>Ratés</span></div>
            <div><strong>{predictions.filter((p) => p.verdict === "pending").length}</strong><span>En attente</span></div>
          </div>
        </div>
      </section>

      <section className="prono-list-section">
        <div className="section-title"><div><span className="eyebrow section-eyebrow">NOS CHOIX</span><h2>Pronostics publiés</h2></div></div>
        {predictions.length === 0 ? (
          <div className="editorial-empty"><h3>Aucun prono publié pour le moment</h3><p>Les prochains pronostics de la rédaction apparaîtront ici.</p></div>
        ) : (
          <div className="prono-grid">
            {predictions.map((prediction) => {
              const match = prediction.match;
              const homeScore = match?.score?.home;
              const awayScore = match?.score?.away;
              const hasScore = Number.isFinite(homeScore) && Number.isFinite(awayScore);
              return (
                <article className={`prono-card prono-${prediction.verdict}`} key={prediction.id}>
                  <div className="prono-card-top">
                    <span>{prediction.competition || "Ligue 1"}</span>
                    <strong className={`prono-verdict ${prediction.verdict}`}>{verdictLabel(prediction.verdict)}</strong>
                  </div>
                  <div className="prono-match">
                    <strong>{prediction.home_team}</strong>
                    <div className="prono-score">
                      {hasScore ? <b>{homeScore} - {awayScore}</b> : <b>VS</b>}
                      <small>{formatDate(prediction.match_date)}</small>
                    </div>
                    <strong>{prediction.away_team}</strong>
                  </div>
                  <div className="prono-choice">
                    <span>Notre prono</span>
                    <strong>{prediction.selection}</strong>
                    <small>{prediction.selection === "1" ? prediction.home_team : prediction.selection === "2" ? prediction.away_team : "Match nul"}</small>
                  </div>
                  {prediction.comment && <p className="prono-comment">{prediction.comment}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
