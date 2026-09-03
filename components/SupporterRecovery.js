"use client";

import { useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

const PROFILE_KEY = "ligue1-express-supporter-profile-v1";
const VOTER_KEY = "ligue1-express-supporter-voter-v1";

export default function SupporterRecovery({ profile, onRecovered }) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    const voterToken = localStorage.getItem(VOTER_KEY);
    if (!supabase || !voterToken) return setMessage("Profil introuvable sur cet appareil.");
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.rpc("generate_supporter_recovery_code", { p_voter_token: voterToken });
    setLoading(false);
    if (error) return setMessage("Impossible de générer le code pour le moment.");
    setGeneratedCode(data || "");
    setMessage("Note ce code : il ne sera affiché qu’ici.");
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(generatedCode); setMessage("Code copié ✓ Garde-le dans un endroit sûr."); }
    catch { setMessage("Sélectionne le code pour le copier."); }
  }

  async function restore(event) {
    event.preventDefault();
    if (!supabase || code.replace(/[^0-9a-f]/gi, "").length !== 16) return setMessage("Entre le code complet à 16 caractères.");
    setLoading(true);
    setMessage("Recherche du profil…");
    const { data, error } = await supabase.rpc("restore_supporter_profile", { p_recovery_code: code });
    setLoading(false);
    if (error || !data?.[0]) return setMessage("Code incorrect ou profil introuvable.");
    const restored = { id: data[0].profile_id, nickname: data[0].nickname };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(restored));
    localStorage.setItem(VOTER_KEY, data[0].voter_token);
    setMessage("Profil récupéré ✓");
    onRecovered?.(restored);
  }

  if (profile) return <section className="supporter-recovery-card is-connected">
    <div><span>🔐 PROFIL MULTI-APPAREILS</span><h2>Ne perds jamais ta progression</h2><p>Génère un code pour retrouver {profile.nickname}, ses pronostics et ses points sur un autre appareil.</p></div>
    {!generatedCode ? <button type="button" onClick={generate} disabled={loading}>{loading ? "Génération…" : "Créer mon code personnel"}</button> : <div className="supporter-generated-code"><strong>{generatedCode}</strong><button type="button" onClick={copyCode}>Copier</button></div>}
    {message && <small>{message}</small>}
  </section>;

  return <section className="supporter-recovery-card">
    <div><span>🔑 J’AI DÉJÀ UN PROFIL</span><h2>Récupérer ma progression</h2><p>Entre le code généré sur ton ancien appareil.</p></div>
    <form onSubmit={restore}><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={19} autoCapitalize="characters" /><button disabled={loading}>{loading ? "Recherche…" : "Récupérer mon profil"}</button></form>
    {message && <small>{message}</small>}
  </section>;
}
