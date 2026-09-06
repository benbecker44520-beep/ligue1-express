"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

export default function AdminAutomaticTrigger() {
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage("");
  }, [pathname]);

  if (!pathname?.startsWith("/admin")) return null;

  async function trigger() {
    if (!supabase || running) return;
    setRunning(true);
    setMessage("Recherche des matchs terminés…");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("Reconnecte-toi à l’administration.");

      const response = await fetch("/api/automatic-articles/check", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) throw new Error(json?.error || "Génération impossible.");

      const result = json.automaticArticles || {};
      const created = Number(result.created || 0);
      const checked = Number(result.checked || 0);
      if (created > 0) {
        setMessage(`${created} brouillon${created > 1 ? "s" : ""} créé${created > 1 ? "s" : ""} ✅`);
        window.setTimeout(() => window.location.reload(), 900);
      } else {
        setMessage(`Aucun nouveau brouillon · ${checked} match${checked > 1 ? "s" : ""} vérifié${checked > 1 ? "s" : ""}.`);
      }
    } catch (error) {
      setMessage(error?.message || "Impossible de lancer la génération.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ position: "fixed", right: 18, bottom: 92, zIndex: 80, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, maxWidth: "calc(100vw - 36px)" }}>
      {message && <div style={{ background: "#071a46", color: "white", padding: "10px 12px", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.18)", fontSize: 13, fontWeight: 800 }}>{message}</div>}
      <button
        type="button"
        onClick={trigger}
        disabled={running}
        style={{ border: 0, borderRadius: 12, padding: "12px 15px", background: "#ffd400", color: "#071a46", fontWeight: 900, boxShadow: "0 10px 28px rgba(7,26,70,.22)", cursor: running ? "wait" : "pointer" }}
      >
        {running ? "⏳ Vérification…" : "🤖 Générer les brouillons"}
      </button>
    </div>
  );
}
