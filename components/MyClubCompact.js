"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ligue1-express-my-club-v1";

export default function MyClubCompact() {
  const [favorite, setFavorite] = useState(null);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorite(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!favorite) return;
    const params = new URLSearchParams({ league: favorite.league, teamId: String(favorite.teamId || ""), team: favorite.team || "" });
    fetch(`/api/my-club?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => { if (json.ok) setDetails(json); })
      .catch(() => {});
  }, [favorite]);

  if (!favorite) {
    return <Link href="/mon-club" className="my-club-compact is-empty">
      <span className="my-club-compact-icon">★</span>
      <div><small>MON CLUB</small><strong>Crée ton espace supporter</strong><p>Choisis ton équipe pour personnaliser Ligue 1 Express.</p></div>
      <b>Choisir →</b>
    </Link>;
  }

  const club = details?.club;
  const next = details?.next;
  const nextLabel = next ? `${next.home?.name} – ${next.away?.name}` : "Prochain match à venir";

  return <Link href="/mon-club" className="my-club-compact">
    <div className="my-club-compact-logo">{(club?.logo || favorite.logo) ? <img src={club?.logo || favorite.logo} alt="" /> : <span>⚽</span>}</div>
    <div className="my-club-compact-copy">
      <small>★ MON CLUB</small>
      <strong>{club?.shortName || favorite.shortName || favorite.team}</strong>
      <p>{club ? `${club.rank}e · ${club.points} pts` : favorite.leagueName} <i>•</i> {nextLabel}</p>
    </div>
    <b className="my-club-compact-cta">Mon espace →</b>
  </Link>;
}
