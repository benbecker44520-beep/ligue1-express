"use client";

import { useState } from "react";

export default function PlayerPortrait({ name, images = [], crest = null }) {
  const candidates = [...new Set((images || []).filter(Boolean))];
  const [index, setIndex] = useState(0);
  const current = candidates[index] || null;

  if (current) {
    return (
      <img
        src={current}
        alt={`Portrait de ${name}`}
        className="player-photo"
        onError={() => setIndex((value) => value + 1)}
      />
    );
  }

  return (
    <div className="player-avatar player-avatar-fallback" aria-label={`Portrait indisponible pour ${name}`}>
      {crest ? <img src={crest} alt="" /> : <span>{name?.slice(0, 1) || "?"}</span>}
    </div>
  );
}
