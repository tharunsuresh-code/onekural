import { NextRequest, NextResponse } from "next/server";
import { getKural } from "@/lib/kurals";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id) || id < 1 || id > 1330) {
    return NextResponse.json({ error: "Invalid kural ID" }, { status: 400 });
  }

  try {
    const kural = await getKural(id);
    return NextResponse.json(kural);
  } catch {
    return NextResponse.json({ error: "Kural not found" }, { status: 404 });
  }
}
