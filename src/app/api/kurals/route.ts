import { NextRequest, NextResponse } from "next/server";
import { getKuralsByChapter } from "@/lib/kurals";
import { MAX_CHAPTER } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const chapter = parseInt(
    request.nextUrl.searchParams.get("chapter") ?? "",
    10
  );
  if (isNaN(chapter) || chapter < 1 || chapter > MAX_CHAPTER) {
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
