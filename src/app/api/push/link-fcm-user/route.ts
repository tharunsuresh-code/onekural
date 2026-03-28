import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { fcmDeviceId } = await request.json();

  if (!fcmDeviceId || typeof fcmDeviceId !== "string" || fcmDeviceId.length > 64) {
    return NextResponse.json({ error: "Invalid fcmDeviceId" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Resolve user from JWT — same pattern as /api/feedback
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .update({ user_id: user.id })
    .eq("device_id", fcmDeviceId)
    .eq("subscription_type", "fcm");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
