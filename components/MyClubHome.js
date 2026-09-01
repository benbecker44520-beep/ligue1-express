"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "ligue1-express-my-club-v1";

function formatDate(date) {
  if (!date) return "Horaire à confirmer";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(date));
}

function MatchMini({ match, label }) {
  if (!match) return <div className="my-club-match is-empty"><span>{label}</span><strong>À venir</strong><p>Les données apparaîtront automatiquement.</p></div>;
  const hasScore = match.score?.home != null && match.score?.away != null;
  return <Link href={match.href} className="my-club-match">
    <span>{label}</span>
    <div className="my-club-match-row"><b>{match.home?.name}</b><strong>{hasScore ? `${match.score.home} – ${match.score.away}` : "VS"}</strong><b>{match.away?.name}</b></div>
    <p>{formatDate(match.utcDate)}</p>
  </Link>;
}

export default function MyClubHome() {
  const [favorite, setFavorite] = useState(null);
  const [details, setDetails] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [clubLoading, setClubLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorite(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!favorite) { setDetails(null); return; }
    let cancelled = false;
    setClubLoading(true);
    const params = new URLSearchParams({ league: favorite.league, teamId: String(favorite.teamId || ""), team: favorite.team || "" });
    fetch(`/api/my-club?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.ok) setDetails(json); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setClubLoading(false); });
    return () => { cancelled = true; };
  }, [favorite]);

  async function openPicker() {
    setOpen(true);
    if (leagues.length) return;
    setLoading(true);
    try {
      const response = await fetch("/api/my-club?mode=clubs", { cache: "no-store" });
      const json = await response.json();
      if (json.ok) setLeagues(json.leagues || []);
    } finally { setLoading(false); }
  }

  function selectClub(club) {
    const value = { teamId: club.teamId, team: club.team, shortName: club.shortName, logo: club.logo, league: club.league, leagueName: club.leagueName };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setFavorite(value);
    setOpen(false);
    setSearch("");
  }

  const filteredLeagues = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return leagues;
    return leagues.map((league) => ({ ...league, clubs: league.clubs.filter((club) => `${club.team} ${club.shortName}`.toLowerCase().includes(needle)) })).filter((league) => league.clubs.length);
  }, [leagues, search]);

  return <>
    <section className={`my-club-home ${favorite ? "has-club" : "is-onboarding"}`}>
      {!favorite ? <>
        <div className="my-club-star">★</div>
        <div className="my-club-intro"><span>MON ESPACE SUPPORTER</span><h2>Ton club. Tes infos. En un coup d'œil.</h2><p>Choisis ton équipe préférée et retrouve automatiquement ses résultats, son prochain match, son classement, ses actus et son mercato.</p></div>
        <button type="button" className="my-club-pick-button" onClick={openPicker}>Choisir mon club →</button>
      </> : <>
        <div className="my-club-main">
          <div className="my-club-identity">
            <div className="my-club-logo">{favorite.logo ? <img src={favorite.logo} alt="" /> : <span>⚽</span>}</div>
            <div><span>★ MON CLUB · {favorite.leagueName}</span><h2>{details?.club?.shortName || favorite.shortName || favorite.team}</h2><p>{details?.club ? `${details.club.rank}e · ${details.club.points} pts · ${details.club.played ?? "–"} matchs` : clubLoading ? "Chargement de ton espace supporter…" : "Ton club préféré"}</p></div>
          </div>
          <div className="my-club-actions">{details?.club?.href && <Link href={details.club.href}>Voir la fiche club →</Link>}<button type="button" onClick={openPicker}>Changer</button></div>
        </div>
        {details?.club && <>
          <div className="my-club-kpis"><div><span>CLASSEMENT</span><strong>{details.club.rank}<small>e</small></strong></div><div><span>POINTS</span><strong>{details.club.points}</strong></div><div><span>VICTOIRES</span><strong>{details.club.win ?? "–"}</strong></div><div><span>FORME</span><div className="my-club-form">{details.club.form?.length ? details.club.form.map((r, i) => <i className={`is-${r}`} key={`${r}-${i}`}>{r}</i>) : <em>—</em>}</div></div></div>
          <div className="my-club-content-grid">
            <MatchMini match={details.latest} label="DERNIER RÉSULTAT" />
            <MatchMini match={details.next} label="PROCHAIN MATCH" />
            <div className="my-club-feed">
              <span>ACTU & MERCATO</span>
              {details.articles?.[0] ? <Link href={`/article/${details.articles[0].slug}`}><b>{details.articles[0].category}</b><strong>{details.articles[0].title}</strong></Link> : details.transfers?.[0] ? <Link href="/mercato"><b>MERCATO</b><strong>{details.transfers[0].player_name} · {details.transfers[0].from_club || "Libre"} → {details.transfers[0].to_club || "À définir"}</strong></Link> : <p>Les prochaines informations liées à ton club apparaîtront ici.</p>}
            </div>
          </div>
        </>}
      </>}
    </section>

    {open && <div className="my-club-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="my-club-modal" role="dialog" aria-modal="true" aria-labelledby="my-club-title">
        <div className="my-club-modal-head"><div><span>★ PERSONNALISE LIGUE 1 EXPRESS</span><h2 id="my-club-title">Quel club supportes-tu ?</h2><p>Ton choix reste uniquement enregistré dans ton navigateur.</p></div><button type="button" aria-label="Fermer" onClick={() => setOpen(false)}>×</button></div>
        <input className="my-club-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un club…" autoFocus />
        <div className="my-club-picker-list">
          {loading ? <div className="my-club-picker-empty">Chargement des clubs…</div> : filteredLeagues.length ? filteredLeagues.map((league) => <section key={league.slug}><h3>{league.name}</h3><div className="my-club-picker-grid">{league.clubs.map((club) => <button type="button" key={`${league.slug}-${club.teamId || club.team}`} onClick={() => selectClub(club)}><span>{club.logo ? <img src={club.logo} alt="" /> : "⚽"}</span><div><strong>{club.shortName || club.team}</strong><small>{club.rank ? `${club.rank}e · ${club.points} pts` : league.name}</small></div><b>→</b></button>)}</div></section>) : <div className="my-club-picker-empty">Aucun club trouvé.</div>}
        </div>
      </div>
    </div>}
  </>;
}
