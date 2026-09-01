"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";
import ShareButtons from "@/components/ShareButtons";
import NewsletterAdmin from "@/components/NewsletterAdmin";
import AnalyticsAdmin from "@/components/AnalyticsAdmin";

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const emptyPredictionForm = {
  id: null, match_id: "", selection: "1", comment: "", secondary_bet: "", confidence: 7, status: "published"
};

const emptyExpressForm = {
  id: null, category: "info", title: "", body: "", club_name: "", player_name: "", link_url: "", status: "published"
};

const emptyTransferForm = {
  id: null, player_name: "", from_club: "", to_club: "", position: "", transfer_type: "transfer", transfer_status: "rumour", fee: "", note: "", occurred_at: ""
};

const emptyForm = {
  id: null,
  slug: "",
  title: "",
  category: "ACTUALITÉS",
  excerpt: "",
  content: "",
  tiktok_url: "",
  image_url: "",
  related_club_ids: [],
  status: "draft"
};

export default function AdminPage() {
  const configured = hasSupabaseConfig();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [articles, setArticles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [finishedMatches, setFinishedMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [scorers, setScorers] = useState([]);
  const [scorerForm, setScorerForm] = useState({ team_side: "home", player_name: "", minute: "", goal_type: "normal" });
  const [scorerMessage, setScorerMessage] = useState("");
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [predictionForm, setPredictionForm] = useState(emptyPredictionForm);
  const [predictionMessage, setPredictionMessage] = useState("");
  const [transfers, setTransfers] = useState([]);
  const [transferForm, setTransferForm] = useState(emptyTransferForm);
  const [transferMessage, setTransferMessage] = useState("");
  const [clubOptions, setClubOptions] = useState([]);
  const [adminSection, setAdminSection] = useState("articles");
  const [expressItems, setExpressItems] = useState([]);
  const [expressForm, setExpressForm] = useState(emptyExpressForm);
  const [expressMessage, setExpressMessage] = useState("");
  const [newsletterSubscribers, setNewsletterSubscribers] = useState([]);
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [matchEvents, setMatchEvents] = useState([]);
  const [eventMessage, setEventMessage] = useState("");
  const [eventForm, setEventForm] = useState({
    team_side: "home",
    event_type: "yellow_card",
    minute: "",
    player_name: "",
    player_in: "",
    player_out: "",
    reason: ""
  });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (session) {
      loadArticles();
      loadFinishedMatches();
      loadUpcomingMatches();
      loadPredictions();
      loadClubs();
      loadNewsletterSubscribers();
      loadTransfers();
      loadExpressItems();
    }
  }, [session]);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);


  useEffect(() => {
    if (session && selectedMatchId) {
      loadScorers(selectedMatchId);
      loadMatchEvents(selectedMatchId);
    } else {
      setScorers([]);
      setMatchEvents([]);
    }
  }, [session, selectedMatchId]);


  async function loadNewsletterSubscribers() {
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("id,email,subscribed_at,active,unsubscribe_token")
      .order("subscribed_at", { ascending: false });
    if (error) setNewsletterMessage(error.message);
    else setNewsletterSubscribers(data || []);
  }

  async function removeNewsletterSubscriber(id) {
    if (!window.confirm("Supprimer cet abonné de la newsletter ?")) return;
    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
    if (error) setNewsletterMessage(error.message);
    else {
      setNewsletterMessage("Abonné supprimé.");
      loadNewsletterSubscribers();
      loadTransfers();
    }
  }

  async function loadClubs() {
    try {
      const response = await fetch("/api/football/standings", { cache: "no-store" });
      const json = await response.json();
      setClubOptions(json?.data || []);
    } catch {
      setClubOptions([]);
    }
  }

  function toggleRelatedClub(teamId) {
    const id = Number(teamId);
    setForm((current) => {
      const ids = (current.related_club_ids || []).map(Number);
      return { ...current, related_club_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] };
    });
  }

  async function loadUpcomingMatches() {
    try {
      const response = await fetch("/api/football/matches?status=UPCOMING", { cache: "no-store" });
      const json = await response.json();
      const matches = json?.data || [];
      setUpcomingMatches(matches);
      setPredictionForm((current) => current.match_id || !matches.length ? current : { ...current, match_id: String(matches[0].id) });
    } catch {
      setPredictionMessage("Impossible de charger les prochains matchs.");
    }
  }

  async function loadPredictions() {
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .order("match_date", { ascending: false });
    if (error) setPredictionMessage(error.message);
    else setPredictions(data || []);
  }

  function editPrediction(prediction) {
    setPredictionForm({
      id: prediction.id,
      match_id: String(prediction.match_id),
      selection: prediction.selection,
      comment: prediction.comment || "",
      secondary_bet: prediction.secondary_bet || "",
      confidence: prediction.confidence || 7,
      status: prediction.status || "draft"
    });
    setPredictionMessage("Mode modification du prono activé.");
  }

  function resetPredictionForm() {
    setPredictionForm({ ...emptyPredictionForm, match_id: upcomingMatches[0]?.id ? String(upcomingMatches[0].id) : "" });
  }

  async function savePrediction(e) {
    e.preventDefault();
    const match = upcomingMatches.find((m) => String(m.id) === String(predictionForm.match_id));
    const existing = predictions.find((p) => String(p.id) === String(predictionForm.id));
    if (!match && !existing) {
      setPredictionMessage("Sélectionne un match à venir.");
      return;
    }

    const payload = {
      match_id: String(match?.id || existing.match_id),
      competition: "Ligue 1",
      home_team: match?.home?.name || existing.home_team,
      away_team: match?.away?.name || existing.away_team,
      match_date: match?.utcDate || existing.match_date,
      selection: predictionForm.selection,
      comment: predictionForm.comment.trim() || null,
      secondary_bet: predictionForm.secondary_bet.trim() || null,
      confidence: Number(predictionForm.confidence) || null,
      status: predictionForm.status,
      updated_at: new Date().toISOString()
    };

    let error;
    if (predictionForm.id) {
      ({ error } = await supabase.from("predictions").update(payload).eq("id", predictionForm.id));
    } else {
      ({ error } = await supabase.from("predictions").insert(payload));
    }

    if (error) {
      setPredictionMessage(error.code === "23505" ? "Un prono existe déjà pour ce match." : error.message);
      return;
    }

    setPredictionMessage(predictionForm.id ? "Prono modifié ✅" : "Prono enregistré ✅");
    resetPredictionForm();
    await loadPredictions();
  }

  async function removePrediction(id) {
    if (!window.confirm("Supprimer ce prono ?")) return;
    const { error } = await supabase.from("predictions").delete().eq("id", id);
    if (error) setPredictionMessage(error.message);
    else {
      if (predictionForm.id === id) resetPredictionForm();
      setPredictionMessage("Prono supprimé.");
      await loadPredictions();
    }
  }

  async function loadExpressItems() {
    const { data, error } = await supabase.from("express_feed").select("*").order("published_at", { ascending: false }).limit(100);
    if (error) setExpressMessage(error.message); else setExpressItems(data || []);
  }
  function editExpressItem(item) { setExpressForm({ ...emptyExpressForm, ...item }); setExpressMessage("Mode modification activé."); }
  function resetExpressForm() { setExpressForm(emptyExpressForm); }
  async function saveExpressItem(e) {
    e.preventDefault();
    const payload = { category: expressForm.category, title: expressForm.title.trim(), body: expressForm.body.trim() || null, club_name: expressForm.club_name.trim() || null, player_name: expressForm.player_name.trim() || null, link_url: expressForm.link_url.trim() || null, status: expressForm.status, updated_at: new Date().toISOString() };
    let error;
    if (expressForm.id) ({ error } = await supabase.from("express_feed").update(payload).eq("id", expressForm.id));
    else ({ error } = await supabase.from("express_feed").insert({ ...payload, published_at: new Date().toISOString() }));
    if (error) { setExpressMessage(error.message); return; }
    setExpressMessage(expressForm.id ? "Info Express modifiée ✅" : "Info Express publiée ✅"); resetExpressForm(); await loadExpressItems();
  }
  async function removeExpressItem(id) {
    if (!window.confirm("Supprimer cette info du Fil Express ?")) return;
    const { error } = await supabase.from("express_feed").delete().eq("id", id);
    if (error) setExpressMessage(error.message); else { setExpressMessage("Info supprimée."); await loadExpressItems(); }
  }

  async function loadTransfers() {
    const { data, error } = await supabase.from("transfers").select("*").order("created_at", { ascending: false });
    if (error) setTransferMessage(error.message); else setTransfers(data || []);
  }

  function editTransfer(t) { setTransferForm({ ...emptyTransferForm, ...t, occurred_at: t.occurred_at || "" }); setTransferMessage("Mode modification activé."); }
  function resetTransferForm() { setTransferForm(emptyTransferForm); }
  async function saveTransfer(e) {
    e.preventDefault();
    const payload = { player_name:transferForm.player_name.trim(), from_club:transferForm.from_club.trim()||null, to_club:transferForm.to_club.trim()||null, position:transferForm.position.trim()||null, transfer_type:transferForm.transfer_type, transfer_status:transferForm.transfer_status, fee:transferForm.fee.trim()||null, note:transferForm.note.trim()||null, occurred_at:transferForm.occurred_at||null, updated_at:new Date().toISOString() };
    let error; if (transferForm.id) ({error}=await supabase.from("transfers").update(payload).eq("id",transferForm.id)); else ({error}=await supabase.from("transfers").insert(payload));
    if(error){setTransferMessage(error.message);return;} setTransferMessage(transferForm.id?"Mouvement modifié ✅":"Mouvement ajouté ✅"); resetTransferForm(); await loadTransfers();
  }
  async function removeTransfer(id){ if(!window.confirm("Supprimer ce mouvement mercato ?")) return; const {error}=await supabase.from("transfers").delete().eq("id",id); if(error)setTransferMessage(error.message); else {setTransferMessage("Mouvement supprimé."); await loadTransfers();} }

  async function loadFinishedMatches() {
    try {
      const response = await fetch("/api/football/matches?status=FINISHED", { cache: "no-store" });
      const json = await response.json();
      const matches = json?.data || [];
      setFinishedMatches(matches);
      if (!selectedMatchId && matches.length) setSelectedMatchId(String(matches[0].id));
    } catch {
      setScorerMessage("Impossible de charger les matchs terminés.");
    }
  }

  async function loadScorers(matchId) {
    const { data, error } = await supabase
      .from("match_scorers")
      .select("*")
      .eq("match_id", String(matchId))
      .order("minute", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) setScorerMessage(error.message);
    else setScorers(data || []);
  }

  async function addScorer(e) {
    e.preventDefault();
    if (!selectedMatchId || !scorerForm.player_name.trim() || scorerForm.minute === "") return;
    const minute = Number(scorerForm.minute);
    if (!Number.isInteger(minute) || minute < 0 || minute > 130) {
      setScorerMessage("Minute invalide.");
      return;
    }

    const { error } = await supabase.from("match_scorers").insert({
      match_id: String(selectedMatchId),
      team_side: scorerForm.team_side,
      player_name: scorerForm.player_name.trim(),
      minute,
      goal_type: scorerForm.goal_type
    });

    if (error) setScorerMessage(error.message);
    else {
      setScorerMessage("Buteur ajouté ✅");
      setScorerForm({ ...scorerForm, player_name: "", minute: "", goal_type: "normal" });
      await loadScorers(selectedMatchId);
    }
  }

  async function removeScorer(id) {
    const { error } = await supabase.from("match_scorers").delete().eq("id", id);
    if (error) setScorerMessage(error.message);
    else {
      setScorerMessage("Buteur supprimé.");
      await loadScorers(selectedMatchId);
    }
  }

  async function loadMatchEvents(matchId) {
    const { data, error } = await supabase
      .from("match_events")
      .select("*")
      .eq("match_id", String(matchId))
      .order("minute", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) setEventMessage(error.message);
    else setMatchEvents(data || []);
  }

  async function addMatchEvent(e) {
    e.preventDefault();
    if (!selectedMatchId || eventForm.minute === "") return;
    const minute = Number(eventForm.minute);
    if (!Number.isInteger(minute) || minute < 0 || minute > 130) {
      setEventMessage("Minute invalide.");
      return;
    }
    if (eventForm.event_type === "substitution" && (!eventForm.player_in.trim() || !eventForm.player_out.trim())) {
      setEventMessage("Indique le joueur entrant et le joueur sortant.");
      return;
    }
    if (eventForm.event_type !== "substitution" && !eventForm.player_name.trim()) {
      setEventMessage("Indique le nom du joueur concerné.");
      return;
    }

    const { error } = await supabase.from("match_events").insert({
      match_id: String(selectedMatchId),
      team_side: eventForm.team_side,
      event_type: eventForm.event_type,
      minute,
      player_name: eventForm.player_name.trim() || null,
      player_in: eventForm.player_in.trim() || null,
      player_out: eventForm.player_out.trim() || null,
      reason: eventForm.reason.trim() || null
    });

    if (error) setEventMessage(error.message);
    else {
      setEventMessage("Action ajoutée ✅");
      setEventForm((current) => ({ ...current, minute: "", player_name: "", player_in: "", player_out: "", reason: "" }));
      await loadMatchEvents(selectedMatchId);
    }
  }

  async function removeMatchEvent(id) {
    if (!window.confirm("Supprimer cette action ?")) return;
    const { error } = await supabase.from("match_events").delete().eq("id", id);
    if (error) setEventMessage(error.message);
    else {
      setEventMessage("Action supprimée.");
      await loadMatchEvents(selectedMatchId);
    }
  }

  function eventTypeLabel(type) {
    return ({
      goal: "⚽ But",
      disallowed_goal: "🚫 But refusé / VAR",
      yellow_card: "🟨 Carton jaune",
      red_card: "🟥 Carton rouge",
      substitution: "🔄 Remplacement"
    })[type] || type;
  }

  const selectedMatch = finishedMatches.find((m) => String(m.id) === String(selectedMatchId));

  async function login(e) {
    e.preventDefault();
    setMessage("Connexion...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : "");
  }

  async function logout() {
    await supabase.auth.signOut();
    setArticles([]);
  }

  async function loadArticles() {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setMessage(error.message);
    else setArticles(data || []);
  }

  async function uploadImage(slug) {
    if (!imageFile) return form.image_url || null;

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${slug}.${ext}`;

    const { error } = await supabase.storage
      .from("article-images")
      .upload(fileName, imageFile, { upsert: false });

    if (error) throw error;

    const { data } = supabase.storage
      .from("article-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  function editArticle(article) {
    setForm({
      id: article.id,
      slug: article.slug,
      title: article.title || "",
      category: article.category || "ACTUALITÉS",
      excerpt: article.excerpt || "",
      content: article.content || "",
      tiktok_url: article.tiktok_url || "",
      image_url: article.image_url || "",
      related_club_ids: article.related_club_ids || [],
      status: article.status || "draft"
    });
    setImageFile(null);
    setPreview(article.image_url || "");
    setMessage("Mode modification activé.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setImageFile(null);
    setPreview("");
    setMessage("");
  }

  async function saveArticle(e) {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    setMessage("");

    try {
      const slug = form.slug || `${slugify(form.title)}-${Date.now().toString().slice(-6)}`;
      const image_url = await uploadImage(slug);

      const payload = {
        slug,
        title: form.title.trim(),
        category: form.category,
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        tiktok_url: form.tiktok_url.trim() || null,
        image_url,
        related_club_ids: (form.related_club_ids || []).map(Number),
        status: form.status,
        published_at: form.status === "published" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      let error;

      if (form.id) {
        ({ error } = await supabase.from("articles").update(payload).eq("id", form.id));
      } else {
        ({ error } = await supabase.from("articles").insert(payload));
      }

      if (error) throw error;

      setMessage(
        form.id
          ? "Article modifié ✅"
          : form.status === "published"
          ? "Article publié ✅"
          : "Brouillon enregistré ✅"
      );

      resetForm();
      await loadArticles();
    } catch (err) {
      setMessage(err.message || "Erreur pendant l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(article) {
    const next = article.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("articles")
      .update({
        status: next,
        published_at: next === "published" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", article.id);

    if (error) setMessage(error.message);
    else {
      setMessage(next === "published" ? "Article publié ✅" : "Article repassé en brouillon.");
      loadArticles();
    }
  }


  async function featureArticle(article) {
    if (article.status !== "published") {
      setMessage("Publie d'abord l'article avant de le mettre à la Une.");
      return;
    }

    const { error: clearError } = await supabase
      .from("articles")
      .update({ is_featured: false })
      .eq("is_featured", true);

    if (clearError) {
      setMessage(clearError.message);
      return;
    }

    const { error } = await supabase
      .from("articles")
      .update({ is_featured: true, updated_at: new Date().toISOString() })
      .eq("id", article.id);

    if (error) setMessage(error.message);
    else {
      setMessage(`"${article.title}" est maintenant À LA UNE ⭐`);
      loadArticles();
    }
  }

  async function removeArticle(article) {
    if (!window.confirm(`Supprimer "${article.title}" ?`)) return;
    const { error } = await supabase.from("articles").delete().eq("id", article.id);
    if (error) setMessage(error.message);
    else {
      if (form.id === article.id) resetForm();
      loadArticles();
    }
  }

  if (!configured) {
    return (
      <div className="page-shell admin-page">
        <span className="eyebrow">LIGUE 1 EXPRESS · V3</span>
        <h1>Administration</h1>
        <div className="setup-box">
          <h2>Connexion Supabase requise</h2>
          <p>Vérifie ton fichier <code>.env.local</code>.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page-shell admin-page">
        <span className="eyebrow">BACK-OFFICE SÉCURISÉ</span>
        <h1>Connexion</h1>
        <form className="admin-form login-form" onSubmit={login}>
          <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>Mot de passe<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          <button className="primary-button">Se connecter</button>
          {message && <p className="admin-message">{message}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="page-shell admin-page">
      <div className="admin-title-row">
        <div>
          <span className="eyebrow">BACK-OFFICE LIGUE 1 EXPRESS</span>
          <h1>Administration</h1>
          <p className="admin-dashboard-subtitle">Choisis ce que tu veux gérer.</p>
        </div>
        <button className="secondary-button" onClick={logout}>Déconnexion</button>
      </div>

      <nav className="admin-dashboard-menu" aria-label="Menu administration">
        <button className={adminSection === "articles" ? "active" : ""} onClick={() => setAdminSection("articles")}><span>📰</span><strong>Articles</strong><small>Publier, modifier et mettre à la Une</small></button>
        <button className={adminSection === "express" ? "active" : ""} onClick={() => setAdminSection("express")}><span>⚡</span><strong>Fil Express</strong><small>Publier une info en quelques secondes</small></button>
        <button className={adminSection === "predictions" ? "active" : ""} onClick={() => setAdminSection("predictions")}><span>🎯</span><strong>Pronostics</strong><small>Pronostics de la rédaction</small></button>
        <button className={adminSection === "transfers" ? "active" : ""} onClick={() => setAdminSection("transfers")}><span>🔁</span><strong>Mercato</strong><small>Arrivées, départs et rumeurs</small></button>
        <button className={adminSection === "scorers" ? "active" : ""} onClick={() => setAdminSection("scorers")}><span>⚽</span><strong>Buteurs</strong><small>Buteurs des matchs terminés</small></button>
        <button className={adminSection === "events" ? "active" : ""} onClick={() => setAdminSection("events")}><span>🟨</span><strong>Faits marquants</strong><small>Cartons, VAR et remplacements</small></button>
        <button className={adminSection === "newsletter" ? "active" : ""} onClick={() => setAdminSection("newsletter")}><span>📩</span><strong>Newsletter</strong><small>Voir et gérer les abonnés</small></button>
        <button className={adminSection === "analytics" ? "active" : ""} onClick={() => setAdminSection("analytics")}><span>📊</span><strong>Statistiques</strong><small>Visiteurs, pages vues et audience</small></button>
      </nav>

      {adminSection === "articles" && <>
      {message && <div className="admin-message-box">{message}</div>}

      <div className="admin-section-heading"><div><span className="eyebrow">RÉDACTION</span><h2>{form.id ? "Modifier l'article" : "Publier un article"}</h2></div>{form.id && <button className="mini-button" onClick={resetForm}>Nouvel article</button>}</div>
      <div className="admin-grid admin-grid-v3">
        <form className="admin-form" onSubmit={saveArticle}>
          <label>
            Titre
            <input value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="Ex. Marseille frappe fort sur le mercato" required />
          </label>

          <label>
            Catégorie
            <select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
              <option>ACTUALITÉS</option>
              <option>MERCATO</option>
              <option>ANALYSES</option>
            </select>
          </label>

          <div className="admin-related-clubs">
            <span className="admin-field-label">Clubs concernés</span>
            <p>Sélectionne les clubs cités dans l'article. Ils seront cliquables vers leur fiche.</p>
            <div className="admin-club-picker">
              {clubOptions.map((club) => {
                const checked = (form.related_club_ids || []).map(Number).includes(Number(club.teamId));
                return (
                  <label key={club.teamId} className={checked ? "selected" : ""}>
                    <input type="checkbox" checked={checked} onChange={() => toggleRelatedClub(club.teamId)} />
                    {club.logo && <img src={club.logo} alt="" width="22" height="22" />}
                    <span>{club.shortName || club.team}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label>
            Image de l'article
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
          </label>

          {(preview || form.image_url) && (
            <div className="admin-image-preview" style={{ backgroundImage: `url("${preview || form.image_url}")` }}>
              <span>Aperçu image</span>
            </div>
          )}

          <label>
            Résumé
            <textarea value={form.excerpt} onChange={e => setForm({...form, excerpt:e.target.value})} placeholder="2 ou 3 lignes pour donner envie de lire..." required />
          </label>

          <label>
            Article
            <textarea className="article-editor" value={form.content} onChange={e => setForm({...form, content:e.target.value})} placeholder={"Écris ton article ici.\n\nSépare les paragraphes avec une ligne vide."} required />
          </label>

          <label>
            Lien TikTok (facultatif)
            <input value={form.tiktok_url} onChange={e => setForm({...form, tiktok_url:e.target.value})} placeholder="https://www.tiktok.com/..." />
          </label>

          <label>
            Publication
            <select value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </label>

          <button className="primary-button" disabled={saving}>
            {saving ? "Enregistrement..." : form.id ? "Enregistrer les modifications" : "Enregistrer l'article"}
          </button>
        </form>

        <div className="drafts">
          <div className="panel-heading">
            <h2>Mes articles</h2>
            <button className="mini-button" onClick={loadArticles}>Actualiser</button>
          </div>

          {articles.length === 0 && <p>Aucun article pour le moment.</p>}

          {articles.map(article => (
            <div className="draft-card draft-card-v3" key={article.id}>
              {article.image_url && (
                <div className="admin-list-image" style={{ backgroundImage: `url("${article.image_url}")` }} />
              )}
              <div className="article-admin-meta">
                <span className="tag">{article.category}</span>
                <div className="admin-badges">
                  {article.is_featured && <span className="featured-pill">⭐ À LA UNE</span>}
                  <span className={`status-pill ${article.status}`}>
                    {article.status === "published" ? "Publié" : "Brouillon"}
                  </span>
                </div>
              </div>
              <strong>{article.title}</strong>
              <p>{article.excerpt}</p>
              <div className="admin-actions">
                <button className="mini-button" onClick={() => editArticle(article)}>Modifier</button>
                {!article.is_featured && article.status === "published" && (
                  <button className="mini-button featured-button" onClick={() => featureArticle(article)}>⭐ Mettre à la Une</button>
                )}
                <button className="mini-button" onClick={() => toggleStatus(article)}>
                  {article.status === "published" ? "Dépublier" : "Publier"}
                </button>
                <button className="mini-button danger" onClick={() => removeArticle(article)}>Supprimer</button>
              </div>
              {article.status === "published" && (
                <div className="admin-share-row">
                  <span>Partager l'article :</span>
                  <ShareButtons compact title={article.title} path={`/article/${article.slug}`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </>}

      {adminSection === "predictions" && <section className="predictions-admin-panel admin-panel-standalone">
        <div className="panel-heading scorers-admin-heading">
          <div>
            <span className="eyebrow">PRONO 1 / N / 2</span>
            <h2>Pronostics de la rédaction</h2>
          </div>
          <div className="admin-top-actions">
            {predictionForm.id && <button className="mini-button" onClick={resetPredictionForm}>Nouveau prono</button>}
            <button className="mini-button" onClick={() => { loadUpcomingMatches(); loadPredictions(); }}>Actualiser</button>
          </div>
        </div>

        {predictionMessage && <div className="admin-message-box">{predictionMessage}</div>}

        <div className="predictions-admin-grid">
          <form className="admin-form prediction-form" onSubmit={savePrediction}>
            <label>
              Match Ligue 1
              <select value={predictionForm.match_id} onChange={e => setPredictionForm({...predictionForm, match_id:e.target.value})} required>
                <option value="">Sélectionner un match</option>
                {predictionForm.id && !upcomingMatches.some((m) => String(m.id) === String(predictionForm.match_id)) && (() => {
                  const current = predictions.find((p) => String(p.id) === String(predictionForm.id));
                  return current ? <option value={current.match_id}>{current.home_team} - {current.away_team}</option> : null;
                })()}
                {upcomingMatches.map(match => (
                  <option key={match.id} value={match.id}>
                    J{match.matchday || "—"} · {match.home.shortName || match.home.name} - {match.away.shortName || match.away.name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="admin-field-label">Pronostic</span>
              <div className="prediction-choice-buttons">
                {["1","N","2"].map(choice => (
                  <button type="button" key={choice} className={predictionForm.selection === choice ? "active" : ""} onClick={() => setPredictionForm({...predictionForm, selection:choice})}>{choice}</button>
                ))}
              </div>
              <small className="prediction-help">1 = domicile · N = nul · 2 = extérieur</small>
            </div>

            <label>
              Commentaire / analyse
              <textarea value={predictionForm.comment} onChange={e => setPredictionForm({...predictionForm, comment:e.target.value})} placeholder="Ex. Monaco est solide à domicile et reste sur une bonne dynamique..." />
            </label>

            <label>
              Pari complémentaire
              <input value={predictionForm.secondary_bet} onChange={e => setPredictionForm({...predictionForm, secondary_bet:e.target.value})} placeholder="Ex. Plus de 1,5 but dans le match" />
            </label>
            <label>
              Indice de confiance : <strong>{predictionForm.confidence}/10</strong>
              <input type="range" min="1" max="10" value={predictionForm.confidence} onChange={e => setPredictionForm({...predictionForm, confidence:e.target.value})} />
            </label>

            <label>
              Publication
              <select value={predictionForm.status} onChange={e => setPredictionForm({...predictionForm, status:e.target.value})}>
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
            </label>

            <button className="primary-button">{predictionForm.id ? "Enregistrer le prono" : "Publier le prono"}</button>
          </form>

          <div className="predictions-admin-list">
            <h3>Historique des pronos</h3>
            {predictions.length === 0 ? <p className="scorers-empty">Aucun prono enregistré.</p> : predictions.map(prediction => (
              <div className="prediction-admin-card" key={prediction.id}>
                <div className="prediction-admin-main">
                  <div><span className="tag">{prediction.selection}</span><strong>{prediction.home_team} - {prediction.away_team}</strong></div>
                  <small>{prediction.status === "published" ? "Publié" : "Brouillon"}</small>
                  {prediction.comment && <p>{prediction.comment}</p>}
                </div>
                <div className="admin-actions">
                  <button className="mini-button" onClick={() => editPrediction(prediction)}>Modifier</button>
                  <button className="mini-button danger" onClick={() => removePrediction(prediction.id)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {adminSection === "express" && <section className="predictions-admin-panel admin-panel-standalone express-admin-panel">
        <div className="panel-heading scorers-admin-heading"><div><span className="eyebrow">V8.7 · À LA MINUTE</span><h2>⚡ Fil Express</h2><p>Publie une brève en quelques secondes. Elle sera prête pour les futures notifications mobiles.</p></div>{expressForm.id && <button className="mini-button" onClick={resetExpressForm}>Nouvelle info</button>}</div>
        {expressMessage && <div className="admin-message-box">{expressMessage}</div>}
        <div className="predictions-admin-grid"><form className="admin-form" onSubmit={saveExpressItem}>
          <label>Catégorie<select value={expressForm.category} onChange={e=>setExpressForm({...expressForm,category:e.target.value})}><option value="info">⚡ Info</option><option value="mercato">🔁 Mercato</option><option value="officiel">✅ Officiel</option><option value="match">⚽ Match</option><option value="blessure">🚑 Blessure</option><option value="declaration">🎙️ Déclaration</option><option value="coupe">🏆 Coupe de France</option><option value="club">🏟️ Club</option></select></label>
          <label>Titre court<input required maxLength="140" value={expressForm.title} onChange={e=>setExpressForm({...expressForm,title:e.target.value})} placeholder="Ex. Le LOSC annonce une prolongation" /></label>
          <label>Détail facultatif<textarea value={expressForm.body} onChange={e=>setExpressForm({...expressForm,body:e.target.value})} placeholder="Une ou deux phrases maximum..." /></label>
          <div className="admin-two-cols"><label>Club concerné<input value={expressForm.club_name} onChange={e=>setExpressForm({...expressForm,club_name:e.target.value})} placeholder="Ex. Olympique de Marseille" /></label><label>Joueur concerné<input value={expressForm.player_name} onChange={e=>setExpressForm({...expressForm,player_name:e.target.value})} placeholder="Ex. Mason Greenwood" /></label></div>
          <label>Lien interne facultatif<input value={expressForm.link_url} onChange={e=>setExpressForm({...expressForm,link_url:e.target.value})} placeholder="/mercato ou /article/mon-article" /></label>
          <label>Statut<select value={expressForm.status} onChange={e=>setExpressForm({...expressForm,status:e.target.value})}><option value="published">Publié immédiatement</option><option value="draft">Brouillon</option></select></label>
          <button className="primary-button">{expressForm.id ? "Enregistrer" : "⚡ Publier maintenant"}</button>
        </form><div className="predictions-admin-list"><h3>Dernières infos</h3>{expressItems.length===0?<p>Aucune info publiée.</p>:expressItems.map(item=><div className="prediction-admin-card" key={item.id}><div className="prediction-admin-main"><div><span className="tag">{item.category}</span><strong>{item.title}</strong></div><small>{new Date(item.published_at).toLocaleString("fr-FR")}{item.status === "draft" ? " · BROUILLON" : ""}</small>{item.body&&<p>{item.body}</p>}</div><div className="admin-actions"><button className="mini-button" onClick={()=>editExpressItem(item)}>Modifier</button><button className="mini-button danger" onClick={()=>removeExpressItem(item.id)}>Supprimer</button></div></div>)}</div></div>
      </section>}

      {adminSection === "transfers" && <section className="predictions-admin-panel admin-panel-standalone">
        <div className="panel-heading scorers-admin-heading"><div><span className="eyebrow">CENTRE MERCATO</span><h2>Mouvements & rumeurs</h2></div>{transferForm.id && <button className="mini-button" onClick={resetTransferForm}>Nouveau mouvement</button>}</div>
        {transferMessage && <div className="admin-message-box">{transferMessage}</div>}
        <div className="predictions-admin-grid"><form className="admin-form" onSubmit={saveTransfer}>
          <label>Joueur<input required value={transferForm.player_name} onChange={e=>setTransferForm({...transferForm,player_name:e.target.value})} placeholder="Ex. Paul Pogba" /></label>
          <div className="admin-two-cols"><label>Club de départ<input value={transferForm.from_club} onChange={e=>setTransferForm({...transferForm,from_club:e.target.value})} placeholder="Ex. Juventus" /></label><label>Club d'arrivée<input value={transferForm.to_club} onChange={e=>setTransferForm({...transferForm,to_club:e.target.value})} placeholder="Ex. AS Monaco" /></label></div>
          <div className="admin-two-cols"><label>Statut<select value={transferForm.transfer_status} onChange={e=>setTransferForm({...transferForm,transfer_status:e.target.value})}><option value="official">✅ Officiel</option><option value="advanced">🔥 Dossier avancé</option><option value="rumour">👀 Rumeur</option></select></label><label>Type<select value={transferForm.transfer_type} onChange={e=>setTransferForm({...transferForm,transfer_type:e.target.value})}><option value="transfer">Transfert</option><option value="loan">Prêt</option><option value="free">Libre</option><option value="return">Retour de prêt</option></select></label></div>
          <div className="admin-two-cols"><label>Poste<input value={transferForm.position} onChange={e=>setTransferForm({...transferForm,position:e.target.value})} placeholder="Milieu" /></label><label>Montant<input value={transferForm.fee} onChange={e=>setTransferForm({...transferForm,fee:e.target.value})} placeholder="25 M€ / Libre" /></label></div>
          <label>Date<input type="date" value={transferForm.occurred_at} onChange={e=>setTransferForm({...transferForm,occurred_at:e.target.value})} /></label><label>Note<textarea value={transferForm.note} onChange={e=>setTransferForm({...transferForm,note:e.target.value})} placeholder="Contexte du dossier..." /></label>
          <button className="primary-button">{transferForm.id?"Enregistrer":"Ajouter au Centre Mercato"}</button>
        </form><div className="predictions-admin-list"><h3>Mouvements suivis</h3>{transfers.length===0?<p>Aucun mouvement.</p>:transfers.map(t=><div className="prediction-admin-card" key={t.id}><div className="prediction-admin-main"><div><span className="tag">{t.transfer_status}</span><strong>{t.player_name}</strong></div><small>{t.from_club||"Libre"} → {t.to_club||"?"}</small>{t.note&&<p>{t.note}</p>}</div><div className="admin-actions"><button className="mini-button" onClick={()=>editTransfer(t)}>Modifier</button><button className="mini-button danger" onClick={()=>removeTransfer(t.id)}>Supprimer</button></div></div>)}</div></div>
      </section>}

      {adminSection === "scorers" && <section className="scorers-admin-panel admin-panel-standalone">
        <div className="panel-heading scorers-admin-heading">
          <div>
            <span className="eyebrow">FICHES MATCH</span>
            <h2>Buteurs des matchs terminés</h2>
          </div>
          <button className="mini-button" onClick={loadFinishedMatches}>Actualiser les matchs</button>
        </div>

        {scorerMessage && <div className="admin-message-box">{scorerMessage}</div>}

        <div className="scorers-admin-grid">
          <form className="admin-form scorer-form" onSubmit={addScorer}>
            <label>
              Match
              <select value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)}>
                {finishedMatches.map(match => (
                  <option key={match.id} value={match.id}>
                    J{match.matchday || "—"} · {match.home.shortName || match.home.name} {match.score.home}-{match.score.away} {match.away.shortName || match.away.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="scorer-form-row">
              <label>
                Équipe
                <select value={scorerForm.team_side} onChange={e => setScorerForm({...scorerForm, team_side:e.target.value})}>
                  <option value="home">{selectedMatch?.home?.shortName || selectedMatch?.home?.name || "Domicile"}</option>
                  <option value="away">{selectedMatch?.away?.shortName || selectedMatch?.away?.name || "Extérieur"}</option>
                </select>
              </label>
              <label>
                Minute
                <input type="number" min="0" max="130" value={scorerForm.minute} onChange={e => setScorerForm({...scorerForm, minute:e.target.value})} placeholder="67" required />
              </label>
            </div>

            <label>
              Buteur
              <input value={scorerForm.player_name} onChange={e => setScorerForm({...scorerForm, player_name:e.target.value})} placeholder="Nom du joueur" required />
            </label>

            <label>
              Type de but
              <select value={scorerForm.goal_type} onChange={e => setScorerForm({...scorerForm, goal_type:e.target.value})}>
                <option value="normal">But</option>
                <option value="penalty">Penalty</option>
                <option value="own_goal">Contre son camp</option>
              </select>
            </label>

            <button className="primary-button">Ajouter le buteur</button>
          </form>

          <div className="scorers-admin-list">
            <h3>{selectedMatch ? `${selectedMatch.home.shortName || selectedMatch.home.name} ${selectedMatch.score.home}-${selectedMatch.score.away} ${selectedMatch.away.shortName || selectedMatch.away.name}` : "Sélectionne un match"}</h3>
            {scorers.length === 0 ? (
              <p className="scorers-empty">Aucun buteur enregistré pour ce match.</p>
            ) : scorers.map(scorer => (
              <div className="scorer-admin-row" key={scorer.id}>
                <div>
                  <span className={`scorer-side ${scorer.team_side}`}>{scorer.team_side === "home" ? "DOM" : "EXT"}</span>
                  <strong>⚽ {scorer.minute}' {scorer.player_name}</strong>
                  {scorer.goal_type === "penalty" && <small>PEN.</small>}
                  {scorer.goal_type === "own_goal" && <small>CSC</small>}
                </div>
                <button className="mini-button danger" onClick={() => removeScorer(scorer.id)}>Supprimer</button>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {adminSection === "events" && <section className="scorers-admin-panel admin-panel-standalone match-events-admin-panel">
        <div className="panel-heading scorers-admin-heading">
          <div>
            <span className="eyebrow">FIL DU MATCH</span>
            <h2>Actions marquantes</h2>
            <p>Ajoute manuellement les cartons, décisions VAR et remplacements qui manquent aux données automatiques.</p>
          </div>
          <button className="mini-button" onClick={() => { loadFinishedMatches(); if (selectedMatchId) loadMatchEvents(selectedMatchId); }}>Actualiser</button>
        </div>

        {eventMessage && <div className="admin-message-box">{eventMessage}</div>}

        <div className="scorers-admin-grid">
          <form className="admin-form scorer-form" onSubmit={addMatchEvent}>
            <label>
              Match
              <select value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)}>
                {finishedMatches.map(match => (
                  <option key={match.id} value={match.id}>
                    J{match.matchday || "—"} · {match.home.shortName || match.home.name} {match.score.home}-{match.score.away} {match.away.shortName || match.away.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="scorer-form-row">
              <label>
                Équipe
                <select value={eventForm.team_side} onChange={e => setEventForm({...eventForm, team_side:e.target.value})}>
                  <option value="home">{selectedMatch?.home?.shortName || selectedMatch?.home?.name || "Domicile"}</option>
                  <option value="away">{selectedMatch?.away?.shortName || selectedMatch?.away?.name || "Extérieur"}</option>
                </select>
              </label>
              <label>
                Minute
                <input type="number" min="0" max="130" value={eventForm.minute} onChange={e => setEventForm({...eventForm, minute:e.target.value})} placeholder="67" required />
              </label>
            </div>

            <label>
              Type d'action
              <select value={eventForm.event_type} onChange={e => setEventForm({...eventForm, event_type:e.target.value})}>
                <option value="goal">⚽ But</option>
                <option value="disallowed_goal">🚫 But refusé / VAR</option>
                <option value="yellow_card">🟨 Carton jaune</option>
                <option value="red_card">🟥 Carton rouge</option>
                <option value="substitution">🔄 Remplacement</option>
              </select>
            </label>

            {eventForm.event_type === "substitution" ? <>
              <label>Joueur sortant<input value={eventForm.player_out} onChange={e => setEventForm({...eventForm, player_out:e.target.value})} placeholder="Nom du joueur sortant" required /></label>
              <label>Joueur entrant<input value={eventForm.player_in} onChange={e => setEventForm({...eventForm, player_in:e.target.value})} placeholder="Nom du joueur entrant" required /></label>
            </> : <label>Joueur concerné<input value={eventForm.player_name} onChange={e => setEventForm({...eventForm, player_name:e.target.value})} placeholder="Nom du joueur" required /></label>}

            <label>
              Détail (facultatif)
              <input value={eventForm.reason} onChange={e => setEventForm({...eventForm, reason:e.target.value})} placeholder="Ex. faute, contestation, VAR hors-jeu..." />
            </label>

            <button className="primary-button">Ajouter l'action</button>
          </form>

          <div className="scorers-admin-list">
            <h3>{selectedMatch ? `${selectedMatch.home.shortName || selectedMatch.home.name} ${selectedMatch.score.home}-${selectedMatch.score.away} ${selectedMatch.away.shortName || selectedMatch.away.name}` : "Sélectionne un match"}</h3>
            {matchEvents.length === 0 ? <p className="scorers-empty">Aucune action manuelle enregistrée pour ce match.</p> : matchEvents.map(event => (
              <div className="match-event-admin-row" key={event.id}>
                <div>
                  <span className={`scorer-side ${event.team_side}`}>{event.team_side === "home" ? "DOM" : "EXT"}</span>
                  <strong>{event.minute}' · {eventTypeLabel(event.event_type)}</strong>
                  {event.event_type === "substitution" ? <p>{event.player_out} sort · {event.player_in} entre</p> : <p>{event.player_name}</p>}
                  {event.reason && <small>{event.reason}</small>}
                </div>
                <button className="mini-button danger" onClick={() => removeMatchEvent(event.id)}>Supprimer</button>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {adminSection === "analytics" && <AnalyticsAdmin />}

      {adminSection === "newsletter" && <section className="predictions-admin-panel admin-panel-standalone">
        <div className="panel-heading scorers-admin-heading">
          <div><span className="eyebrow">NEWSLETTER · V5.8</span><h2>Newsletter Ligue 1 Express</h2><p>Prépare, teste et envoie une édition aux abonnés actifs.</p></div>
        </div>
        {newsletterMessage && <div className="admin-message-box">{newsletterMessage}</div>}
        <NewsletterAdmin session={session} articles={articles} subscribers={newsletterSubscribers} onRefreshSubscribers={loadNewsletterSubscribers} onRemoveSubscriber={removeNewsletterSubscriber} />
      </section>}
    </div>
  );
}
