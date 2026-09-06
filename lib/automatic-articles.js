import crypto from "node:crypto";
import { getRecentlyFinishedFrenchMatches } from "@/lib/apifootball";
import { sendPush } from "@/lib/push-server";

const RUN_KEY = "post-match-articles";
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

function slugify(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function scoreLine(match) { return `${match.home.name} ${match.score.home ?? 0}-${match.score.away ?? 0} ${match.away.name}`; }
function siteBase() { const configured=process.env.NEXT_PUBLIC_SITE_URL; const vercel=process.env.VERCEL_PROJECT_PRODUCTION_URL; return String(configured || (vercel ? `https://${vercel}` : "https://foot-francais-express.vercel.app")).replace(/\/$/,""); }
function matchVisual(match) { const p=new URLSearchParams({home:match.home.name,away:match.away.name,hs:String(match.score.home??0),as:String(match.score.away??0),league:match.leagueName||"Football français"}); if(match.home.logo)p.set("hl",match.home.logo); if(match.away.logo)p.set("al",match.away.logo); return `${siteBase()}/api/match-visual?${p.toString()}`; }

function minuteLabel(e){ return e.minuteLabel || (e.minute != null ? `${e.minute}'` : ""); }
function describeGoal(e,match){ const team=e.side==="home"?match.home.name:match.away.name; return `${minuteLabel(e)} : ${e.player || "un joueur"} trouve le chemin des filets pour ${team}${e.assist ? `, servi par ${e.assist}` : ""}.`; }

export function buildPostMatchArticle(match) {
  const hs=Number(match.score.home??0), as=Number(match.score.away??0);
  const winner=hs===as?null:(hs>as?match.home.name:match.away.name);
  const loser=hs===as?null:(hs>as?match.away.name:match.home.name);
  const goals=match.events.filter(e=>e.type==="goal").sort((a,b)=>Number(a.minute)-Number(b.minute));
  const reds=match.events.filter(e=>e.type==="red_card").sort((a,b)=>Number(a.minute)-Number(b.minute));
  const keyEvents=[...goals,...reds].sort((a,b)=>Number(a.minute)-Number(b.minute));
  const context=[match.leagueName,match.round?`journée ${match.round}`:null].filter(Boolean).join(", ");

  let title;
  if (winner) title=`${match.home.name} ${hs}-${as} ${match.away.name} : ${winner} prend le dessus`;
  else title=`${match.home.name} ${hs}-${as} ${match.away.name} : personne ne cède`;

  let lead;
  if(hs===as && hs===0) lead=`Pas de vainqueur entre ${match.home.name} et ${match.away.name}. Au terme d'une rencontre fermée au tableau d'affichage, les deux formations se quittent sur un score nul et vierge (${hs}-${as}).`;
  else if(hs===as) lead=`${match.home.name} et ${match.away.name} se quittent dos à dos (${hs}-${as}) après une rencontre où aucune des deux équipes n'a réussi à conserver définitivement l'avantage.`;
  else lead=`${winner} sort vainqueur de son duel face à ${loser} (${hs}-${as}). Une victoire construite au fil d'une rencontre dont le scénario a fini par basculer en faveur du vainqueur.`;

  let scenario;
  if(goals.length){
    const sequence=goals.slice(0,6).map(e=>describeGoal(e,match)).join(" ");
    scenario=`Le scénario du match s'est dessiné au rythme des buts. ${sequence}${goals.length>6?" La fin de rencontre a encore apporté son lot de mouvements au tableau d'affichage.":""}`;
  } else {
    scenario=`Le score est resté bloqué malgré les différentes séquences de la rencontre. Les deux blocs ont résisté et aucune équipe n'est parvenue à convertir ses opportunités en but.`;
  }

  let turningPoint;
  if(reds.length){ const r=reds[0], team=r.side==="home"?match.home.name:match.away.name; turningPoint=`La rencontre a également été marquée par l'expulsion de ${r.player || "un joueur de "+team} à la ${minuteLabel(r)}. Un fait de jeu important qui a obligé ${team} à revoir son organisation pour la suite du match.`; }
  else if(goals.some(e=>Number(e.minute)>=85)) turningPoint=`La décision s'est faite dans les dernières minutes, donnant à cette fin de match une dimension particulière et laissant très peu de temps à l'adversaire pour réagir.`;
  else if(Math.abs(hs-as)>=3) turningPoint=`L'écart au score traduit une rencontre nettement maîtrisée par ${winner}, capable de faire fructifier ses temps forts et de garder son adversaire à distance.`;
  else turningPoint=`Au-delà du résultat, ce sont surtout les détails et la gestion des temps forts qui ont pesé dans l'issue de cette rencontre.`;

  let conclusion;
  if(winner) conclusion=`Au coup de sifflet final, ${winner} peut donc savourer ce succès face à ${loser}. Pour les deux équipes, l'attention se tourne désormais vers la prochaine journée${match.leagueName?` de ${match.leagueName}`:""}, avec l'objectif de confirmer ou de rebondir.`;
  else conclusion=`Ce partage des points laisse forcément des sensations différentes dans les deux camps. ${match.home.name} et ${match.away.name} devront désormais se projeter sur leur prochain rendez-vous et chercher à transformer ce nul en dynamique positive.`;

  const excerpt=winner ? `${winner} s'impose ${hs}-${as} face à ${loser}. Le scénario, les faits marquants et notre débrief de la rencontre.` : `${match.home.name} et ${match.away.name} se quittent sur un nul ${hs}-${as}. Retrouvez le scénario et les enseignements du match.`;
  const editorialNote=`Débrief Foot Français Express établi à partir des données officielles disponibles après la rencontre. Brouillon à relire et enrichir par la rédaction avant publication.`;

  return {
    slug:`${slugify(match.home.name)}-${slugify(match.away.name)}-${match.id}`,
    title, category:"ACTUALITÉS", excerpt,
    content:[context?`**${context} — Score final : ${scoreLine(match)}.**`: `**Score final : ${scoreLine(match)}.**`,lead,scenario,turningPoint,conclusion,editorialNote].join("\n\n"),
    image_url:matchVisual(match),
    related_club_ids:[match.home.id,match.away.id].map(Number).filter(Number.isFinite), status:"draft", auto_generated:true, source_type:"post_match", source_match_id:String(match.id), review_status:"pending_review", generated_at:new Date().toISOString(),
    automation_payload:{provider:match.provider,league:match.leagueName,round:match.round,score:match.score,home:match.home,away:match.away,important_events:keyEvents,editorial_version:"v8.25"}
  };
}

async function notifyAdmins(supabase,article,match){ const {data:admins}=await supabase.from("supporter_profiles").select("user_id").eq("role","admin"); const ids=(admins||[]).map(r=>r.user_id).filter(Boolean); if(!ids.length)return 0; const {data:subs}=await supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id",ids); let sent=0; for(const s of subs||[]){try{await sendPush(s,{title:"📝 Article automatique à relire",body:`${scoreLine(match)} · Le débrief est prêt.`,icon:"/icon-192.png",badge:"/icon-192.png",type:"editorial_review",url:"/admin?section=articles",tag:`article-review-${article.id}`});sent++;}catch(e){if([404,410].includes(e?.statusCode))await supabase.from("push_subscriptions").delete().eq("id",s.id);}}return sent; }

export async function generatePostMatchDrafts(supabase,{force=false}={}){ if(String(process.env.AUTOMATIC_ARTICLES_ENABLED||"true").toLowerCase()==="false")return{enabled:false,checked:0,created:0,notified:0}; const {data:previous}=await supabase.from("article_automation_runs").select("last_run_at").eq("run_key",RUN_KEY).maybeSingle(); const last=previous?.last_run_at?new Date(previous.last_run_at).getTime():0; if(!force&&Date.now()-last<CHECK_INTERVAL_MS)return{throttled:true,checked:0,created:0,notified:0}; await supabase.from("article_automation_runs").upsert({run_key:RUN_KEY,last_run_at:new Date().toISOString()},{onConflict:"run_key"}); const result=await getRecentlyFinishedFrenchMatches({days:1}); if(!result.ok)throw new Error(result.error||"Matchs terminés indisponibles"); let created=0,notified=0; for(const match of result.data||[]){const draft=buildPostMatchArticle(match);const {data:article,error}=await supabase.from("articles").insert(draft).select("id,slug,title").single();if(error?.code==="23505")continue;if(error)throw error;created++;notified+=await notifyAdmins(supabase,article,match);await supabase.from("articles").update({review_notified_at:new Date().toISOString()}).eq("id",article.id);}return{enabled:true,checked:result.data?.length||0,created,notified}; }

function baseUrl(){return siteBase();}
function socialCopy(article){const url=`${baseUrl()}/article/${article.slug}`;const facebook=`⚽ ${article.title}\n\n${article.excerpt}\n\n👉 ${url}\n\n#FootFrancais #Football`;const xSuffix=`\n\n${url}\n\n#FootFrancais`;const xLead=`⚽ ${article.title}\n\n${article.excerpt}`;return{url,facebook,x:`${xLead.slice(0,Math.max(0,280-xSuffix.length))}${xSuffix}`};}
async function publishFacebook(article){const pageId=String(process.env.FACEBOOK_PAGE_ID||"").trim(),token=String(process.env.FACEBOOK_PAGE_ACCESS_TOKEN||"").trim();if(!pageId||!token)return{status:"not_configured"};const copy=socialCopy(article);const body=new URLSearchParams({message:copy.facebook,link:copy.url,access_token:token});const response=await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(pageId)}/feed`,{method:"POST",body});const json=await response.json().catch(()=>({}));if(!response.ok)throw new Error(json?.error?.message||`Facebook HTTP ${response.status}`);return{status:"published",id:json.id||null};}
function oauthEncode(value){return encodeURIComponent(String(value)).replace(/[!'()*]/g,char=>`%${char.charCodeAt(0).toString(16).toUpperCase()}`);}
async function publishX(article){const consumerKey=String(process.env.X_API_KEY||"").trim(),consumerSecret=String(process.env.X_API_SECRET||"").trim(),accessToken=String(process.env.X_ACCESS_TOKEN||"").trim(),accessSecret=String(process.env.X_ACCESS_TOKEN_SECRET||"").trim();if(!consumerKey||!consumerSecret||!accessToken||!accessSecret)return{status:"not_configured"};const url="https://api.x.com/2/tweets";const oauth={oauth_consumer_key:consumerKey,oauth_nonce:crypto.randomBytes(18).toString("hex"),oauth_signature_method:"HMAC-SHA1",oauth_timestamp:String(Math.floor(Date.now()/1000)),oauth_token:accessToken,oauth_version:"1.0"};const parameterString=Object.entries(oauth).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${oauthEncode(k)}=${oauthEncode(v)}`).join("&");const signatureBase=`POST&${oauthEncode(url)}&${oauthEncode(parameterString)}`;oauth.oauth_signature=crypto.createHmac("sha1",`${oauthEncode(consumerSecret)}&${oauthEncode(accessSecret)}`).update(signatureBase).digest("base64");const authorization=`OAuth ${Object.entries(oauth).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${oauthEncode(k)}="${oauthEncode(v)}"`).join(", ")}`;const response=await fetch(url,{method:"POST",headers:{Authorization:authorization,"Content-Type":"application/json"},body:JSON.stringify({text:socialCopy(article).x})});const json=await response.json().catch(()=>({}));if(!response.ok)throw new Error(json?.detail||json?.title||`X HTTP ${response.status}`);return{status:"published",id:json?.data?.id||null};}
export async function publishArticleToSocials(article){const results={};for(const [network,publisher] of [["facebook",publishFacebook],["x",publishX]]){try{results[network]=await publisher(article);}catch(error){results[network]={status:"failed",error:error?.message||"Publication impossible"};}}return results;}
