export interface Kural {
  id: number;
  book: number;
  chapter: number;
  chapter_name_tamil: string;
  chapter_name_english: string;
  kural_tamil: string;
  transliteration: string;
  meaning_english: string;
  meaning_tamil: string;
  explanation_english?: string | null;
  explanation_tamil?: string | null;
}

export const BOOK_NAMES: Record<number, { tamil: string; english: string }> = {
  1: { tamil: "அறத்துப்பால்", english: "Aram" },
  2: { tamil: "பொருட்பால்", english: "Porul" },
  3: { tamil: "இன்பத்துப்பால்", english: "Inbam" },
};

/** Returns Solomon Pappaiah's Tamil meaning. */
export function getSolomonTamil(kural: Kural): string {
  return kural.meaning_tamil ?? kural.meaning_english;
}

export interface Chapter {
  chapter: number;
  chapter_name_tamil: string;
  chapter_name_english: string;
  book: number;
}
