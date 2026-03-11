import { supabase } from "./supabase";
import type { Kural, Chapter } from "./types";
import { MAX_KURAL_ID, MS_PER_DAY } from "./constants";

// Fixed epoch: Jan 1 2025 (calendar date anchor, timezone-agnostic).
const EPOCH = "2025-01-01";

/**
 * Seeded Fisher-Yates shuffle of kural IDs 1–1330.
 * Uses xorshift32 with a fixed seed so the order is identical for every build/user.
 * Computed once at module load — O(1) daily lookup thereafter.
 */
const DAILY_ORDER: number[] = (() => {
  let x = 0x4A9F3C2E; // fixed seed — change this to re-roll the schedule
  const rand = () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0xFFFFFFFF;
  };
  const arr = Array.from({ length: MAX_KURAL_ID }, (_, i) => i + 1);
  for (let i = MAX_KURAL_ID - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
})();

/**
 * Returns today's date as YYYY-MM-DD in the user's local timezone.
 * Used as the default fallback — callers on the client pass their own local date;
 * the server-side home page relies on KuralCard to correct it on hydration.
 */
export function getTodayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

/**
 * Deterministically maps a calendar date string (YYYY-MM-DD) to a kural ID (1–1330).
 * Uses a pre-shuffled order so consecutive days show unrelated kurals.
 * The same date always returns the same kural, regardless of who calls it.
 */
export function getDailyKuralId(date: string = getTodayLocal()): number {
  const today = new Date(date + "T00:00:00Z").getTime();
  const epoch = new Date(EPOCH + "T00:00:00Z").getTime();
  const daysSinceEpoch = Math.floor((today - epoch) / MS_PER_DAY);
  return DAILY_ORDER[((daysSinceEpoch % MAX_KURAL_ID) + MAX_KURAL_ID) % MAX_KURAL_ID];
}

export async function getDailyKural(date: string = getTodayLocal()): Promise<Kural> {
  const id = getDailyKuralId(date);
  const { data, error } = await supabase
    .from("kurals")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Kural;
}

export async function getKural(id: number): Promise<Kural> {
  const { data, error } = await supabase
    .from("kurals")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Kural;
}

export async function getChaptersByBook(book: number): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from("kurals")
    .select("chapter, chapter_name_tamil, chapter_name_english, book")
    .eq("book", book)
    .order("chapter", { ascending: true });
  if (error) throw error;

  // Deduplicate: each chapter appears 10 times (one per kural)
  const seen = new Set<number>();
  const chapters: Chapter[] = [];
  for (const row of data) {
    if (!seen.has(row.chapter)) {
      seen.add(row.chapter);
      chapters.push(row as Chapter);
    }
  }
  return chapters;
}

export async function getKuralsByChapter(chapter: number): Promise<Kural[]> {
  const { data, error } = await supabase
    .from("kurals")
    .select("*")
    .eq("chapter", chapter)
    .order("id", { ascending: true });
  if (error) throw error;
  return data as Kural[];
}

export async function searchKurals(query: string): Promise<Kural[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from("kurals")
    .select("*")
    .or(
      `kural_tamil.ilike.%${q}%,meaning_english.ilike.%${q}%,meaning_tamil.ilike.%${q}%,chapter_name_english.ilike.%${q}%,chapter_name_tamil.ilike.%${q}%,transliteration.ilike.%${q}%`
    )
    .order("id", { ascending: true })
    .limit(50);
  if (error) throw error;
  return data as Kural[];
}
