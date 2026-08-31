import Link from "next/link";
import Image from "next/image";
import { getHomeSnapshot, getStandings } from "@/lib/football";
import { reconcileFinishedMatchScores } from "@/lib/match-score";

function MatchScore({ match }) {
  const hasScore = match.score.home !== null && match.score.away !== null;
  const date = match.utcDate ? new Date(match.utcDate) : null;
  const time = date ? new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris"
  }).format(date) : "--:--";

  return (
    <Link href={`/match/${match.id}`} className="score-row score-row-v4 score-row-link" aria-label={`Voir ${match.home.name} - ${match.away.name}`}>
      <span className="mini-team">
        {match.home.logo && <Image src={match.home.logo} alt="" width={24} height={24} unoptimized />}
        <span>{match.home.shortName || match.home.name}</span>
      </span>

      <strong>{hasScore ? `${match.score.home} - ${match.score.away}` : time}</strong>

      <span className="mini-team mini-team-away">
        <span>{match.away.shortName || match.away.name}</span>
        {match.away.logo && <Image src={match.away.logo} alt="" width={24} height={24} unoptimized />}
      </span>
    </Link>
  );
}

export async function ResultsPanel() {
  const snapshot = await getHomeSnapshot();
  if (snapshot.ok) {
    const reconciled = await reconcileFinishedMatchScores([
      snapshot.data.latest,
      snapshot.data.live,
      snapshot.data.next
    ]);
    const [latest, live, next] = reconciled;
    snapshot.data = { latest: latest || null, live: live || null, next: next || null };
  }

  return (
    <section className="side-panel">
      <div className="panel-heading">
        <h2>Matchs Ligue 1</h2>
        <Link href="/resultats">Calendrier</Link>
      </div>

      {!snapshot.ok ? (
        <div className="football-setup-mini">
          <strong>Données Ligue 1 à connecter</strong>
          <span>{snapshot.error || "Ajoute FOOTBALL_DATA_TOKEN dans .env.local."}</span>
        </div>
      ) : (
        <div className="home-match-stack">
          {snapshot.data.live ? (
            <div className="home-match-block live-block">
              <span className="home-match-label">🔴 EN DIRECT</span>
              <MatchScore match={snapshot.data.live} />
            </div>
          ) : snapshot.data.latest ? (
            <div className="home-match-block">
              <span className="home-match-label">DERNIER RÉSULTAT</span>
              <MatchScore match={snapshot.data.latest} />
            </div>
          ) : null}

          {snapshot.data.next && (
            <div className="home-match-block">
              <span className="home-match-label">PROCHAIN MATCH</span>
              <MatchScore match={snapshot.data.next} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export async function StandingsPanel() {
  const standings = await getStandings();

  return (
    <section className="side-panel">
      <div className="panel-heading">
        <h2>Classement</h2>
        <Link href="/classement">Voir tout</Link>
      </div>

      {!standings.ok ? (
        <div className="football-setup-mini">
          <strong>Classement à connecter</strong>
          <span>{standings.error || "Ajoute FOOTBALL_DATA_TOKEN dans .env.local."}</span>
        </div>
      ) : (
        <>
          <div className="table-head">
            <span>#</span><span>Équipe</span><span>Pts</span>
          </div>

          {standings.data.slice(0, 5).map((row) => (
            <div className="standing-row standing-row-v4" key={row.rank}>
              <span>{row.rank}</span>
              <Link href={`/club/${row.teamId}`} className="standing-team standing-team-link">
                {row.logo && <Image src={row.logo} alt="" width={23} height={23} unoptimized />}
                <span>{row.shortName || row.team}</span>
              </Link>
              <b>{row.points}</b>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
