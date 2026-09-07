import { NextResponse } from "next/server";
import { getFacebookPageIdentity, isFacebookConfigured } from "@/lib/facebook";

export const runtime = "nodejs";

export async function GET() {
  const configured = isFacebookConfigured();
  if (!configured) {
    return NextResponse.json({ ok: false, configured: false });
  }

  const identity = await getFacebookPageIdentity();
  return NextResponse.json({
    ok: Boolean(identity?.ok),
    configured: true,
    page: identity?.ok ? { id: identity.id, name: identity.name } : null,
    error: identity?.ok ? null : identity?.error || "Vérification Facebook impossible",
    code: identity?.code || null
  });
}
