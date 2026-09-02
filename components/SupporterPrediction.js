"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

const VOTER_KEY = "ligue1-express-supporter-voter-v1";
const PICKS_KEY = "ligue1-express-supporter-picks-v1";
const CHOICES = ["1", "N", "2"];

function getVoterToken() {
  let token = localStorage.getItem(VOTER_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(VOTER_KEY, token);
  }
  return token;
}

function getSavedPicks() {
  try { return JSON.parse(localStorage.getItem(PICKS_KEY) || "{}"); }
  catch { return {}; }
}

function labels(homeTeam, awayTeam) {
  return {
    "1": `Victoire ${homeTeam}`,
    "N": "Match nul",
    "2": `Victoire ${awayTeam}`
  };
}

function percentages(rows = []) {
  const total = Number(rows[0]?.total_votes) || 0;
  if (!total) return { "1": 0, "N": 0, "2": 0, total: 0 };
  const parts = CHOICES.map((selection) => {
    const count = Number(rows.find((row) => row.selection === selection)?.vote_count) || 0;
    const exact = count * 100 / total;
    return { selection, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let missing = 100 - parts.reduce((sum, part) => sum + part.value, 0);
  [...parts].sort((a, b) => b.remainder - a.remainder).forEach((part) => {
    if (missing > 0) { part.value += 1; missing -= 1; }
  });
  return { ...Object.fromEntries(parts.map((part) => [part.selection, part.value])), total };
}

function majorityChoice(stats) {
  if (!stats.total) return null;
  const highest = Math.max(...CHOICES.map((item) => stats[item]));
  const leaders = CHOICES.filter((item) => stats[item] === highest);
  return leaders.length === 1 ? leaders[0] : null;
}

function duelResult(editorialSelection, supporterChoice, outcome) {
  if (!outcome || !supporterChoice) return "";
  const editorialWon = String(editorialSelection || "").includes(outcome);
  const supportersWon = supporterChoice === outcome;
  if (editorialWon && supportersWon) return "🤝 Les deux avaient raison";
  if (editorialWon) return "✍️ Point pour la rédaction";
  if (supportersWon) return "👥 Point pour les supporters";
  return "❌ Personne n’avait vu juste";
}

export default function SupporterPrediction({ matchId, matchDate, homeTeam, awayTeam, editorialSelection, outcome, initialStats }) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [stats, setStats] = useState(initialStats ? { ...initialStats.percentages, total: initialStats.total } : { "1": 0, "N": 0, "2": 0, total: 0 });
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const closed = !matchDate || new Date(matchDate).getTime() <= Date.now();
  const choiceLabels = labels(homeTeam, awayTeam);
  const supporterChoice = majorityChoice(stats);
  const resultLabel = duelResult(editorialSelection, supporterChoice, outcome);

  async function loadStats() {
    if (!supabase) return setLoading(false);
    const { data, error } = await supabase.rpc("get_supporter_prediction_stats", { p_match_id: String(matchId) });
    if (!error) setStats(percentages(data || []));
    setLoading(false);
  }

  useEffect(() => {
    setChoice(getSavedPicks()[String(matchId)] || "");
    loadStats();
  }, [matchId]);

  async function vote(nextChoice) {
    if (!supabase || closed) return;
    setMessage("Enregistrement du vote…");
    const { error } = await supabase.rpc("cast_supporter_prediction", {
      p_match_id: String(matchId),
      p_selection: nextChoice,
      p_voter_token: getVoterToken()
    });
    if (error) {
      setMessage(error.message.includes("closed") ? "Les votes sont fermés pour ce match." : "Impossible d’enregistrer le vote.");
      return;
    }
    const picks = getSavedPicks();
    picks[String(matchId)] = nextChoice;
    localStorage.setItem(PICKS_KEY, JSON.stringify(picks));
    setChoice(nextChoice);
    setMessage("Vote enregistré ✓");
    await loadStats();
  }

  return <section className="supporter-prediction">
    <div className="supporter-prediction-head">
      <div><span>👥 TENDANCE DES SUPPORTERS</span><strong>Quel est ton pronostic ?</strong></div>
      <b>{loading ? "…" : `${stats.total} vote${stats.total > 1 ? "s" : ""}`}</b>
    </div>

    {!closed && <div className="supporter-vote-buttons">
      {CHOICES.map(item => <button type="button" key={item} className={choice === item ? "active" : ""} onClick={() => vote(item)} disabled={loading}>
        <b>{item}</b><span>{choiceLabels[item]}</span>
      </button>)}
    </div>}

    <div className="supporter-gauges">
      {CHOICES.map(item => <div className={`supporter-gauge ${choice === item ? "is-mine" : ""}`} key={item}>
        <div><span>{choiceLabels[item]}{choice === item ? " · Ton choix" : ""}</span><strong>{stats[item]}%</strong></div>
        <i><b style={{ width: `${stats[item]}%` }} /></i>
      </div>)}
    </div>

    {stats.total > 0 && <div className="prediction-duel-inline">
      <div><span>Rédaction</span><strong>{editorialSelection}</strong></div><i>VS</i>
      <div><span>Supporters{supporterChoice ? ` · ${stats[supporterChoice]}%` : ""}</span><strong>{supporterChoice || "="}</strong></div>
      <b>{resultLabel || (supporterChoice ? "Duel en attente du résultat" : "Tendance partagée")}</b>
    </div>}

    <div className="supporter-vote-foot">
      <small>{closed ? "🔒 Votes clôturés au coup d’envoi" : choice ? "Tu peux modifier ton choix jusqu’au coup d’envoi." : "Un seul vote par personne et par match."}</small>
      {message && <span>{message}</span>}
    </div>
  </section>;
}
