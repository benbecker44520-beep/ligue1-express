import crypto from "node:crypto";
import { getRecentlyFinishedFrenchMatches } from "@/lib/apifootball";
import { sendPush } from "@/lib/push-server";

const RUN_KEY = "post-match-articles";
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function scoreLine(match) {
  return `${match.home.name} ${match.score.home ?? 0}-${match.score.away ?? 0} ${match.away.name}`;
}

function eventSentence(event, match) {
  const minute = event.minuteLabel || (event.minute != null ? `${event.minute}'` : "");
  const team = event.side === "home" ? match.home.name : match.away.name;
  if (event.type === "goal") return `${minute} : but de ${event.player || "un joueur"} pour ${team}${event.assist ? `, sur une passe de ${event.assist}` : ""}.`;
  if (event.type === "red_card") return `${minute} : carton rouge pour ${event.player || "un joueur"} (${team}), un tournant majeur de la rencontre.`;
  return "";
}

function specialComment(match) {
  const home = Number(match.score.home ?? 0);
  const away = Number(match.score.away ?? 0);
  const total = home + away;
  const redCards = match.events.filter((event) => event.type === "red_card");
  const goals = match.events.filter((event) => event.type === "goal");
  const lateGoals = goals.filter((event) => Number(event.minute) >= 85);

  if (lateGoals.length) return "Le scénario s’est joué dans les dernières minutes, avec un dénouement qui a totalement changé la lecture du match.";
  if (redCards.length) return "L’expulsion a pesé lourd dans l’équilibre de la rencontre et restera l’un des faits décisifs de ce match.";
  if (home === away) return total >= 4
    ? "Les deux équipes se quittent sur un nul spectaculaire, rythmé par plusieurs changements de scénario."
    : "Aucune des deux équipes n’a réussi à faire la différence au terme d’un duel particulièrement serré.";
  if (Math.abs(home - away) >= 3) return "L’écart final illustre la maîtrise du vainqueur, qui a su imposer son rythme et punir chaque temps faible adverse.";
  if (total >= 5) return "Cette rencontre restera comme l’une des plus animées de la journée, avec un festival offensif et très peu de temps morts.";
  if (away > home) return `${match.away.name} réalise une performance solide à l’extérieur et repart avec un succès précieux.`;
  return `${match.home.name} a fait respecter l’avantage du terrain au terme d’une rencontre disputée.`;
}

export function buildPostMatchArticle(match) {
  const homeScore = Number(match.score.home ?? 0);
  const awayScore = Number(match.score.away ?? 0);
  const winner = homeScore === awayScore ? null : homeScore > awayScore ? match.home.name : match.away.name;
  const goals = match.events.filter((event) => event.type === "goal");
  const reds = match.events.filter((event) => event.type === "red_card");
  const keyEvents = [...goals, ...reds].sort((a, b) => Number(a.minute) - Number(b.minute));
  const title = winner
    ? `${scoreLine(match)} : ${winner} s’impose`
    : `${scoreLine(match)} : les deux équipes se neutralisent`;
  const facts = keyEvents.map((event) => eventSentence(event, match)).filter(Boolean);
  const context = [match.leagueName, match.round ? `journée ${match.round}` : null].filter(Boolean).join(" · ");
  const opening = `${match.home.name} et ${match.away.name} se sont affrontés${context ? ` en ${context}` : ""}. Le match s’est terminé sur le score de ${homeScore}-${awayScore}.`;
  const factsParagraph = facts.length
    ? `Les faits marquants : ${facts.join(" ")}`
    : "La rencontre s’est décidée sans fait disciplinaire majeur confirmé dans le flux officiel.";
  const conclusion = specialComment(match);
  const excerpt = winner
    ? `${winner} s’impose ${homeScore}-${awayScore}. Retrouvez les buts, les cartons rouges et le tournant du match.`
    : `Match nul ${homeScore}-${awayScore} entre ${match.home.name} et ${match.away.name}. Retrouvez les principaux faits du match.`;

  return {
    slug: `${slugify(match.home.name)}-${slugify(match.away.name)}-${match.id}`,
    title,
    category: "ACTUALITÉS",
    excerpt,
    content: [opening, factsParagraph, conclusion, "Brouillon généré automatiquement à partir des données officielles du match. Relu et validé par la rédaction de Foot Français Express."].join("\n\n"),
    image_url: match.home.logo || match.away.logo || null,
    related_club_ids: [match.home.id, match.away.id].map(Number).filter(Number.isFinite),
    status: "draft",
    auto_generated: true,
    source_type: "post_match",
    source_match_id: String(match.id),
    review_status: "pending_review",
    generated_at: new Date().toISOString(),
    automation_payload: {
      provider: match.provider,
      league: match.leagueName,
      round: match.round,
      score: match.score,
      home: match.home,
      away: match.away,
      important_events: keyEvents
    }
  };
}

