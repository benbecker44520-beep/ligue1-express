import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function allowedHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  let supabaseHost = "";
  try { supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname.toLowerCase(); } catch {}
  return Boolean(
    (supabaseHost && host === supabaseHost) ||
    host === "crests.football-data.org" ||
    host.endsWith(".football-data.org") ||
    host === "www.thesportsdb.com" ||
    host === "r2.thesportsdb.com" ||
    host === "media.api-sports.io" ||
    host.endsWith(".api-sports.io") ||
    host === "upload.wikimedia.org"
  );
}

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "URL manquante" }, { status: 400 });

  let target;
  try { target = new URL(raw); } catch { return NextResponse.json({ error: "URL invalide" }, { status: 400 }); }
  if (target.protocol !== "https:" || !allowedHost(target.hostname)) {
    return NextResponse.json({ error: "Source image non autorisée" }, { status: 403 });
  }

  try {
    const response = await fetch(target.toString(), { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "Image indisponible" }, { status: response.status });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return NextResponse.json({ error: "Le fichier distant n'est pas une image" }, { status: 415 });
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de charger l'image" }, { status: 502 });
  }
}
