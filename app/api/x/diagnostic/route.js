import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function enc(v) {
  return encodeURIComponent(String(v)).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function cfg() {
  const consumerKey = String(process.env.X_API_KEY || "").trim();
  const consumerSecret = String(process.env.X_API_SECRET || "").trim();
  const accessToken = String(process.env.X_ACCESS_TOKEN || "").trim();
  const accessSecret = String(process.env.X_ACCESS_TOKEN_SECRET || "").trim();
  return { consumerKey, consumerSecret, accessToken, accessSecret, configured: Boolean(consumerKey && consumerSecret && accessToken && accessSecret) };
}

function auth(method, url, c) {
  const o = {
    oauth_consumer_key: c.consumerKey,
    oauth_nonce: crypto.randomBytes(18).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: c.accessToken,
    oauth_version: "1.0"
  };
  const ps = Object.entries(o).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${enc(k)}=${enc(v)}`).join("&");
  const base = `${method.toUpperCase()}&${enc(url)}&${enc(ps)}`;
  o.oauth_signature = crypto.createHmac("sha1", `${enc(c.consumerSecret)}&${enc(c.accessSecret)}`).update(base).digest("base64");
  return `OAuth ${Object.entries(o).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${enc(k)}="${enc(v)}"`).join(", ")}`;
}

export async function GET() {
  const c = cfg();
  if (!c.configured) return NextResponse.json({ ok:false, configured:false });
  try {
    const url = "https://api.x.com/2/tweets";
    // Intentionally invalid/empty text: validates write endpoint, auth and account access without creating a public post.
    const r = await fetch(url, {
      method:"POST",
      headers:{ Authorization: auth("POST", url, c), "Content-Type":"application/json" },
      body: JSON.stringify({ text:"" }),
      cache:"no-store"
    });
    const j = await r.json().catch(() => ({}));
    // 400 for empty text means authentication/write access reached the create-post endpoint successfully.
    const validationReached = r.status === 400;
    return NextResponse.json({
      ok: validationReached,
      configured:true,
      writeEndpointReached: validationReached,
      status:r.status,
      title:j?.title || null,
      detail:j?.detail || null,
      type:j?.type || null,
      errors:Array.isArray(j?.errors) ? j.errors.map(e => ({ message:e?.message || null, type:e?.type || null })) : null
    });
  } catch (e) {
    return NextResponse.json({ ok:false, configured:true, error:e?.message || "Diagnostic X impossible." });
  }
}
