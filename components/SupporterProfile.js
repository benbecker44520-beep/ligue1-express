"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

const VOTER_KEY = "ligue1-express-supporter-voter-v1";
const PROFILE_KEY = "ligue1-express-supporter-profile-v1";

function voterToken() {
  let token = localStorage.getItem(VOTER_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(VOTER_KEY, token);
  }
  return token;
}

export default function SupporterProfile() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [profile, setProfile] = useState(null);
  const [nickname, setNickname] = useState("");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (saved?.nickname) { setProfile(saved); setNickname(saved.nickname); }
    } catch {}
  }, []);

  async function save(event) {
    event.preventDefault();
    const clean = nickname.trim();
    if (clean.length < 3 || clean.length > 20) return setMessage("Choisis un pseudo de 3 à 20 caractères.");
    setMessage("Enregistrement…");
    const { data, error } = await supabase.rpc("register_supporter_profile", { p_voter_token: voterToken(), p_nickname: clean });
    if (error) {
      if (error.message.includes("already used")) setMessage("Ce pseudo est déjà utilisé.");
      else if (error.message.includes("characters")) setMessage("Utilise uniquement des lettres, chiffres, tirets ou underscores.");
      else setMessage("Impossible d’enregistrer le pseudo pour le moment.");
      return;
    }
    const saved = { id: data?.[0]?.profile_id, nickname: data?.[0]?.nickname || clean };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(saved));
    setProfile(saved);
    setNickname(saved.nickname);
    setEditing(false);
    setMessage("Profil enregistré ✓ Tes anciens votes comptent aussi.");
  }

  if (profile && !editing) return <section className="supporter-profile is-ready">
    <div><span>🏆 MON PROFIL SUPPORTER</span><strong>{profile.nickname}</strong><small>Tes pronostics participent au classement.</small></div>
    <div><Link href="/mon-profil-supporter">Mon espace →</Link><Link href="/classement-pronos" className="profile-ranking-link">Classement</Link><button type="button" onClick={() => setEditing(true)}>Modifier le pseudo</button></div>
    {message && <p>{message}</p>}
  </section>;

  return <section className="supporter-profile">
    <div><span>🏆 REJOINS LE CLASSEMENT</span><strong>Choisis ton pseudo de pronostiqueur</strong><small>Aucun e-mail demandé. Tes votes déjà enregistrés seront conservés.</small></div>
    <form onSubmit={save}><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} placeholder="Ex. BenDu44" autoComplete="nickname" /><button>Valider</button>{profile && <button type="button" className="is-cancel" onClick={() => { setEditing(false); setNickname(profile.nickname); }}>Annuler</button>}<Link href="/classement-pronos" className="profile-ranking-link">Voir le classement</Link></form>
    {message && <p>{message}</p>}
  </section>;
}
