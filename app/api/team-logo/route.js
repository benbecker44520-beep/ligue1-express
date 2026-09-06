export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url).searchParams.get("url") || "";
  if (!/^https?:\/\//i.test(url)) {
    return new Response("invalid logo url", { status: 400 });
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Foot-Francais-Express/1.0" },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return new Response("logo unavailable", { status: 404 });
    }

    const type = response.headers.get("content-type") || "image/png";
    if (!type.startsWith("image/")) {
      return new Response("invalid logo content", { status: 415 });
    }

    const body = await response.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
      }
    });
  } catch {
    return new Response("logo fetch failed", { status: 502 });
  }
}
