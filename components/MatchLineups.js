"use client";

import { useEffect, useState } from "react";

function TeamLineup({ title, lineup }) {
  return (
    <article className="v830-lineup-team">
      <div className="v830-lineup-head">
        <h3>{title}</h3>
        {lineup?.formation ? <span>{lineup.formation}</span> : null}
      </div>
      {lineup?.coach ? <p className="v830-coach">Coach : <strong>{lineup.coach}</strong></p> : null}
      <h4>Titulaires</h4>
      <ol>
        {(lineup?.starters || []).map((player) => (
          <li key={player.id}><b>{player.number || "•"}</b><span>{player.name}</span>{player.position ? <small>{player.position}</small> : null}</li>
        ))}
      </ol>
      {(lineup?.substitutes || []).length ? <><h4>Remplaçants</h4><ul>{lineup.substitutes.map((player) => <li key={player.id}><b>{player.number || "•"}</b><span>{player.name}</span></li>)}</ul></> : null}
    </article>
  );
}

export default function MatchLineups({ matchId, homeName, awayName }) {
  const [state, setState] = useState({ loading:true, data:null });

  useEffect(() => {
    let active = true;
    fetch(`/api/football/lineups?matchId=${encodeURIComponent(matchId)}`, { cache:"no-store" })
      .then((response) => response.json())
      .then((json) => { if (active) setState({ loading:false, data:json?.ok ? json.data : null }); })
      .catch(() => { if (active) setState({ loading:false, data:null }); });
    return () => { active = false; };
  }, [matchId]);

  const lineups = state.data?.lineups;
  return (
    <section id="compositions" className="v830-lineups">
      <div className="v830-lineups-title"><div><span>📋 COMPOSITIONS</span><h2>Les onze officiels</h2></div><b>{lineups?.available ? "OFFICIEL" : "EN ATTENTE"}</b></div>
      {state.loading ? <div className="v830-lineup-empty">Chargement des compositions…</div> : lineups?.available ? (
        <div className="v830-lineup-grid"><TeamLineup title={homeName} lineup={lineups.home} /><TeamLineup title={awayName} lineup={lineups.away} /></div>
      ) : <div className="v830-lineup-empty"><strong>Les compositions ne sont pas encore publiées.</strong><p>Elles apparaîtront ici automatiquement dès que la source officielle les rendra disponibles.</p></div>}
      <style jsx global>{`
        .v830-lineups{margin:24px 0;padding:24px;border:1px solid #dce4f0;border-radius:24px;background:#fff}.v830-lineups-title{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}.v830-lineups-title span{font-size:12px;font-weight:900;letter-spacing:1.4px;color:#b38b00}.v830-lineups-title h2{margin:4px 0 0;color:#071a46}.v830-lineups-title>b{padding:8px 12px;border-radius:999px;background:#e8fff1;color:#18834b;font-size:12px}.v830-lineup-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.v830-lineup-team{border-radius:18px;background:#f6f8fc;padding:18px}.v830-lineup-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.v830-lineup-head h3{margin:0;color:#071a46}.v830-lineup-head span{font-weight:900;color:#b38b00}.v830-coach{margin:8px 0 18px;color:#65718a}.v830-lineup-team h4{margin:16px 0 8px;color:#071a46}.v830-lineup-team ol,.v830-lineup-team ul{list-style:none;margin:0;padding:0}.v830-lineup-team li{display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #e3e8f1}.v830-lineup-team li b{color:#b38b00}.v830-lineup-team li small{color:#778197}.v830-lineup-empty{text-align:center;padding:30px 16px;border-radius:18px;background:#f6f8fc;color:#65718a}.v830-lineup-empty strong{display:block;color:#071a46;margin-bottom:8px}@media(max-width:720px){.v830-lineups{padding:18px}.v830-lineup-grid{grid-template-columns:1fr}.v830-lineup-team li{grid-template-columns:30px 1fr}.v830-lineup-team li small{grid-column:2}}
      `}</style>
    </section>
  );
}
