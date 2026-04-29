/**
 * Client-side kural data store.
 *
 * Loads /data/kurals.json once, persists it in IndexedDB, and exposes the same
 * lookup functions as lib/kurals.ts so components never hit the API for static
 * kural data. All reads after the first load are instant and fully offline.
 *
 * SSR code (lib/kurals.ts) and public API routes are untouched — this only
 * replaces client-side fetch() calls.
 */

import type { Kural, Chapter } from "./types";

const IDB_NAME = "onekural-data";
const IDB_STORE = "kv";
const DATA_KEY = "kurals";
const LOADED_AT_KEY = "loaded_at";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // refresh cached data after 7 days

// In-memory map rebuilt from IDB on load — all lookups are O(1) after that.
let kuralMap: Map<number, Kural> | null = null;
let loadPromise: Promise<Map<number, Kural>> | null = null;

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const r = tx.objectStore(IDB_STORE).get(key);
    r.onsuccess = () => resolve((r.result as T) ?? null);
    r.onerror = () => resolve(null);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const r = tx.objectStore(IDB_STORE).put(value, key);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

async function fetchFromNetwork(): Promise<Kural[]> {
  const res = await fetch("/data/kurals.json");
  if (!res.ok) throw new Error(`kurals.json fetch failed: ${res.status}`);
  return res.json();
}

async function loadKurals(): Promise<Map<number, Kural>> {
  const toMap = (kurals: Kural[]) =>
    new Map<number, Kural>(kurals.map((k) => [k.id, k]));

  try {
    const db = await openIDB();
    const loadedAt = await idbGet<number>(db, LOADED_AT_KEY);
    const isFresh = loadedAt !== null && Date.now() - loadedAt < MAX_AGE_MS;

    if (isFresh) {
      const cached = await idbGet<Kural[]>(db, DATA_KEY);
      if (cached && cached.length > 0) {
        db.close();
        return toMap(cached);
      }
    }

    const kurals = await fetchFromNetwork();
    await idbPut(db, DATA_KEY, kurals);
    await idbPut(db, LOADED_AT_KEY, Date.now());
    db.close();
    return toMap(kurals);
  } catch {
    // IDB unavailable (private browsing, etc.) — load from network without caching
    return toMap(await fetchFromNetwork());
  }
}

function ensureLoaded(): Promise<Map<number, Kural>> {
  if (kuralMap) return Promise.resolve(kuralMap);
  if (!loadPromise) {
    loadPromise = loadKurals()
      .then((map) => {
        kuralMap = map;
        return map;
      })
      .catch((err) => {
        loadPromise = null; // allow retry on next call
        throw err;
      });
  }
  return loadPromise;
}

export async function storeGetKural(id: number): Promise<Kural | null> {
  try {
    return (await ensureLoaded()).get(id) ?? null;
  } catch {
    return null;
  }
}

/** Synchronous lookup — returns null if the store hasn't loaded yet. */
export function storeGetKuralSync(id: number): Kural | null {
  return kuralMap?.get(id) ?? null;
}

export async function storeGetKuralsByChapter(chapter: number): Promise<Kural[]> {
  try {
    return Array.from((await ensureLoaded()).values())
      .filter((k) => k.chapter === chapter)
      .sort((a, b) => a.id - b.id);
  } catch {
    return [];
  }
}

export async function storeGetChaptersByBook(book: number): Promise<Chapter[]> {
  try {
    const seen = new Set<number>();
    const chapters: Chapter[] = [];
    const sorted = Array.from((await ensureLoaded()).values()).sort(
      (a, b) => a.chapter - b.chapter
    );
    for (const k of sorted) {
      if (k.book === book && !seen.has(k.chapter)) {
        seen.add(k.chapter);
        chapters.push({
          chapter: k.chapter,
          chapter_name_tamil: k.chapter_name_tamil,
          chapter_name_english: k.chapter_name_english,
          book: k.book,
        });
      }
    }
    return chapters;
  } catch {
    return [];
  }
}

export async function storeGetKuralsByIds(ids: number[]): Promise<Kural[]> {
  try {
    const map = await ensureLoaded();
    return ids
      .map((id) => map.get(id))
      .filter((k): k is Kural => k !== undefined)
      .sort((a, b) => a.id - b.id);
  } catch {
    return [];
  }
}

export async function storeSearchKurals(query: string): Promise<Kural[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  try {
    const results: Kural[] = [];
    for (const k of Array.from((await ensureLoaded()).values())) {
      if (
        k.kural_tamil.toLowerCase().includes(q) ||
        k.meaning_english.toLowerCase().includes(q) ||
        k.meaning_tamil.toLowerCase().includes(q) ||
        k.chapter_name_english.toLowerCase().includes(q) ||
        k.chapter_name_tamil.toLowerCase().includes(q) ||
        k.transliteration.toLowerCase().includes(q)
      ) {
        results.push(k);
        if (results.length >= 50) break;
      }
    }
    return results.sort((a, b) => a.id - b.id);
  } catch {
    return [];
  }
}

/**
 * Kick off background loading without blocking. Call this early (e.g. in
 * layout) so the data is warm before the user navigates to Explore or taps
 * prev/next on a kural.
 */
export function preloadKuralStore(): void {
  if (typeof window === "undefined") return;
  ensureLoaded().catch(() => {});
}

// ─── Pending navigation kural ─────────────────────────────────────────────────
// Set by Explore (and any other list page) right before navigating to a kural
// page, so KuralCard can pick up the correct kural synchronously in
// useIsomorphicLayoutEffect — before the first browser paint — without waiting
// for IDB or the network. This eliminates the flash of kural #1 (the SW shell)
// when the store hasn't loaded yet.
let _pendingNavKural: Kural | null = null;

export function setPendingNavKural(kural: Kural): void {
  _pendingNavKural = kural;
}

/** Consume and return the pending kural only if its id matches expectedId. */
export function takePendingNavKural(expectedId: number): Kural | null {
  const k = _pendingNavKural;
  _pendingNavKural = null;
  return k?.id === expectedId ? k : null;
}
