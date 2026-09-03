"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

const links = [
  ["Accueil", "/"],
  ["🔴 LIVE", "/live"],
  ["Actualités", "/actualites"],
  ["Championnats", "/championnats"],
  ["Résultats", "/resultats"],
  ["Stats", "/stats"],
  ["Prono", "/prono"],
  ["Mercato", "/mercato"],
  ["Analyses", "/analyses"]
];

export default function Header() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    async function updateAccess(session) {
      setConnected(Boolean(session));
      if (!session) return setIsAdmin(false);
      const { data: allowed } = await supabase.rpc("is_current_user_admin");
      setIsAdmin(Boolean(allowed));
    }
    supabase.auth.getSession().then(({ data }) => updateAccess(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => window.setTimeout(() => updateAccess(session), 0));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <Image
            src="/logo-ligue1-express.png"
            width={131}
            height={54}
            alt="Ligue 1 Express"
            priority
          />
        </Link>

        <nav className="desktop-nav" aria-label="Navigation principale">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>

        <div className="header-actions">
          <button className="search-header-button" aria-label="Rechercher" onClick={() => setSearchOpen(!searchOpen)}>⌕</button>
          <Link href="/mes-alertes" className="alerts-header-link" aria-label="Mes alertes">🔔</Link>
          <div className="header-account-menu">
            <button className="member-header-link" onClick={() => setAccountOpen(!accountOpen)} aria-expanded={accountOpen}>{connected ? "Mon espace" : "Connexion"}<span>⌄</span></button>
            {accountOpen && <div className="header-account-dropdown">
              <Link href={connected ? "/mon-profil-supporter" : "/connexion"} onClick={() => setAccountOpen(false)}><b>👤 {connected ? "Mon espace membre" : "Connexion / Inscription"}</b><small>{connected ? "Profil, pronostics et badges" : "Retrouver mes préférences"}</small></Link>
              {connected && <Link href="/mon-club" onClick={() => setAccountOpen(false)}><b>★ Mon club</b><small>Mon actualité personnalisée</small></Link>}
              {isAdmin && <Link href="/admin" className="editorial-access" onClick={() => setAccountOpen(false)}><b>🔐 Accès rédaction</b><small>Administration du site</small></Link>}
            </div>}
          </div>
          <button
            className="mobile-menu-button"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="header-search-panel">
          <form action="/recherche" className="header-search-form">
            <span aria-hidden="true">⌕</span>
            <input name="q" type="search" placeholder="Rechercher un joueur, un club, une actualité…" autoFocus aria-label="Recherche globale" />
            <button type="submit">Rechercher</button>
          </form>
        </div>
      )}

      {open && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Navigation mobile">
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <Link href="/mes-alertes" onClick={() => setOpen(false)}>🔔 Mes alertes</Link>
          <Link href={connected ? "/mon-profil-supporter" : "/connexion"} onClick={() => setOpen(false)}>{connected ? "👤 Mon espace" : "👤 Connexion / Inscription"}</Link>
          {connected && <Link href="/mon-club" onClick={() => setOpen(false)}>★ Mon club</Link>}
          {isAdmin && <Link href="/admin" className="mobile-editorial-access" onClick={() => setOpen(false)}>🔐 Accès rédaction</Link>}
        </nav>
      )}
    </header>
  );
}