async function notifyAdmins(supabase, article, match) {
  const { data: admins } = await supabase.from("supporter_profiles").select("user_id").eq("role", "admin");
  const adminIds = (admins || []).map((row) => row.user_id).filter(Boolean);
  if (!adminIds.length) return 0;
  const { data: subscriptions } = await supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", adminIds);
  let sent = 0;
  for (const subscription of subscriptions || []) {
    try {
      await sendPush(subscription, {
        title: "📝 Article automatique à relire",
        body: `${scoreLine(match)} · Vérifie le brouillon avant publication.`,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        type: "editorial_review",
        url: "/admin?section=articles",
        tag: `article-review-${article.id}`
      });
      sent += 1;
    } catch (error) {
      if ([404, 410].includes(error?.statusCode)) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
    }
  }
  return sent;
}

export async function generatePostMatchDrafts(supabase, { force = false } = {}) {
  if (String(process.env.AUTOMATIC_ARTICLES_ENABLED || "true").toLowerCase() === "false") {
    return { enabled: false, checked: 0, created: 0, notified: 0 };
  }

  const { data: previous } = await supabase.from("article_automation_runs").select("last_run_at").eq("run_key", RUN_KEY).maybeSingle();
  const lastRun = previous?.last_run_at ? new Date(previous.last_run_at).getTime() : 0;
  if (!force && Date.now() - lastRun < CHECK_INTERVAL_MS) return { throttled: true, checked: 0, created: 0, notified: 0 };

  await supabase.from("article_automation_runs").upsert({ run_key: RUN_KEY, last_run_at: new Date().toISOString() }, { onConflict: "run_key" });
  const result = await getRecentlyFinishedFrenchMatches({ days: 1 });
  if (!result.ok) throw new Error(result.error || "Matchs terminés indisponibles");

  let created = 0;
  let notified = 0;
  for (const match of result.data || []) {
    const draft = buildPostMatchArticle(match);
    const { data: article, error } = await supabase.from("articles").insert(draft).select("id,slug,title").single();
    if (error?.code === "23505") continue;
    if (error) throw error;
    created += 1;
    notified += await notifyAdmins(supabase, article, match);
    await supabase.from("articles").update({ review_notified_at: new Date().toISOString() }).eq("id", article.id);
  }
  return { enabled: true, checked: result.data?.length || 0, created, notified };
}

function baseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return String(configured || (vercelHost ? `https://${vercelHost}` : "https://foot-francais-express.vercel.app")).replace(/\/$/, "");
}

function socialCopy(article) {
  const url = `${baseUrl()}/article/${article.slug}`;
  const facebook = `⚽ ${article.title}\n\n${article.excerpt}\n\n👉 ${url}\n\n#FootFrancais #Football`;
  const xSuffix = `\n\n${url}\n\n#FootFrancais`;
  const xLead = `⚽ ${article.title}\n\n${article.excerpt}`;
  const x = `${xLead.slice(0, Math.max(0, 280 - xSuffix.length))}${xSuffix}`;
  return { url, facebook, x };
}

async function publishFacebook(article) {
  const pageId = String(process.env.FACEBOOK_PAGE_ID || "").trim();
  const token = String(process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "").trim();
  if (!pageId || !token) return { status: "not_configured" };
  const copy = socialCopy(article);
  const body = new URLSearchParams({ message: copy.facebook, link: copy.url, access_token: token });
  const response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(pageId)}/feed`, { method: "POST", body });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || `Facebook HTTP ${response.status}`);
  return { status: "published", id: json.id || null };
}

function oauthEncode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function publishX(article) {
  const consumerKey = String(process.env.X_API_KEY || "").trim();
  const consumerSecret = String(process.env.X_API_SECRET || "").trim();
  const accessToken = String(process.env.X_ACCESS_TOKEN || "").trim();
  const accessSecret = String(process.env.X_ACCESS_TOKEN_SECRET || "").trim();
  if (!consumerKey || !consumerSecret || !accessToken || !accessSecret) return { status: "not_configured" };

  const url = "https://api.x.com/2/tweets";
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(18).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: accessToken,
    oauth_version: "1.0"
  };
  const parameterString = Object.entries(oauth).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${oauthEncode(key)}=${oauthEncode(value)}`).join("&");
  const signatureBase = `POST&${oauthEncode(url)}&${oauthEncode(parameterString)}`;
  oauth.oauth_signature = crypto.createHmac("sha1", `${oauthEncode(consumerSecret)}&${oauthEncode(accessSecret)}`).update(signatureBase).digest("base64");
  const authorization = `OAuth ${Object.entries(oauth).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${oauthEncode(key)}="${oauthEncode(value)}"`).join(", ")}`;
  const response = await fetch(url, { method: "POST", headers: { Authorization: authorization, "Content-Type": "application/json" }, body: JSON.stringify({ text: socialCopy(article).x }) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.detail || json?.title || `X HTTP ${response.status}`);
  return { status: "published", id: json?.data?.id || null };
}

export async function publishArticleToSocials(article) {
  const results = {};
  for (const [network, publisher] of [["facebook", publishFacebook], ["x", publishX]]) {
    try { results[network] = await publisher(article); }
    catch (error) { results[network] = { status: "failed", error: error?.message || "Publication impossible" }; }
  }
  return results;
}
