"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
          <Link href="/admin" className="admin-link">Admin</Link>
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
          <Link href="/admin" onClick={() => setOpen(false)}>Administration</Link>
        </nav>
      )}
    </header>
  );
}
