const CACHE_NAME = "foot-francais-express-v2";
const OFFLINE_URL = "/offline";
const PRECACHE = [
  "/offline",
  "/icon-192.png",
  "/icon-512.png",
  "/logo-foot-francais-express.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(OFFLINE_URL))
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }))
    );
  }
});

function notificationActions(type) {
  if (type === "article_published") return [{ action: "open", title: "Lire l'article" }];
  if (type === "lineup") return [{ action: "open", title: "Voir les compos" }];
  if (["goal", "red_card", "offside", "foul"].includes(type)) return [{ action: "open", title: "Voir le LIVE" }];
  return [{ action: "open", title: "Ouvrir FF Express" }];
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || "Nouvelle actualité sur FF Express" };
  }

  const type = payload.type || "generic";
  const options = {
    body: payload.body || "Ouvre FF Express pour découvrir la suite.",
    icon: payload.icon || "/icon-192.png",
    tag: payload.tag || `ff-express-${type}`,
    renotify: true,
    timestamp: Date.now(),
    data: { url: payload.url || "/" },
    actions: notificationActions(type)
  };

  // Android affichait un gros carré blanc quand le logo complet était utilisé comme badge.
  // On n'impose donc plus de badge : Android garde son rendu natif propre.
  if (payload.image) options.image = payload.image;
  if (type === "goal") options.vibrate = [140, 70, 140];
  else if (type === "red_card") options.vibrate = [120, 60, 120];

  event.waitUntil(
    self.registration.showNotification(payload.title || "FF Express", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url === target);
    if (existing) return existing.focus();
    return clients.openWindow(target);
  }));
});
