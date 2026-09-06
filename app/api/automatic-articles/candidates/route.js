import { NextResponse } from "next/server";
import { getRecentlyFinishedFrenchMatches } from "@/lib/apifootball";
import { requireAdmin } from "@/lib/newsletter-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function daysBack(dateString) {
  const target = new Date(`${dateString}T12:00:00+02:00`);
  if (Number.isNaN(target.getTime())) return 1;
  const diff = Math.ceil((Date.now() - target.getTime()) / (24 * 60 * 60 * 1000));
  return Math.min(14, Math.max(1, diff + 1));
}

export async function GET(request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const date = String(url.searchParams.get("date") || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ ok:false, error:"Date invalide." }, { status:400 });
    }

    const result = await getRecentlyFinishedFrenchMatches({ days: daysBack(date) });
    if (!result.ok) throw new Error(result.error || "Matchs terminés indisponibles");

    const matches = (result.data || [])
      .filter((match) => String(match.utcDate || "").slice(0, 10) === date)
      .map((match) => ({
        id: String(match.id),
        league: match.leagueName,
        home: match.home?.name,
        away: match.away?.name,
        homeLogo: match.home?.logo || null,
        awayLogo: match.away?.logo || null,
        score: { home: match.score?.home ?? 0, away: match.score?.away ?? 0 },
        utcDate: match.utcDate
      }));

    return NextResponse.json({ ok:true, date, matches });
  } catch (error) {
    return NextResponse.json({ ok:false, error:error?.message || "Impossible de charger les matchs." }, { status:503 });
  }
}
