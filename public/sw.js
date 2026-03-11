// OneKural Service Worker
const CACHE_VERSION = "v1";
const SHELL_CACHE = `onekural-shell-${CACHE_VERSION}`;
const KURAL_CACHE = `onekural-kurals-${CACHE_VERSION}`;

const APP_SHELL = [
  "/",
  "/explore",
  "/journal",
  "/profile",
  "/manifest.json",
];

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== KURAL_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except fonts)
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin && !url.hostname.includes("fonts.g")) return;

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.hostname.includes("fonts.g")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Kural API: network-first, cache viewed kurals for offline
  if (url.pathname.startsWith("/api/kural")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(KURAL_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Navigation: network-first with offline fallback to shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then((cached) => cached || new Response("Offline", { status: 503 }))
      )
    );
    return;
  }
});

// ─── IDB helpers (used by pushsubscriptionchange) ──────────────────────────
const IDB_NAME = "onekural-push";
const IDB_STORE = "meta";

function openPushIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getFromIDB(key) {
  return openPushIDB().then(
    (db) =>
      new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const r = tx.objectStore(IDB_STORE).get(key);
        r.onsuccess = () => resolve(r.result ?? null);
        r.onerror = () => resolve(null);
      })
  );
}

// ─── Push subscription auto-refresh ────────────────────────────────────────
// Fires when the browser silently rotates the push endpoint (rare but real).
// Re-subscribes and saves the new subscription to the server so the next
// daily push reaches the correct endpoint.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.pushManager.subscribe(event.oldSubscription.options),
      getFromIDB("device_id"),
    ])
      .then(([newSub, deviceId]) => {
        if (!deviceId) return;
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: newSub.toJSON(),
            deviceId,
          }),
        });
      })
      .catch(console.error)
  );
});

// ─── Push ──────────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "OneKural", body: "Your daily kural is ready." };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/favicon-32.png",
      data: { url: data.url || "/" },
    })
  );
});

// ─── Notification click ────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Always use an absolute URL so openWindow/navigate work correctly in PWA
  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          // Return the promise chain so the SW stays alive until navigation completes
          return existing.focus().then(() => existing.navigate(targetUrl));
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
