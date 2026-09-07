import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/newsletter-server";
import { getFacebookPageIdentity } from "@/lib/facebook";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await requireAdmin(request);
    const facebook = await getFacebookPageIdentity();
    const xConfigured = Boolean(
      process.env.X_API_KEY &&
      process.env.X_API_SECRET &&
      process.env.X_ACCESS_TOKEN &&
      process.env.X_ACCESS_TOKEN_SECRET
    );

    return NextResponse.json({
      ok: true,
      facebook: {
        configured: Boolean(facebook.configured),
        valid: Boolean(facebook.ok),
        name: facebook.ok ? facebook.name : null,
        id: facebook.ok ? facebook.id : null,
        error: facebook.ok ? null : facebook.error || null
      },
      x: { configured: xConfigured }
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Vérification sociale impossible." }, { status: 500 });
  }
}
