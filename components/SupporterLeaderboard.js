"use client";

import { useEffect, useState } from "react";

const PROFILE_KEY = "ligue1-express-supporter-profile-v1";

function medal(index) {
  return index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1;
}

export default function SupporterLeaderboard({ general, weekly }) {
  const [mode, setMode] = useState("weekly");
  const [profileId, setProfileId] = useState("");
  useEffect(() => {
    try { setProfileId(JSON.parse(localStorage.getItem(PROFILE_KEY) || "null")?.id || ""); } catch {}
  }, []);
  const ranking = mode === "weekly" ? weekly : general;
  const myRank = profileId ? ranking.findIndex((player) => player.id === profileId) + 1 : 0;

  return <>
    <div className="ranking-switch"><button className={mode === "weekly" ? "active" : ""} onClick={() => setMode("weekly")}>Cette semaine</button><button className={mode === "general" ? "active" : ""} onClick={() => setMode("general")}>Classement général</button></div>
    {myRank > 0 && <div className="my-ranking-position"><span>Ta position</span><strong>#{myRank}</strong><small>{ranking[myRank - 1].points} points · {ranking[myRank - 1].successRate}% de réussite</small></div>}
    {ranking.length === 0 ? <div className="ranking-empty"><span>🏟️</span><h2>Le classement va bientôt démarrer</h2><p>Les premiers points apparaîtront après les prochains résultats.</p></div> : <div className="supporter-ranking-table">
      <div className="ranking-row ranking-head"><span>Rang</span><span>Pronostiqueur</span><span>Pronos</span><span>Réussite</span><span>Série</span><span>Points</span></div>
      {ranking.map((player, index) => <div className={`ranking-row ${player.id === profileId ? "is-me" : ""} ${index < 3 ? "is-podium" : ""}`} key={player.id}>
        <strong className="ranking-rank">{medal(index)}</strong>
        <div className="ranking-player"><b>{player.nickname}{player.id === profileId ? " · TOI" : ""}</b><small>{player.badge}</small></div>
        <span>{player.played}</span><span>{player.successRate}%</span><span>{player.currentStreak ? `🔥 ${player.currentStreak}` : "—"}</span><strong className="ranking-points">{player.points}</strong>
      </div>)}
    </div>}
  </>;
}
