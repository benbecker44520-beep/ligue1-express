"use client";

import { useState } from "react";

export default function ShareButtons({ title, path = "", compact = false }) {
  const [message, setMessage] = useState("");

  function currentUrl() {
    if (typeof window === "undefined") return path;
    if (path?.startsWith("http")) return path;
    if (path) return `${window.location.origin}${path}`;
    return window.location.href;
  }

  function open(url) {
    window.open(url, "_blank", "noopener,noreferrer,width=760,height=680");
  }

  function shareFacebook() {
    const url = currentUrl();
    open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  }

  function shareX() {
    const url = currentUrl();
    open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title || "Ligue 1 Express")}&url=${encodeURIComponent(url)}`);
  }

  async function shareInstagram() {
    const url = currentUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "Ligue 1 Express", text: title || "Ligue 1 Express", url });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    await copyLink("Lien copié : ouvre Instagram puis colle-le dans ta publication ou ta story.");
  }

  async function copyLink(customMessage = "Lien copié ✅") {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setMessage(customMessage);
      window.setTimeout(() => setMessage(""), 3500);
    } catch {
      setMessage("Impossible de copier automatiquement le lien.");
    }
  }

  return (
    <div className={`share-actions ${compact ? "share-actions-compact" : ""}`}>
      <button type="button" onClick={shareFacebook} aria-label="Partager sur Facebook">Facebook</button>
      <button type="button" onClick={shareX} aria-label="Partager sur X">X</button>
      <button type="button" onClick={shareInstagram} aria-label="Partager via Instagram">Instagram</button>
      <button type="button" onClick={() => copyLink()} aria-label="Copier le lien">Copier le lien</button>
      {message && <small className="share-message">{message}</small>}
    </div>
  );
}
