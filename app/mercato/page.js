import ArticleCard from "@/components/ArticleCard";
import Link from "next/link";
import Image from "next/image";
import { getPublishedArticles } from "@/lib/articles";
import { getTransfers } from "@/lib/transfers";
import { getStandings, getScorers } from "@/lib/football";
import { sameEntityName } from "@/lib/content-links";

export const revalidate = 0;
export const metadata = { title: "Mercato", description: "Le centre mercato Ligue 1 Express : transferts officiels, dossiers avancés, rumeurs et actualités." };
const status = { official:["OFFICIEL","✅"], advanced:["DOSSIER AVANCÉ","🔥"], rumour:["RUMEUR","👀"] };
const type = { transfer:"Transfert", loan:"Prêt", free:"Libre", return:"Retour de prêt" };

export default async function Page() {
 const [articles, transfers, standingsResult, scorersResult] = await Promise.all([getPublishedArticles({category:"MERCATO",limit:30}), getTransfers(), getStandings(), getScorers()]);
 const clubs = standingsResult.ok ? standingsResult.data : [];
 const scorers = scorersResult.ok ? scorersResult.data : [];
 const clubFor = name => clubs.find(c => sameEntityName(c.team,name) || sameEntityName(c.shortName,name));
 const playerFor = name => scorers.find(s => sameEntityName(s.name,name));
 const official=transfers.filter(t=>t.transfer_status==="official").length, advanced=transfers.filter(t=>t.transfer_status==="advanced").length, rumours=transfers.filter(t=>t.transfer_status==="rumour").length;
 return <div className="page-shell listing-page mercato-v6 mercato-v7"><span className="eyebrow">LIGUE 1 EXPRESS · TRANSFERTS</span><h1>Centre Mercato</h1><p className="mercato-lead">Les mouvements qui comptent, séparés des rumeurs. Les clubs et joueurs connus de Ligue 1 Express sont maintenant directement accessibles.</p>
  <section className="mercato-dashboard"><div><span>✅</span><strong>{official}</strong><small>Transferts officiels</small></div><div><span>🔥</span><strong>{advanced}</strong><small>Dossiers avancés</small></div><div><span>👀</span><strong>{rumours}</strong><small>Rumeurs suivies</small></div><div><span>⚡</span><strong>{transfers.length}</strong><small>Mouvements suivis</small></div></section>
  <section className="mercato-board"><div className="section-title"><div><span className="eyebrow section-eyebrow">LIVE MERCATO</span><h2>Tableau des mouvements</h2></div></div>
   {transfers.length===0?<div className="editorial-empty"><h3>Le tableau mercato est prêt</h3><p>Ajoute les premiers mouvements depuis l’Admin : officiels, dossiers avancés ou rumeurs.</p></div>:<div className="transfer-list">{transfers.map(t=>{const s=status[t.transfer_status]||status.rumour; const from=clubFor(t.from_club); const to=clubFor(t.to_club); const player=playerFor(t.player_name); return <article className={`transfer-card ${t.transfer_status}`} key={t.id}><div className="transfer-status"><span>{s[1]}</span><strong>{s[0]}</strong></div><div className="transfer-player"><small>{t.position||"JOUEUR"}</small><h3>{player?.playerId ? <Link href={`/joueur/${player.playerId}${player.teamId?`?club=${player.teamId}`:""}`}>{t.player_name}</Link> : t.player_name}</h3>{t.fee&&<b>{t.fee}</b>}</div><div className="transfer-route"><div><span>DE</span>{from ? <Link href={`/club/${from.teamId}`} className="transfer-club-link">{from.logo&&<Image src={from.logo} alt="" width={24} height={24} unoptimized/>}<strong>{t.from_club}</strong></Link> : <strong>{t.from_club||"Libre"}</strong>}</div><i>→</i><div><span>VERS</span>{to ? <Link href={`/club/${to.teamId}`} className="transfer-club-link">{to.logo&&<Image src={to.logo} alt="" width={24} height={24} unoptimized/>}<strong>{t.to_club}</strong></Link> : <strong>{t.to_club||"À définir"}</strong>}</div></div><div className="transfer-meta"><span>{type[t.transfer_type]||"Transfert"}</span>{t.note&&<p>{t.note}</p>}</div></article>})}</div>}
  </section>
  <section className="mercato-news"><div className="section-title"><div><span className="eyebrow section-eyebrow">LA RÉDACTION</span><h2>Dernières infos mercato</h2></div></div><div className="cards-grid">{articles.map(a=><ArticleCard key={a.slug} article={a}/>)}</div></section>
 </div>;
}
