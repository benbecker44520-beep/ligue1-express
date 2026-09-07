import { NextResponse } from "next/server";

export const runtime = "nodejs";

function config() {
  const pageId = String(process.env.FACEBOOK_PAGE_ID || "").trim();
  const token = String(process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "").trim();
  return { pageId, token, configured: Boolean(pageId && token) };
}

async function graph(path, token) {
  const url = new URL(`https://graph.facebook.com/v26.0/${path}`);
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { cache: "no-store" });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok && !json?.error, status: response.status, json };
}

export async function GET() {
  const { pageId, token, configured } = config();
  if (!configured) return NextResponse.json({ ok: false, configured: false });

  const [me, page, permissions, accounts] = await Promise.all([
    graph("me?fields=id,name", token),
    graph(`${encodeURIComponent(pageId)}?fields=id,name`, token),
    graph("me/permissions", token),
    graph("me/accounts?fields=id,name", token)
  ]);

  const granted = Array.isArray(permissions.json?.data)
    ? permissions.json.data.filter((p) => p.status === "granted").map((p) => p.permission)
    : [];
  const managedPages = Array.isArray(accounts.json?.data)
    ? accounts.json.data.map((p) => ({ id: String(p.id), name: p.name }))
    : [];

  const tokenIdentityId = me.json?.id ? String(me.json.id) : null;
  const tokenLooksLikePageToken = Boolean(tokenIdentityId && tokenIdentityId === String(pageId));
  const pageVisibleInAccounts = managedPages.some((p) => p.id === String(pageId));

  return NextResponse.json({
    ok: Boolean(page.ok),
    configured: true,
    page: page.ok ? { id: page.json.id, name: page.json.name } : null,
    tokenIdentity: me.ok ? { id: me.json.id, name: me.json.name } : null,
    tokenLooksLikePageToken,
    pageVisibleInAccounts,
    grantedPermissions: granted,
    requiredPermissions: {
      pages_show_list: granted.includes("pages_show_list"),
      pages_manage_posts: granted.includes("pages_manage_posts"),
      pages_read_engagement: granted.includes("pages_read_engagement")
    },
    errors: {
      me: me.ok ? null : { code: me.json?.error?.code || me.status, message: me.json?.error?.message || "Erreur Meta" },
      page: page.ok ? null : { code: page.json?.error?.code || page.status, message: page.json?.error?.message || "Erreur Meta" },
      permissions: permissions.ok ? null : { code: permissions.json?.error?.code || permissions.status, message: permissions.json?.error?.message || "Erreur Meta" },
      accounts: accounts.ok ? null : { code: accounts.json?.error?.code || accounts.status, message: accounts.json?.error?.message || "Erreur Meta" }
    }
  });
}
