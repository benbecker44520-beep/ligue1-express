"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

export default function FollowPlayerButton({ player }) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [user, setUser] = useState(undefined);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUser(data.user || null);
      if (!data.user) { setLoading(false); return; }
      const { data: row } = await supabase.from("followed_players").select("id").eq("user_id", data.user.id).eq("player_id", String(player.id)).maybeSingle();
      if (active) { setFollowing(Boolean(row)); setLoading(false); }
    }
    if (supabase) load(); else { setUser(null); setLoading(false); }
    return () => { active = false; };
  }, [supabase, player.id]);

  async function toggle() {
    if (!user || loading) return;
    setLoading(true);
    if (following) {
      const { error } = await supabase.from("followed_players").delete().eq("user_id", user.id).eq("player_id", String(player.id));
      if (!error) setFollowing(false);
    } else {
      const { error } = await supabase.from("followed_players").upsert({
        user_id: user.id,
        player_id: String(player.id),
        player_name: player.name,
        team_id: player.teamId ? String(player.teamId) : null,
        team_name: player.teamName || null,
        player_url: `/joueur/${player.id}${player.teamId ? `?club=${player.teamId}` : ""}`
      }, { onConflict: "user_id,player_id" });
      if (!error) setFollowing(true);
    }
    setLoading(false);
  }

  if (user === undefined || (loading && !user)) return <span className="follow-player-button is-loading">Chargement…</span>;
  if (!user) return <Link href="/connexion" className="follow-player-button">🔔 Se connecter pour suivre</Link>;
  return <button type="button" className={`follow-player-button ${following ? "is-following" : ""}`} onClick={toggle} disabled={loading}>{loading ? "Mise à jour…" : following ? "✓ Joueur suivi" : "🔔 Suivre ce joueur"}</button>;
}
