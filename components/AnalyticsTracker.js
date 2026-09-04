"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";

const VISITOR_KEY = "l1e_visitor_id";
const SESSION_KEY = "l1e_session_id";
const LAST_VIEW_KEY = "l1e_last_page_view";

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

function getStoredId(storage, key) {
  try {
    let value = storage.getItem(key);
    if (!value) {
      value = randomId();
      storage.setItem(key, value);
    }
    return value;
  } catch {
    // Sans stockage persistant, chaque page deviendrait à tort un nouveau visiteur.
    return null;
  }
}

function isAutomatedBrowser() {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent || "";
  return Boolean(navigator.webdriver) || /bot|crawler|spider|slurp|headless|lighthouse|pagespeed|vercel|facebookexternalhit|twitterbot|linkedinbot|whatsapp|preview/i.test(ua);
}

function isRapidDuplicate(pathname) {
  try {
    const previous = JSON.parse(window.sessionStorage.getItem(LAST_VIEW_KEY) || "null");
    const now = Date.now();
    if (previous?.path === pathname && now - Number(previous?.at || 0) < 60_000) return true;
    window.sessionStorage.setItem(LAST_VIEW_KEY, JSON.stringify({ path: pathname, at: now }));
    return false;
  } catch {
    return true;
  }
}

function getDeviceType() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(ua)) return "mobile";
  return "desktop";
}

function getReferrerHost() {
  if (typeof document === "undefined" || !document.referrer) return "direct";
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    if (host === window.location.hostname.replace(/^www\./, "")) return "internal";
    return host || "direct";
  } catch {
    return "direct";
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || !hasSupabaseConfig()) return;
    if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;
    if (isAutomatedBrowser() || isRapidDuplicate(pathname)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionData?.session) {
        const { data: isAdmin } = await supabase.rpc("is_current_user_admin");
        if (cancelled || isAdmin === true) return;
      }
      const visitorId = getStoredId(window.localStorage, VISITOR_KEY);
      const sessionId = getStoredId(window.sessionStorage, SESSION_KEY);
      if (!visitorId || !sessionId) return;
      const safePath = pathname.slice(0, 500);
      const tenMinuteBucket = Math.floor(Date.now() / 600_000);
      await supabase.from("page_views").insert({
        visitor_id: visitorId,
        session_id: sessionId,
        path: safePath,
        referrer: getReferrerHost().slice(0, 250),
        device: getDeviceType(),
        view_key: `${visitorId}:${tenMinuteBucket}:${safePath}`
      });
    }, 800);

    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [pathname]);

  return null;
}
