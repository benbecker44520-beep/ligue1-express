"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

function fmt(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function shortDate(value) {
  try {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
  } catch {
    return value;
  }
}

function labelDevice(value) {
  return { mobile: "Mobile", desktop: "Ordinateur", tablet: "Tablette", unknown: "Autre" }[value] || value;
}

function labelSource(value) {
  if (!value || value === "direct") return "Accès direct";
  if (value === "internal") return "Navigation interne";
  return value;
}

export default function AnalyticsAdmin() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const { data: result, error: rpcError } = await supabase.rpc("analytics_summary", { p_days: days });
    if (rpcError) {
      setError(rpcError.message);
      setData(null);
    } else {
      setData(result || {});
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [days]);

  const daily = data?.daily || [];
  const maxVisits = Math.max(1, ...daily.map((item) => Number(item.visits || 0)));

  return (
    <section className="analytics-admin-panel admin-panel-standalone">
      <div className="panel-heading analytics-admin-heading">
        <div>
          <span className="eyebrow">AUDIENCE LIGUE 1 EXPRESS</span>
          <h2>Statistiques du site</h2>
          <p>Visites anonymisées, pages consultées et tendances d'audience.</p>
        </div>
        <div className="analytics-admin-actions">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Période des statistiques">
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
          </select>
          <button className="mini-button" onClick={load}>Actualiser</button>
        </div>
      </div>

      {error && <div className="admin-message-box">{error}</div>}
      {loading ? <div className="analytics-loading">Chargement des statistiques…</div> : <>
        <div className="analytics-kpis">
          <article><span>AUJOURD'HUI</span><strong>{fmt(data?.today_visits)}</strong><small>pages vues</small></article>
          <article><span>VISITEURS AUJOURD'HUI</span><strong>{fmt(data?.today_visitors)}</strong><small>visiteurs uniques</small></article>
          <article><span>{days} JOURS</span><strong>{fmt(data?.period_visits)}</strong><small>pages vues</small></article>
          <article><span>VISITEURS UNIQUES</span><strong>{fmt(data?.period_visitors)}</strong><small>sur la période</small></article>
        </div>

        <div className="analytics-grid">
          <article className="analytics-card analytics-chart-card">
            <div className="analytics-card-title"><div><span className="eyebrow">ÉVOLUTION</span><h3>Visites par jour</h3></div><strong>{fmt(data?.period_visits)}</strong></div>
            {daily.length === 0 ? <p className="analytics-empty">Les premières visites apparaîtront ici.</p> :
              <div className="analytics-bars">
                {daily.map((item) => <div className="analytics-bar-item" key={item.day} title={`${shortDate(item.day)} · ${fmt(item.visits)} vues · ${fmt(item.visitors)} visiteurs`}>
                  <div className="analytics-bar-track"><div className="analytics-bar-fill" style={{ height: `${Math.max(4, (Number(item.visits || 0) / maxVisits) * 100)}%` }} /></div>
                  <small>{shortDate(item.day)}</small>
                </div>)}
              </div>}
          </article>

          <article className="analytics-card">
            <div className="analytics-card-title"><div><span className="eyebrow">CONTENU</span><h3>Pages les plus vues</h3></div></div>
            <div className="analytics-ranking">
              {(data?.top_pages || []).length === 0 ? <p className="analytics-empty">Aucune donnée.</p> : (data.top_pages || []).map((item, index) =>
                <div key={item.path}><span className="analytics-rank">{String(index + 1).padStart(2, "0")}</span><div><strong>{item.path}</strong><small>{fmt(item.visitors)} visiteurs</small></div><b>{fmt(item.visits)}</b></div>)}
            </div>
          </article>

          <article className="analytics-card">
            <div className="analytics-card-title"><div><span className="eyebrow">APPAREILS</span><h3>Comment ils consultent</h3></div></div>
            <div className="analytics-breakdown">
              {(data?.devices || []).map((item) => <div key={item.device}><div><span>{labelDevice(item.device)}</span><strong>{fmt(item.visits)}</strong></div><div className="analytics-progress"><i style={{ width: `${Math.round((Number(item.visits || 0) / Math.max(1, Number(data?.period_visits || 0))) * 100)}%` }} /></div></div>)}
            </div>
          </article>

          <article className="analytics-card">
            <div className="analytics-card-title"><div><span className="eyebrow">ACQUISITION</span><h3>D'où viennent les visiteurs</h3></div></div>
            <div className="analytics-ranking compact">
              {(data?.sources || []).length === 0 ? <p className="analytics-empty">Aucune donnée.</p> : (data.sources || []).map((item, index) =>
                <div key={`${item.referrer}-${index}`}><span className="analytics-rank">{String(index + 1).padStart(2, "0")}</span><div><strong>{labelSource(item.referrer)}</strong></div><b>{fmt(item.visits)}</b></div>)}
            </div>
          </article>
        </div>

        <p className="analytics-privacy-note">🔒 Mesure d'audience interne : aucun nom, e-mail, adresse IP brute ou empreinte numérique n'est enregistré. L'espace Admin n'est pas comptabilisé et le signal “Do Not Track” est respecté.</p>
      </>}
    </section>
  );
}
