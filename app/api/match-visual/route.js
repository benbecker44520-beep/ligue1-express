export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v, fallback = "") => String(v || fallback).trim().slice(0, 70);
const esc = (v) => String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const initials = (name) => clean(name, "FC").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

async function logoData(url) {
  if (!url || !/^https?:\/\//i.test(url)) return "";
  try {
    const r = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 Foot-Francais-Express/1.0", Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(7000)
    });
    if (!r.ok) return "";
    const type = r.headers.get("content-type") || "image/png";
    if (!type.startsWith("image/")) return "";
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > 3_000_000) return "";
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

function teamBlock({ x, name, logo, anchor = "middle" }) {
  const label = esc(name);
  const size = name.length > 16 ? 31 : 37;
  const fallback = esc(initials(name));
  const logoSvg = logo
    ? `<image href="${logo}" x="${x-92}" y="238" width="184" height="184" preserveAspectRatio="xMidYMid meet"/>`
    : `<circle cx="${x}" cy="330" r="84" fill="#0d3768" stroke="#ffd400" stroke-width="7"/><text x="${x}" y="350" text-anchor="middle" font-family="Arial,sans-serif" font-size="62" font-weight="900" fill="#fff">${fallback}</text>`;
  return `${logoSvg}<text x="${x}" y="470" text-anchor="${anchor}" font-family="Arial,sans-serif" font-size="${size}" font-weight="900" fill="#fff">${label}</text>`;
}

export async function GET(request) {
  try {
    const p = new URL(request.url).searchParams;
    const home = clean(p.get("home"), "Domicile");
    const away = clean(p.get("away"), "Extérieur");
    const hs = clean(p.get("hs"), "0");
    const as = clean(p.get("as"), "0");
    const league = clean(p.get("league"), "Football français");
    const round = clean(p.get("round"), "");
    const [homeLogo, awayLogo] = await Promise.all([logoData(p.get("hl") || ""), logoData(p.get("al") || "")]);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#031326"/><stop offset="0.58" stop-color="#062a55"/><stop offset="1" stop-color="#020b17"/></linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#1d75c5" stop-opacity=".5"/><stop offset=".48" stop-color="#031731" stop-opacity=".1"/><stop offset="1" stop-color="#00050d" stop-opacity=".78"/></radialGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity=".55"/></filter>
  </defs>
  <rect width="1200" height="630" rx="28" fill="url(#bg)"/>
  <rect width="1200" height="630" rx="28" fill="url(#glow)"/>
  <rect x="0" y="158" width="1200" height="190" fill="#184f7d" opacity=".16" stroke="#fff" stroke-opacity=".08"/>
  <line x1="-20" y1="150" x2="320" y2="65" stroke="#fff" stroke-width="6" opacity=".9"/>
  <line x1="1220" y1="150" x2="880" y2="65" stroke="#fff" stroke-width="6" opacity=".9"/>
  <line x1="40" y1="48" x2="190" y2="18" stroke="#ffd400" stroke-width="5"/>
  <line x1="1010" y1="570" x2="1160" y2="540" stroke="#ffd400" stroke-width="5"/>

  <text x="68" y="48" font-family="Arial,sans-serif" font-size="27" font-weight="900" font-style="italic" fill="#fff">⚽ FOOT FRANÇAIS</text>
  <rect x="68" y="57" width="170" height="39" rx="3" fill="#ffd400"/>
  <text x="153" y="84" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="900" font-style="italic" fill="#071a46">EXPRESS</text>
  <text x="1132" y="48" text-anchor="end" font-family="Arial,sans-serif" font-size="24" font-weight="900" fill="#fff">${esc(league.toUpperCase())}</text>
  ${round ? `<text x="1132" y="76" text-anchor="end" font-family="Arial,sans-serif" font-size="18" font-weight="800" fill="#ffd400">JOURNÉE ${esc(round)}</text>` : ""}

  ${teamBlock({x:300,name:home,logo:homeLogo})}
  ${teamBlock({x:900,name:away,logo:awayLogo})}

  <rect x="493" y="247" width="214" height="52" rx="10" fill="#ffd400"/>
  <text x="600" y="281" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="900" fill="#071a46">SCORE FINAL</text>
  <g filter="url(#shadow)">
    <text x="515" y="408" text-anchor="middle" font-family="Arial,sans-serif" font-size="112" font-weight="900" fill="#fff">${esc(hs)}</text>
    <text x="600" y="396" text-anchor="middle" font-family="Arial,sans-serif" font-size="62" font-weight="900" fill="#ffd400">–</text>
    <text x="685" y="408" text-anchor="middle" font-family="Arial,sans-serif" font-size="112" font-weight="900" fill="#fff">${esc(as)}</text>
  </g>

  <rect x="0" y="548" width="1200" height="82" fill="#000711" opacity=".76"/>
  <rect x="410" y="557" width="380" height="38" rx="3" fill="#ffd400"/>
  <text x="600" y="583" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" font-weight="900" font-style="italic" fill="#071a46">LE DÉBRIEF DE LA RÉDACTION</text>
  <text x="600" y="615" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" letter-spacing="4" fill="#fff" opacity=".9">foot-francais-express.vercel.app</text>
</svg>`;

    return new Response(svg, {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600"
      }
    });
  } catch (error) {
    return new Response(`match-visual error: ${error?.message || "unknown"}`, { status:500, headers:{"content-type":"text/plain; charset=utf-8"} });
  }
}
