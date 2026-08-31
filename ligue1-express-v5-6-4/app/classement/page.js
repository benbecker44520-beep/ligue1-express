import Image from "next/image";
import Link from "next/link";
import { getStandings } from "@/lib/football";

export const revalidate = 0;

export default async function Page() {
  const result = await getStandings();

  if (!result.ok) {
    return (
      <div className="page-shell listing-page">
        <span className="eyebrow">LIGUE 1 · V4.1</span>
        <h1>Classement</h1>
        <div className="football-setup-box">
          <h2>Connexion football-data.org requise</h2>
          <p>{result.error || <>Ajoute <code>FOOTBALL_DATA_TOKEN</code> dans <code>.env.local</code>, puis redémarre.</>}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell listing-page">
      <span className="eyebrow">SAISON {result.season || "ACTUELLE"}</span>
      <h1>Classement Ligue 1</h1>

      <div className="league-table-v4">
        <div className="league-row-v4 league-head-v4">
          <span>#</span><span>Équipe</span><span>J</span><span>G</span><span>N</span><span>P</span><span>Diff</span><span>Pts</span>
        </div>

        {result.data.map((r) => (
          <div className="league-row-v4" key={r.rank}>
            <strong>{r.rank}</strong>
            <Link href={`/club/${r.teamId}`} className="league-team-v4 league-team-link">
              {r.logo && <Image src={r.logo} alt="" width={30} height={30} unoptimized />}
              <strong>{r.team}</strong>
            </Link>
            <span>{r.played}</span>
            <span>{r.win}</span>
            <span>{r.draw}</span>
            <span>{r.lose}</span>
            <span>{r.diff > 0 ? `+${r.diff}` : r.diff}</span>
            <b>{r.points}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
