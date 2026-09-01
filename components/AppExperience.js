"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "ligue1-express-install-dismissed-v1";

export default function AppExperience() {
  const [installEvent, setInstallEvent] = useState(null);
  const [standalone, setStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const standaloneMode = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
    setStandalone(Boolean(standaloneMode));
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setStandalone(true);
      setInstallEvent(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => null);
    setInstallEvent(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  const showInstall = !standalone && !dismissed && (Boolean(installEvent) || isIOS);

  return (
    <>
      {showInstall && (
        <aside className="app-install-banner" aria-label="Installer Ligue 1 Express">
          <div className="app-install-copy">
            <span>📱 MODE APP</span>
            <strong>Installe Ligue 1 Express sur ton téléphone</strong>
            <p>Accès plein écran, raccourci direct et navigation pensée mobile.</p>
          </div>
          <div className="app-install-actions">
            {installEvent ? (
              <button type="button" onClick={install}>Installer</button>
            ) : (
              <button type="button" onClick={() => setShowIOSHelp((v) => !v)}>Comment installer ?</button>
            )}
            <button type="button" className="is-ghost" onClick={dismiss}>Plus tard</button>
          </div>
          {showIOSHelp && (
            <p className="ios-install-help">Sur iPhone/iPad : ouvre le menu Partager de Safari, puis choisis « Sur l’écran d’accueil ».</p>
          )}
        </aside>
      )}

      <nav className="mobile-app-nav" aria-label="Navigation application mobile">
        <Link href="/"><span>⌂</span><strong>Accueil</strong></Link>
        <Link href="/live"><span>●</span><strong>Live</strong></Link>
        <Link href="/fil-express"><span>⚡</span><strong>Fil</strong></Link>
        <Link href="/actualites"><span>▤</span><strong>Actus</strong></Link>
        <Link href="/mes-alertes"><span>★</span><strong>Mon Club</strong></Link>
      </nav>
    </>
  );
}
