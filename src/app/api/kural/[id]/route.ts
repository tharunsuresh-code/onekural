import { NextRequest, NextResponse } from "next/server";
import { getKural } from "@/lib/kurals";
import { MAX_KURAL_ID } from "@/lib/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id) || id < 1 || id > MAX_KURAL_ID) {
    return NextResponse.json({ error: "Invalid kural ID" }, { status: 400 });
  }

  try {
    const kural = await getKural(id);
    return NextResponse.json(kural);
  } catch {
    return NextResponse.json({ error: "Kural not found" }, { status: 404 });
  }
}
