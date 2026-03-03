import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { getDailyKural } from "@/lib/kurals";

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
  // Verify cron secret when set (Vercel cron sends Authorization header)
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    .select("id, subscription, timezone");

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
        hour12: false,
      }).formatToParts(now);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "-1");
      return hour === 4;
    } catch {
      return false;
    }
  });

  // Group by local date — subscriptions in different timezones may get different kurals
  const dateGroups = new Map<string, typeof toNotify>();
  for (const row of toNotify) {
    const tz = row.timezone || "Asia/Kolkata";
    const localDate = now.toLocaleDateString("en-CA", { timeZone: tz });
    if (!dateGroups.has(localDate)) dateGroups.set(localDate, []);
    dateGroups.get(localDate)!.push(row);
  }

  const expiredIds: string[] = [];
  let sent = 0;

  for (const [date, rows] of Array.from(dateGroups.entries())) {
    const kural = await getDailyKural(date);
    const payload = JSON.stringify({
      title: "OneKural — Daily Thirukkural",
      body: kural.kural_tamil.split("\n")[0],
      url: "/",
    });

    await Promise.allSettled(
      rows.map(async (row: (typeof toNotify)[0]) => {
        try {
          await webpush.sendNotification(row.subscription as webpush.PushSubscription, payload);
          sent++;
        } catch (err: unknown) {
          // 410 Gone / 404 = subscription expired
          if (err && typeof err === "object" && "statusCode" in err) {
            const e = err as { statusCode: number };
            if (e.statusCode === 410 || e.statusCode === 404) {
              expiredIds.push(row.id);
            }
          }
        }
      })
    );
  }

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("id", expiredIds);
  }

  return NextResponse.json({ sent, expired: expiredIds.length });
}
