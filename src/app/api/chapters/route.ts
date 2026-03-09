import { NextRequest, NextResponse } from "next/server";
import { getChaptersByBook } from "@/lib/kurals";
import { MAX_BOOK } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const book = parseInt(
    request.nextUrl.searchParams.get("book") ?? "1",
    10
  );
  if (isNaN(book) || book < 1 || book > MAX_BOOK) {
    return NextResponse.json({ error: "Invalid book" }, { status: 400 });
  }

  try {
    const chapters = await getChaptersByBook(book);
    return NextResponse.json(chapters);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}
