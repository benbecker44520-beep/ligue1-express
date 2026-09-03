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

export default async function Page({ searchParams }) {
 const params = await searchParams;
 const requestedStatus = params?.statut;
 const activeStatus = ["official", "advanced", "rumour"].includes(requestedStatus) ? requestedStatus : "all";
 const [articles, transfers, standingsResult, scorersResult] = await Promise.all([getPublishedArticles({category:"MERCATO",limit:30}), getTransfers(), getStandings(), getScorers()]);
 const clubs = standingsResult.ok ? standingsResult.data : [];
 const scorers = scorersResult.ok ? scorersResult.data : [];
 const clubFor = name => clubs.find(c => sameEntityName(c.team,name) || sameEntityName(c.shortName,name));
 const playerFor = name => scorers.find(s => sameEntityName(s.name,name));
 const official=transfers.filter(t=>t.transfer_status==="official").length, advanced=transfers.filter(t=>t.transfer_status==="advanced").length, rumours=transfers.filter(t=>t.transfer_status==="rumour").length;
 const filteredTransfers = activeStatus === "all" ? transfers : transfers.filter(t => t.transfer_status === activeStatus);
 return <div className="page-shell listing-page mercato-v6 mercato-v7"><span className="eyebrow">LIGUE 1 EXPRESS · TRANSFERTS</span><h1>Centre Mercato</h1><p className="mercato-lead">Les mouvements qui comptent, séparés des rumeurs. Les clubs et joueurs connus de Ligue 1 Express sont maintenant directement accessibles.</p>
  <section className="mercato-dashboard" aria-label="Filtrer les mouvements mercato"><Link href="/mercato?statut=official" className={activeStatus==="official"?"active":""} aria-current={activeStatus==="official"?"true":undefined}><span>✅</span><strong>{official}</strong><small>Transferts officiels</small></Link><Link href="/mercato?statut=advanced" className={activeStatus==="advanced"?"active":""} aria-current={activeStatus==="advanced"?"true":undefined}><span>🔥</span><strong>{advanced}</strong><small>Dossiers avancés</small></Link><Link href="/mercato?statut=rumour" className={activeStatus==="rumour"?"active":""} aria-current={activeStatus==="rumour"?"true":undefined}><span>👀</span><strong>{rumours}</strong><small>Rumeurs suivies</small></Link><Link href="/mercato" className={activeStatus==="all"?"active":""} aria-current={activeStatus==="all"?"true":undefined}><span>⚡</span><strong>{transfers.length}</strong><small>Tous les mouvements</small></Link></section>
  <section className="mercato-board"><div className="section-title"><div><span className="eyebrow section-eyebrow">LIVE MERCATO</span><h2>Tableau des mouvements</h2></div></div>
   {filteredTransfers.length===0?<div className="editorial-empty"><h3>Aucun mouvement dans cette catégorie</h3><p>Choisis un autre filtre ou ajoute un mouvement depuis l’Admin.</p></div>:<div className="transfer-list">{filteredTransfers.map(t=>{const s=status[t.transfer_status]||status.rumour; const from=clubFor(t.from_club); const to=clubFor(t.to_club); const player=playerFor(t.player_name); return <article className={`transfer-card ${t.transfer_status}`} key={t.id}><div className="transfer-status"><span>{s[1]}</span><strong>{s[0]}</strong></div><div className="transfer-player"><small>{t.position||"JOUEUR"}</small><h3>{player?.playerId ? <Link href={`/joueur/${player.playerId}${player.teamId?`?club=${player.teamId}`:""}`}>{t.player_name}</Link> : t.player_name}</h3>{t.fee&&<b>{t.fee}</b>}</div><div className="transfer-route"><div><span>DE</span>{from ? <Link href={`/club/${from.teamId}`} className="transfer-club-link">{from.logo&&<Image src={from.logo} alt="" width={24} height={24} unoptimized/>}<strong>{t.from_club}</strong></Link> : <strong>{t.from_club||"Libre"}</strong>}</div><i>→</i><div><span>VERS</span>{to ? <Link href={`/club/${to.teamId}`} className="transfer-club-link">{to.logo&&<Image src={to.logo} alt="" width={24} height={24} unoptimized/>}<strong>{t.to_club}</strong></Link> : <strong>{t.to_club||"À définir"}</strong>}</div></div><div className="transfer-meta"><span>{type[t.transfer_type]||"Transfert"}</span>{t.note&&<p>{t.note}</p>}</div></article>})}</div>}
  </section>
  <section className="mercato-news"><div className="section-title"><div><span className="eyebrow section-eyebrow">LA RÉDACTION</span><h2>Dernières infos mercato</h2></div></div><div className="cards-grid">{articles.map(a=><ArticleCard key={a.slug} article={a}/>)}</div></section>
 </div>;
}
