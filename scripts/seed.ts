/**
 * Seed script — populates the `kurals` table.
 *
 * Usage:
 *   npx ts-node --project tsconfig.seed.json scripts/seed.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Note: daily kural selection is handled deterministically in lib/kurals.ts
 * via a pre-shuffled Fisher-Yates order — no daily_kurals table needed.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawKural {
  Number: number;
  Line1: string;
  Line2: string;
  transliteration1: string;
  transliteration2: string;
  Translation: string;
  explanation: string;
  couplet: string;
  mv: string;
  sp: string;
  mk: string;
}

interface RawDetail {
  number: number;
  name: string;
  transliteration: string;
  translation: string;
  start: number;
  end: number;
  group?: string;
  section?: string;
}

interface RawDetailRoot {
  detail: RawDetail[];
}

// ─── Fetch source data ────────────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Build chapter lookup: kural id → chapter info ───────────────────────────

function buildChapterMap(details: RawDetail[]) {
  // detail.json has 133 chapters; each has start/end kural numbers
  // We infer book from section: "அறத்துப்பால்"=1, "பொருட்பால்"=2, "இன்பத்துப்பால்"=3
  const bookMap: Record<string, number> = {
    அறத்துப்பால: 1,
    பொருட்பால: 2,
    இன்பத்துப்பால: 3,
  };

  const map = new Map<
    number,
    { chapter: number; chapter_name_tamil: string; chapter_name_english: string; book: number }
  >();

  details.forEach((d, idx) => {
    const chapterNumber = idx + 1;
    // Derive book: chapters 1-38 → Aram, 39-108 → Porul, 109-133 → Inbam
    const book =
      chapterNumber <= 38 ? 1 : chapterNumber <= 108 ? 2 : 3;

    for (let k = d.start; k <= d.end; k++) {
      map.set(k, {
        chapter: chapterNumber,
        chapter_name_tamil: d.name,
        chapter_name_english: d.translation,
        book,
      });
    }
  });

  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching kural data...");

  const [kuralRoot, detailRoot] = await Promise.all([
    fetchJSON<{ kural: RawKural[] }>(
      "https://raw.githubusercontent.com/tk120404/thirukkural/master/thirukkural.json"
    ),
    fetchJSON<RawDetailRoot>(
      "https://raw.githubusercontent.com/tk120404/thirukkural/master/detail.json"
    ),
  ]);

  const rawKurals = kuralRoot.kural;
  const chapterMap = buildChapterMap(detailRoot.detail);

  console.log(`Fetched ${rawKurals.length} kurals, ${detailRoot.detail.length} chapters`);

  // ── Transform ──────────────────────────────────────────────────────────────

  const rows = rawKurals.map((k) => {
    const chapter = chapterMap.get(k.Number);
    if (!chapter) throw new Error(`No chapter found for kural #${k.Number}`);

    return {
      id: k.Number,
      book: chapter.book,
      chapter: chapter.chapter,
      chapter_name_tamil: chapter.chapter_name_tamil,
      chapter_name_english: chapter.chapter_name_english,
      kural_tamil: `${k.Line1}\n${k.Line2}`,
      transliteration: `${k.transliteration1}\n${k.transliteration2}`,
      meaning_english: k.explanation,
      scholars: [
        { name: "மு.வ", commentary: k.mv },
        { name: "சாலமன் பாப்பையா", commentary: k.sp },
        { name: "கலைஞர்", commentary: k.mk },
        { name: "Couplet", commentary: k.couplet },
        { name: "Explanation", commentary: k.explanation },
      ],
      themes: [],
    };
  });

  // ── Upsert kurals in batches of 100 ───────────────────────────────────────

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("kurals").upsert(batch);
    if (error) throw error;
    console.log(`Seeded kurals ${i + 1}–${Math.min(i + BATCH, rows.length)}`);
  }

  console.log("Done! 1330 kurals seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
