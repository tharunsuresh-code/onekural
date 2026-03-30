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

  const { data, error } = await supabaseAdmin
    .from("push_subscriptions")
    .update({ user_id: user.id })
    .eq("device_id", fcmDeviceId)
    .eq("subscription_type", "fcm")
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If no rows matched, the FCM subscription hasn't been registered yet (race: the
  // Android app's fcm-subscribe POST hasn't completed before this call fired).
  // Return 202 so the client knows to retry rather than treating it as success.
  if (!data || data.length === 0) {
    return NextResponse.json({ ok: false, pending: true }, { status: 202 });
  }

  return NextResponse.json({ ok: true });
}
