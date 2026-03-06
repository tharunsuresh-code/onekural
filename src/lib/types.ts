export interface Scholar {
  name: string;
  commentary: string;
}

export interface Kural {
  id: number;
  book: number;
  chapter: number;
  chapter_name_tamil: string;
  chapter_name_english: string;
  kural_tamil: string;
  transliteration: string;
  meaning_english: string;
  scholars: Scholar[];
  scholars_en?: string;
  themes: string[];
  explanation_english?: string | null;
  explanation_tamil?: string | null;
}

export const BOOK_NAMES: Record<number, { tamil: string; english: string }> = {
  1: { tamil: "அறத்துப்பால்", english: "Aram" },
  2: { tamil: "பொருட்பால்", english: "Porul" },
  3: { tamil: "இன்பத்துப்பால்", english: "Inbam" },
};

/** Returns Solomon Popoye's Tamil commentary, falling back to the first Tamil scholar entry. */
export function getSolomonTamil(kural: Kural): string {
  const solomon = kural.scholars?.find((s) => s.name === "சாலமன் பாப்பையா");
  if (solomon) return solomon.commentary;
  // Fallback: first scholar whose name is in Tamil script (non-ASCII)
  const tamil = kural.scholars?.find((s) => /[^\u0000-\u007F]/.test(s.name));
  return tamil?.commentary ?? kural.meaning_english;
}

export interface Chapter {
  chapter: number;
  chapter_name_tamil: string;
  chapter_name_english: string;
  book: number;
}
