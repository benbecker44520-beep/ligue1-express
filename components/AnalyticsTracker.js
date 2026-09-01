"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";

const VISITOR_KEY = "l1e_visitor_id";
const SESSION_KEY = "l1e_session_id";

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
    return randomId();
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

    const visitorId = getStoredId(window.localStorage, VISITOR_KEY);
    const sessionId = getStoredId(window.sessionStorage, SESSION_KEY);
    const supabase = createSupabaseClient();
    if (!supabase) return;

    const timer = window.setTimeout(() => {
      supabase.from("page_views").insert({
        visitor_id: visitorId,
        session_id: sessionId,
        path: pathname.slice(0, 500),
        referrer: getReferrerHost().slice(0, 250),
        device: getDeviceType()
      }).then(() => {}).catch(() => {});
    }, 250);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
