import { NextResponse } from "next/server";
import { getChampionshipSnapshot, CHAMPIONSHIPS } from "@/lib/championships";
import { getPublishedArticles } from "@/lib/articles";
import { getTransfers } from "@/lib/transfers";
import { articleMentions, sameEntityName } from "@/lib/content-links";
import { getExpressFeed } from "@/lib/express-feed";

export const dynamic = "force-dynamic";

function teamMatches(match, club) {
  const id = String(club?.teamId || "");
  return String(match?.home?.id || "") === id || String(match?.away?.id || "") === id ||
    sameEntityName(match?.home?.name, club?.team) || sameEntityName(match?.away?.name, club?.team);
}

function matchResult(match, club) {
  if (match?.score?.home == null || match?.score?.away == null) return null;
  const isHome = String(match?.home?.id || "") === String(club?.teamId || "") || sameEntityName(match?.home?.name, club?.team);
  const scored = Number(isHome ? match.score.home : match.score.away);
  const conceded = Number(isHome ? match.score.away : match.score.home);
  if (scored > conceded) return "V";
  if (scored < conceded) return "D";
  return "N";
}

function compactMatch(match, league) {
  if (!match) return null;
  return {
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,
    home: { id: match.home?.id, name: match.home?.shortName || match.home?.name, logo: match.home?.logo || null },
    away: { id: match.away?.id, name: match.away?.shortName || match.away?.name, logo: match.away?.logo || null },
    score: { home: match.score?.home ?? null, away: match.score?.away ?? null },
    href: league === "ligue-1" ? `/match/${match.id}` : `/championnats/${league}/match/${match.id}`
  };
}

async function clubsResponse() {
  const slugs = ["ligue-1", "ligue-2", "ligue-3"];
  const snapshots = await Promise.all(slugs.map((slug) => getChampionshipSnapshot(slug).catch(() => ({ ok: false }))));
  const leagues = slugs.map((slug, index) => {
    const snapshot = snapshots[index];
    const config = CHAMPIONSHIPS[slug];
    const clubs = snapshot?.ok ? (snapshot.standings || []).map((row) => ({
      teamId: row.teamId,
      team: row.team,
      shortName: row.shortName || row.team,
      logo: row.logo || null,
      rank: row.rank,
      points: row.points,
      league: slug,
      leagueName: config.name
    })) : [];
    return { slug, name: config.name, clubs };
  });
  return NextResponse.json({ ok: true, leagues }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
}

async function detailResponse(request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get("league") || "ligue-1";
  const teamId = searchParams.get("teamId") || "";
  const teamName = searchParams.get("team") || "";
  if (!CHAMPIONSHIPS[league]) return NextResponse.json({ ok: false, error: "Championnat inconnu" }, { status: 400 });

  const snapshot = await getChampionshipSnapshot(league);
  if (!snapshot?.ok) return NextResponse.json({ ok: false, error: snapshot?.error || "Données indisponibles" }, { status: 503 });

  const club = (snapshot.standings || []).find((row) =>
    (teamId && String(row.teamId) === String(teamId)) ||
    (teamName && (sameEntityName(row.team, teamName) || sameEntityName(row.shortName, teamName)))
  );
  if (!club) return NextResponse.json({ ok: false, error: "Club introuvable" }, { status: 404 });

  const allMatches = snapshot.matches || [...(snapshot.recent || []), ...(snapshot.upcoming || [])];
  const clubMatches = allMatches.filter((match) => teamMatches(match, club));
  const recent = clubMatches.filter((match) => match.status === "FINISHED").sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  const upcoming = clubMatches.filter((match) => match.status !== "FINISHED").sort((a, b) => a.timestamp - b.timestamp);
  const form = recent.map((match) => matchResult(match, club)).filter(Boolean);

  const [articles, transfers, expressFeed] = await Promise.all([
    getPublishedArticles({ limit: 40 }),
    getTransfers(),
    getExpressFeed({ limit: 40 })
  ]);
  const relatedArticles = articles.filter((article) => articleMentions(article, club.team) || articleMentions(article, club.shortName)).slice(0, 6);
  const relatedTransfers = transfers.filter((transfer) => sameEntityName(transfer.from_club, club.team) || sameEntityName(transfer.to_club, club.team)).slice(0, 5);
  const relatedExpress = expressFeed.filter((item) =>
    sameEntityName(item.club_name, club.team) ||
    sameEntityName(item.club_name, club.shortName) ||
    articleMentions({ title: item.title, excerpt: item.body }, club.team) ||
    articleMentions({ title: item.title, excerpt: item.body }, club.shortName)
  ).slice(0, 8);
  const clubHref = league === "ligue-1" ? `/club/${club.teamId}` : `/championnats/${league}/club/${encodeURIComponent(club.team)}`;

  return NextResponse.json({
    ok: true,
    club: {
      teamId: club.teamId,
      team: club.team,
      shortName: club.shortName || club.team,
      logo: club.logo || null,
      rank: club.rank,
      points: club.points,
      played: club.played,
      win: club.win,
      draw: club.draw,
      lose: club.lose,
      goalsFor: club.goalsFor,
      goalsAgainst: club.goalsAgainst,
      form,
      league,
      leagueName: CHAMPIONSHIPS[league].name,
      href: clubHref
    },
    latest: compactMatch(recent[0], league),
    next: compactMatch(upcoming[0], league),
    articles: relatedArticles.map((article) => ({ slug: article.slug, title: article.title, category: article.category || "ACTUALITÉ", image_url: article.image_url || null })),
    transfers: relatedTransfers.map((transfer) => ({
      id: transfer.id,
      player_name: transfer.player_name,
      from_club: transfer.from_club,
      to_club: transfer.to_club,
      transfer_status: transfer.transfer_status,
      fee: transfer.fee || null
    })),
    express: relatedExpress.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body || null,
      category: item.category || "info",
      link_url: item.link_url || "/fil-express",
      published_at: item.published_at
    }))
  }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("mode") === "clubs") return clubsResponse();
  return detailResponse(request);
}
