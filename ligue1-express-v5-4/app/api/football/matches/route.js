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
  if (status) matches = matches.filter((match) => match.status === status);
  matches = [...matches].sort((a, b) => b.timestamp - a.timestamp);

  return NextResponse.json({ ok: true, data: matches });
}
