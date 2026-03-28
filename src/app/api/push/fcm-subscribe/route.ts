import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { fcmToken, deviceId, timezone } = await request.json();

  if (!fcmToken || !deviceId) {
    return NextResponse.json({ error: "Missing fcmToken or deviceId" }, { status: 400 });
  }
  if (typeof fcmToken !== "string" || fcmToken.length > 4096) {
    return NextResponse.json({ error: "Invalid fcmToken" }, { status: 400 });
  }
  if (typeof deviceId !== "string" || deviceId.length > 64) {
    return NextResponse.json({ error: "Invalid deviceId" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      {
        device_id: deviceId,
        fcm_token: fcmToken,
        subscription_type: "fcm",
        subscription: null,
        timezone: timezone ?? null,
      },
      { onConflict: "device_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
