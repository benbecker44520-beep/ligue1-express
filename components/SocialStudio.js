"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TYPES = {
  article: { label: "📰 Actualité", kicker: "L1 EXPRESS" },
  mercato: { label: "🚨 Mercato", kicker: "MERCATO EXPRESS" },
  prono: { label: "🎯 Prono", kicker: "PRONO L1 EXPRESS" },
  match: { label: "📅 Match à venir", kicker: "MATCH À SUIVRE" },
  resultat: { label: "🏁 Résultat", kicker: "TERMINÉ" },
};

function wrapText(ctx, text, maxWidth, maxLines = 5) {
  const words = String(text || "").toUpperCase().split(/\s+/).filter(Boolean);
  const lines = []; let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error("no image"));
    const img = new Image();
    if (!String(src).startsWith("data:") && !String(src).startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img); img.onerror = reject; img.src = src;
  });
}

function canvasImageSource(src) {
  if (!src) return "";
  const value = String(src);
  if (value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    if (typeof window !== "undefined" && url.origin === window.location.origin) return value;
    return `/api/social-image?url=${encodeURIComponent(value)}`;
  } catch {
    return value;
  }
}

function clubName(team, fallback = "?") { return team?.shortName || team?.name || team || fallback; }
function matchName(m) { return m ? `${clubName(m.home, m.home_team)} - ${clubName(m.away, m.away_team)}` : ""; }
function formatDate(value) { try { return new Intl.DateTimeFormat("fr-FR", { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }).format(new Date(value)); } catch { return ""; } }
function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function sameClub(a, b) { const x = normalize(a), y = normalize(b); return Boolean(x && y && (x === y || x.includes(y) || y.includes(x))); }

