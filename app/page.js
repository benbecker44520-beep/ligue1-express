import Link from "next/link";
import Image from "next/image";
import { getPublishedArticles, getFeaturedArticle } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";
import { getFixtures, getHomeSnapshot, getScorers, getStandings } from "@/lib/football";
import { getPublishedPredictions } from "@/lib/predictions";
import { getTransfers } from "@/lib/transfers";
import { sameEntityName } from "@/lib/content-links";
import HomeHeroMedia from "@/components/HomeHeroMedia";
import { getAllSupporterPredictionStats } from "@/lib/supporter-predictions";
import MatchOfTheWeek from "@/components/MatchOfTheWeek";

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

function formatMatchTime(match) {
  if (!match?.utcDate) return "--:--";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris"
  }).format(new Date(match.utcDate));
}

function MatchTeam({ team, align = "left" }) {
  return (
    <div className={`v8-match-team ${align === "right" ? "away" : ""}`}>
      {team?.logo && <Image src={team.logo} alt="" width={54} height={54} unoptimized />}
      <div>
        <span>{align === "right" ? "EXTÉRIEUR" : "DOMICILE"}</span>
        <strong>{team?.shortName || team?.name}</strong>
      </div>
    </div>
  );
}

function formTable(fixtures = [], standings = []) {
  const clubs = new Map(standings.map((row) => [String(row.teamId), { ...row, formPoints: 0, formGames: 0, form: [] }]));
  const finished = fixtures.filter((m) => m.status === "FINISHED").sort((a, b) => b.timestamp - a.timestamp);

  for (const row of clubs.values()) {
    const matches = finished.filter((m) => String(m.home.id) === String(row.teamId) || String(m.away.id) === String(row.teamId)).slice(0, 5);
    for (const m of matches) {
      const home = String(m.home.id) === String(row.teamId);
      const scored = home ? m.score.home : m.score.away;
      const conceded = home ? m.score.away : m.score.home;
      const result = scored > conceded ? "V" : scored === conceded ? "N" : "D";
      row.form.push(result);
      row.formGames += 1;
      row.formPoints += result === "V" ? 3 : result === "N" ? 1 : 0;
    }
  }

  return [...clubs.values()]
    .filter((row) => row.formGames > 0)
    .sort((a, b) => b.formPoints - a.formPoints || b.points - a.points)
    .slice(0, 5);
}

function recentForm(fixtures, teamId, excludedMatchId) {
  return fixtures.filter((match) => match.status === "FINISHED" && String(match.id) !== String(excludedMatchId) && (String(match.home.id) === String(teamId) || String(match.away.id) === String(teamId))).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5).reverse().map((match) => {
    const home = String(match.home.id) === String(teamId);
    const scored = home ? match.score.home : match.score.away;
    const conceded = home ? match.score.away : match.score.home;
    return scored > conceded ? "V" : scored < conceded ? "D" : "N";
  });
}

function headToHead(fixtures, homeId, awayId, excludedMatchId) {
  return fixtures.filter((match) => match.status === "FINISHED" && String(match.id) !== String(excludedMatchId) && [String(match.home.id), String(match.away.id)].includes(String(homeId)) && [String(match.home.id), String(match.away.id)].includes(String(awayId))).sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
}

