// OneKural Service Worker
const CACHE_VERSION = "v10";
const SHELL_CACHE = `onekural-shell-${CACHE_VERSION}`;
const KURAL_CACHE = `onekural-kurals-${CACHE_VERSION}`;

const APP_SHELL = [
  "/",
  "/explore",
  "/journal",
  "/profile",
  "/profile/favorites",
  "/manifest.json",
  "/data/kurals.json",
  "/kural/1",  // generic kural shell — served for any /kural/[id] when offline
];

// ─── Offline kural helpers ─────────────────────────────────────────────────
// Lazily populated from pre-cached /data/kurals.json on first offline fallback.
let _offlineKurals = null;

async function getOfflineKurals() {
  if (_offlineKurals) return _offlineKurals;
  const cached = await caches.match("/data/kurals.json");
  if (!cached) return null;
  try {
    _offlineKurals = await cached.json();
    return _offlineKurals;
  } catch {
    return null;
  }
}

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function offlineKuralById(id) {
  const kurals = await getOfflineKurals();
  if (!kurals) return jsonRes({ error: "Offline" }, 503);
  const k = kurals.find((k) => k.id === id);
  return k ? jsonRes(k) : jsonRes({ error: "Not found" }, 404);
}

async function offlineKuralsByChapter(chapter) {
  const kurals = await getOfflineKurals();
  if (!kurals) return jsonRes({ error: "Offline" }, 503);
  return jsonRes(
    kurals.filter((k) => k.chapter === chapter).sort((a, b) => a.id - b.id)
  );
}

async function offlineChaptersByBook(book) {
  const kurals = await getOfflineKurals();
  if (!kurals) return jsonRes({ error: "Offline" }, 503);
  const seen = new Set();
  const chapters = [];
  for (const k of [...kurals].sort((a, b) => a.chapter - b.chapter)) {
    if (k.book === book && !seen.has(k.chapter)) {
      seen.add(k.chapter);
      chapters.push({
        chapter: k.chapter,
        chapter_name_tamil: k.chapter_name_tamil,
        chapter_name_english: k.chapter_name_english,
        book: k.book,
      });
    }
  }
  return jsonRes(chapters);
}

async function offlineSearch(query) {
  const kurals = await getOfflineKurals();
  if (!kurals) return jsonRes({ error: "Offline" }, 503);
  const q = query.trim().toLowerCase();
  if (!q) return jsonRes([]);
  const results = [];
  for (const k of kurals) {
    if (
      k.kural_tamil.toLowerCase().includes(q) ||
      k.meaning_english.toLowerCase().includes(q) ||
      k.meaning_tamil.toLowerCase().includes(q) ||
      k.transliteration.toLowerCase().includes(q) ||
      k.chapter_name_english.toLowerCase().includes(q)
    ) {
      results.push(k);
      if (results.length >= 50) break;
    }
  }
  return jsonRes(results);
}

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
      .then(() => {
        // Parallelise SW boot with navigation network request — eliminates
        // latency gap when serving from SWR cache below.
        if (self.registration.navigationPreload) {
          return self.registration.navigationPreload.enable();
        }
      })
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

  // Static assets: cache-first (content-hashed, never change after deploy)
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

  // Kural dataset: stale-while-revalidate — serve cached copy immediately so
  // the app never waits on a network round-trip, but fetch a fresh copy in the
  // background so data updates (new kurals.json deploy) reach users promptly.
  if (url.pathname === "/data/kurals.json") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        }).catch(() => null);

        // Return cached immediately; background fetch updates for next load.
        if (cached) {
          networkFetch.catch(() => {});
          return cached;
        }
        return networkFetch;
      })
    );
    return;
  }

  // Kural + chapters + search API: network-first, offline fallback from kurals.json
  if (
    url.pathname.startsWith("/api/kural") ||
    url.pathname.startsWith("/api/chapters") ||
    url.pathname.startsWith("/api/search")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(KURAL_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Try previously-cached response first
          const cached = await caches.match(request);
          if (cached) return cached;

          // Compute from pre-cached kurals.json
          if (url.pathname.match(/^\/api\/kural\/\d+$/)) {
            return offlineKuralById(parseInt(url.pathname.split("/").pop(), 10));
          }
          if (url.pathname === "/api/kurals") {
            const ch = parseInt(url.searchParams.get("chapter") ?? "", 10);
            if (!isNaN(ch)) return offlineKuralsByChapter(ch);
          }
          if (url.pathname === "/api/chapters") {
            const book = parseInt(url.searchParams.get("book") ?? "1", 10);
            return offlineChaptersByBook(isNaN(book) ? 1 : book);
          }
          if (url.pathname === "/api/search") {
            return offlineSearch(url.searchParams.get("q") ?? "");
          }
          return jsonRes({ error: "Offline" }, 503);
        })
    );
    return;
  }

  // Navigation: kural pages always use the pre-cached /kural/1 shell so there
  // is never a per-kural network round-trip. KuralCard reads the correct kural
  // from the client-side IndexedDB store (populated from kurals.json) and
  // applies it synchronously before the browser paints — no visible flash.
  // All other navigation requests use stale-while-revalidate.
  if (request.mode === "navigate") {
    const isKuralPage = url.pathname.match(/^\/kural\/\d+$/);

    if (isKuralPage) {
      event.respondWith(
        (async () => {
          const shell = await caches.match("/kural/1");
          if (shell) return shell;
          // Shell not cached yet (very first SW install) — fetch from network.
          // Cache the result as the shell for future navigations.
          const fresh = await fetch(request).catch(() => null);
          if (fresh && fresh.ok) {
            caches.open(SHELL_CACHE).then((c) => c.put("/kural/1", fresh.clone()));
            return fresh;
          }
          return (await caches.match("/")) ?? new Response("Offline", { status: 503 });
        })()
      );
      return;
    }

    // Non-kural pages: stale-while-revalidate — serve cache instantly (no blank
    // flash on resume after Android kills the process), update cache in background.
    event.respondWith(
      (async () => {
        const cached = await caches.match(request, { ignoreSearch: true });

        // event.preloadResponse: Chrome starts this fetch in parallel with SW
        // boot when navigationPreload is enabled — no extra round-trip cost.
        const networkPromise = event.preloadResponse
          ? event.preloadResponse.catch(() => null)
          : fetch(request).catch(() => null);

        if (cached) {
          // Return cache immediately; revalidate in background
          networkPromise
            .then((fresh) => {
              if (fresh && fresh.ok) {
                caches.open(SHELL_CACHE).then((c) => c.put(request, fresh.clone()));
              }
            })
            .catch(() => {});
          return cached;
        }

        // No cache yet (first visit or after version bump) — wait for network
        const fresh = await networkPromise;
        if (fresh && fresh.ok) {
          caches.open(SHELL_CACHE).then((c) => c.put(request, fresh.clone()));
          return fresh;
        }

        // Offline + no cache
        return (
          (await caches.match("/")) ??
          new Response("Offline", { status: 503 })
        );
      })()
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
  const options = event.oldSubscription?.options;
  if (!options) return;
  event.waitUntil(
    Promise.all([
      self.registration.pushManager.subscribe(options),
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
      badge: "/icons/badge-96.png",
      data: { url: data.url || "/" },
      requireInteraction: true,
      vibrate: [200, 100, 200],
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
