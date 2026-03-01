import { supabase } from "./supabase";
import type { Kural, Chapter } from "./types";

// Fixed epoch: Jan 1 2025 IST. Kural #1 was the daily kural on this date.
const EPOCH_IST = "2025-01-01";

/**
 * Returns today's date as YYYY-MM-DD in IST (Asia/Kolkata).
 * Everyone sees the same kural — it rolls over at midnight Chennai time.
 */
export function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Deterministically maps any IST date string to a kural ID (1–1330).
 * Same result for all users on the same IST calendar date, forever.
 */
export function getDailyKuralId(dateIST: string = getTodayIST()): number {
  const today = new Date(dateIST + "T00:00:00Z").getTime();
  const epoch = new Date(EPOCH_IST + "T00:00:00Z").getTime();
  const daysSinceEpoch = Math.floor((today - epoch) / 86_400_000);
  return (((daysSinceEpoch % 1330) + 1330) % 1330) + 1;
}

export async function getDailyKural(dateIST: string = getTodayIST()): Promise<Kural> {
  const id = getDailyKuralId(dateIST);
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
      `kural_tamil.ilike.%${q}%,meaning_english.ilike.%${q}%,chapter_name_english.ilike.%${q}%,chapter_name_tamil.ilike.%${q}%,transliteration.ilike.%${q}%`
    )
    .order("id", { ascending: true })
    .limit(50);
  if (error) throw error;
  return data as Kural[];
}