export default function SocialStudio({ articles = [], predictions = [], upcomingMatches = [], finishedMatches = [], transfers = [] }) {
  const published = useMemo(() => articles.filter(a => a.status === "published"), [articles]);
  const [type, setType] = useState("article");
  const [itemId, setItemId] = useState("");
  const [headline, setHeadline] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [manualImage, setManualImage] = useState("");
  const [imageMode, setImageMode] = useState("auto");
  const canvasRef = useRef(null);
  const renderTokenRef = useRef(0);
  const fileInputRef = useRef(null);

  const items = type === "article" ? published : type === "mercato" ? transfers : type === "prono" ? predictions : type === "match" ? upcomingMatches : finishedMatches;
  const item = items.find(x => String(x.id) === String(itemId)) || items[0] || null;

  useEffect(() => { setItemId(items[0] ? String(items[0].id) : ""); setManualImage(""); setImageMode("auto"); }, [type]);

  useEffect(() => {
    if (!item) { setHeadline(""); setNote(""); return; }
    if (type === "article") { setHeadline(item.title || ""); setNote(item.excerpt || ""); }
    if (type === "mercato") { setHeadline(`${item.player_name || "Mercato"} : ${item.to_club || "nouvelle destination"}`); setNote(`${item.from_club || "Libre"} → ${item.to_club || "?"}${item.fee ? ` · ${item.fee}` : ""}${item.note ? ` · ${item.note}` : ""}`); }
    if (type === "prono") { setHeadline(`${item.home_team || "?"} - ${item.away_team || "?"} : notre prono ${item.selection || ""}`); setNote(`${item.comment || ""}${item.secondary_bet ? ` · 🎯 ${item.secondary_bet}` : ""}${item.confidence ? ` · Confiance ${item.confidence}/10` : ""}`); }
    if (type === "match") { setHeadline(matchName(item)); setNote(`${formatDate(item.utcDate)}${item.matchday ? ` · Journée ${item.matchday}` : ""}`); }
    if (type === "resultat") { setHeadline(`${matchName(item)} · ${item.score?.fullTime?.home ?? "-"}-${item.score?.fullTime?.away ?? "-"}`); setNote(item.matchday ? `Journée ${item.matchday}` : "Ligue 1"); }
  }, [type, item?.id]);

  const articleUrl = type === "article" && item?.slug ? `https://ligue1-express.vercel.app/article/${item.slug}` : "https://ligue1-express.vercel.app/";
  const kicker = TYPES[type].kicker;
  const facebookText = `${kicker} ⚽\n\n${headline}${note ? `\n\n${note}` : ""}\n\n👉 ${articleUrl}\n\n#Ligue1 #Ligue1Express`;
  const xText = `${kicker} ⚽\n\n${headline}${note ? `\n${note}` : ""}\n\n${articleUrl}\n\n#Ligue1`;

  const relatedMatch = useMemo(() => {
    if (!item) return null;
    if (type === "match" || type === "resultat") return item;
    if (type !== "prono") return null;
    const pool = [...upcomingMatches, ...finishedMatches];
    return pool.find(m => sameClub(clubName(m.home, m.home_team), item.home_team) && sameClub(clubName(m.away, m.away_team), item.away_team)) || null;
  }, [type, item, upcomingMatches, finishedMatches]);

  const homeLogo = relatedMatch?.home?.crest || relatedMatch?.home?.logo || "";
  const awayLogo = relatedMatch?.away?.crest || relatedMatch?.away?.logo || "";
  const homeLabel = type === "prono" ? (item?.home_team || "") : clubName(relatedMatch?.home, relatedMatch?.home_team);
  const awayLabel = type === "prono" ? (item?.away_team || "") : clubName(relatedMatch?.away, relatedMatch?.away_team);
  const automaticImage = type === "article" ? (item?.image_url || "") : type === "mercato" ? (item?.image_url || item?.player_image || item?.photo_url || "") : "";
  const selectedImage = imageMode === "manual" ? manualImage : imageMode === "none" ? "" : automaticImage;

  function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setStatus("Choisis un fichier image (JPG, PNG, WEBP…)."); return; }
    if (file.size > 12 * 1024 * 1024) { setStatus("Image trop lourde : 12 Mo maximum."); return; }
    const reader = new FileReader();
    reader.onload = () => { setManualImage(String(reader.result || "")); setImageMode("manual"); setStatus("Image ajoutée au visuel ✅"); };
    reader.onerror = () => setStatus("Impossible de lire cette image.");
    reader.readAsDataURL(file);
  }

  async function renderCanvas() {
    const visibleCanvas = canvasRef.current; if (!visibleCanvas) return;
    const renderToken = ++renderTokenRef.current;
    const offscreen = document.createElement("canvas");
    const ctx = offscreen.getContext("2d"), W = 1200, H = 1200;
    offscreen.width = W; offscreen.height = H;
    ctx.fillStyle = "#071f4f"; ctx.fillRect(0,0,W,H);

    if (selectedImage) {
      try {
        const img = await loadImage(canvasImageSource(selectedImage));
        if (renderToken !== renderTokenRef.current) return;
        const scale = Math.max(W / img.width, H / img.height);
        const iw = img.width * scale, ih = img.height * scale;
        ctx.drawImage(img, (W-iw)/2, (H-ih)/2, iw, ih);
      } catch {}
    }

    const hasPhoto = Boolean(selectedImage);
    const grad = ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0, hasPhoto ? "rgba(4,25,66,.97)" : "rgba(4,25,66,1)");
    grad.addColorStop(.55, hasPhoto ? "rgba(4,25,66,.72)" : "rgba(8,39,91,.96)");
    grad.addColorStop(1, hasPhoto ? "rgba(4,25,66,.38)" : "rgba(7,31,79,1)");
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

    ctx.fillStyle="#ffd51f"; ctx.fillRect(0,0,W,22);
    ctx.font="900 34px Arial"; ctx.fillText(kicker,78,105);

    const isFixture = type === "match" || type === "prono" || type === "resultat";
    if (isFixture && item) {
      const scoreHome = type === "resultat" ? (item.score?.fullTime?.home ?? "-") : null;
      const scoreAway = type === "resultat" ? (item.score?.fullTime?.away ?? "-") : null;
      const logoY = hasPhoto ? 245 : 225;
      const logoSize = 170;
      const homeX = 130, awayX = W - 130 - logoSize;
      for (const [src,x] of [[homeLogo,homeX],[awayLogo,awayX]]) {
        if (!src) continue;
        try {
          const logo = await loadImage(canvasImageSource(src));
          if (renderToken !== renderTokenRef.current) return;
          const ratio = Math.min(logoSize/logo.width,logoSize/logo.height);
          const lw=logo.width*ratio, lh=logo.height*ratio;
          ctx.fillStyle="rgba(255,255,255,.96)"; ctx.beginPath(); ctx.roundRect(x-18,logoY-18,logoSize+36,logoSize+36,30); ctx.fill();
          ctx.drawImage(logo,x+(logoSize-lw)/2,logoY+(logoSize-lh)/2,lw,lh);
        } catch {}
      }

      ctx.fillStyle="white"; ctx.textAlign="center"; ctx.font="900 35px Arial";
      wrapText(ctx,homeLabel,330,2).forEach((line,i)=>ctx.fillText(line,215,logoY+230+i*38));
      wrapText(ctx,awayLabel,330,2).forEach((line,i)=>ctx.fillText(line,W-215,logoY+230+i*38));

      if (type === "resultat") {
        ctx.fillStyle="#ffd51f"; ctx.font="900 92px Arial"; ctx.fillText(`${scoreHome}  -  ${scoreAway}`,W/2,logoY+120);
      } else {
        ctx.fillStyle="#ffd51f"; ctx.font="900 58px Arial"; ctx.fillText("VS",W/2,logoY+115);
      }
      ctx.textAlign="left";

      const mainY = 690;
      ctx.fillStyle="white"; ctx.font="900 58px Arial";
      wrapText(ctx,headline,1040,3).forEach((line,i)=>ctx.fillText(line,78,mainY+i*68));
      ctx.fillStyle="rgba(255,255,255,.9)"; ctx.font="700 27px Arial";
      wrapText(ctx,note,1000,2).forEach((line,i)=>ctx.fillText(line,78,900+i*38));
    } else {
      ctx.fillStyle="white"; ctx.font="900 72px Arial";
      wrapText(ctx,headline,1035,5).forEach((line,i)=>ctx.fillText(line,78,255+i*84));
      ctx.fillStyle="rgba(255,255,255,.92)"; ctx.font="700 28px Arial";
      wrapText(ctx,note,1000,3).forEach((line,i)=>ctx.fillText(line,78,760+i*40));
    }

    ctx.fillStyle="rgba(7,31,79,.88)"; ctx.fillRect(0,1010,W,190);
    ctx.fillStyle="#ffd51f"; ctx.fillRect(78,1040,360,92);
    ctx.fillStyle="#071f4f"; ctx.font="900 31px Arial"; ctx.fillText("LIGUE 1 EXPRESS",106,1098);
    ctx.fillStyle="white"; ctx.font="700 23px Arial"; ctx.fillText("ligue1-express.vercel.app",470,1095);

    if (renderToken !== renderTokenRef.current) return;
    visibleCanvas.width = W; visibleCanvas.height = H;
    const visibleCtx = visibleCanvas.getContext("2d");
    visibleCtx.clearRect(0,0,W,H);
    visibleCtx.drawImage(offscreen,0,0);
  }
  useEffect(()=>{ renderCanvas(); },[type,item?.id,headline,note,selectedImage,homeLogo,awayLogo,homeLabel,awayLabel]);

  function downloadPng(){ try { const a=document.createElement("a"); a.download=`ligue1-express-${type}-${item?.id || "social"}.png`; a.href=canvasRef.current.toDataURL("image/png"); a.click(); setStatus("Visuel PNG téléchargé ✅"); } catch { setStatus("Export bloqué par une image distante. Essaie un autre visuel."); } }
  async function copy(text,label){ await navigator.clipboard.writeText(text); setStatus(`${label} copié ✅`); }

  return <section className="social-studio admin-panel-standalone">
    <div className="panel-heading"><div><span className="eyebrow">STUDIO SOCIAL V2</span><h2>Créer les posts Ligue 1 Express</h2><p>Actualités, mercato, pronostics, matchs et résultats : prépare le visuel et le texte adapté à chaque réseau.</p></div></div>
    <div className="social-type-picker">{Object.entries(TYPES).map(([key,v])=><button type="button" key={key} className={type===key?"active":""} onClick={()=>setType(key)}>{v.label}</button>)}</div>
    <div className="social-studio-grid">
      <div className="social-studio-controls">
        <label>Contenu<select value={item?.id || ""} onChange={e=>setItemId(e.target.value)}>{items.map(x=><option key={x.id} value={x.id}>{type==="article"?x.title:type==="mercato"?`${x.player_name} → ${x.to_club || "?"}`:type==="prono"?`${x.home_team} - ${x.away_team}`:matchName(x)}</option>)}</select></label>
        {!items.length && <div className="admin-message-box">Aucun contenu disponible pour ce format.</div>}
        <label>Titre du visuel<textarea value={headline} onChange={e=>setHeadline(e.target.value)} rows="3" /></label>
        <label>Accroche<textarea value={note} onChange={e=>setNote(e.target.value)} rows="3" /></label>
        <div className="social-image-card">
          <div><strong>Image du visuel</strong><span>Photo facultative. Pour les matchs, pronos et résultats, les logos clubs sont ajoutés automatiquement quand ils sont disponibles.</span></div>
          <input ref={fileInputRef} className="social-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseImage} />
          <div className="social-image-actions">
            <button type="button" className={imageMode==="manual"?"active":""} onClick={()=>fileInputRef.current?.click()}>📷 Choisir une image</button>
            {automaticImage && <button type="button" className={imageMode==="auto"?"active":""} onClick={()=>setImageMode("auto")}>✨ Image automatique</button>}
            <button type="button" className={imageMode==="none"?"active":""} onClick={()=>setImageMode("none")}>Sans image</button>
          </div>
          {selectedImage && <div className="social-image-thumb"><img src={selectedImage} alt="Aperçu de l’image choisie"/><button type="button" onClick={()=>{setManualImage("");setImageMode(automaticImage?"auto":"none");if(fileInputRef.current)fileInputRef.current.value="";}}>Retirer</button></div>}
          {(type === "match" || type === "prono" || type === "resultat") && <div className="social-club-auto"><span>{homeLogo ? "✅" : "○"} Logo domicile</span><span>{awayLogo ? "✅" : "○"} Logo extérieur</span></div>}
        </div>
        <div className="social-copy-card"><strong>Facebook</strong><textarea value={facebookText} readOnly rows="7"/><button type="button" className="primary-button" onClick={()=>copy(facebookText,"Texte Facebook")}>Copier Facebook</button></div>
        <div className="social-copy-card"><strong>X / Twitter</strong><textarea value={xText} readOnly rows="7"/><button type="button" className="primary-button" onClick={()=>copy(xText,"Texte X")}>Copier X</button></div>
        <div className="social-studio-actions"><button type="button" className="secondary-button" onClick={downloadPng}>Télécharger le PNG</button><a className="mini-button" target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`}>Ouvrir sur X ↗</a><a className="mini-button" target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`}>Ouvrir sur Facebook ↗</a></div>
        {status&&<p className="admin-message">{status}</p>}
      </div>
      <div className="social-studio-preview"><span className="admin-field-label">Aperçu carré 1200 × 1200</span><canvas ref={canvasRef}/></div>
    </div>
  </section>;
}
