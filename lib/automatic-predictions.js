import "server-only";
import { getFixtures, getStandings } from "@/lib/football";

const RUN_KEY = "automatic-predictions";
const RUN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED", "LIVE"]);

async function markSuccessfulRun(supabase) {
  const { error } = await supabase.from("article_automation_runs").upsert(
    { run_key: RUN_KEY, last_run_at: new Date().toISOString() },
    { onConflict: "run_key" }
  );
  if (error) throw error;
}

function recentFormPoints(fixtures, teamId) {
  const matches = fixtures
    .filter((match) => match.status === "FINISHED" && [match.home?.id, match.away?.id].map(String).includes(String(teamId)))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
  if (!matches.length) return null;
  const points = matches.reduce((total, match) => {
    const home = String(match.home?.id) === String(teamId);
    const scored = Number(home ? match.score?.home : match.score?.away);
    const conceded = Number(home ? match.score?.away : match.score?.home);
    if (!Number.isFinite(scored) || !Number.isFinite(conceded)) return total;
    return total + (scored > conceded ? 3 : scored === conceded ? 1 : 0);
  }, 0);
  return points / matches.length;
}

function teamRating(row, formPoints, home = false) {
  if (!row || !row.played) return home ? 0.2 : 0;
  const pointsPerGame = row.points / row.played;
  const goalDifferencePerGame = row.diff / row.played;
  const formPerGame = formPoints ?? pointsPerGame;
  return pointsPerGame * 0.55 + formPerGame * 0.3 + goalDifferencePerGame * 0.15 + (home ? 0.2 : 0);
}

function teamName(team) {
  return team?.shortName || team?.name || "Équipe";
}

function predictionFor(match, standings, fixtures) {
  const homeRow = standings.find((row) => String(row.teamId) === String(match.home?.id));
  const awayRow = standings.find((row) => String(row.teamId) === String(match.away?.id));
  const homeForm = recentFormPoints(fixtures, match.home?.id);
  const awayForm = recentFormPoints(fixtures, match.away?.id);
  const homeRating = teamRating(homeRow, homeForm, true);
  const awayRating = teamRating(awayRow, awayForm, false);
  const gap = homeRating - awayRating;
  const selection = gap > 0.28 ? "1" : gap < -0.28 ? "2" : "N";
  const confidence = Math.max(5, Math.min(9, 5 + Math.round(Math.abs(gap) * 1.7)));
  const home = teamName(match.home);
  const away = teamName(match.away);
  const comment = selection === "1"
    ? `Le modèle automatique donne l’avantage à ${home} : ses indicateurs récents et l’avantage du terrain sont supérieurs à ceux de ${away}.`
    : selection === "2"
      ? `Le modèle automatique donne l’avantage à ${away} : sa dynamique et ses statistiques actuelles sont supérieures à celles de ${home}.`
      : `Le modèle automatique relève des indicateurs très proches entre ${home} et ${away}. Le match nul est le scénario privilégié.`;
  const played = [homeRow, awayRow].filter(Boolean).reduce((sum, row) => sum + Number(row.played || 0), 0);
  const totalGoals = [homeRow, awayRow].filter(Boolean).reduce((sum, row) => sum + Number(row.goalsFor || 0) + Number(row.goalsAgainst || 0), 0);
  const goalAverage = played ? totalGoals / played : 2.5;

  return {
    match_id: String(match.id),
    competition: "Ligue 1",
    home_team: match.home?.name || home,
    away_team: match.away?.name || away,
    match_date: match.utcDate,
    selection,
    comment,
    secondary_bet: goalAverage >= 2.25 ? "Plus de 1,5 but dans le match" : "Moins de 3,5 buts dans le match",
    confidence,
    status: "published",
    players_to_watch: null,
    absentees: null,
    is_automatic: true,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function generateAutomaticPredictions(supabase, { force = false } = {}) {
  const { data: previousRun } = await supabase
    .from("article_automation_runs")
    .select("last_run_at")
    .eq("run_key", RUN_KEY)
    .maybeSingle();
  const previousAt = previousRun?.last_run_at ? new Date(previousRun.last_run_at).getTime() : 0;
  if (!force && previousAt && Date.now() - previousAt < RUN_INTERVAL_MS) {
    return { ok: true, skipped: true, reason: "recent_run", lastRunAt: previousRun.last_run_at };
  }

  const [fixturesResult, standingsResult] = await Promise.all([getFixtures(), getStandings()]);
  if (!fixturesResult.ok || !standingsResult.ok) {
    throw new Error(fixturesResult.error || standingsResult.error || "Données Ligue 1 indisponibles");
  }

  const now = Math.floor(Date.now() / 1000);
  const upcoming = fixturesResult.data
    .filter((match) => match.timestamp > now && match.status !== "FINISHED" && !LIVE_STATUSES.has(match.status) && !["CANCELLED", "POSTPONED"].includes(match.status))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (!upcoming.length) {
    await markSuccessfulRun(supabase);
    return { ok: true, created: 0, updated: 0, skipped: 0, reason: "no_upcoming_matches" };
  }

  const nextMatchday = upcoming[0].matchday;
  const targetMatches = upcoming
    .filter((match) => nextMatchday ? Number(match.matchday) === Number(nextMatchday) : match.timestamp <= upcoming[0].timestamp + 4 * 24 * 60 * 60)
    .slice(0, 10);
  const matchIds = targetMatches.map((match) => String(match.id));
  const { data: existingRows, error: existingError } = await supabase
    .from("predictions")
    .select("id,match_id,is_automatic,is_week_match")
    .in("match_id", matchIds);
  if (existingError) throw existingError;
  const existing = new Map((existingRows || []).map((row) => [String(row.match_id), row]));

  const nowIso = new Date().toISOString();
  const { data: featuredRows, error: featuredError } = await supabase
    .from("predictions")
    .select("id,match_id,is_automatic")
    .eq("is_week_match", true)
    .gte("match_date", nowIso)
    .limit(1);
  if (featuredError) throw featuredError;
  const hasUpcomingFeatured = Boolean(featuredRows?.length);
  if (!hasUpcomingFeatured) {
    const { error: rolloverError } = await supabase
      .from("predictions")
      .update({ is_week_match: false, updated_at: nowIso })
      .eq("is_week_match", true)
      .lt("match_date", nowIso);
    if (rolloverError) throw rolloverError;
  }
  const generated = targetMatches.map((match) => predictionFor(match, standingsResult.data, fixturesResult.data));
  const featuredId = hasUpcomingFeatured
    ? null
    : [...generated].sort((a, b) => b.confidence - a.confidence || new Date(a.match_date) - new Date(b.match_date))[0]?.match_id;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const payload of generated) {
    const current = existing.get(payload.match_id);
    if (current && !current.is_automatic) {
      skipped += 1;
      continue;
    }
    payload.is_week_match = current?.is_week_match || payload.match_id === featuredId;
    const query = current
      ? supabase.from("predictions").update(payload).eq("id", current.id)
      : supabase.from("predictions").insert(payload);
    const { error } = await query;
    if (error) throw error;
    if (current) updated += 1;
    else created += 1;
  }

  await markSuccessfulRun(supabase);
  return { ok: true, matchday: nextMatchday || null, checked: targetMatches.length, created, updated, skipped };
}
