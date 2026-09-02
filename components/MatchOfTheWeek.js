"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ShareButtons from "@/components/ShareButtons";
import SupporterPrediction from "@/components/SupporterPrediction";

function countdown(date) {
  const distance = new Date(date).getTime() - Date.now();
  if (distance <= 0) return null;
  const days = Math.floor(distance / 86400000);
  const hours = Math.floor(distance % 86400000 / 3600000);
  const minutes = Math.floor(distance % 3600000 / 60000);
  const seconds = Math.floor(distance % 60000 / 1000);
  return { days, hours, minutes, seconds };
}

function TeamForm({ name, logo, form }) {
  return <div className="week-form-team">
    <div>{logo && <Image src={logo} width={34} height={34} alt="" unoptimized />}<strong>{name}</strong></div>
    <span>{form.length ? form.map((value, index) => <i className={`is-${value}`} key={`${value}-${index}`}>{value}</i>) : <small>Forme à venir</small>}</span>
  </div>;
}

export default function MatchOfTheWeek({ prediction, match, stats, homeForm, awayForm, meetings }) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    setRemaining(countdown(prediction.match_date));
    const timer = window.setInterval(() => setRemaining(countdown(prediction.match_date)), 1000);
    return () => window.clearInterval(timer);
  }, [prediction.match_date]);
  const finished = match?.status === "FINISHED";
  const live = ["IN_PLAY", "PAUSED", "LIVE"].includes(match?.status);
  const hasScore = Number.isFinite(match?.score?.home) && Number.isFinite(match?.score?.away);

  return <section className="match-of-week">
    <div className="week-kicker"><span>⭐ MATCH DE LA SEMAINE</span><ShareButtons compact title={`${prediction.home_team} - ${prediction.away_team} : fais ton pronostic`} path="/prono" /></div>
    <div className="week-scoreboard">
      <div className="week-team">{match?.home?.logo && <Image src={match.home.logo} width={72} height={72} alt="" unoptimized />}<strong>{prediction.home_team}</strong></div>
      <div className="week-center">
        {hasScore ? <b>{match.score.home} <i>-</i> {match.score.away}</b> : <b>VS</b>}
        {remaining ? <div className="week-countdown"><span><strong>{remaining.days}</strong>J</span><span><strong>{remaining.hours}</strong>H</span><span><strong>{remaining.minutes}</strong>MIN</span><span><strong>{remaining.seconds}</strong>S</span></div> : <em>{live ? "🔴 MATCH EN DIRECT" : finished ? "TERMINÉ" : "COUP D’ENVOI IMMINENT"}</em>}
      </div>
      <div className="week-team away">{match?.away?.logo && <Image src={match.away.logo} width={72} height={72} alt="" unoptimized />}<strong>{prediction.away_team}</strong></div>
    </div>
    <details className="week-details">
      <summary>Voir l’analyse, la forme et les absents <span>＋</span></summary>
      <div className="week-insights">
        <div className="week-forms"><span>📈 FORME RÉCENTE</span><TeamForm name={prediction.home_team} logo={match?.home?.logo} form={homeForm} /><TeamForm name={prediction.away_team} logo={match?.away?.logo} form={awayForm} /></div>
        <div className="week-editorial"><span>✍️ PRONO DE LA RÉDACTION</span><strong>{prediction.selection}</strong><p>{prediction.comment || "L’analyse de la rédaction accompagne ce grand rendez-vous."}</p>{prediction.confidence && <small>Confiance {prediction.confidence}/10</small>}</div>
        <div className="week-info"><span>🔎 À SURVEILLER</span><p><b>Joueurs :</b> {prediction.players_to_watch || "À confirmer"}</p><p><b>Absents :</b> {prediction.absentees || "Aucun absent renseigné"}</p>{meetings.length > 0 && <div><b>Derniers face-à-face</b>{meetings.map((item) => <small key={item.id}>{item.home.shortName || item.home.name} {item.score.home}–{item.score.away} {item.away.shortName || item.away.name}</small>)}</div>}</div>
      </div>
    </details>
    <SupporterPrediction matchId={prediction.match_id} matchDate={prediction.match_date} homeTeam={prediction.home_team} awayTeam={prediction.away_team} editorialSelection={prediction.selection} outcome={prediction.outcome} initialStats={stats} />
    <Link className="week-match-link" href={`/match/${prediction.match_id}`}>Ouvrir le Centre Match →</Link>
  </section>;
}
