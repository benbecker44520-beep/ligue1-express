"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { localMemberData, loadMemberProfile } from "@/lib/member-client";

export default function MemberAccount() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return setLoading(false);
    loadMemberProfile(supabase).then((result) => { setUser(result.user); setProfile(result.profile); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === "PASSWORD_RECOVERY") setMode("new-password");
      if (session?.user) window.setTimeout(() => loadMemberProfile(supabase).then((result) => setProfile(result.profile)), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setMessage("");
    if (mode === "register") {
      const local = localMemberData();
      const clean = nickname.trim();
      if (clean.length < 3 || clean.length > 20) { setLoading(false); return setMessage("Choisis un pseudo de 3 à 20 caractères."); }
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/connexion`, data: { nickname: clean, voter_token: local.voterToken, favorite_club: local.favoriteClub, alert_preferences: local.alertPreferences || {} } } });
      setLoading(false);
      if (error) return setMessage(error.message.includes("nickname already used") ? "Ce pseudo est déjà utilisé." : "Inscription impossible : vérifie les informations.");
      if (!data.session) return setMessage("Compte créé ✓ Consulte ton e-mail pour confirmer ton inscription.");
      setUser(data.user); return setMessage("Compte créé et progression récupérée ✓");
    }
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/connexion` });
      setLoading(false); return setMessage(error ? "Impossible d’envoyer l’e-mail." : "E-mail de réinitialisation envoyé ✓");
    }
    if (mode === "new-password") {
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false); if (!error) setMode("login"); return setMessage(error ? "Impossible de modifier le mot de passe." : "Nouveau mot de passe enregistré ✓");
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return setMessage("E-mail ou mot de passe incorrect.");
    setUser(data.user); setMessage("Connexion réussie ✓");
  }

  async function logout() { await supabase.auth.signOut(); setUser(null); setProfile(null); setMessage("Tu es déconnecté."); }

  if (loading && !user) return <div className="member-account-loading">Chargement de ton espace…</div>;
  if (user) return <section className="member-account-card is-connected"><span>✅ COMPTE CONNECTÉ</span><h1>Bienvenue {profile?.nickname || "supporter"}</h1><p>{user.email}</p><div><Link href="/mon-profil-supporter">Ouvrir mon espace</Link><Link href="/mon-club">Mon club</Link><button onClick={logout}>Se déconnecter</button></div>{message && <small>{message}</small>}</section>;

  return <section className="member-auth-layout"><div className="member-auth-intro"><span>⚽ LIGUE 1 EXPRESS</span><h1>Ton football, partout avec toi.</h1><p>Connecte-toi pour retrouver ton club, tes pronostics, tes points, tes badges et tes alertes sur tous tes appareils.</p><ul><li>✓ Le reste du site reste accessible sans compte</li><li>✓ Tes anciens pronostics sont conservés</li><li>✓ Aucun mot de passe n’est stocké par le site</li></ul></div><div className="member-auth-card"><div className="member-auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); }}>Connexion</button><button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setMessage(""); }}>Inscription</button></div><h2>{mode === "register" ? "Créer mon compte" : mode === "forgot" ? "Mot de passe oublié" : mode === "new-password" ? "Nouveau mot de passe" : "Se connecter"}</h2><form onSubmit={submit}>{mode === "register" && <label>Pseudo<input value={nickname} onChange={(e) => setNickname(e.target.value)} minLength={3} maxLength={20} required /></label>}{mode !== "new-password" && <label>Adresse e-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>}{mode !== "forgot" && <label>Mot de passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>}<button disabled={loading}>{loading ? "Un instant…" : mode === "register" ? "Créer mon compte" : mode === "forgot" ? "Envoyer le lien" : mode === "new-password" ? "Enregistrer" : "Se connecter"}</button></form>{mode === "login" && <button className="member-forgot" onClick={() => setMode("forgot")}>Mot de passe oublié ?</button>}{mode === "forgot" && <button className="member-forgot" onClick={() => setMode("login")}>Retour à la connexion</button>}{message && <p className="member-auth-message">{message}</p>}</div></section>;
}
