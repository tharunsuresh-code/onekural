import { NextRequest, NextResponse } from "next/server";
import { searchKurals } from "@/lib/kurals";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 200);
  if (!query.trim()) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchKurals(query);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
