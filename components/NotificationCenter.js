"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { loadMemberProfile } from "@/lib/member-client";

const PREFS_KEY = "ligue1-express-alert-preferences-v1";
const CLUB_KEY = "ligue1-express-my-club-v1";

const DEFAULT_PREFS = {
  mercato: true,
  match: true,
  result: true,
  injury: true,
  cup: true,
  breaking: true,
  favoriteOnly: true
};

const OPTIONS = [
  ["mercato", "🔁 Mercato", "Arrivées, départs, officialisations et rumeurs avancées."],
  ["match", "⚽ Match", "Avant-match, coup d’envoi et informations importantes."],
  ["result", "🏁 Résultats", "Score final et principaux faits du match."],
  ["injury", "🚑 Blessures", "Absences et retours importants."],
  ["cup", "🏆 Coupe de France", "Alertes liées aux tours et matchs de Coupe."],
  ["breaking", "🚨 Urgent", "Informations importantes signalées comme prioritaires."]
];

export default function NotificationCenter() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [user, setUser] = useState(undefined);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [favorite, setFavorite] = useState(null);
  const [permission, setPermission] = useState("unsupported");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!supabase) { setUser(null); return; }
    loadMemberProfile(supabase).then((result) => {
      setUser(result.user);
      if (result.profile?.alert_preferences) setPrefs({ ...DEFAULT_PREFS, ...result.profile.alert_preferences });
      if (result.profile?.favorite_club) setFavorite(result.profile.favorite_club);
    });
    if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission);
  }, [supabase]);

  const activeCount = useMemo(() => OPTIONS.filter(([key]) => prefs[key]).length, [prefs]);

  function toggle(key) {
    setPrefs((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  }

  async function save() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    await supabase.rpc("update_my_supporter_profile", { p_alert_preferences: prefs });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  function sendTest() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification("Ligue 1 Express", {
      body: favorite?.shortName || favorite?.team ? `Tes alertes ${favorite.shortName || favorite.team} sont prêtes.` : "Tes alertes Ligue 1 Express sont prêtes.",
      icon: "/icon-192.png"
    });
  }

  if (user === undefined) return <div className="member-account-loading">Chargement de tes alertes…</div>;
  if (!user) return <section className="club-space-onboarding"><span>🔔 MES ALERTES</span><h1>Des informations rien que pour toi</h1><p>Connecte-toi pour enregistrer tes préférences et les retrouver sur tous tes appareils.</p><Link href="/connexion">Connexion / Inscription →</Link></section>;

  return (
    <div className="alerts-center">
      <section className="alerts-hero">
        <div>
          <span>V8.8 · PERSONNALISATION</span>
          <h1>Mes alertes</h1>
          <p>Choisis les infos que tu veux suivre. Ces préférences sont déjà structurées pour les futures notifications mobiles.</p>
        </div>
        <div className="alerts-summary"><strong>{activeCount}</strong><span>types d’alertes actifs</span></div>
      </section>

      <section className="alerts-grid">
        <div className="alerts-card">
          <div className="alerts-card-head"><span>★ MON CLUB</span><strong>{favorite ? (favorite.shortName || favorite.team) : "Aucun club choisi"}</strong></div>
          {favorite ? <>
            <label className="alerts-switch-row">
              <div><strong>Priorité à mon club</strong><p>Mettre en avant les alertes liées à {favorite.shortName || favorite.team}.</p></div>
              <input type="checkbox" checked={prefs.favoriteOnly} onChange={() => toggle("favoriteOnly")} />
              <i aria-hidden="true"></i>
            </label>
            <Link href="/" className="alerts-text-link">Modifier mon club depuis l’accueil →</Link>
          </> : <><p className="alerts-muted">Choisis d’abord ton club favori depuis l’accueil pour personnaliser les alertes.</p><Link href="/" className="alerts-primary-link">Choisir mon club →</Link></>}
        </div>

        <div className="alerts-card">
          <div className="alerts-card-head"><span>🔔 NAVIGATEUR</span><strong>Autorisation des notifications</strong></div>
          <p className="alerts-muted">Cette étape permet déjà de tester les notifications sur ton appareil. Les vraies alertes en arrière-plan seront branchées avec l’application mobile.</p>
          <div className="alerts-browser-actions">
            {permission === "unsupported" && <span className="alerts-status is-off">Non disponible sur ce navigateur</span>}
            {permission === "default" && <button type="button" onClick={enableBrowserNotifications}>Autoriser les notifications</button>}
            {permission === "denied" && <span className="alerts-status is-off">Notifications bloquées dans le navigateur</span>}
            {permission === "granted" && <><span className="alerts-status is-on">✓ Autorisées</span><button type="button" className="is-secondary" onClick={sendTest}>Envoyer un test</button></>}
          </div>
        </div>
      </section>

      <section className="alerts-card alerts-types">
        <div className="alerts-card-head"><span>⚡ CENTRE D’ALERTES</span><strong>Ce que je veux suivre</strong></div>
        <div className="alerts-options">
          {OPTIONS.map(([key, title, description]) => <label className="alerts-option" key={key}>
            <div><strong>{title}</strong><p>{description}</p></div>
            <input type="checkbox" checked={Boolean(prefs[key])} onChange={() => toggle(key)} />
            <i aria-hidden="true"></i>
          </label>)}
        </div>
        <div className="alerts-save-row"><button type="button" onClick={save}>Enregistrer mes préférences</button>{saved && <span>✓ Préférences enregistrées</span>}</div>
      </section>

      <section className="alerts-roadmap">
        <span>📱 PRÊT POUR LA SUITE</span>
        <strong>Ces réglages serviront directement à l’application Ligue 1 Express.</strong>
        <p>La prochaine couche pourra connecter ces préférences aux notifications push iOS et Android sans refaire l’interface de personnalisation.</p>
      </section>
    </div>
  );
}