export default async function HomePage() {
  const [allArticles, featuredArticle, mercatoArticles, analyses, predictions, transfers, scorersResult, standingsResult, fixturesResult, snapshotResult, supporterStats] = await Promise.all([
    getPublishedArticles({ limit: 14 }),
    getFeaturedArticle(),
    getPublishedArticles({ category: "MERCATO", limit: 3 }),
    getPublishedArticles({ category: "ANALYSES", limit: 3 }),
    getPublishedPredictions(),
    getTransfers(),
    getScorers(),
    getStandings(),
    getFixtures(),
    getHomeSnapshot(),
    getAllSupporterPredictionStats()
  ]);

  const standings = standingsResult.ok ? standingsResult.data : [];
  const scorers = scorersResult.ok ? scorersResult.data.slice(0, 5) : [];
  const fixtures = fixturesResult.ok ? fixturesResult.data : [];
  const formTeams = formTable(fixtures, standings);
  const snapshot = snapshotResult.ok ? snapshotResult.data : {};
  const featuredPrediction = [...predictions]
    .filter((prediction) => prediction.verdict === "pending")
    .sort((a, b) => new Date(a.match_date || 0) - new Date(b.match_date || 0))[0] || predictions[0] || null;
  const weekPrediction = predictions.find((prediction) => prediction.is_week_match) || featuredPrediction;
  const weekMatch = weekPrediction?.match || fixtures.find((match) => String(match.id) === String(weekPrediction?.match_id)) || null;
  const weekStats = weekPrediction ? supporterStats[String(weekPrediction.match_id)] : null;
  const weekHomeForm = weekMatch ? recentForm(fixtures, weekMatch.home.id, weekMatch.id) : [];
  const weekAwayForm = weekMatch ? recentForm(fixtures, weekMatch.away.id, weekMatch.id) : [];
  const weekMeetings = weekMatch ? headToHead(fixtures, weekMatch.home.id, weekMatch.away.id, weekMatch.id) : [];

  const hero = featuredArticle || allArticles[0] || {
    slug: "debrief-express-journee",
    title: "Ligue 1 Express",
    excerpt: "L'actualité de la Ligue 1, en un clin d'œil."
  };

  const heroImages = [hero.image_url].filter(Boolean);
  const heroImage = heroImages[0] || null;
  const secondary = allArticles.filter((a) => a.slug !== hero.slug).slice(0, 3);
  const latest = allArticles.filter((a) => a.slug !== hero.slug).slice(3, 9);
  const latestTransfers = transfers.slice(0, 4);
  const clubFor = (name) => standings.find((club) => sameEntityName(club.team, name) || sameEntityName(club.shortName, name));

  return (
    <div className="page-shell home-v8">
      <section className="v8-live-strip" aria-label="En ce moment">
        <div className="v8-live-title"><span>⚡</span><strong>EN CE MOMENT</strong></div>
        <div className="v8-live-items">
          {snapshot.live ? (
            <Link href={`/match/${snapshot.live.id}`}><b>LIVE</b> {snapshot.live.home.shortName || snapshot.live.home.name} {snapshot.live.score.home ?? "-"} · {snapshot.live.score.away ?? "-"} {snapshot.live.away.shortName || snapshot.live.away.name}</Link>
          ) : snapshot.next ? (
            <Link href={`/match/${snapshot.next.id}`}><b>À VENIR</b> {snapshot.next.home.shortName || snapshot.next.home.name} - {snapshot.next.away.shortName || snapshot.next.away.name} · {formatMatchTime(snapshot.next)}</Link>
          ) : <span>Le prochain rendez-vous Ligue 1 apparaîtra ici.</span>}
          {latestTransfers[0] && <Link href="/mercato"><b>MERCATO</b> {latestTransfers[0].player_name} · {latestTransfers[0].to_club || "dossier suivi"}</Link>}
          {allArticles[0] && <Link href={`/article/${allArticles[0].slug}`}><b>ACTU</b> {allArticles[0].title}</Link>}
        </div>
        <Link href="/resultats" className="v8-live-more">Tout suivre →</Link>
      </section>

      {weekPrediction && <MatchOfTheWeek prediction={weekPrediction} match={weekMatch} stats={weekStats} homeForm={weekHomeForm} awayForm={weekAwayForm} meetings={weekMeetings} />}


      {secondary.length > 0 && (
        <section className="home-headlines" aria-label="À suivre">
          <div className="home-headlines-label">À SUIVRE</div>
          <div className="home-headlines-grid">
            {secondary.map((article) => (
              <Link href={`/article/${article.slug}`} className="home-headline" key={article.slug}>
                <div className={`home-headline-image ${article.image_url ? "has-image" : ""}`} style={article.image_url ? { backgroundImage: `url("${article.image_url}")` } : undefined}>{!article.image_url && <span>L1</span>}</div>
                <div className="home-headline-copy"><span>{article.category || "ACTUALITÉ"}</span><strong>{article.title}</strong></div><b>→</b>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="top-grid v8-top-grid">
        <div className={`hero v8-hero ${heroImage ? "has-hero-image" : ""}`}>
          <HomeHeroMedia images={heroImages} title={hero.title} />
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <span className="tag tag-yellow">À LA UNE</span>
            <span className="eyebrow">LIGUE 1 · EXPRESS</span>
            <h1>{hero.title}</h1>
            <p>{hero.excerpt}</p>
            <Link href={`/article/${hero.slug}`} className="primary-button">Lire l'article →</Link>
          </div>
        </div>

        <aside className="v8-right-rail">
          <section className="v8-standings-mini">
            <div className="v8-card-head"><div><span>CLASSEMENT</span><strong>Top 5 Ligue 1</strong></div><Link href="/classement">Voir tout →</Link></div>
            {standings.slice(0, 5).map((row) => (
              <Link href={`/club/${row.teamId}`} className="v8-standing-line" key={row.teamId}>
                <b>{row.rank}</b>
                {row.logo && <Image src={row.logo} alt="" width={26} height={26} unoptimized />}
                <span>{row.shortName || row.team}</span>
                <strong>{row.points} pts</strong>
              </Link>
            ))}
          </section>
        </aside>
      </section>



      <nav className="media-shortcuts" aria-label="Accès rapides Ligue 1">
        <Link href="/actualites" className="media-shortcut"><div><span>À LA UNE</span><strong>Dernières actualités</strong></div><b>→</b></Link>
        <Link href="/resultats" className="media-shortcut"><div><span>MATCHS</span><strong>Résultats & calendrier</strong></div><b>→</b></Link>
        <Link href="/championnats" className="media-shortcut"><div><span>FRANCE</span><strong>L1 · L2 · Ligue 3</strong></div><b>→</b></Link>
        <Link href="/stats" className="media-shortcut"><div><span>DATA</span><strong>Stats & buteurs</strong></div><b>→</b></Link>
      </nav>

      <section className="v8-data-grid">
        <div className="v8-data-card">
          <div className="v8-card-head"><div><span>STATS EXPRESS</span><strong>Top buteurs</strong></div><Link href="/stats">Toutes les stats →</Link></div>
          <div className="v8-scorers-list">
            {scorers.length ? scorers.map((player, index) => (
              <Link href={`/joueur/${player.playerId}${player.teamId ? `?club=${player.teamId}` : ""}`} className="v8-scorer" key={player.playerId || player.name}>
                <b>{index + 1}</b>{player.logo && <Image src={player.logo} alt="" width={32} height={32} unoptimized />}
                <div><strong>{player.name}</strong><span>{player.teamName}</span></div><em>{player.goals}<small>buts</small></em>
              </Link>
            )) : <p className="v8-muted">Classement des buteurs temporairement indisponible.</p>}
          </div>
        </div>

        <div className="v8-data-card">
          <div className="v8-card-head"><div><span>DYNAMIQUE</span><strong>Forme du moment</strong></div><Link href="/classement">Classement →</Link></div>
          <div className="v8-form-list">
            {formTeams.length ? formTeams.map((club, index) => (
              <Link href={`/club/${club.teamId}`} className="v8-form-team" key={club.teamId}>
                <b>{index + 1}</b>{club.logo && <Image src={club.logo} alt="" width={32} height={32} unoptimized />}
                <div><strong>{club.shortName || club.team}</strong><span>{club.formGames} derniers matchs</span></div>
                <div className="v8-form-dots">{club.form.map((result, i) => <i className={`is-${result}`} key={`${club.teamId}-${i}`}>{result}</i>)}</div>
              </Link>
            )) : <p className="v8-muted">La forme des clubs apparaîtra après les premiers matchs terminés.</p>}
          </div>
        </div>
      </section>

      {latestTransfers.length > 0 && (
        <section className="v8-mercato-strip">
          <div className="section-title"><div><span className="eyebrow section-eyebrow">TRANSFERTS</span><h2>Mercato Express</h2></div><Link href="/mercato">Ouvrir le centre Mercato →</Link></div>
          <div className="v8-transfer-grid">
            {latestTransfers.map((transfer) => {
              const toClub = clubFor(transfer.to_club);
              return (
                <Link href="/mercato" className={`v8-transfer-mini ${transfer.transfer_status || "rumour"}`} key={transfer.id}>
                  <span>{transfer.transfer_status === "official" ? "✅ OFFICIEL" : transfer.transfer_status === "advanced" ? "🔥 AVANCÉ" : "👀 RUMEUR"}</span>
                  <div>{toClub?.logo && <Image src={toClub.logo} alt="" width={38} height={38} unoptimized />}<strong>{transfer.player_name}</strong></div>
                  <p>{transfer.from_club || "Libre"} <b>→</b> {transfer.to_club || "À définir"}</p>
                  {transfer.fee && <em>{transfer.fee}</em>}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="content-section v8-news-section">
        <div className="section-title"><div><span className="eyebrow section-eyebrow">FIL INFO</span><h2>Dernières actualités</h2></div><Link href="/actualites">Voir toutes les actus →</Link></div>
        {latest.length > 0 ? <div className="cards-grid">{latest.map((a) => <ArticleCard key={a.slug} article={a} />)}</div> : <EmptyState title="La rédaction attend ton prochain article" text="Publie un deuxième article depuis l'admin : il apparaîtra ici automatiquement." href="/admin" cta="Publier un article" />}
      </section>

      <section className="editorial-grid">
        <div className="editorial-column">
          <div className="section-title"><div><span className="eyebrow section-eyebrow">TRANSFERTS</span><h2>Actus Mercato</h2></div><Link href="/mercato">Voir tout →</Link></div>
          {mercatoArticles.length > 0 ? <div className="stacked-cards">{mercatoArticles.map((a) => <ArticleCard key={a.slug} article={a} />)}</div> : <EmptyState title="Aucune info mercato publiée" text="Les articles classés Mercato remonteront automatiquement ici." href="/admin" cta="Ajouter une info mercato" />}
        </div>
        <div className="editorial-column">
          <div className="section-title"><div><span className="eyebrow section-eyebrow">DÉBRIEF & TACTIQUE</span><h2>Analyses</h2></div><Link href="/analyses">Voir tout →</Link></div>
          {analyses.length > 0 ? <div className="stacked-cards">{analyses.map((a) => <ArticleCard key={a.slug} article={a} />)}</div> : <EmptyState title="Aucune analyse publiée" text="Les articles classés Analyses apparaîtront automatiquement ici." href="/admin" cta="Publier une analyse" />}
        </div>
      </section>

      <section className="cta editorial-cta home-league-cta"><div><span className="eyebrow">TOUTE LA LIGUE 1</span><h2>Matchs, clubs, joueurs et statistiques.</h2><p>Retrouve les données essentielles du championnat et navigue directement vers les fiches détaillées.</p></div><div className="home-cta-links"><Link href="/resultats" className="primary-button">Voir les matchs →</Link><Link href="/stats" className="home-cta-secondary">Explorer les stats</Link></div></section>
    </div>
  );
}
