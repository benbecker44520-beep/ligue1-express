"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

export default function FollowedMatchesList() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [user, setUser] = useState(undefined);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUser(data.user || null);
      if (!data.user) return;
      const { data: rows } = await supabase.from("followed_matches").select("id,match_id,league_name,home_name,away_name,match_url,starts_at,created_at").eq("user_id", data.user.id).order("created_at", { ascending:false });
      if (active) setMatches(rows || []);
    }
    if (supabase) load(); else setUser(null);
    return () => { active = false; };
  }, [supabase]);

  async function remove(id) {
    const { error } = await supabase.from("followed_matches").delete().eq("id", id);
    if (!error) setMatches((current) => current.filter((match) => match.id !== id));
  }

  if (!user || !matches.length) return null;
  return <section className="alerts-card followed-matches-card"><div className="alerts-card-head"><span>🔔 MES MATCHS SUIVIS</span><strong>{matches.length} rencontre{matches.length > 1 ? "s" : ""}</strong></div><div className="followed-matches-list">{matches.map((match) => <article key={match.id}><Link href={match.match_url}><small>{match.league_name || "LIVE"}</small><strong>{match.home_name} — {match.away_name}</strong><span>Ouvrir le match →</span></Link><button type="button" onClick={() => remove(match.id)}>Ne plus suivre</button></article>)}</div></section>;
}

