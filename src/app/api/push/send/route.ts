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
    .select("id, subscription");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const kural = await getDailyKural();
  const payload = JSON.stringify({
    title: "OneKural — Daily Thirukkural",
    body: kural.kural_tamil.split("\n")[0],
    url: "/",
  });

  const expiredIds: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    (subs ?? []).map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription as webpush.PushSubscription, payload);
        sent++;
      } catch (err: unknown) {
        // 410 Gone = subscription expired
        if (err && typeof err === "object" && "statusCode" in err) {
          const e = err as { statusCode: number };
          if (e.statusCode === 410 || e.statusCode === 404) {
            expiredIds.push(row.id);
          }
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("id", expiredIds);
  }

  return NextResponse.json({ sent, expired: expiredIds.length });
}
