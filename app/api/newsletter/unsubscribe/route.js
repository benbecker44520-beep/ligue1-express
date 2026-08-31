import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const destination = new URL("/newsletter/desinscription", request.url);
  if (!token) { destination.searchParams.set("status", "invalid"); return NextResponse.redirect(destination); }
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc("unsubscribe_newsletter", { p_token: token });
    destination.searchParams.set("status", !error && data ? "ok" : "invalid");
  } catch { destination.searchParams.set("status", "error"); }
  return NextResponse.redirect(destination);
}
