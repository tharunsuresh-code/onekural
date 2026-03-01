import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { subscription, deviceId, userId } = await request.json();

  if (!subscription || !deviceId) {
    return NextResponse.json({ error: "Missing subscription or deviceId" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      { device_id: deviceId, user_id: userId ?? null, subscription },
      { onConflict: "device_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
