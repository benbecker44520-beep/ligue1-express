import { NextResponse } from "next/server";
import { authenticatedSupabase } from "@/lib/push-server";

export const runtime = "nodejs";

function bearer(request) {
  return String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

export async function POST(request) {
  try {
    const token = bearer(request);
    if (!token) return NextResponse.json(false, { status: 401 });

    const supabase = authenticatedSupabase(token);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return NextResponse.json(false, { status: 401 });

    const { data, error } = await supabase.rpc("is_current_user_admin");
    if (error) throw error;

    return NextResponse.json(Boolean(data));
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Impossible de vérifier les droits administrateur." },
      { status: 500 }
    );
  }
}
