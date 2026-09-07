import { NextResponse } from "next/server";
import { getFacebookPageIdentity } from "@/lib/facebook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const facebook = await getFacebookPageIdentity();
  return NextResponse.json({
    facebook: {
      configured: Boolean(facebook.configured),
      valid: Boolean(facebook.ok),
      name: facebook.ok ? facebook.name : null,
      code: facebook.ok ? null : facebook.code || null
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
