"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

export default function FollowMatchButton({ match, compact = false }) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [user, setUser] = useState(undefined);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const provider = match?.provider || "apifootball";
  const matchId = String(match?.id || "");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUser(data.user || null);
      if (!data.user || !matchId) { setLoading(false); return; }
      const { data: row } = await supabase.from("followed_matches").select("id").eq("user_id", data.user.id).eq("provider", provider).eq("match_id", matchId).maybeSingle();
      if (active) { setFollowing(Boolean(row)); setLoading(false); }
    }
    if (supabase) load(); else { setUser(null); setLoading(false); }
    return () => { active = false; };
  }, [supabase, provider, matchId]);

  async function toggle() {
    if (!user || loading) return;
    setLoading(true);
    if (following) {
      const { error } = await supabase.from("followed_matches").delete().eq("user_id", user.id).eq("provider", provider).eq("match_id", matchId);
      if (!error) setFollowing(false);
    } else {
      const { error } = await supabase.from("followed_matches").upsert({
        user_id: user.id,
        provider,
        match_id: matchId,
        league_name: match.leagueName || match.league || "Football",
        home_name: match.home?.name || match.home?.shortName || "Domicile",
        away_name: match.away?.name || match.away?.shortName || "Extérieur",
        match_url: match.href || `/live/match/${matchId}`,
        starts_at: match.utcDate || null
      }, { onConflict: "user_id,provider,match_id" });
      if (!error) setFollowing(true);
    }
    setLoading(false);
  }

  if (user === undefined || loading && !user) return <span className={`follow-match-button is-loading ${compact ? "is-compact" : ""}`}>Chargement…</span>;
  if (!user) return <Link href="/connexion" className={`follow-match-button ${compact ? "is-compact" : ""}`}>🔔 Se connecter pour suivre</Link>;
  return <button type="button" className={`follow-match-button ${following ? "is-following" : ""} ${compact ? "is-compact" : ""}`} onClick={toggle} disabled={loading}>{loading ? "Mise à jour…" : following ? "✓ Match suivi" : "🔔 Suivre ce match"}</button>;
}

