import { NextResponse } from "next/server";
import { generatePostMatchDraftForMatch } from "@/lib/automatic-articles";
import { getFinishedAutomaticMatchById } from "@/lib/automatic-match-source";
import { serviceSupabase } from "@/lib/push-server";
import { requireAdmin } from "@/lib/newsletter-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function runSelected(matchId) {
  const supabase = serviceSupabase();
  const result = await getFinishedAutomaticMatchById(matchId);
  if (!result.ok || !result.data) {
    return NextResponse.json(
      { ok:false, error:result.error || "Match terminé introuvable." },
      { status:404 }
    );
  }

  const match = result.data;
  const automaticArticles = await generatePostMatchDraftForMatch(supabase, match);
  return NextResponse.json({
    ok:true,
    automaticArticles,
    match:{ id:match.id, home:match.home?.name, away:match.away?.name }
  });
}

// Le cron ne crée plus aucun article en masse.
export async function GET() {
  return NextResponse.json({
    ok:true,
    automaticArticles:{enabled:false,bulkGeneration:false,created:0,notified:0},
    message:"La génération automatique en masse est désactivée. Les articles sont créés uniquement après sélection d'un match dans l'administration."
  });
}

// Déclenchement manuel depuis l'administration : un match précis est obligatoire.
export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const matchId = String(body?.matchId || "").trim();
    if (!matchId) {
      return NextResponse.json(
        { ok:false, error:"Sélectionne d'abord un match. La génération globale est désactivée depuis l'administration." },
        { status:400 }
      );
    }
    return runSelected(matchId);
  } catch (error) {
    return NextResponse.json(
      { ok:false, error:error?.message || "Génération automatique impossible." },
      { status:500 }
    );
  }
}
