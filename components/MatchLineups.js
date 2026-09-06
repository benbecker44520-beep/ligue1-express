"use client";

import { useEffect, useMemo, useState } from "react";

function compactName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0][0]}. ${parts.at(-1)}`;
}

function parseFormation(value, count) {
  const numbers = String(value || "").match(/\d+/g)?.map(Number).filter(Boolean) || [];
  const sum = numbers.reduce((a, b) => a + b, 0);
  if (numbers.length >= 2 && sum === count - 1) return [1, ...numbers];
  if (count >= 10) return [1, 4, 4, count - 9];
  const rows = [1];
  let remaining = Math.max(0, count - 1);
  while (remaining > 0) { const take = Math.min(4, remaining); rows.push(take); remaining -= take; }
  return rows;
}

function splitRows(players = [], formation = "") {
  const sizes = parseFormation(formation, players.length);
  const rows = [];
  let offset = 0;
  for (const size of sizes) {
    rows.push(players.slice(offset, offset + size));
    offset += size;
  }
  if (offset < players.length) rows.push(players.slice(offset));
  return rows.filter((row) => row.length);
}

function PitchPlayer({ player }) {
  return (
    <div className="v831-pitch-player" title={player.name}>
      <b>{player.number || "•"}</b>
      <span>{compactName(player.name)}</span>
    </div>
  );
}

function TacticalPitch({ lineup, teamName }) {
  const rows = useMemo(() => splitRows(lineup?.starters || [], lineup?.formation), [lineup]);
  return (
    <div className="v831-pitch-wrap">
      <div className="v831-pitch-team"><strong>{teamName}</strong><span>{lineup?.formation || "XI officiel"}</span></div>
      <div className="v831-pitch" aria-label={`Composition tactique ${teamName}`}>
        <i className="v831-half" /><i className="v831-circle" /><i className="v831-box top" /><i className="v831-box bottom" />
        <div className="v831-pitch-rows">
          {rows.map((row, rowIndex) => <div className="v831-pitch-row" key={rowIndex}>{row.map((player) => <PitchPlayer key={player.id} player={player} />)}</div>)}
        </div>
      </div>
    </div>
  );
}

function TeamLineup({ title, lineup }) {
  return (
    <article className="v830-lineup-team">
      <div className="v830-lineup-head"><h3>{title}</h3>{lineup?.formation ? <span>{lineup.formation}</span> : null}</div>
      {lineup?.coach ? <p className="v830-coach">Coach : <strong>{lineup.coach}</strong></p> : null}
      <h4>Titulaires</h4>
      <ol>{(lineup?.starters || []).map((player) => <li key={player.id}><b>{player.number || "•"}</b><span>{player.name}</span>{player.position ? <small>{player.position}</small> : null}</li>)}</ol>
      {(lineup?.substitutes || []).length ? <><h4>Remplaçants</h4><ul>{lineup.substitutes.map((player) => <li key={player.id}><b>{player.number || "•"}</b><span>{player.name}</span></li>)}</ul></> : null}
    </article>
  );
}

export default function MatchLineups({ matchId, homeName, awayName }) {
  const [state, setState] = useState({ loading:true, data:null, loadedAt:null });
  const [view, setView] = useState("pitch");

  useEffect(() => {
    let active = true;
    fetch(`/api/football/lineups?matchId=${encodeURIComponent(matchId)}`, { cache:"no-store" })
      .then((response) => response.json())
      .then((json) => { if (active) setState({ loading:false, data:json?.ok ? json.data : null, loadedAt:new Date() }); })
      .catch(() => { if (active) setState({ loading:false, data:null, loadedAt:new Date() }); });
    return () => { active = false; };
  }, [matchId]);

  const lineups = state.data?.lineups;
  const publishedTime = state.loadedAt ? new Intl.DateTimeFormat("fr-FR", { hour:"2-digit", minute:"2-digit" }).format(state.loadedAt) : null;

  return (
    <section id="compositions" className="v830-lineups">
      <div className="v830-lineups-title">
        <div><span>📋 COMPOSITIONS</span><h2>Les onze officiels</h2>{lineups?.available && publishedTime ? <small>Disponibles · vérifiées à {publishedTime}</small> : null}</div>
        <b>{lineups?.available ? "OFFICIEL" : "EN ATTENTE"}</b>
      </div>

      {lineups?.available ? <div className="v831-view-tabs"><button type="button" className={view === "pitch" ? "active" : ""} onClick={() => setView("pitch")}>⚽ Terrain</button><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>☷ Liste</button></div> : null}

      {state.loading ? <div className="v830-lineup-empty">Chargement des compositions…</div> : lineups?.available ? (
        view === "pitch" ? <div className="v831-pitches"><TacticalPitch teamName={homeName} lineup={lineups.home} /><TacticalPitch teamName={awayName} lineup={lineups.away} /></div>
        : <div className="v830-lineup-grid"><TeamLineup title={homeName} lineup={lineups.home} /><TeamLineup title={awayName} lineup={lineups.away} /></div>
      ) : <div className="v830-lineup-empty"><strong>Les compositions ne sont pas encore publiées.</strong><p>Elles apparaîtront ici automatiquement dès que la source officielle les rendra disponibles.</p></div>}

      <style jsx global>{`
        .v830-lineups{margin:24px 0;padding:24px;border:1px solid #dce4f0;border-radius:24px;background:#fff}.v830-lineups-title{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.v830-lineups-title span{font-size:12px;font-weight:900;letter-spacing:1.4px;color:#b38b00}.v830-lineups-title h2{margin:4px 0 0;color:#071a46}.v830-lineups-title small{display:block;margin-top:5px;color:#778197}.v830-lineups-title>b{padding:8px 12px;border-radius:999px;background:#e8fff1;color:#18834b;font-size:12px}.v831-view-tabs{display:flex;gap:8px;margin:0 0 18px}.v831-view-tabs button{border:1px solid #dce4f0;background:#f6f8fc;color:#53617b;border-radius:999px;padding:9px 14px;font-weight:800;cursor:pointer}.v831-view-tabs button.active{background:#071a46;color:#fff;border-color:#071a46}.v831-pitches{display:grid;grid-template-columns:1fr 1fr;gap:18px}.v831-pitch-wrap{border-radius:20px;overflow:hidden;background:#071a46}.v831-pitch-team{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;color:#fff}.v831-pitch-team span{font-size:12px;font-weight:900;background:#ffd500;color:#071a46;border-radius:999px;padding:5px 9px}.v831-pitch{position:relative;min-height:510px;margin:0 10px 10px;border:2px solid rgba(255,255,255,.8);border-radius:14px;background:linear-gradient(180deg,#178d4e 0%,#117a43 100%);overflow:hidden}.v831-pitch:before,.v831-pitch:after{content:"";position:absolute;left:0;right:0;height:10%;background:rgba(255,255,255,.035)}.v831-pitch:before{top:20%}.v831-pitch:after{top:60%}.v831-half{position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(255,255,255,.8)}.v831-circle{position:absolute;left:50%;top:50%;width:88px;height:88px;border:2px solid rgba(255,255,255,.8);border-radius:50%;transform:translate(-50%,-50%)}.v831-box{position:absolute;left:22%;right:22%;height:70px;border:2px solid rgba(255,255,255,.8)}.v831-box.top{top:-2px}.v831-box.bottom{bottom:-2px}.v831-pitch-rows{position:absolute;inset:18px 8px;display:flex;flex-direction:column;justify-content:space-between;z-index:2}.v831-pitch-row{display:flex;justify-content:space-around;align-items:center;gap:4px}.v831-pitch-player{display:flex;flex-direction:column;align-items:center;min-width:0;max-width:92px;text-align:center;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.55)}.v831-pitch-player b{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#ffd500;color:#071a46;text-shadow:none;border:2px solid #fff;font-size:13px;box-shadow:0 2px 7px rgba(0,0,0,.22)}.v831-pitch-player span{margin-top:4px;font-size:11px;font-weight:900;line-height:1.1}.v830-lineup-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.v830-lineup-team{border-radius:18px;background:#f6f8fc;padding:18px}.v830-lineup-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.v830-lineup-head h3{margin:0;color:#071a46}.v830-lineup-head span{font-weight:900;color:#b38b00}.v830-coach{margin:8px 0 18px;color:#65718a}.v830-lineup-team h4{margin:16px 0 8px;color:#071a46}.v830-lineup-team ol,.v830-lineup-team ul{list-style:none;margin:0;padding:0}.v830-lineup-team li{display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #e3e8f1}.v830-lineup-team li b{color:#b38b00}.v830-lineup-team li small{color:#778197}.v830-lineup-empty{text-align:center;padding:30px 16px;border-radius:18px;background:#f6f8fc;color:#65718a}.v830-lineup-empty strong{display:block;color:#071a46;margin-bottom:8px}@media(max-width:720px){.v830-lineups{padding:18px}.v831-pitches,.v830-lineup-grid{grid-template-columns:1fr}.v831-pitch{min-height:475px}.v830-lineup-team li{grid-template-columns:30px 1fr}.v830-lineup-team li small{grid-column:2}.v830-lineups-title{align-items:flex-start}.v831-pitch-player{max-width:70px}.v831-pitch-player span{font-size:10px}}
      `}</style>
    </section>
  );
}
