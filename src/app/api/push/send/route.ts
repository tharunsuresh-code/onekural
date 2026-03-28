import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { getDailyKural } from "@/lib/kurals";
import { BOOK_NAMES } from "@/lib/types";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

function getFirebaseMessaging() {
  if (getApps().length === 0) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) });
  }
  return getMessaging();
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_MAILTO = process.env.VAPID_MAILTO ?? "mailto:hello@onekural.app";

// Authorized by CRON_SECRET in Vercel environment (set in vercel.json)
const CRON_SECRET = process.env.CRON_SECRET;

// Vercel cron jobs send GET requests; POST is kept for manual triggering
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  // Always validate — if CRON_SECRET unset, endpoint is disabled
  const auth = request.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  // Service-role client (bypasses RLS to read all subscriptions)
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, subscription, timezone, user_id, fcm_token, subscription_type");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();

  // Filter to subscriptions where it is currently 4 AM in their local timezone.
  // Cron runs hourly, so this fires once per hour and picks up whichever timezones
  // are at the 4 o'clock hour right now (covers half-hour offsets like IST within ±30 min).
  const toNotify = (subs ?? []).filter((row) => {
    const tz = row.timezone || "Asia/Kolkata";
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).formatToParts(now);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "-1");
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "60");
      // Only fire in the first half of the 4 AM hour to avoid duplicate notifications
      // when the cron runs twice within the same hour (e.g. 4:00 and 4:30).
      return hour === 4 && minute < 30;
    } catch {
      return false;
    }
  });

  // Group by local date — subscriptions in different timezones may get different kurals.
  // Each group tracks webpush and fcm rows separately for dispatch routing.
  type SubRow = (typeof toNotify)[0];
  const dateGroups = new Map<string, { webpush: SubRow[]; fcm: SubRow[] }>();
  for (const row of toNotify) {
    const tz = row.timezone || "Asia/Kolkata";
    const localDate = now.toLocaleDateString("en-CA", { timeZone: tz });
    if (!dateGroups.has(localDate)) dateGroups.set(localDate, { webpush: [], fcm: [] });
    const group = dateGroups.get(localDate)!;
    const type = row.subscription_type ?? "webpush";
    if (type === "fcm" && row.fcm_token != null) {
      group.fcm.push(row);
    } else if (type === "webpush" && row.subscription != null) {
      group.webpush.push(row);
    }
  }

  // Batch-fetch language preferences from user metadata for all logged-in subscribers
  const userIds = Array.from(new Set((subs ?? []).map((r) => r.user_id).filter(Boolean))) as string[];
  const langPrefMap = new Map<string, string>();
  await Promise.allSettled(
    userIds.map(async (uid) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
      const pref = data?.user?.user_metadata?.kuralPrefs?.boxContent;
      if (pref === "transliteration") langPrefMap.set(uid, "transliteration");
    })
  );

  const expiredWebPushIds: string[] = [];
  const expiredFcmIds: string[] = [];
  let sent = 0;
  const errors: Array<{ subscriptionId: string; error: string }> = [];

  // Only init Firebase if the env var is configured
  const fcm = process.env.FIREBASE_SERVICE_ACCOUNT ? getFirebaseMessaging() : null;

  for (const [date, groups] of Array.from(dateGroups.entries())) {
    const kural = await getDailyKural(date);

    // --- Web Push (browser users) ---
    await Promise.allSettled(
      groups.webpush.map(async (row) => {
        const langPref = row.user_id ? (langPrefMap.get(row.user_id) ?? "tamil") : "tamil";
        const body = langPref === "transliteration" ? kural.transliteration : kural.kural_tamil;
        const title = langPref === "transliteration"
          ? `${BOOK_NAMES[kural.book].english} · ${kural.chapter_name_english}`
          : `${BOOK_NAMES[kural.book].tamil} · ${kural.chapter_name_tamil}`;
        const payload = JSON.stringify({ title, body, url: "/" });
        try {
          await webpush.sendNotification(row.subscription as webpush.PushSubscription, payload);
          sent++;
        } catch (err: unknown) {
          if (err && typeof err === "object" && "statusCode" in err) {
            const e = err as { statusCode: number };
            if (e.statusCode === 410 || e.statusCode === 404) {
              expiredWebPushIds.push(row.id);
            } else {
              errors.push({ subscriptionId: row.id, error: `HTTP ${e.statusCode}` });
            }
          } else if (err instanceof Error) {
            errors.push({ subscriptionId: row.id, error: err.message });
          }
        }
      })
    );

    // --- FCM (Android app users) ---
    if (fcm) {
      await Promise.allSettled(
        groups.fcm.map(async (row) => {
          const langPref = row.user_id ? (langPrefMap.get(row.user_id) ?? "tamil") : "tamil";
          const body = langPref === "transliteration" ? kural.transliteration : kural.kural_tamil;
          const title = langPref === "transliteration"
            ? `${BOOK_NAMES[kural.book].english} · ${kural.chapter_name_english}`
            : `${BOOK_NAMES[kural.book].tamil} · ${kural.chapter_name_tamil}`;
          try {
            await fcm.send({
              token: row.fcm_token as string,
              notification: { title, body },
              android: {
                priority: "normal",
                notification: {
                  channelId: "daily_kural",
                  icon: "ic_notification_icon",
                  color: "#1B5E4F",
                },
              },
            });
            sent++;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (
              msg.includes("registration-token-not-registered") ||
              msg.includes("invalid-registration-token")
            ) {
              expiredFcmIds.push(row.id);
            } else {
              errors.push({ subscriptionId: row.id, error: msg });
            }
          }
        })
      );
    }
  }

  // Clean up expired subscriptions
  const allExpired = [...expiredWebPushIds, ...expiredFcmIds];
  if (allExpired.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", allExpired);
  }

  return NextResponse.json({
    sent,
    expired: allExpired.length,
    expiredBreakdown: { webpush: expiredWebPushIds.length, fcm: expiredFcmIds.length },
    errors,
  });
}
