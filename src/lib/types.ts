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
  themes: string[];
}

export const BOOK_NAMES: Record<number, { tamil: string; english: string }> = {
  1: { tamil: "அறத்துப்பால்", english: "Aram" },
  2: { tamil: "பொருட்பால்", english: "Porul" },
  3: { tamil: "இன்பத்துப்பால்", english: "Inbam" },
};

export interface Chapter {
  chapter: number;
  chapter_name_tamil: string;
  chapter_name_english: string;
  book: number;
}
