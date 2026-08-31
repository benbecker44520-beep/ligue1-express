import { NextResponse } from "next/server";
import { loadNewsletterArticles, renderNewsletterHtml, requireAdmin, sendWithResend } from "@/lib/newsletter-server";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { supabase, user } = await requireAdmin(request);
    const body = await request.json();
    const subject = String(body?.subject || "").trim();
    const intro = String(body?.intro || "").trim();
    if (!subject) return NextResponse.json({ error: "L'objet de la newsletter est obligatoire." }, { status: 400 });

    const articles = await loadNewsletterArticles(supabase, body?.articleIds || []);
    const { data: subscribers, error } = await supabase.from("newsletter_subscribers").select("id,email,unsubscribe_token,active").eq("active", true).order("subscribed_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!subscribers?.length) return NextResponse.json({ error: "Aucun abonné actif." }, { status: 400 });

    let sent = 0, failed = 0;
    const errors = [];
    for (const subscriber of subscribers.slice(0, 100)) {
      try {
        const html = renderNewsletterHtml({ subject, intro, articles, unsubscribeToken: subscriber.unsubscribe_token });
        await sendWithResend({ to: subscriber.email, subject, html });
        sent += 1;
      } catch (sendError) {
        failed += 1;
        errors.push({ email: subscriber.email, error: sendError?.message || "Erreur d'envoi" });
      }
    }

    await supabase.from("newsletter_editions").insert({
      subject, intro, article_ids: body?.articleIds || [], sent_count: sent, failed_count: failed,
      sent_at: new Date().toISOString(), sent_by: user.email || null, status: failed ? (sent ? "partial" : "failed") : "sent"
    });

    if (!sent && failed) return NextResponse.json({ error: errors[0]?.error || "Aucun e-mail n'a pu être envoyé.", sent, failed }, { status: 502 });
    return NextResponse.json({ ok: true, sent, failed, errors: errors.slice(0, 5) });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Erreur newsletter." }, { status: 500 });
  }
}
