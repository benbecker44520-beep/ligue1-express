import Image from "next/image";
import Link from "next/link";
import LiveAutoRefresh from "@/components/LiveAutoRefresh";
import { getFrenchLiveMatches } from "@/lib/apifootball";
import { getFixtures } from "@/lib/football";
import { getEspnCupLiveMatches } from "@/lib/espn";
import FollowMatchButton from "@/components/FollowMatchButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "LIVE — Scores en direct" };

const LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED", "LIVE"]);

function fallbackStatusLabel(status) {
  if (status === "PAUSED") return "MI-TEMPS";
  if (LIVE_STATUSES.has(status)) return "EN DIRECT";
  return status || "LIVE";
}

function LiveCard({ match, league, href }) {
  const label = match.statusText || fallbackStatusLabel(match.status);
  return (
    <article className="live-v82-match">
      <Link className="live-v82-match-link" href={href}>
        <div className="live-v82-match-head">
          <span className="live-v82-pulse"><i /> {label}</span>
          <span>{league}</span>
        </div>
        <div className="live-v82-team">
          {match.home.logo ? <Image src={match.home.logo} width={34} height={34} alt="" /> : <span className="live-v82-logo-fallback">⚽</span>}
          <strong>{match.home.shortName || match.home.name}</strong>
          <b>{match.score?.home ?? "-"}</b>
        </div>
        <div className="live-v82-team">
          {match.away.logo ? <Image src={match.away.logo} width={34} height={34} alt="" /> : <span className="live-v82-logo-fallback">⚽</span>}
          <strong>{match.away.shortName || match.away.name}</strong>
          <b>{match.score?.away ?? "-"}</b>
        </div>
        <div className="live-v82-open">Ouvrir le Centre Match →</div>
      </Link>
      {match.provider === "apifootball" && <FollowMatchButton compact match={{ ...match, href, leagueName:league }} />}
    </article>
  );
}

function LeagueStatus({ number, name, source, active, note }) {
  return (
    <div className={`live-v82-league ${active ? "is-active" : ""}`}>
      <b>{number}</b>
      <div><strong>{name}</strong><span>{note} · {source}</span></div>
      <em>{active ? "ACTIF" : "SECOURS"}</em>
    </div>
  );
}

export default async function LivePage() {
  const [apiResult, espnCupLive] = await Promise.all([
    getFrenchLiveMatches(),
    getEspnCupLiveMatches().catch(() => [])
  ]);
  let matches = apiResult.ok ? apiResult.data : [];
  const hasApiCup = matches.some((m) => m.leagueId === "165");
  if (!hasApiCup && espnCupLive.length) matches = [...matches, ...espnCupLive];
  let l1Fallback = false;

  // Sécurité de continuité : si APIfootball est momentanément indisponible,
  // la Ligue 1 conserve le flux football-data.org déjà validé en V8.2.
  if (!apiResult.ok) {
    const footballData = await getFixtures().catch(() => null);
    const fallbackMatches = footballData?.ok
      ? (footballData.data || []).filter((match) => LIVE_STATUSES.has(match.status)).map((match) => ({ ...match, provider: "football-data" }))
      : [];
    matches = fallbackMatches;
    l1Fallback = true;
  }

  const groups = [
    { id: "168", name: "Ligue 1", matches: matches.filter((m) => m.leagueId === "168" || (m.provider === "football-data" && !m.leagueId)) },
    { id: "164", name: "Ligue 2", matches: matches.filter((m) => m.leagueId === "164") },
    { id: "167", name: "National", matches: matches.filter((m) => m.leagueId === "167") },
    { id: "165", name: "Coupe de France", matches: matches.filter((m) => m.leagueId === "165") }
  ];
  const total = groups.reduce((sum, group) => sum + group.matches.length, 0);

  return (
    <div className="container live-v82-page">
      <LiveAutoRefresh seconds={60} />

      <section className="live-v82-hero">
        <div>
          <p className="eyebrow">LIGUE 1 EXPRESS · TEMPS RÉEL</p>
          <h1><span>LIVE</span> Scores en direct</h1>
          <p>Suivez la Ligue 1, la Ligue 2, le National et la Coupe de France. Les scores sont actualisés automatiquement toutes les 60 secondes.</p>
        </div>
        <div className={`live-v82-counter ${total ? "is-live" : ""}`}>
          <i />
          <strong>{total}</strong>
          <span>match{total > 1 ? "s" : ""} en direct</span>
        </div>
      </section>

      {total > 0 ? (
        <div className="live-v83-sections">
          {groups.filter((group) => group.matches.length).map((group) => (
            <section className="live-v83-section" key={group.id}>
              <div className="live-v83-section-head"><h2>{group.name}</h2><span>{group.matches.length} LIVE</span></div>
              <div className="live-v82-grid">
                {group.matches.map((match) => (
                  <LiveCard
                    key={`${group.id}-${match.id}`}
                    match={match}
                    league={group.name}
                    href={match.provider === "apifootball" ? `/live/match/${match.id}` : match.provider === "espn" ? "/championnats/coupe-de-france" : `/match/${match.id}`}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="live-v82-empty">
          <div className="live-v82-ball">⚽</div>
          <h2>Aucun match en direct actuellement</h2>
          <p>La page se rafraîchit automatiquement. Dès qu'un match de Ligue 1, Ligue 2, National ou Coupe de France démarre, son score apparaît ici.</p>
          <Link href="/resultats">Voir les résultats et prochains matchs →</Link>
        </section>
      )}

      {!apiResult.ok && (
        <div className="live-v83-source-note">
          APIfootball est momentanément indisponible. La Ligue 1 utilise automatiquement le flux de secours football-data.org.
        </div>
      )}

      <section className="live-v82-leagues">
        <LeagueStatus number="01" name="Ligue 1" source={l1Fallback ? "football-data.org" : "APIfootball"} active note={l1Fallback ? "Live activé en secours" : "Scores live activés"} />
        <LeagueStatus number="02" name="Ligue 2" source="APIfootball" active={apiResult.ok} note={apiResult.ok ? "Scores live activés" : "En attente du flux principal"} />
        <LeagueStatus number="03" name="National" source="APIfootball" active={apiResult.ok} note={apiResult.ok ? "Scores live activés" : "En attente du flux principal"} />
        <LeagueStatus number="04" name="Coupe de France" source={hasApiCup ? "APIfootball" : "ESPN"} active note="Scores live activés" />
      </section>
    </div>
  );
}
