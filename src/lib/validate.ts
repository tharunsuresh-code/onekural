import { MAX_KURAL_ID, MAX_CHAPTER, MAX_BOOK } from "./constants";

export function isValidKuralId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= MAX_KURAL_ID;
}

export function isValidChapter(chapter: number): boolean {
  return Number.isInteger(chapter) && chapter >= 1 && chapter <= MAX_CHAPTER;
}

export function isValidBook(book: number): boolean {
  return Number.isInteger(book) && book >= 1 && book <= MAX_BOOK;
}

export function isValidPushSubscription(sub: unknown): boolean {
  if (typeof sub !== "object" || sub === null) return false;
  const s = sub as Record<string, unknown>;
  return (
    typeof s.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    typeof s.keys === "object" &&
    s.keys !== null &&
    typeof (s.keys as Record<string, unknown>).p256dh === "string" &&
    typeof (s.keys as Record<string, unknown>).auth === "string"
  );
}
