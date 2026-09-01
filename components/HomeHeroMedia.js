"use client";

import { useState } from "react";

export default function HomeHeroMedia({ images = [], title = "Ligue 1 Express" }) {
  const candidates = [...new Set((images || []).filter(Boolean))];
  const [index, setIndex] = useState(0);
  const current = candidates[index] || null;

  if (!current) return <div className="v8973-hero-fallback" aria-hidden="true">L1</div>;

  return (
    <img
      className="v8973-hero-media"
      src={current}
      alt=""
      aria-hidden="true"
      onError={() => setIndex((value) => value + 1)}
    />
  );
}
