import Link from "next/link";
import { CHAMPIONSHIPS } from "@/lib/championships";

export const metadata = {
  title: "Championnats",
  description: "Ligue 1, Ligue 2 et Ligue 3 : classements, matchs et informations essentielles."
};

export default function ChampionshipsPage() {
  const championships = Object.values(CHAMPIONSHIPS);

  return (
    <div className="page-shell listing-page championships-index">
      <span className="eyebrow">FOOTBALL FRANÇAIS</span>
      <h1>Championnats</h1>
      <p className="championships-intro">Choisis une compétition pour retrouver son classement, ses derniers résultats et ses prochains matchs.</p>

      <div className="championship-card-grid">
        {championships.map((champ) => (
          <Link href={`/championnats/${champ.slug}`} className="championship-card" key={champ.slug}>
            <div className="championship-card-badge">{champ.shortName}</div>
            <div>
              <span>{champ.level}</span>
              <h2>{champ.name}</h2>
              {champ.subtitle && <p>{champ.subtitle}</p>}
            </div>
            <b>→</b>
          </Link>
        ))}
      </div>
    </div>
  );
}
