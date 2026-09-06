import { NextResponse } from "next/server";
import { generatePostMatchDrafts } from "@/lib/automatic-articles";
import { serviceSupabase } from "@/lib/push-server";
import { requireAdmin } from "@/lib/newsletter-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run({ force = false } = {}) {
  try {
    const supabase = serviceSupabase();
    const result = await generatePostMatchDrafts(supabase, { force });
    return NextResponse.json({ ok: true, automaticArticles: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Génération automatique impossible." },
      { status: 500 }
    );
  }
}

// Appel périodique GitHub Actions.
export async function GET() {
  return run();
}

// Déclenchement manuel depuis l'administration : session admin obligatoire.
export async function POST(request) {
  try {
    await requireAdmin(request);
    return run({ force: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Accès administrateur requis." },
      { status: 401 }
    );
  }
}
