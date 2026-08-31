import Image from "next/image";
import Link from "next/link";
import { getFixtures } from "@/lib/football";
import { reconcileFinishedMatchScores } from "@/lib/match-score";

export const revalidate = 0;

function statusLabel(match) {
  if (match.status === "FINISHED") return "Terminé";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(match.status)) return "🔴 En direct";
  if (match.status === "POSTPONED") return "Reporté";
  if (match.status === "CANCELLED") return "Annulé";
  const date = new Date(match.utcDate);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris"
  }).format(date);
}

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const result = await getFixtures();

  if (!result.ok) {
    return <div className="page-shell listing-page"><span className="eyebrow">LIGUE 1 · V4.2</span><h1>Résultats & calendrier</h1><div className="football-setup-box"><h2>Connexion football-data.org requise</h2><p>{result.error || <>Ajoute <code>FOOTBALL_DATA_TOKEN</code> dans <code>.env.local</code>, puis redémarre.</>}</p></div></div>;
  }

  const rounds = new Map();
  result.data.forEach((match) => {
    const n = match.matchday || 0;
    if (!rounds.has(n)) rounds.set(n, []);
    rounds.get(n).push(match);
  });
  const roundNumbers = [...rounds.keys()].filter(Boolean).sort((a,b) => a-b);
  const now = Math.floor(Date.now()/1000);
  const current = roundNumbers.find((n) => rounds.get(n).some((m) => m.timestamp >= now)) || roundNumbers.at(-1) || 1;
  const requested = Number(params?.journee);
  const selected = roundNumbers.includes(requested) ? requested : current;
  const index = roundNumbers.indexOf(selected);
  const previous = index > 0 ? roundNumbers[index-1] : null;
  const next = index >= 0 && index < roundNumbers.length-1 ? roundNumbers[index+1] : null;
  const matches = await reconcileFinishedMatchScores(rounds.get(selected) || []);

  return (
    <div className="page-shell listing-page">
      <span className="eyebrow">LIGUE 1 · DONNÉES LIVE</span>
      <h1>Résultats & calendrier</h1>
      <div className="round-nav">
        {previous ? <Link href={`/resultats?journee=${previous}`}>← Journée {previous}</Link> : <span />}
        <strong>Journée {selected}</strong>
        {next ? <Link href={`/resultats?journee=${next}`}>Journée {next} →</Link> : <span />}
      </div>
      <section className="round-block">
        <div className="results-page results-page-v4">
          {matches.map((m) => (
            <Link href={`/match/${m.id}`} className="match-card match-card-v4 match-card-link" key={m.id}>
              <span className="match-team home">{m.home.logo && <Image src={m.home.logo} alt="" width={34} height={34} unoptimized />}<strong>{m.home.name}</strong></span>
              <div className="match-center">{m.score.home !== null && m.score.away !== null ? <b>{m.score.home} - {m.score.away}</b> : <b>vs</b>}<small>{statusLabel(m)}</small></div>
              <span className="match-team away"><strong>{m.away.name}</strong>{m.away.logo && <Image src={m.away.logo} alt="" width={34} height={34} unoptimized />}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
