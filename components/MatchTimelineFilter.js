"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const FILTERS = [
  { value: "all", icon: "✨", label: "Tous" },
  { value: "goal", icon: "⚽", label: "But" },
  { value: "disallowed_goal", icon: "🚫", label: "But refusé" },
  { value: "yellow_card", icon: "🟨", label: "Jaune" },
  { value: "red_card", icon: "🟥", label: "Rouge" },
  { value: "substitution", icon: "🔄", label: "Remplacement" }
];

export default function MatchTimelineFilter({ incidents, homeName, awayName }) {
  const [filter, setFilter] = useState("all");
  const availableTypes = useMemo(() => new Set(incidents.map((incident) => incident.type)), [incidents]);
  const visibleIncidents = filter === "all" ? incidents : incidents.filter((incident) => incident.type === filter);

  return <>
    <div className="match-event-legend result-v8213-filters" role="group" aria-label="Filtrer les faits marquants">
      {FILTERS.map((item) => {
        const disabled = item.value !== "all" && !availableTypes.has(item.value);
        return <button
          type="button"
          key={item.value}
          className={filter === item.value ? "active" : ""}
          disabled={disabled}
          aria-pressed={filter === item.value}
          onClick={() => setFilter(item.value)}
        >{item.icon} {item.label}</button>;
      })}
    </div>

    <div className="match-timeline-list result-v8212-events">
      <div className="result-v8212-teams" aria-hidden="true">
        <strong>{homeName}</strong><span>MIN.</span><strong>{awayName}</strong>
      </div>
      {visibleIncidents.map((incident) => (
        <div className={`match-timeline-row ${incident.isHome ? "home" : "away"} ${incident.type}`} key={incident.id}>
          <div className="match-event-copy">
            <strong>{incident.label}{incident.manual && <small className="match-event-manual-badge">Ajout rédaction</small>}</strong>
            {incident.type === "substitution" ? <span>
              {incident.playerOutId ? <Link href={`/joueur/${incident.playerOutId}?club=${incident.clubId}`}>{incident.playerOut}</Link> : (incident.playerOut || "Sortie")} sort · {incident.playerInId ? <Link href={`/joueur/${incident.playerInId}?club=${incident.clubId}`}>{incident.playerIn}</Link> : (incident.playerIn || "Entrée")} entre
            </span> : <span>
              {incident.playerId ? <Link href={`/joueur/${incident.playerId}?club=${incident.clubId}`}>{incident.player}</Link> : (incident.player || incident.reason || (incident.isHome ? homeName : awayName))}
            </span>}
            {incident.reason && incident.player && <small>{incident.reason}</small>}
          </div>
          <div className="result-v8212-marker"><time>{incident.minute || "—"}</time><i>{incident.icon}</i></div>
        </div>
      ))}
      {!visibleIncidents.length && <div className="result-v8213-empty">Aucun événement de ce type pendant ce match.</div>}
    </div>
  </>;
}
