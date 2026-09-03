import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export function pushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration serveur Supabase incomplète.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function authenticatedSupabase(token) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !token) throw new Error("Authentification requise.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function configureWebPush() {
  if (!pushConfigured()) throw new Error("Clés Web Push absentes.");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contact@ligue1-express.fr",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return webpush;
}

export async function sendPush(subscription, payload) {
  const client = configureWebPush();
  return client.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    JSON.stringify(payload),
    { TTL: 300, urgency: payload?.type === "goal" ? "high" : "normal" }
  );
}

