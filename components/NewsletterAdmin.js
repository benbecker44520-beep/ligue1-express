"use client";

import { useMemo, useState } from "react";

function formatDate(value) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
  catch { return value; }
}

export default function NewsletterAdmin({ session, articles = [], subscribers = [], onRefreshSubscribers, onRemoveSubscriber }) {
  const publishedArticles = useMemo(() => articles.filter((article) => article.status === "published"), [articles]);
  const [subject, setSubject] = useState("L'essentiel Ligue 1 Express");
  const [intro, setIntro] = useState("Retrouve les dernières actualités, analyses et infos mercato de la rédaction.");
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [testEmail, setTestEmail] = useState(session?.user?.email || "");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  function toggleArticle(id) {
    setSelectedArticleIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function callNewsletterApi(path, body) {
    const token = session?.access_token;
    if (!token) throw new Error("Session administrateur expirée. Reconnecte-toi.");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.error || "Erreur lors de l'envoi.");
    return json;
  }

  async function sendTest() {
    if (!testEmail.trim()) return setStatus("Renseigne l'adresse qui doit recevoir le test.");
    setSending(true); setStatus("");
    try {
      const result = await callNewsletterApi("/api/newsletter/test", {
        to: testEmail.trim(), subject, intro, articleIds: selectedArticleIds
      });
      setStatus(`E-mail de test envoyé ✅${result?.id ? ` · ID ${result.id}` : ""}`);
    } catch (error) { setStatus(error.message); }
    finally { setSending(false); }
  }

  async function sendNewsletter() {
    const activeCount = subscribers.filter((s) => s.active).length;
    if (!activeCount) return setStatus("Aucun abonné actif à qui envoyer la newsletter.");
    if (!window.confirm(`Envoyer cette newsletter à ${activeCount} abonné${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} ?`)) return;
    setSending(true); setStatus("");
    try {
      const result = await callNewsletterApi("/api/newsletter/send", { subject, intro, articleIds: selectedArticleIds });
      setStatus(`Newsletter envoyée ✅ · ${result.sent || 0} envoyé(s)${result.failed ? ` · ${result.failed} échec(s)` : ""}`);
      if (onRefreshSubscribers) onRefreshSubscribers();
    } catch (error) { setStatus(error.message); }
    finally { setSending(false); }
  }

  return <div className="newsletter-admin-v58">
    <div className="newsletter-compose-grid">
      <div className="newsletter-editor-card">
        <span className="eyebrow">ÉDITION</span>
        <h3>Préparer la newsletter</h3>
        <label>Objet<input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} /></label>
        <label>Introduction<textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={5} maxLength={1000} /></label>
        <div className="newsletter-article-picker">
          <span className="admin-field-label">Articles à mettre en avant</span>
          {publishedArticles.length === 0 ? <p className="scorers-empty">Aucun article publié.</p> : publishedArticles.map((article) => <label key={article.id} className={selectedArticleIds.includes(article.id) ? "selected" : ""}>
            <input type="checkbox" checked={selectedArticleIds.includes(article.id)} onChange={() => toggleArticle(article.id)} />
            <span><strong>{article.title}</strong><small>{article.category}</small></span>
          </label>)}
        </div>
        <div className="newsletter-test-row">
          <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="Adresse de test" />
          <button className="mini-button" type="button" disabled={sending} onClick={sendTest}>Envoyer un test</button>
        </div>
        <button className="primary-button" type="button" disabled={sending} onClick={sendNewsletter}>{sending ? "Envoi en cours..." : "📩 Envoyer aux abonnés"}</button>
        {status && <div className="admin-message-box newsletter-send-status">{status}</div>}
        <p className="newsletter-resend-note">Avec <strong>onboarding@resend.dev</strong>, Resend limite les tests à l'adresse autorisée du compte. Pour envoyer à tous les abonnés, configure ensuite un domaine vérifié et la variable <code>NEWSLETTER_FROM_EMAIL</code>.</p>
      </div>

      <div className="newsletter-preview-card">
        <span className="eyebrow">APERÇU</span>
        <div className="newsletter-preview-mail">
          <div className="newsletter-preview-brand">LIGUE 1 <b>EXPRESS</b></div>
          <h2>{subject || "Objet de la newsletter"}</h2>
          <p>{intro || "Ton introduction apparaîtra ici."}</p>
          <div className="newsletter-preview-articles">
            {publishedArticles.filter((a) => selectedArticleIds.includes(a.id)).map((article) => <div key={article.id}>
              {article.image_url && <img src={article.image_url} alt="" />}
              <span>{article.category}</span><strong>{article.title}</strong><small>{article.excerpt}</small>
            </div>)}
            {!selectedArticleIds.length && <em>Sélectionne un ou plusieurs articles pour voir l'aperçu.</em>}
          </div>
          <small className="newsletter-preview-footer">Tu reçois cet e-mail car tu es inscrit à la newsletter Ligue 1 Express. Un lien de désinscription sera ajouté automatiquement.</small>
        </div>
      </div>
    </div>

    <div className="newsletter-subscribers-card">
      <div className="panel-heading"><div><span className="eyebrow">ABONNÉS</span><h3>{subscribers.filter((s) => s.active).length} actif{subscribers.filter((s) => s.active).length > 1 ? "s" : ""}</h3></div><button className="mini-button" onClick={onRefreshSubscribers}>Actualiser</button></div>
      <div className="newsletter-admin-list">
        {subscribers.length === 0 ? <p className="scorers-empty">Aucun abonné pour le moment.</p> : subscribers.map((subscriber) => <div className="newsletter-admin-row" key={subscriber.id}>
          <div><strong>{subscriber.email}</strong><small>{subscriber.active ? "Actif" : "Désinscrit"} · inscrit le {formatDate(subscriber.subscribed_at)}</small></div>
          <button className="mini-button danger" onClick={() => onRemoveSubscriber(subscriber.id)}>Supprimer</button>
        </div>)}
      </div>
    </div>
  </div>;
}
