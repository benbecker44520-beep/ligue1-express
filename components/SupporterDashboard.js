"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SupporterRecovery from "@/components/SupporterRecovery";

const PROFILE_KEY = "ligue1-express-supporter-profile-v1";

function position(ranking, profileId) {
  const index = ranking.findIndex((player) => player.id === profileId);
  return index < 0 ? null : index + 1;
}

function choiceLabel(choice, match) {
  if (choice === "1") return `Victoire ${match.homeTeam}`;
  if (choice === "2") return `Victoire ${match.awayTeam}`;
  return "Match nul";
}

function fullStats(history) {
  const evaluated = history.filter((item) => item.status !== "pending");
  const wins = evaluated.filter((item) => item.status === "won").length;
  const ordered = [...evaluated].sort((a, b) => new Date(b.match.matchDate) - new Date(a.match.matchDate));
  let currentStreak = 0;
  for (const item of ordered) { if (item.status !== "won") break; currentStreak += 1; }
  let bestStreak = 0;
  let running = 0;
  for (const item of [...ordered].reverse()) {
    running = item.status === "won" ? running + 1 : 0;
    bestStreak = Math.max(bestStreak, running);
  }
  return { played: evaluated.length, pending: history.length - evaluated.length, wins, points: wins * 3, successRate: evaluated.length ? Math.round(wins * 100 / evaluated.length) : 0, currentStreak, bestStreak };
}

function badges(stats) {
  return [
    { icon: "⚽", name: "Premier prono", unlocked: stats.played >= 1, current: Math.min(stats.played, 1), target: 1 },
    { icon: "🎯", name: "Œil du coach", unlocked: stats.wins >= 3, current: Math.min(stats.wins, 3), target: 3 },
    { icon: "👑", name: "Expert Ligue 1", unlocked: stats.played >= 10 && stats.successRate >= 70, current: Math.min(stats.played, 10), target: 10, note: "puis 70 % de réussite" },
    { icon: "🔥", name: "Série de 5", unlocked: stats.bestStreak >= 5, current: Math.min(stats.bestStreak, 5), target: 5 }
  ];
}

export default function SupporterDashboard({ entries, predictions, general, weekly }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    try { setProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) || "null")); } catch {}
  }, []);

  const dashboard = useMemo(() => {
    if (!profile?.id) return null;
    const matches = new Map(predictions.map((match) => [match.matchId, match]));
    const history = entries.filter((entry) => String(entry.profile_id) === String(profile.id)).map((entry) => {
      const match = matches.get(String(entry.match_id));
      if (!match) return null;
      const status = !match.outcome ? "pending" : entry.selection === match.outcome ? "won" : "lost";
      return { ...entry, match, status };
    }).filter(Boolean).sort((a, b) => new Date(b.match.matchDate) - new Date(a.match.matchDate));
    const stats = fullStats(history);
    return { history, stats, badges: badges(stats), generalRank: position(general, String(profile.id)), weeklyRank: position(weekly, String(profile.id)) };
  }, [profile, entries, predictions, general, weekly]);

  if (!profile?.id) return <main className="page-shell supporter-dashboard-page"><section className="supporter-login-card"><span>🏆 ESPACE SUPPORTER</span><h1>Retrouve ton espace</h1><p>Crée un nouveau pseudo ou récupère un profil existant avec ton code personnel.</p><Link href="/prono">Créer un nouveau profil →</Link></section><SupporterRecovery onRecovered={(restored) => setProfile(restored)} /></main>;
  if (!dashboard) return null;

  const nextBadge = dashboard.badges.find((badge) => !badge.unlocked);
  return <main className="page-shell supporter-dashboard-page">
    <section className="supporter-dashboard-hero"><div><span>🏆 V8.15 · MON ESPACE</span><h1>Salut {profile.nickname} !</h1><p>Retrouve ici toute ta saison de pronostiqueur.</p></div><div><Link href="/prono">Faire mes pronostics</Link><Link href="/classement-pronos">Voir le classement</Link></div></section>

    <section className="supporter-dashboard-kpis">
      <div><span>Points</span><strong>{dashboard.stats.points}</strong><small>3 par bon résultat</small></div>
      <div><span>Réussite</span><strong>{dashboard.stats.successRate}%</strong><small>{dashboard.stats.wins}/{dashboard.stats.played} bons pronostics</small></div>
      <div><span>Classement général</span><strong>{dashboard.generalRank ? `#${dashboard.generalRank}` : "—"}</strong><small>{general.length} joueur{general.length > 1 ? "s" : ""} classé{general.length > 1 ? "s" : ""}</small></div>
      <div><span>Cette semaine</span><strong>{dashboard.weeklyRank ? `#${dashboard.weeklyRank}` : "—"}</strong><small>{dashboard.stats.pending} en attente</small></div>
      <div><span>Série actuelle</span><strong>{dashboard.stats.currentStreak ? `🔥 ${dashboard.stats.currentStreak}` : "—"}</strong><small>Record : {dashboard.stats.bestStreak}</small></div>
    </section>

    {nextBadge && <section className="next-supporter-badge"><div><span>PROCHAIN OBJECTIF</span><h2>{nextBadge.icon} {nextBadge.name}</h2><p>{nextBadge.current}/{nextBadge.target} {nextBadge.note || "étape(s) validée(s)"}</p></div><div className="badge-progress"><i style={{ width: `${Math.round(nextBadge.current * 100 / nextBadge.target)}%` }} /></div></section>}

    <section className="supporter-dashboard-grid">
      <div className="supporter-history"><div className="supporter-block-title"><span>MES PRONOSTICS</span><h2>Historique</h2></div>{dashboard.history.length === 0 ? <div className="supporter-history-empty"><p>Tu n’as pas encore enregistré de pronostic.</p><Link href="/prono">Faire mon premier choix →</Link></div> : <div>{dashboard.history.map((item) => <article key={`${item.match_id}-${item.voted_at}`} className={`supporter-history-row is-${item.status}`}><div><span>{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "Europe/Paris" }).format(new Date(item.match.matchDate))}</span><strong>{item.match.homeTeam} <i>–</i> {item.match.awayTeam}</strong><small>Ton choix : {choiceLabel(item.selection, item.match)}</small></div><div>{item.match.outcome && <b>{item.match.homeScore} - {item.match.awayScore}</b>}<strong>{item.status === "won" ? "+3 POINTS" : item.status === "lost" ? "PERDU" : "EN ATTENTE"}</strong></div></article>)}</div>}</div>
      <aside className="supporter-badge-case"><div className="supporter-block-title"><span>MA COLLECTION</span><h2>Badges</h2></div><div>{dashboard.badges.map((badge) => <article className={badge.unlocked ? "is-unlocked" : ""} key={badge.name}><b>{badge.icon}</b><div><strong>{badge.name}</strong><small>{badge.unlocked ? "Débloqué ✓" : `${badge.current}/${badge.target}`}</small></div></article>)}</div></aside>
    </section>
    <SupporterRecovery profile={profile} />
  </main>;
}
