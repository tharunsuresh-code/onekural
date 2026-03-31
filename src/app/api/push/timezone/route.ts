import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { deviceId, timezone } = await request.json();

  if (!timezone || typeof timezone !== "string" || timezone.length > 64) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Update by device_id (web push users — anonymous or logged in)
  if (deviceId) {
    if (typeof deviceId !== "string" || deviceId.length > 64) {
      return NextResponse.json({ error: "Invalid deviceId" }, { status: 400 });
    }
    await supabaseAdmin
      .from("push_subscriptions")
      .update({ timezone })
      .eq("device_id", deviceId);
  }

  // Update all subscription rows for the authenticated user (covers FCM + web push)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      await supabaseAdmin
        .from("push_subscriptions")
        .update({ timezone })
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
