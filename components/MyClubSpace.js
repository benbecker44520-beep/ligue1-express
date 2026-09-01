"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ligue1-express-my-club-v1";

function formatDate(date) {
  if (!date) return "Horaire à confirmer";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(date));
}

function MatchCard({ match, label }) {
  if (!match) return <div className="club-space-match is-empty"><span>{label}</span><strong>À venir</strong><p>Les données apparaîtront automatiquement.</p></div>;
  const hasScore = match.score?.home != null && match.score?.away != null;
  return <Link href={match.href} className="club-space-match">
    <span>{label}</span>
    <div className="club-space-match-teams"><strong>{match.home?.name}</strong><b>{hasScore ? `${match.score.home} – ${match.score.away}` : "VS"}</b><strong>{match.away?.name}</strong></div>
    <p>{formatDate(match.utcDate)}</p>
  </Link>;
}

export default function MyClubSpace() {
  const [favorite, setFavorite] = useState(null);
  const [details, setDetails] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) setFavorite(JSON.parse(raw)); } catch {} }, []);
  useEffect(() => {
    if (!favorite) { setDetails(null); return; }
    const params = new URLSearchParams({ league: favorite.league, teamId: String(favorite.teamId || ""), team: favorite.team || "" });
    fetch(`/api/my-club?${params.toString()}`, { cache: "no-store" }).then(r => r.json()).then(json => { if (json.ok) setDetails(json); }).catch(() => {});
  }, [favorite]);

  async function openPicker() {
    setPicker(true);
    if (leagues.length) return;
    setLoading(true);
    try { const json = await fetch("/api/my-club?mode=clubs", { cache: "no-store" }).then(r => r.json()); if (json.ok) setLeagues(json.leagues || []); } finally { setLoading(false); }
  }
  function selectClub(club) {
    const value = { teamId: club.teamId, team: club.team, shortName: club.shortName, logo: club.logo, league: club.league, leagueName: club.leagueName };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); setFavorite(value); setPicker(false); setSearch("");
  }
  const filtered = useMemo(() => { const n = search.trim().toLowerCase(); if (!n) return leagues; return leagues.map(l => ({...l, clubs:l.clubs.filter(c => `${c.team} ${c.shortName}`.toLowerCase().includes(n))})).filter(l => l.clubs.length); }, [leagues, search]);

  if (!favorite) return <section className="club-space-onboarding">
    <span>★ MON CLUB</span><h1>Ton football, rien qu'à toi.</h1><p>Choisis ton club préféré pour créer un espace personnalisé avec matchs, classement, Fil Express, actualités, mercato et alertes.</p><button onClick={openPicker}>Choisir mon club →</button>{picker && <Picker leagues={filtered} loading={loading} search={search} setSearch={setSearch} selectClub={selectClub} close={() => setPicker(false)} />}
  </section>;

  const club = details?.club;
  return <>
    <section className="club-space-hero">
      <div className="club-space-identity"><div className="club-space-logo">{(club?.logo || favorite.logo) ? <img src={club?.logo || favorite.logo} alt="" /> : "⚽"}</div><div><span>★ MON CLUB · {club?.leagueName || favorite.leagueName}</span><h1>{club?.shortName || favorite.shortName || favorite.team}</h1><p>{club ? `${club.rank}e au classement · ${club.points} points · ${club.played ?? "–"} matchs` : "Chargement de ton espace supporter…"}</p></div></div>
      <div className="club-space-actions">{club?.href && <Link href={club.href}>Fiche club →</Link>}<Link href="/mes-alertes">🔔 Mes alertes</Link><button onClick={openPicker}>Changer de club</button></div>
    </section>

    {club && <>
      <section className="club-space-kpis"><div><span>CLASSEMENT</span><strong>{club.rank}<small>e</small></strong></div><div><span>POINTS</span><strong>{club.points}</strong></div><div><span>VICTOIRES</span><strong>{club.win ?? "–"}</strong></div><div><span>FORME</span><div className="club-space-form">{club.form?.length ? club.form.map((r,i)=><i className={`is-${r}`} key={i}>{r}</i>) : "—"}</div></div></section>
      <section className="club-space-matches"><MatchCard match={details.latest} label="DERNIER RÉSULTAT"/><MatchCard match={details.next} label="PROCHAIN MATCH"/></section>

      <section className="club-space-grid">
        <div className="club-space-panel club-space-feed"><div className="club-space-panel-head"><div><span>⚡ À LA MINUTE</span><h2>Fil de ton club</h2></div><Link href="/fil-express">Tout le fil →</Link></div>{details.express?.length ? details.express.map(item => <Link href={item.link_url || "/fil-express"} key={item.id} className="club-space-feed-item"><time>{new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Paris"}).format(new Date(item.published_at))}</time><div><small>{String(item.category).toUpperCase()}</small><strong>{item.title}</strong></div><b>→</b></Link>) : <p className="club-space-empty">Aucune info dédiée pour le moment.</p>}</div>
        <div className="club-space-panel"><div className="club-space-panel-head"><div><span>🔁 TRANSFERTS</span><h2>Mercato</h2></div><Link href="/mercato">Centre Mercato →</Link></div>{details.transfers?.length ? details.transfers.map(t => <Link href="/mercato" className="club-space-transfer" key={t.id}><small>{t.transfer_status === "official" ? "✅ OFFICIEL" : t.transfer_status === "advanced" ? "🔥 AVANCÉ" : "👀 RUMEUR"}</small><strong>{t.player_name}</strong><p>{t.from_club || "Libre"} → {t.to_club || "À définir"}</p></Link>) : <p className="club-space-empty">Aucun mouvement mercato associé actuellement.</p>}</div>
      </section>

      <section className="club-space-news"><div className="club-space-panel-head"><div><span>📰 ACTUALITÉS</span><h2>Tout sur {club.shortName}</h2></div><Link href="/actualites">Toutes les actus →</Link></div><div className="club-space-news-grid">{details.articles?.length ? details.articles.map(a => <Link href={`/article/${a.slug}`} key={a.slug} className="club-space-article">{a.image_url ? <div className="club-space-article-img" style={{backgroundImage:`url("${a.image_url}")`}}/> : <div className="club-space-article-img is-empty">L1</div>}<div><small>{a.category}</small><strong>{a.title}</strong><b>Lire →</b></div></Link>) : <p className="club-space-empty">Les prochains articles liés à ton club apparaîtront ici.</p>}</div></section>
    </>}
    {picker && <Picker leagues={filtered} loading={loading} search={search} setSearch={setSearch} selectClub={selectClub} close={() => setPicker(false)} />}
  </>;
}

function Picker({ leagues, loading, search, setSearch, selectClub, close }) {
  return <div className="my-club-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><div className="my-club-modal"><div className="my-club-modal-head"><div><span>★ PERSONNALISE LIGUE 1 EXPRESS</span><h2>Quel club supportes-tu ?</h2><p>Ton choix reste enregistré uniquement dans ton navigateur.</p></div><button onClick={close}>×</button></div><input className="my-club-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un club…" autoFocus/><div className="my-club-picker-list">{loading ? <div className="my-club-picker-empty">Chargement des clubs…</div> : leagues.map(l=><section key={l.slug}><h3>{l.name}</h3><div className="my-club-picker-grid">{l.clubs.map(c=><button key={`${l.slug}-${c.teamId||c.team}`} onClick={()=>selectClub(c)}><span>{c.logo?<img src={c.logo} alt=""/>:"⚽"}</span><div><strong>{c.shortName||c.team}</strong><small>{c.rank?`${c.rank}e · ${c.points} pts`:l.name}</small></div><b>→</b></button>)}</div></section>)}</div></div></div>;
}
