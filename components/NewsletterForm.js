"use client";

import { useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

export default function NewsletterForm() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function subscribe(event) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !consent) {
      setStatus("Renseigne ton e-mail et confirme ton inscription.");
      return;
    }
    if (!supabase) {
      setStatus("Newsletter temporairement indisponible.");
      return;
    }
    setSaving(true);
    setStatus("");
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: normalizedEmail, consent: true });
    setSaving(false);
    if (error) {
      if (error.code === "23505") setStatus("Cette adresse est déjà inscrite ✅");
      else setStatus("Impossible de t'inscrire pour le moment.");
      return;
    }
    setEmail("");
    setConsent(false);
    setStatus("Inscription réussie ✅");
  }

  return <form className="newsletter-wrap" onSubmit={subscribe}>
    <div className="newsletter">
      <input type="email" aria-label="Adresse e-mail" placeholder="Ton e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button type="submit" disabled={saving}>{saving ? "Inscription..." : "S'inscrire"}</button>
    </div>
    <label className="newsletter-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required /> <span>J'accepte de recevoir la newsletter Ligue 1 Express.</span></label>
    {status && <p className="newsletter-status" aria-live="polite">{status}</p>}
  </form>;
}
