import Image from "next/image";
import Link from "next/link";
import LiveAutoRefresh from "@/components/LiveAutoRefresh";
import { getFrenchLiveMatches } from "@/lib/free-football";
import { getFixtures } from "@/lib/football";
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
      {match.provider === "espn-free" && <FollowMatchButton compact match={{ ...match, href, leagueName: league }} />}
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
  const freeResult = await getFrenchLiveMatches();
  let matches = freeResult.ok ? freeResult.data : [];
  let l1Fallback = false;

  const hasEspnL1 = matches.some((match) => match.league?.slug === "ligue-1");
  if (!freeResult.ok || !hasEspnL1) {
    const footballData = await getFixtures().catch(() => null);
    const fallbackMatches = footballData?.ok
      ? (footballData.data || []).filter((match) => LIVE_STATUSES.has(match.status)).map((match) => ({ ...match, provider: "football-data" }))
      : [];
    if (fallbackMatches.length) {
      matches = [...matches, ...fallbackMatches];
      l1Fallback = true;
    } else if (!freeResult.ok) {
      l1Fallback = true;
    }
  }

  const groups = [
    { id: "l1", slug: "ligue-1", name: "Ligue 1" },
    { id: "l2", slug: "ligue-2", name: "Ligue 2" },
    { id: "l3", slug: "ligue-3", name: "Ligue 3" },
    { id: "cdf", slug: "coupe-de-france", name: "Coupe de France" },
    { id: "ldc", slug: "ligue-des-champions", name: "Ligue des champions" },
    { id: "uel", slug: "europa-league", name: "Europa League" },
    { id: "uecl", slug: "conference-league", name: "Conference League" }
  ].map((group) => ({
    ...group,
    matches: matches.filter((match) => match.league?.slug === group.slug || (group.slug === "ligue-1" && match.provider === "football-data" && !match.league?.slug))
  }));

  const total = groups.reduce((sum, group) => sum + group.matches.length, 0);
  const europeanLive = groups.slice(4).reduce((sum, group) => sum + group.matches.length, 0);

  return (
    <div className="container live-v82-page">
      <LiveAutoRefresh seconds={60} />

      <section className="live-v82-hero">
        <div>
          <p className="eyebrow">FOOT FRANÇAIS EXPRESS · TEMPS RÉEL</p>
          <h1><span>LIVE</span> Scores en direct</h1>
          <p>Suivez le football français et, en Europe, uniquement les matchs des clubs français. Le flux LIVE fonctionne désormais avec des sources gratuites et se rafraîchit automatiquement.</p>
        </div>
        <div className={`live-v82-counter ${total ? "is-live" : ""}`}><i /><strong>{total}</strong><span>match{total > 1 ? "s" : ""} en direct</span></div>
      </section>

      {total > 0 ? (
        <div className="live-v83-sections">
          {groups.filter((group) => group.matches.length).map((group) => (
            <section className="live-v83-section" key={group.id}>
              <div className="live-v83-section-head"><h2>{group.name}</h2><span>{group.matches.length} LIVE</span></div>
              <div className="live-v82-grid">
                {group.matches.map((match) => {
                  const href = match.provider === "espn-free" ? `/live/match/${encodeURIComponent(match.id)}` : `/match/${match.id}`;
                  return <LiveCard key={`${group.id}-${match.id}`} match={match} league={group.name} href={href} />;
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="live-v82-empty">
          <div className="live-v82-ball">⚽</div><h2>Aucun match en direct actuellement</h2>
          <p>La page se rafraîchit automatiquement. Les matchs européens apparaissent uniquement lorsqu'un club français est concerné.</p>
          <Link href="/resultats">Voir les résultats et prochains matchs →</Link>
        </section>
      )}

      {l1Fallback && <div className="live-v83-source-note">La Ligue 1 utilise football-data.org en secours lorsque le flux ESPN gratuit ne fournit pas le match en direct.</div>}

      <section className="live-v82-leagues">
        <LeagueStatus number="01" name="Ligue 1" source={l1Fallback ? "football-data.org" : "ESPN"} active note={l1Fallback ? "Live activé en secours" : "Scores live gratuits"} />
        <LeagueStatus number="02" name="Ligue 2" source="ESPN" active={freeResult.ok} note="Flux gratuit" />
        <LeagueStatus number="03" name="Ligue 3" source="ESPN / sources gratuites" active={freeResult.ok} note="Selon disponibilité du flux" />
        <LeagueStatus number="04" name="Coupe de France" source="ESPN" active={freeResult.ok} note="Scores live gratuits" />
        <LeagueStatus number="05" name="Coupes d'Europe" source="ESPN" active={freeResult.ok} note={europeanLive ? `${europeanLive} match(s) français en direct` : "Clubs français uniquement"} />
      </section>
    </div>
  );
}
