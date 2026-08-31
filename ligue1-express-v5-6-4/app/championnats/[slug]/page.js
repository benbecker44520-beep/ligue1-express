import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CHAMPIONSHIPS, getChampionshipConfig, getChampionshipSnapshot, normalizeChampionshipSlug } from "@/lib/championships";

export const revalidate = 0;

function formatMatchDate(match) {
  if (!match.utcDate) return "Horaire à confirmer";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(match.utcDate));
}

function MatchLine({ match }) {
  const hasScore = match.score?.home !== null && match.score?.away !== null;
  const isLive = match.status === "IN_PLAY";
  return (
    <div className="champ-match-row">
      <div className="champ-match-team home">{match.home?.logo && <Image src={match.home.logo} alt="" width={25} height={25} unoptimized />}<span>{match.home?.shortName || match.home?.name}</span></div>
      <div className="champ-match-center"><strong>{hasScore ? `${match.score.home} - ${match.score.away}` : "vs"}</strong><small>{isLive ? "● En direct" : formatMatchDate(match)}</small></div>
      <div className="champ-match-team away"><span>{match.away?.shortName || match.away?.name}</span>{match.away?.logo && <Image src={match.away.logo} alt="" width={25} height={25} unoptimized />}</div>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { slug } = await params; const config = getChampionshipConfig(slug);
  if (!config) return { title: "Championnat introuvable", robots: { index: false } };
  return { title: config.name, description: `${config.name} : classement complet, statistiques, résultats, calendrier et meilleurs buteurs sur Ligue 1 Express.`, alternates: { canonical: `/championnats/${config.slug}` } };
}

export default async function ChampionshipPage({ params }) {
  const { slug } = await params; if (slug === "national") redirect("/championnats/ligue-3");
  const normalizedSlug = normalizeChampionshipSlug(slug); const config = getChampionshipConfig(normalizedSlug); if (!config) notFound();
  const result = await getChampionshipSnapshot(normalizedSlug);

  return (
    <div className="page-shell listing-page championship-page">
      <nav className="championship-tabs" aria-label="Choisir un championnat">
        {Object.values(CHAMPIONSHIPS).map((champ) => <Link key={champ.slug} href={`/championnats/${champ.slug}`} className={champ.slug === normalizedSlug ? "active" : ""}>{champ.name}</Link>)}
      </nav>

      <span className="eyebrow">{config.level.toUpperCase()} · {result.ok ? `SAISON ${result.season}` : "DONNÉES"}</span>
      <div className="championship-title-row"><div><h1>{config.name}</h1>{config.subtitle && <p>{config.subtitle}</p>}</div><div className="championship-brand-mark">{config.shortName}</div></div>

      {!result.ok ? <div className="football-setup-box"><h2>Données temporairement indisponibles</h2><p>{result.error}</p></div> : <>
        {result.note && <div className={`championship-data-note ${result.limited ? "is-warning" : ""}`}>ℹ️ {result.note}</div>}
        <div className="championship-source-line"><span>Actualisation automatique</span><b>Source : {result.source}</b></div>

        {result.metrics && <section className="champ-metrics-grid">
          <div><span>LEADER</span><strong>{result.metrics.leader?.shortName || result.metrics.leader?.team || "—"}</strong><small>{result.metrics.leader?.points ?? 0} pts</small></div>
          <div><span>MEILLEURE ATTAQUE</span><strong>{result.metrics.bestAttack?.shortName || result.metrics.bestAttack?.team || "—"}</strong><small>{result.metrics.bestAttack?.goalsFor ?? 0} buts</small></div>
          <div><span>MEILLEURE DÉFENSE</span><strong>{result.metrics.bestDefense?.shortName || result.metrics.bestDefense?.team || "—"}</strong><small>{result.metrics.bestDefense?.goalsAgainst ?? 0} encaissés</small></div>
          <div><span>MOYENNE DE BUTS</span><strong>{result.metrics.goalAverage}</strong><small>par match</small></div>
        </section>}

        <div className="championship-dashboard championship-dashboard-wide">
          <section className="championship-panel championship-table-panel">
            <div className="panel-heading"><h2>{result.limited ? "Aperçu du classement" : "Classement complet"}</h2><span>{result.standings.length ? `${result.standings.length} / ${config.teamCount} équipes` : "Indisponible"}</span></div>
            {result.standings.length ? <div className="championship-table champ-full-table">
              <div className="champ-table-row champ-table-row-full head"><span>#</span><span>Équipe</span><span>J</span><span>G</span><span>N</span><span>P</span><span>BP</span><span>BC</span><span>Diff</span><span>Pts</span><span>Forme</span></div>
              {result.standings.map((row) => <div className={`champ-table-row champ-table-row-full ${row.rank <= 2 ? "zone-promotion" : row.rank >= config.teamCount - 2 ? "zone-relegation" : ""}`} key={`${row.teamId}-${row.rank}`}>
                <strong>{row.rank}</strong>
                <div className="champ-table-team">{row.logo && <Image src={row.logo} alt="" width={26} height={26} unoptimized />}{normalizedSlug === "ligue-1" && row.teamId ? <Link href={`/club/${row.teamId}`}>{row.shortName || row.team}</Link> : <span>{row.shortName || row.team}</span>}</div>
                <span>{row.played}</span><span>{row.win}</span><span>{row.draw}</span><span>{row.lose}</span><span>{row.goalsFor}</span><span>{row.goalsAgainst}</span><span>{row.diff > 0 ? `+${row.diff}` : row.diff}</span><b>{row.points}</b><div className="champ-form">{(row.form || []).map((f, i) => <i className={`form-${f.toLowerCase()}`} key={`${row.teamId}-form-${i}`}>{f}</i>)}</div>
              </div>)}
            </div> : <div className="champ-empty">Classement indisponible pour le moment.</div>}<div className="champ-zone-legend"><span className="promotion-dot" /> Montée directe <span className="relegation-dot" /> Relégation</div>
          </section>

          <div className="championship-side-stack">
            <section className="championship-panel"><div className="panel-heading"><h2>Derniers résultats</h2></div>{result.recent.length ? result.recent.slice(0, 6).map((m) => <MatchLine key={`r-${m.id}`} match={m} />) : <div className="champ-empty">Aucun résultat terminé disponible.</div>}</section>
            <section className="championship-panel"><div className="panel-heading"><h2>Prochains matchs</h2></div>{result.upcoming.length ? result.upcoming.slice(0, 6).map((m) => <MatchLine key={`u-${m.id}`} match={m} />) : <div className="champ-empty">Aucun match à venir disponible.</div>}</section>
          </div>
        </div>

        {result.scorers.length > 0 && <section className="championship-panel championship-scorers">
          <div className="panel-heading"><h2>Meilleurs buteurs</h2>{normalizedSlug === "ligue-1" && <Link href="/stats">Toutes les stats →</Link>}</div>
          <div className="champ-scorer-grid">{result.scorers.slice(0, 10).map((player, index) => <div className="champ-scorer" key={`${player.playerId}-${index}`}><b>{index + 1}</b><div><strong>{player.name}</strong><span>{player.teamName}</span></div><strong>{player.goals} buts</strong></div>)}</div>
        </section>}
      </>}
    </div>
  );
}
