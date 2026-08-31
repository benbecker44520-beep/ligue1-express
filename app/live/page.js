import Image from "next/image";
import Link from "next/link";
import LiveAutoRefresh from "@/components/LiveAutoRefresh";
import { getFixtures } from "@/lib/football";
import { getChampionshipSnapshot } from "@/lib/championships";
import { secondaryMatchHref } from "@/lib/futpythontrader";

export const dynamic = "force-dynamic";
export const metadata = { title: "LIVE — Scores en direct" };

const LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED", "LIVE"]);

function statusLabel(status) {
  if (status === "PAUSED") return "MI-TEMPS";
  if (LIVE_STATUSES.has(status)) return "EN DIRECT";
  return status || "LIVE";
}

function LiveCard({ match, league, href }) {
  return (
    <Link className="live-v82-match" href={href}>
      <div className="live-v82-match-head">
        <span className="live-v82-pulse"><i /> {statusLabel(match.status)}</span>
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
  );
}

export default async function LivePage() {
  const [l1Result, l2Result, l3Result] = await Promise.allSettled([
    getFixtures(),
    getChampionshipSnapshot("ligue-2"),
    getChampionshipSnapshot("ligue-3")
  ]);

  const l1 = l1Result.status === "fulfilled" && l1Result.value?.ok
    ? (l1Result.value.data || []).filter((m) => LIVE_STATUSES.has(m.status))
    : [];

  // FutPythonTrader est actuellement notre source L2/L3, mais son CSV n'est pas un flux live.
  // On n'invente donc jamais un score en direct : ces ligues seront activées automatiquement
  // ici dès qu'une vraie source live sera branchée et renverra un statut LIVE/IN_PLAY/PAUSED.
  const secondary = [
    ["Ligue 2", "ligue-2", l2Result],
    ["Ligue 3", "ligue-3", l3Result]
  ].flatMap(([name, slug, result]) => {
    if (result.status !== "fulfilled" || !result.value?.ok) return [];
    return (result.value.matches || []).filter((m) => LIVE_STATUSES.has(m.status)).map((m) => ({ match: m, league: name, slug }));
  });

  const total = l1.length + secondary.length;

  return (
    <div className="container live-v82-page">
      <LiveAutoRefresh seconds={60} />

      <section className="live-v82-hero">
        <div>
          <p className="eyebrow">LIGUE 1 EXPRESS · TEMPS RÉEL</p>
          <h1><span>LIVE</span> Scores en direct</h1>
          <p>Suivez les matchs du football français. Les scores Ligue 1 sont actualisés automatiquement toutes les 60 secondes.</p>
        </div>
        <div className={`live-v82-counter ${total ? "is-live" : ""}`}>
          <i />
          <strong>{total}</strong>
          <span>match{total > 1 ? "s" : ""} en direct</span>
        </div>
      </section>

      {total > 0 ? (
        <section className="live-v82-grid">
          {l1.map((match) => <LiveCard key={`l1-${match.id}`} match={match} league="Ligue 1" href={`/match/${match.id}`} />)}
          {secondary.map(({ match, league, slug }) => <LiveCard key={`${slug}-${match.id}`} match={match} league={league} href={secondaryMatchHref(slug, match.id)} />)}
        </section>
      ) : (
        <section className="live-v82-empty">
          <div className="live-v82-ball">⚽</div>
          <h2>Aucun match en direct actuellement</h2>
          <p>La page se rafraîchit automatiquement. Dès qu'un match Ligue 1 passe en direct, son score apparaît ici.</p>
          <Link href="/resultats">Voir les résultats et prochains matchs →</Link>
        </section>
      )}

      <section className="live-v82-leagues">
        <div className="live-v82-league is-active"><b>01</b><div><strong>Ligue 1</strong><span>Scores live activés · football-data.org</span></div><em>ACTIF</em></div>
        <div className="live-v82-league"><b>02</b><div><strong>Ligue 2</strong><span>Calendrier disponible · source live à connecter</span></div><em>BIENTÔT</em></div>
        <div className="live-v82-league"><b>03</b><div><strong>Ligue 3</strong><span>Calendrier disponible · source live à connecter</span></div><em>BIENTÔT</em></div>
      </section>
    </div>
  );
}
