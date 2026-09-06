import { NextResponse } from "next/server";
import { generatePostMatchDrafts } from "@/lib/automatic-articles";
import { serviceSupabase } from "@/lib/push-server";
import { requireAdmin } from "@/lib/newsletter-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryable(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("fetch failed") || message.includes("apifootball") || message.includes("api-football") || message.includes("tempor") || message.includes("network");
}

async function run({ force = false } = {}) {
  const supabase = serviceSupabase();
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await generatePostMatchDrafts(supabase, { force });
      return NextResponse.json({ ok: true, automaticArticles: result, attempts: attempt });
    } catch (error) {
      lastError = error;
      if (!retryable(error) || attempt === 3) break;
      await wait(attempt * 800);
    }
  }

  const raw = String(lastError?.message || "").trim();
  const friendly = /fetch failed|network|apifootball|api-football/i.test(raw)
    ? "API-Football est momentanément indisponible. La génération a été retentée 3 fois. Réessaie dans quelques secondes."
    : raw || "Génération automatique impossible.";

  return NextResponse.json({ ok: false, error: friendly }, { status: 503 });
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
