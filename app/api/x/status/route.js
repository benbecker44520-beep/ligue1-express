import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function oauthEncode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function config() {
  const consumerKey = String(process.env.X_API_KEY || "").trim();
  const consumerSecret = String(process.env.X_API_SECRET || "").trim();
  const accessToken = String(process.env.X_ACCESS_TOKEN || "").trim();
  const accessSecret = String(process.env.X_ACCESS_TOKEN_SECRET || "").trim();
  return { consumerKey, consumerSecret, accessToken, accessSecret, configured: Boolean(consumerKey && consumerSecret && accessToken && accessSecret) };
}

function oauthHeader(method, url, params, cfg) {
  const oauth = {
    oauth_consumer_key: cfg.consumerKey,
    oauth_nonce: crypto.randomBytes(18).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: cfg.accessToken,
    oauth_version: "1.0"
  };

  const all = { ...oauth, ...params };
  const parameterString = Object.entries(all)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${oauthEncode(k)}=${oauthEncode(v)}`)
    .join("&");
  const signatureBase = `${method.toUpperCase()}&${oauthEncode(url)}&${oauthEncode(parameterString)}`;
  oauth.oauth_signature = crypto
    .createHmac("sha1", `${oauthEncode(cfg.consumerSecret)}&${oauthEncode(cfg.accessSecret)}`)
    .update(signatureBase)
    .digest("base64");

  return `OAuth ${Object.entries(oauth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${oauthEncode(k)}="${oauthEncode(v)}"`)
    .join(", ")}`;
}

export async function GET() {
  const cfg = config();
  if (!cfg.configured) return NextResponse.json({ ok: false, configured: false });

  try {
    const baseUrl = "https://api.x.com/2/users/me";
    const params = { "user.fields": "id,name,username" };
    const qs = new URLSearchParams(params);
    const response = await fetch(`${baseUrl}?${qs.toString()}`, {
      headers: { Authorization: oauthHeader("GET", baseUrl, params, cfg) },
      cache: "no-store"
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        configured: true,
        status: response.status,
        title: json?.title || null,
        detail: json?.detail || null,
        error: json?.errors?.[0]?.message || null
      });
    }
    return NextResponse.json({
      ok: true,
      configured: true,
      account: json?.data ? { id: json.data.id, name: json.data.name, username: json.data.username } : null
    });
  } catch (error) {
    return NextResponse.json({ ok: false, configured: true, error: error?.message || "Diagnostic X impossible." });
  }
}
