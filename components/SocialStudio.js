"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const FORMATS = {
  mercato: { label: "🚨 Mercato", kicker: "MERCATO EXPRESS", accent: "#ffd51f" },
  breaking: { label: "⚡ Breaking", kicker: "L1 EXPRESS", accent: "#ffd51f" },
  debat: { label: "🗣️ Débat", kicker: "LE DÉBAT", accent: "#ffd51f" },
  stat: { label: "📊 Stat", kicker: "LE CHIFFRE", accent: "#ffd51f" },
  topflop: { label: "🔥 Top / Flop", kicker: "TOP / FLOP", accent: "#ffd51f" },
};

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").toUpperCase().split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error("no image"));
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function SocialStudio({ articles = [] }) {
  const published = useMemo(() => articles.filter((a) => a.status === "published"), [articles]);
  const [articleId, setArticleId] = useState("");
  const article = published.find((a) => String(a.id) === String(articleId)) || published[0] || null;
  const [format, setFormat] = useState("breaking");
  const [headline, setHeadline] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!articleId && published[0]) setArticleId(String(published[0].id));
  }, [published, articleId]);

  useEffect(() => {
    if (article) {
      setHeadline(article.title || "");
      setNote(article.excerpt || "");
      const cat = String(article.category || "").toLowerCase();
      setFormat(cat.includes("mercato") ? "mercato" : "breaking");
    }
  }, [article?.id]);

  const articleUrl = article ? `https://ligue1-express.vercel.app/article/${article.slug}` : "https://ligue1-express.vercel.app/";
  const socialText = `${FORMATS[format].kicker} ⚽\n\n${headline}${note ? `\n\n${note}` : ""}\n\n${articleUrl}`;

  async function renderCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 1200, H = 1200;
    canvas.width = W; canvas.height = H;
    ctx.fillStyle = "#071f4f"; ctx.fillRect(0, 0, W, H);

    if (article?.image_url) {
      try {
        const img = await loadImage(article.image_url);
        const scale = Math.max(W / img.width, H / img.height);
        const iw = img.width * scale, ih = img.height * scale;
        ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
      } catch {}
    }

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "rgba(4,25,66,.97)");
    grad.addColorStop(.62, "rgba(4,25,66,.74)");
    grad.addColorStop(1, "rgba(4,25,66,.35)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = FORMATS[format].accent; ctx.fillRect(0, 0, W, 22);

    ctx.fillStyle = FORMATS[format].accent;
    ctx.font = "900 34px Arial";
    ctx.fillText(FORMATS[format].kicker, 78, 110);

    ctx.fillStyle = "white";
    ctx.font = "900 76px Arial";
    const lines = wrapText(ctx, headline, 1035);
    lines.forEach((line, i) => ctx.fillText(line, 78, 260 + i * 88));

    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "700 29px Arial";
    const sub = wrapText(ctx, note, 1000).slice(0, 2);
    sub.forEach((line, i) => ctx.fillText(line, 78, 760 + i * 42));

    ctx.fillStyle = "#ffd51f";
    ctx.fillRect(78, 1020, 360, 92);
    ctx.fillStyle = "#071f4f";
    ctx.font = "900 31px Arial";
    ctx.fillText("LIGUE 1 EXPRESS", 106, 1078);
    ctx.fillStyle = "white";
    ctx.font = "700 23px Arial";
    ctx.fillText("ligue1-express.vercel.app", 470, 1075);
  }

  useEffect(() => { renderCanvas(); }, [article?.id, article?.image_url, format, headline, note]);

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const link = document.createElement("a");
      link.download = `ligue1-express-${article?.slug || "social"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setStatus("Visuel PNG téléchargé ✅");
    } catch {
      setStatus("L’image distante bloque l’export. Essaie une image article stockée dans Supabase.");
    }
  }

  async function copyText() {
    await navigator.clipboard.writeText(socialText);
    setStatus("Texte copié ✅");
  }

  return <section className="social-studio admin-panel-standalone">
    <div className="panel-heading">
      <div><span className="eyebrow">STUDIO SOCIAL</span><h2>Créer un post Ligue 1 Express</h2><p>Choisis un article, adapte le message et récupère un visuel prêt pour Facebook ou X.</p></div>
    </div>
    <div className="social-studio-grid">
      <div className="social-studio-controls">
        <label>Article<select value={article?.id || ""} onChange={(e) => setArticleId(e.target.value)}>{published.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
        <div><span className="admin-field-label">Format</span><div className="social-template-picker">{Object.entries(FORMATS).map(([key, item]) => <button type="button" key={key} className={format === key ? "active" : ""} onClick={() => setFormat(key)}>{item.label}</button>)}</div></div>
        <label>Titre du post<textarea value={headline} onChange={(e) => setHeadline(e.target.value)} rows="3" /></label>
        <label>Accroche<textarea value={note} onChange={(e) => setNote(e.target.value)} rows="3" /></label>
        <label>Texte Facebook / X<textarea value={socialText} readOnly rows="8" /></label>
        <div className="social-studio-actions"><button type="button" className="primary-button" onClick={copyText}>Copier le texte</button><button type="button" className="secondary-button" onClick={downloadPng}>Télécharger le PNG</button></div>
        <div className="social-studio-actions"><a className="mini-button" target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(socialText)}`}>Ouvrir sur X ↗</a><a className="mini-button" target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`}>Ouvrir sur Facebook ↗</a></div>
        {status && <p className="admin-message">{status}</p>}
      </div>
      <div className="social-studio-preview"><span className="admin-field-label">Aperçu carré 1200 × 1200</span><canvas ref={canvasRef} /></div>
    </div>
  </section>;
}
