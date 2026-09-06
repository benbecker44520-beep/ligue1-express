import { NextResponse } from "next/server";
import { generatePostMatchDrafts } from "@/lib/automatic-articles";
import { serviceSupabase } from "@/lib/push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run() {
  try {
    const supabase = serviceSupabase();
    const result = await generatePostMatchDrafts(supabase);
    return NextResponse.json({ ok: true, automaticArticles: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Génération automatique impossible." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return run();
}

export async function POST() {
  return run();
}
