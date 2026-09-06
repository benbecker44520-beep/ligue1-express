import crypto from "node:crypto";
import { getRecentlyFinishedFrenchMatches } from "@/lib/apifootball";
import { sendPush } from "@/lib/push-server";
import { buildEditorialTitle } from "@/lib/automatic-article-title";

const RUN_KEY = "post-match-articles";
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

function slugify(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function scoreLine(match) { return `${match.home.name} ${match.score.home ?? 0}-${match.score.away ?? 0} ${match.away.name}`; }
function siteBase() { const configured=process.env.NEXT_PUBLIC_SITE_URL; const vercel=process.env.VERCEL_PROJECT_PRODUCTION_URL; return String(configured || (vercel ? `https://${vercel}` : "https://foot-francais-express.vercel.app")).replace(/\/$/,""); }
function matchVisual(match) { const p=new URLSearchParams({home:match.home.name,away:match.away.name,hs:String(match.score.home??0),as:String(match.score.away??0),league:match.leagueName||"Football français"}); if(match.round)p.set("round",String(match.round).replace(/[^0-9]/g,"")||String(match.round)); if(match.home?.logo)p.set("hl",match.home.logo); if(match.away?.logo)p.set("al",match.away.logo); return `${siteBase()}/api/match-visual?${p.toString()}`; }
function minuteLabel(e){ return e.minuteLabel || (e.minute != null ? `${e.minute}'` : ""); }
function describeGoal(e,match){ const team=e.side==="home"?match.home.name:match.away.name; return `${minuteLabel(e)} : ${e.player || "un joueur"} trouve le chemin des filets pour ${team}${e.assist ? `, servi par ${e.assist}` : ""}.`; }
function stablePick(match, options, salt="") { const seed=crypto.createHash("sha1").update(`${match.id}:${salt}`).digest().readUInt32BE(0); return options[seed % options.length]; }
function teamForSide(match, side){ return side === "home" ? match.home.name : match.away.name; }
function goalMinute(goal){ const n=Number(goal?.minute); return Number.isFinite(n)?n:null; }

function buildMatchStory(match, goals, reds) {
  const hs=Number(match.score.home??0), as=Number(match.score.away??0);
  const winnerSide=hs===as?null:(hs>as?"home":"away");
  const winner=winnerSide?teamForSide(match,winnerSide):null;
  const loser=winnerSide?teamForSide(match,winnerSide==="home"?"away":"home"):null;
  const margin=Math.abs(hs-as);
  const totalGoals=hs+as;
  const firstGoal=goals[0] || null;
  const lastGoal=goals.at(-1) || null;
  const firstScorer=firstGoal?.player || null;
  const firstTeam=firstGoal?teamForSide(match,firstGoal.side):null;
  const lastMinute=goalMinute(lastGoal);
  const lateGoal=goals.find(g=>Number(g.minute)>=85) || null;
  const cleanSheet=winnerSide && (winnerSide==="home"?as===0:hs===0);

  let home=0, away=0, leader=null, comebackWinner=false, equalizers=0, leadChanges=0;
  for (const goal of goals) {
    const beforeLeader=home===away?null:(home>away?"home":"away");
    if(goal.side==="home") home++; else if(goal.side==="away") away++;
    const afterLeader=home===away?null:(home>away?"home":"away");
    if(beforeLeader && !afterLeader) equalizers++;
    if(beforeLeader && afterLeader && beforeLeader!==afterLeader) leadChanges++;
    if(!leader && afterLeader) leader=afterLeader;
  }
  if(winnerSide && leader && leader!==winnerSide) comebackWinner=true;

  const facts={hs,as,winnerSide,winner,loser,margin,totalGoals,firstGoal,lastGoal,firstScorer,firstTeam,lastMinute,lateGoal,cleanSheet,comebackWinner,equalizers,leadChanges,reds};
  return facts;
}

function buildExcerpt(match, facts) {
  const {hs,as,winner,loser,margin,totalGoals,firstScorer,firstTeam,lastMinute,lateGoal,cleanSheet,comebackWinner,equalizers,reds}=facts;
  if(hs===as && hs===0) return stablePick(match,[
    `${match.home.name} et ${match.away.name} se neutralisent 0-0 au terme d'un match où les défenses ont pris le dessus.`,
    `Aucun but entre ${match.home.name} et ${match.away.name} : les deux équipes repartent avec un point après un duel verrouillé.`,
    `${match.home.name}-${match.away.name} se termine sans vainqueur ni but. Retour sur une rencontre fermée et disputée.`
  ],"excerpt-00");

  if(hs===as) {
    if(lateGoal) return `${match.home.name} et ${match.away.name} se quittent sur un ${hs}-${as} arraché dans une fin de match animée${lateGoal.player?`, avec ${lateGoal.player} parmi les acteurs décisifs`:""}.`;
    if(equalizers>=2) return `Un vrai chassé-croisé entre ${match.home.name} et ${match.away.name}, finalement dos à dos ${hs}-${as} après plusieurs égalisations.`;
    if(totalGoals>=4) return `${totalGoals} buts mais aucun vainqueur : ${match.home.name} et ${match.away.name} se répondent jusqu'au bout et terminent à ${hs}-${as}.`;
    return stablePick(match,[
      `${match.home.name} et ${match.away.name} partagent les points (${hs}-${as}) après une rencontre longtemps indécise.`,
      `Pas de vainqueur entre ${match.home.name} et ${match.away.name} : un nul ${hs}-${as} au terme d'un match équilibré.`,
      `${match.home.name}-${match.away.name} se conclut sur un ${hs}-${as}, avec un scénario où personne n'a réussi à faire définitivement la différence.`
    ],"excerpt-draw");
  }

  if(comebackWinner) return `${winner} renverse ${loser} et s'impose ${hs}-${as} après avoir été mené : un succès construit dans la réaction.`;
  if(lateGoal && lastMinute>=85 && margin<=2) return `${winner} fait la différence dans les dernières minutes et bat ${loser} ${hs}-${as} au bout d'un final décisif.`;
  if(margin>=4) return `${winner} frappe fort face à ${loser} (${hs}-${as}) au terme d'une rencontre à sens unique.`;
  if(margin===3) return `${winner} s'impose nettement ${hs}-${as} face à ${loser}, avec une maîtrise qui s'est confirmée au fil du match.`;
  if(cleanSheet && margin>=2) return `${winner} domine ${loser} ${hs}-${as} sans encaisser, porté par une prestation solide dans les deux surfaces.`;
  if(reds.length) return `${winner} vient à bout de ${loser} ${hs}-${as} dans une rencontre marquée aussi par une expulsion.`;
  if(firstScorer && firstTeam===winner) return `${firstScorer} a lancé ${winner}, qui conserve ensuite l'avantage pour s'imposer ${hs}-${as} face à ${loser}.`;
  return stablePick(match,[
    `${winner} prend le dessus sur ${loser} (${hs}-${as}) au terme d'un match longtemps disputé.`,
    `${winner} décroche les trois points face à ${loser} (${hs}-${as}) après avoir mieux négocié les moments clés.`,
    `Victoire ${hs}-${as} pour ${winner} face à ${loser}, dans une rencontre où les détails ont fini par faire la différence.`
  ],"excerpt-win");
}

export function buildPostMatchArticle(match) {
  const hs=Number(match.score.home??0), as=Number(match.score.away??0);
  const winner=hs===as?null:(hs>as?match.home.name:match.away.name);
  const loser=hs===as?null:(hs>as?match.away.name:match.home.name);
  const events=Array.isArray(match.events)?match.events:[];
  const goals=events.filter(e=>e.type==="goal").sort((a,b)=>Number(a.minute)-Number(b.minute));
  const reds=events.filter(e=>e.type==="red_card").sort((a,b)=>Number(a.minute)-Number(b.minute));
  const keyEvents=[...goals,...reds].sort((a,b)=>Number(a.minute)-Number(b.minute));
  const context=[match.leagueName,match.round?`journée ${match.round}`:null].filter(Boolean).join(", ");
  const title=buildEditorialTitle(match);
  const facts=buildMatchStory(match,goals,reds);

  let lead;
  if(hs===as && hs===0) lead=stablePick(match,[
    `Pas de vainqueur entre ${match.home.name} et ${match.away.name}. Les deux équipes se quittent sur un 0-0 où chaque erreur pouvait coûter cher.`,
    `${match.home.name} et ${match.away.name} n'ont pas réussi à se départager. Malgré plusieurs séquences disputées, le score est resté vierge jusqu'au coup de sifflet final.`,
    `Le duel entre ${match.home.name} et ${match.away.name} s'achève sans but. Une rencontre serrée, davantage marquée par l'équilibre que par les occasions franches.`
  ],"lead-00");
  else if(hs===as) lead=facts.equalizers>=2
    ? `${match.home.name} et ${match.away.name} se sont rendu coup pour coup avant de terminer à ${hs}-${as}. À chaque prise d'avantage ou presque, la réponse adverse n'a pas tardé.`
    : `${match.home.name} et ${match.away.name} se quittent dos à dos (${hs}-${as}) après une rencontre restée ouverte jusqu'au bout.`;
  else if(facts.comebackWinner) lead=`${winner} s'impose ${hs}-${as} face à ${loser} après avoir dû renverser le scénario. Mené au cours de la rencontre, le vainqueur a su réagir et reprendre le contrôle.`;
  else if(facts.margin>=3) lead=`${winner} s'impose largement face à ${loser} (${hs}-${as}). L'écart s'est creusé au fil d'un match où le vainqueur a su convertir ses temps forts.`;
  else lead=stablePick(match,[
    `${winner} sort vainqueur de son duel face à ${loser} (${hs}-${as}) après avoir mieux négocié les moments qui comptaient.`,
    `${winner} prend les trois points contre ${loser} (${hs}-${as}) dans une rencontre où l'efficacité a fini par faire la différence.`,
    `Succès ${hs}-${as} pour ${winner} face à ${loser}. Le match est longtemps resté disputé avant de tourner en faveur du vainqueur.`
  ],"lead-win");

  let scenario;
  if(goals.length){ const sequence=goals.slice(0,7).map(e=>describeGoal(e,match)).join(" "); scenario=`Le fil du match s'est écrit au rythme des buts. ${sequence}${goals.length>7?" D'autres buts sont encore venus alourdir ou resserrer l'écart dans la dernière partie de rencontre.":""}`; }
  else scenario=`Aucun but n'est venu débloquer la rencontre. Les deux équipes ont alterné les phases de maîtrise sans parvenir à transformer leurs situations en avantage au tableau d'affichage.`;

  let turningPoint;
  if(reds.length){ const r=reds[0], team=r.side==="home"?match.home.name:match.away.name; turningPoint=`Le carton rouge reçu par ${r.player || "un joueur de "+team} à la ${minuteLabel(r)} a changé les équilibres. ${team} a dû terminer la rencontre en réorganisant son bloc.`; }
  else if(facts.comebackWinner) turningPoint=`Le tournant tient à la réaction de ${winner}, capable d'effacer son retard puis de faire basculer définitivement la rencontre de son côté.`;
  else if(facts.lateGoal) turningPoint=`La fin de match a fait la différence : un but inscrit à la ${minuteLabel(facts.lateGoal)} a définitivement pesé sur l'issue de la rencontre.`;
  else if(Math.abs(hs-as)>=3) turningPoint=`L'écart au score reflète l'efficacité de ${winner}, qui a transformé plusieurs de ses temps forts sans laisser ${loser} revenir dans la partie.`;
  else turningPoint=stablePick(match,[
    `Le match s'est joué sur la capacité à mieux gérer les temps faibles et à être efficace dans les zones décisives.`,
    `Sans véritable rupture spectaculaire, la différence s'est faite dans les détails : gestion, réalisme et maîtrise des moments clés.`,
    `L'écart s'est construit sur de petits détails, avec une meilleure efficacité du côté de l'équipe qui repart avec les points.`
  ],"turning");

  const conclusion=winner ? stablePick(match,[
    `Au coup de sifflet final, ${winner} peut savourer ce succès face à ${loser}. La prochaine journée permettra de voir si cette victoire peut lancer une dynamique.`,
    `${winner} repart avec les trois points et un résultat à valoriser dès le prochain rendez-vous${match.leagueName?` en ${match.leagueName}`:""}. ${loser}, de son côté, devra rapidement rebondir.`,
    `Ce succès offre à ${winner} une base intéressante pour la suite. Pour ${loser}, il faudra corriger ce qui a manqué dans les moments décisifs.`
  ],"conclusion-win") : stablePick(match,[
    `Ce partage des points laisse les deux équipes avec des regrets différents. ${match.home.name} et ${match.away.name} devront maintenant confirmer les bonnes séquences vues dans ce match.`,
    `Un point chacun, mais pas forcément la même satisfaction. ${match.home.name} comme ${match.away.name} se projettent désormais vers leur prochain rendez-vous.`,
    `Le nul laisse le classement avancer doucement pour les deux camps. La prochaine journée dira qui saura mieux capitaliser sur ce résultat.`
  ],"conclusion-draw");
  const excerpt=buildExcerpt(match,facts);
  const editorialNote=`Débrief Foot Français Express établi à partir des données officielles disponibles après la rencontre. Brouillon à relire et enrichir par la rédaction avant publication.`;

  return { slug:`${slugify(match.home.name)}-${slugify(match.away.name)}-${match.id}`, title, category:"ACTUALITÉS", excerpt, content:[context?`**${context} — Score final : ${scoreLine(match)}.**`:`**Score final : ${scoreLine(match)}.**`,lead,scenario,turningPoint,conclusion,editorialNote].join("\n\n"), image_url:matchVisual(match), related_club_ids:[match.home.id,match.away.id].map(Number).filter(Number.isFinite), status:"draft", auto_generated:true, source_type:"post_match", source_match_id:String(match.id), review_status:"pending_review", generated_at:new Date().toISOString(), automation_payload:{provider:match.provider,league:match.leagueName,round:match.round,score:match.score,home:match.home,away:match.away,important_events:keyEvents,editorial_version:"v8.32"} };
}

async function notifyAdmins(supabase,article,match){ const {data:admins}=await supabase.from("supporter_profiles").select("user_id").eq("role","admin"); const ids=(admins||[]).map(r=>r.user_id).filter(Boolean); if(!ids.length)return 0; const {data:subs}=await supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id",ids); let sent=0; for(const s of subs||[]){try{await sendPush(s,{title:"📝 Article automatique à relire",body:`${scoreLine(match)} · Le débrief est prêt.`,icon:"/icon-192.png",badge:"/icon-192.png",type:"editorial_review",url:"/admin?section=articles",tag:`article-review-${article.id}`});sent++;}catch(e){if([404,410].includes(e?.statusCode))await supabase.from("push_subscriptions").delete().eq("id",s.id);}}return sent; }

export async function generatePostMatchDraftForMatch(supabase, match) {
  if (String(process.env.AUTOMATIC_ARTICLES_ENABLED || "true").toLowerCase() === "false") {
    return { enabled:false, checked:1, created:0, notified:0 };
  }
  const draft=buildPostMatchArticle(match);
  const {data:article,error}=await supabase.from("articles").insert(draft).select("id,slug,title").single();
  if(error?.code==="23505") return { enabled:true, checked:1, created:0, notified:0, duplicate:true };
  if(error) throw error;
  const notified=await notifyAdmins(supabase,article,match);
  await supabase.from("articles").update({review_notified_at:new Date().toISOString()}).eq("id",article.id);
  return { enabled:true, checked:1, created:1, notified, article };
}

export async function generatePostMatchDrafts(supabase,{force=false}={}){ if(String(process.env.AUTOMATIC_ARTICLES_ENABLED||"true").toLowerCase()==="false")return{enabled:false,checked:0,created:0,notified:0}; const {data:previous}=await supabase.from("article_automation_runs").select("last_run_at").eq("run_key",RUN_KEY).maybeSingle(); const last=previous?.last_run_at?new Date(previous.last_run_at).getTime():0; if(!force&&Date.now()-last<CHECK_INTERVAL_MS)return{throttled:true,checked:0,created:0,notified:0}; await supabase.from("article_automation_runs").upsert({run_key:RUN_KEY,last_run_at:new Date().toISOString()},{onConflict:"run_key"}); const result=await getRecentlyFinishedFrenchMatches({days:1}); if(!result.ok)throw new Error(result.error||"Matchs terminés indisponibles"); let created=0,notified=0; for(const match of result.data||[]){const one=await generatePostMatchDraftForMatch(supabase,match);created+=Number(one.created||0);notified+=Number(one.notified||0);}return{enabled:true,checked:result.data?.length||0,created,notified}; }
function baseUrl(){return siteBase();}
function socialCopy(article){const url=`${baseUrl()}/article/${article.slug}`;const facebook=`⚽ ${article.title}\n\n${article.excerpt}\n\n👉 ${url}\n\n#FootFrancais #Football`;const xSuffix=`\n\n${url}\n\n#FootFrancais`;const xLead=`⚽ ${article.title}\n\n${article.excerpt}`;return{url,facebook,x:`${xLead.slice(0,Math.max(0,280-xSuffix.length))}${xSuffix}`};}
async function publishFacebook(article){const pageId=String(process.env.FACEBOOK_PAGE_ID||"").trim(),token=String(process.env.FACEBOOK_PAGE_ACCESS_TOKEN||"").trim();if(!pageId||!token)return{status:"not_configured"};const copy=socialCopy(article);const body=new URLSearchParams({message:copy.facebook,link:copy.url,access_token:token});const response=await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(pageId)}/feed`,{method:"POST",body});const json=await response.json().catch(()=>({}));if(!response.ok)throw new Error(json?.error?.message||`Facebook HTTP ${response.status}`);return{status:"published",id:json.id||null};}
function oauthEncode(value){return encodeURIComponent(String(value)).replace(/[!'()*]/g,char=>`%${char.charCodeAt(0).toString(16).toUpperCase()}`);}
async function publishX(article){const consumerKey=String(process.env.X_API_KEY||"").trim(),consumerSecret=String(process.env.X_API_SECRET||"").trim(),accessToken=String(process.env.X_ACCESS_TOKEN||"").trim(),accessSecret=String(process.env.X_ACCESS_TOKEN_SECRET||"").trim();if(!consumerKey||!consumerSecret||!accessToken||!accessSecret)return{status:"not_configured"};const url="https://api.x.com/2/tweets";const oauth={oauth_consumer_key:consumerKey,oauth_nonce:crypto.randomBytes(18).toString("hex"),oauth_signature_method:"HMAC-SHA1",oauth_timestamp:String(Math.floor(Date.now()/1000)),oauth_token:accessToken,oauth_version:"1.0"};const parameterString=Object.entries(oauth).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${oauthEncode(k)}=${oauthEncode(v)}`).join("&");const signatureBase=`POST&${oauthEncode(url)}&${oauthEncode(parameterString)}`;oauth.oauth_signature=crypto.createHmac("sha1",`${oauthEncode(consumerSecret)}&${oauthEncode(accessSecret)}`).update(signatureBase).digest("base64");const authorization=`OAuth ${Object.entries(oauth).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${oauthEncode(k)}="${oauthEncode(v)}"`).join(", ")}`;const response=await fetch(url,{method:"POST",headers:{Authorization:authorization,"Content-Type":"application/json"},body:JSON.stringify({text:socialCopy(article).x})});const json=await response.json().catch(()=>({}));if(!response.ok)throw new Error(json?.detail||json?.title||`X HTTP ${response.status}`);return{status:"published",id:json?.data?.id||null};}
export async function publishArticleToSocials(article){const results={};for(const [network,publisher] of [["facebook",publishFacebook],["x",publishX]]){try{results[network]=await publisher(article);}catch(error){results[network]={status:"failed",error:error?.message||"Publication impossible"};}}return results;}
