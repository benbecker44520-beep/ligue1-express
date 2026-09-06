import { NextResponse } from "next/server";
import { getMatchLineups } from "@/lib/lineups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const matchId = new URL(request.url).searchParams.get("matchId") || "";
  const result = await getMatchLineups(matchId);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
