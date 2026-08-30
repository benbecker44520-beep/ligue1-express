"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const emptyForm = {
  id: null,
  slug: "",
  title: "",
  category: "ACTUALITÉS",
  excerpt: "",
  content: "",
  tiktok_url: "",
  image_url: "",
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

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (session) { loadArticles(); loadFinishedMatches(); }
  }, [session]);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);


  useEffect(() => {
    if (session && selectedMatchId) loadScorers(selectedMatchId);
    else setScorers([]);
  }, [session, selectedMatchId]);

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
          <span className="eyebrow">BACK-OFFICE LIGUE 1 EXPRESS · V3</span>
          <h1>{form.id ? "Modifier l'article" : "Publier un article"}</h1>
        </div>
        <div className="admin-top-actions">
          {form.id && <button className="mini-button" onClick={resetForm}>Nouvel article</button>}
          <button className="secondary-button" onClick={logout}>Déconnexion</button>
        </div>
      </div>

      {message && <div className="admin-message-box">{message}</div>}

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
            </div>
          ))}
        </div>
      </div>

      <section className="scorers-admin-panel">
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
      </section>
    </div>
  );
}
