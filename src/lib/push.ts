/**
 * Client-side push notification utilities.
 * Works for both anonymous and logged-in users.
 * Subscriptions are keyed by a stable device UUID stored in localStorage.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const DEVICE_ID_KEY = "onekural-device-id";
const PUSH_TZ_KEY = "onekural-push-tz";
const PUSH_TZ_USER_KEY = "onekural-push-tz-user";
const IDB_NAME = "onekural-push";
const IDB_STORE = "meta";

/** Persist device_id in IDB so the service worker can read it on pushsubscriptionchange. */
function saveDeviceIdToIDB(deviceId: string): void {
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(deviceId, "device_id");
    };
  } catch {
    // IDB unavailable — non-fatal
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Subscribe this device. Pass userId when logged in (optional). */
export async function subscribeToPush(userId?: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.error("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
    return false;
  }

  // Callers must ensure Notification.permission === "granted" before calling this.
  // Requesting permission is the caller's responsibility (e.g. toggle() in profile/page.tsx).
  if (Notification.permission !== "granted") {
    console.warn("[Push] subscribeToPush called without notification permission granted");
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;

    // Clear any existing (potentially stale) subscription before re-subscribing.
    // If the push service has invalidated the endpoint (410 Gone), the browser
    // still caches it and subscribe() would return the same dead endpoint.
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
    });

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        deviceId: getDeviceId(),
        userId: userId ?? null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    if (!res.ok) {
      console.error("[Push] Failed to save subscription:", await res.text());
      return false;
    }
    saveDeviceIdToIDB(getDeviceId());
    localStorage.setItem(PUSH_TZ_KEY, Intl.DateTimeFormat().resolvedOptions().timeZone);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      // Notification permission not granted — the UI permission check should
      // have caught this, but guard here as a fallback.
      console.warn("[Push] Subscribe blocked — notification permission not granted");
    } else {
      console.error("[Push] Subscribe error:", err);
    }
    return false;
  }
}

/** Unsubscribe this device. */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();

    const res = await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId() }),
    });

    if (!res.ok) {
      console.error("[Push] Failed to remove subscription:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Push] Unsubscribe error:", err);
    return false;
  }
}

/**
 * Updates the stored push timezone if the device's timezone has changed since last sync.
 * Covers web push subscribers (anonymous or logged-in), keyed by device_id.
 * No-op if never subscribed or timezone is unchanged.
 */
export async function syncTimezoneIfChanged(): Promise<void> {
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) return;

  const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (localStorage.getItem(PUSH_TZ_KEY) === currentTz) return;

  try {
    const res = await fetch("/api/push/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, timezone: currentTz }),
    });
    if (res.ok) localStorage.setItem(PUSH_TZ_KEY, currentTz);
  } catch {
    // Non-fatal — retries on next launch
  }
}

/**
 * Updates the stored push timezone for all subscriptions tied to the logged-in user.
 * Covers FCM/TWA rows and web push rows for the same account.
 * No-op if timezone is unchanged since last sync.
 */
export async function syncUserTimezoneIfChanged(accessToken: string): Promise<void> {
  const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (localStorage.getItem(PUSH_TZ_USER_KEY) === currentTz) return;

  try {
    const res = await fetch("/api/push/timezone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ timezone: currentTz }),
    });
    if (res.ok) localStorage.setItem(PUSH_TZ_USER_KEY, currentTz);
  } catch {
    // Non-fatal — retries on next launch
  }
}

/** Check if this device is currently subscribed. Backfills IDB for existing subscribers. */
export async function isPushSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  // If permission was revoked in Chrome or OS settings, treat as unsubscribed.
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub !== null) saveDeviceIdToIDB(getDeviceId());
    return sub !== null;
  } catch {
    return false;
  }
}
