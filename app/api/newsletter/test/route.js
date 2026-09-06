import { NextResponse } from "next/server";
import { loadNewsletterArticles, renderNewsletterHtml, requireAdmin, sendWithResend } from "@/lib/newsletter-server";

export async function POST(request) {
  try {
    const { supabase } = await requireAdmin(request);
    const body = await request.json();
    const to = String(body?.to || "").trim();
    const subject = String(body?.subject || "Foot Français Express · Test newsletter").trim();
    const intro = String(body?.intro || "Test de la newsletter Foot Français Express.").trim();
    if (!to || !to.includes("@")) return NextResponse.json({ error: "Adresse de test invalide." }, { status: 400 });
    const articles = await loadNewsletterArticles(supabase, body?.articleIds || []);
    const html = renderNewsletterHtml({ subject, intro, articles });
    const result = await sendWithResend({ to, subject: `[TEST] ${subject}`, html });
    return NextResponse.json({ ok: true, id: result?.id || null });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Erreur newsletter." }, { status: 500 });
  }
}
