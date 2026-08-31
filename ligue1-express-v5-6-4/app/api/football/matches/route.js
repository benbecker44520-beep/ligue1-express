import { NextResponse } from "next/server";
import { getFixtures } from "@/lib/football";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const result = await getFixtures();

  if (!result.ok) {
    return NextResponse.json(result, { status: 503 });
  }

  let matches = result.data;
  const now = Math.floor(Date.now() / 1000);

  if (status === "UPCOMING") {
    matches = matches
      .filter((match) => match.status !== "FINISHED" && !["CANCELLED", "POSTPONED"].includes(match.status) && match.timestamp >= now)
      .sort((a, b) => a.timestamp - b.timestamp);
  } else if (status) {
    matches = matches
      .filter((match) => match.status === status)
      .sort((a, b) => status === "FINISHED" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
  } else {
    matches = [...matches].sort((a, b) => b.timestamp - a.timestamp);
  }

  return NextResponse.json({ ok: true, data: matches });
}
