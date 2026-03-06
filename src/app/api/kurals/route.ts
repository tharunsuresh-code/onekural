import { NextRequest, NextResponse } from "next/server";
// TODO: same as /api/kural/[id] — revert to cached once data is stable.
export const dynamic = "force-dynamic";
import { getKuralsByChapter } from "@/lib/kurals";

export async function GET(request: NextRequest) {
  const chapter = parseInt(
    request.nextUrl.searchParams.get("chapter") ?? "",
    10
  );
  if (isNaN(chapter) || chapter < 1 || chapter > 133) {
    return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
  }

  try {
    const kurals = await getKuralsByChapter(chapter);
    return NextResponse.json(kurals);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch kurals" },
      { status: 500 }
    );
  }
}
