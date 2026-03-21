import { NextRequest, NextResponse } from "next/server";
import { MAX_KURAL_ID } from "@/lib/constants";
import { getKuralsByIds } from "@/lib/kurals";

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  if (!idsParam.trim()) {
    return NextResponse.json([]);
  }

  const ids = idsParam
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= MAX_KURAL_ID);

  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  // Cap at 100 to prevent abuse
  const safeIds = ids.slice(0, 100);

  try {
    const data = await getKuralsByIds(safeIds);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch kurals" }, { status: 500 });
  }
}
