import { NextResponse } from "next/server";
import { getStandings } from "@/lib/football";

export async function GET() {
  const result = await getStandings();
  if (!result.ok) return NextResponse.json(result, { status: 503 });
  return NextResponse.json({ ok: true, data: result.data });
}
