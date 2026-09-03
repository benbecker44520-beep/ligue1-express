"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { loadMemberProfile } from "@/lib/member-client";
import FollowedMatchesList from "@/components/FollowedMatchesList";

const PREFS_KEY = "ligue1-express-alert-preferences-v1";
const CLUB_KEY = "ligue1-express-my-club-v1";

const DEFAULT_PREFS = {
  mercato: true,
  match: true,
  result: true,
  injury: true,
  cup: true,
  breaking: true,
  liveGoal: true,
  liveFoul: true,
  liveOffside: true,
  liveRedCard: true,
  favoriteOnly: true
};

const OPTIONS = [
  ["mercato", "🔁 Mercato", "Arrivées, départs, officialisations et rumeurs avancées."],
  ["match", "⚽ Match", "Avant-match, coup d’envoi et informations importantes."],
  ["result", "🏁 Résultats", "Score final et principaux faits du match."],
  ["injury", "🚑 Blessures", "Absences et retours importants."],
  ["cup", "🏆 Coupe de France", "Alertes liées aux tours et matchs de Coupe."],
  ["breaking", "🚨 Urgent", "Informations importantes signalées comme prioritaires."],
  ["liveGoal", "⚽ But en direct", "Notification immédiate lorsqu’un but est confirmé."],
  ["liveFoul", "🛑 Faute importante", "Alerte lorsqu’une faute importante est fournie par le direct."],
  ["liveOffside", "🚩 Hors-jeu", "Alerte lorsqu’un hors-jeu est fourni par le direct."],
  ["liveRedCard", "🟥 Carton rouge", "Notification immédiate pour une expulsion."]
];

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function NotificationCenter() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [user, setUser] = useState(undefined);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [favorite, setFavorite] = useState(null);
  const [permission, setPermission] = useState("unsupported");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!supabase) { setUser(null); return; }
    loadMemberProfile(supabase).then((result) => {
      setUser(result.user);
      if (result.profile?.alert_preferences) setPrefs({ ...DEFAULT_PREFS, ...result.profile.alert_preferences });
      if (result.profile?.favorite_club) setFavorite(result.profile.favorite_club);
    });
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      navigator.serviceWorker?.register("/sw.js").then((registration) => registration.pushManager.getSubscription()).then((subscription) => setPushEnabled(Boolean(subscription))).catch(() => {});
    }
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
    setPushMessage("");
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Les notifications push ne sont pas disponibles sur ce navigateur.");
      const publicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
      if (!publicKey) throw new Error("Les notifications LIVE ne sont pas encore configurées sur le serveur.");
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") throw new Error("Autorisation refusée dans les réglages du navigateur.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) throw new Error("Reconnecte-toi avant d’activer les notifications.");
      const response = await fetch("/api/push/subscribe", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${data.session.access_token}` }, body:JSON.stringify(subscription.toJSON()) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Activation impossible.");
      setPushEnabled(true);
      setPushMessage("✓ Ce téléphone recevra les alertes LIVE.");
    } catch (error) { setPushMessage(error?.message || "Activation impossible."); }
  }

  async function disableBrowserNotifications() {
    setPushMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const { data } = await supabase.auth.getSession();
      if (subscription && data.session?.access_token) await fetch("/api/push/subscribe", { method:"DELETE", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${data.session.access_token}` }, body:JSON.stringify({ endpoint:subscription.endpoint }) });
      if (subscription) await subscription.unsubscribe();
      setPushEnabled(false);
      setPushMessage("Notifications désactivées sur ce téléphone.");
    } catch (error) { setPushMessage(error?.message || "Désactivation impossible."); }
  }

  async function sendTest() {
    setPushMessage("Envoi du test…");
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/push/test", { method:"POST", headers:{ Authorization:`Bearer ${data.session?.access_token || ""}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Test impossible.");
      setPushMessage(payload.sent ? "✓ Notification de test envoyée." : "Aucun appareil n’a reçu le test.");
    } catch (error) { setPushMessage(error?.message || "Test impossible."); }
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
          <p className="alerts-muted">Active ce téléphone pour recevoir les événements LIVE, même lorsque le site est fermé ou l’écran verrouillé.</p>
          <div className="alerts-browser-actions">
            {permission === "unsupported" && <span className="alerts-status is-off">Non disponible sur ce navigateur</span>}
            {!pushEnabled && permission !== "denied" && <button type="button" onClick={enableBrowserNotifications}>Activer sur ce téléphone</button>}
            {permission === "denied" && <span className="alerts-status is-off">Notifications bloquées dans le navigateur</span>}
            {pushEnabled && <><span className="alerts-status is-on">✓ Téléphone activé</span><button type="button" className="is-secondary" onClick={sendTest}>Envoyer un test</button><button type="button" className="is-secondary" onClick={disableBrowserNotifications}>Désactiver</button></>}
          </div>
          {pushMessage && <p className="alerts-push-message">{pushMessage}</p>}
        </div>
      </section>

      <FollowedMatchesList />

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
        <p>Android reçoit les alertes dans Chrome, même fermé. Sur iPhone, ajoute d’abord le site à l’écran d’accueil, puis active les notifications depuis cette page.</p>
      </section>
    </div>
  );
}
