import { NextResponse } from "next/server";
import { getFrenchLiveMatches } from "@/lib/apifootball";
import { sendPush, serviceSupabase } from "@/lib/push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREF_FOR_EVENT = {
  goal: "liveGoal",
  foul: "liveFoul",
  offside: "liveOffside",
  red_card: "liveRedCard"
};

function authorized(request) {
  const expected = String(process.env.CRON_SECRET || "").trim();
  const received = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && received && expected === received);
}

function sameClub(match, favorite) {
  if (!favorite) return false;
  const ids = [match.home?.id, match.away?.id].map(String);
  if (favorite.teamId && ids.includes(String(favorite.teamId))) return true;
  const wanted = String(favorite.team || favorite.shortName || "").toLowerCase();
  return wanted && [match.home?.name, match.home?.shortName, match.away?.name, match.away?.shortName]
    .some((name) => String(name || "").toLowerCase().includes(wanted) || wanted.includes(String(name || "").toLowerCase()));
}

function notificationFor(match, event) {
  const minute = event.minuteLabel || (event.minute != null ? `${event.minute}'` : "LIVE");
  const teams = `${match.home.name} - ${match.away.name}`;
  if (event.type === "goal") return { title: `⚽ BUT · ${minute}`, body: `${event.player || "Buteur"} · ${teams}${event.score ? ` · ${event.score}` : ""}` };
  if (event.type === "red_card") return { title: `🟥 Carton rouge · ${minute}`, body: `${event.player || "Joueur"} · ${teams}` };
  if (event.type === "offside") return { title: `🚩 Hors-jeu · ${minute}`, body: `${event.player || "Action"} · ${teams}` };
  return { title: `🛑 Faute · ${minute}`, body: `${event.player || "Action"} · ${teams}` };
}

async function runCheck(request) {
  if (!authorized(request)) return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  const live = await getFrenchLiveMatches();
  if (!live.ok) return NextResponse.json({ error: live.error || "Flux LIVE indisponible." }, { status: 503 });
  const supabase = serviceSupabase();
  const candidates = live.data.flatMap((match) => (match.events || [])
    .filter((event) => PREF_FOR_EVENT[event.type])
    .map((event) => ({ match, event, eventKey: `${match.provider}:${match.id}:${event.type}:${event.id}` })));
  let newEvents = 0;
  let sent = 0;

  for (const candidate of candidates) {
    const { error: markerError } = await supabase.from("live_notification_events").insert({
      event_key: candidate.eventKey,
      match_id: candidate.match.id,
      event_type: candidate.event.type,
      payload: { event: candidate.event, league: candidate.match.leagueName }
    });
    if (markerError?.code === "23505") continue;
    if (markerError) throw markerError;
    newEvents += 1;

    const { data: subscriptions, error: subscriptionsError } = await supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth");
    if (subscriptionsError) throw subscriptionsError;
    const userIds = [...new Set((subscriptions || []).map((item) => item.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("supporter_profiles").select("user_id,favorite_club,alert_preferences").in("user_id", userIds)
      : { data: [] };
    const profilesByUser = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
    const { data: followedRows } = await supabase.from("followed_matches").select("user_id").eq("provider", candidate.match.provider || "apifootball").eq("match_id", String(candidate.match.id));
    const followedUsers = new Set((followedRows || []).map((row) => row.user_id));
    const copy = notificationFor(candidate.match, candidate.event);

    for (const subscription of subscriptions || []) {
      const profile = profilesByUser.get(subscription.user_id);
      const prefs = profile?.alert_preferences || {};
      if (prefs[PREF_FOR_EVENT[candidate.event.type]] === false) continue;
      const followsMatch = followedUsers.has(subscription.user_id);
      if (!followsMatch && prefs.favoriteOnly !== false && !sameClub(candidate.match, profile?.favorite_club)) continue;
      try {
        await sendPush(subscription, {
          ...copy,
          type: candidate.event.type,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          url: `/live/match/${candidate.match.id}`,
          tag: candidate.eventKey
        });
        sent += 1;
      } catch (error) {
        if ([404, 410].includes(error?.statusCode)) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("live_notification_events").delete().lt("created_at", cutoff);
  return NextResponse.json({ ok: true, liveMatches: live.data.length, detected: candidates.length, newEvents, sent });
}

export async function GET(request) { return runCheck(request); }
export async function POST(request) { return runCheck(request); }
