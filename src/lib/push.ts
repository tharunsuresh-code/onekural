/**
 * Client-side push notification utilities
 */

import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

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

/** Subscribe the current device and save to Supabase */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.error("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
    });

    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: userId, subscription: subscription.toJSON() },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("[Push] Failed to save subscription:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Push] Subscribe error:", err);
    return false;
  }
}

/** Unsubscribe the current device and remove from Supabase */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("[Push] Failed to remove subscription:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Push] Unsubscribe error:", err);
    return false;
  }
}

/** Check if push is currently subscribed */
export async function isPushSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}
