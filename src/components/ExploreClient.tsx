"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Chapter, Kural } from "@/lib/types";
import { BOOK_NAMES, getSolomonTamil } from "@/lib/types";
import { usePreferences } from "@/lib/preferences";
import { MAX_KURAL_ID } from "@/lib/constants";
import { emitNavStart } from "./NavigationProgress";

const BOOKS = [1, 2, 3] as const;

export default function ExploreClient() {
  const [activeBook, setActiveBook] = useState<number>(1);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [chapterKurals, setChapterKurals] = useState<Record<number, Kural[]>>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Kural[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const { boxContent, setBoxContent } = usePreferences();

  // Fetch chapters when book changes
  useEffect(() => {
    setLoadingChapters(true);
    fetch(`/api/chapters?book=${activeBook}`)
      .then((res) => res.json())
      .then((data) => {
        setChapters(data);
        setExpandedChapter(null);
      })
      .finally(() => setLoadingChapters(false));
  }, [activeBook]);

  // Debounced search — direct kural ID lookup when input is a plain integer
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // If the query is a bare integer in range 1–MAX_KURAL_ID, fetch that kural directly
    const numericId = parseInt(q.trim(), 10);
    if (String(numericId) === q.trim() && numericId >= 1 && numericId <= MAX_KURAL_ID) {
      setIsSearching(true);
      fetch(`/api/kural/${numericId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setSearchResults(data ? [data] : []))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q.trim())}`
        );
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Expand chapter → fetch its kurals
  const toggleChapter = useCallback(
    async (chapterNum: number) => {
      if (expandedChapter === chapterNum) {
        setExpandedChapter(null);
        return;
      }
      setExpandedChapter(chapterNum);
      if (!chapterKurals[chapterNum]) {
        const res = await fetch(`/api/kurals?chapter=${chapterNum}`);
        const data = await res.json();
        setChapterKurals((prev) => ({ ...prev, [chapterNum]: data }));
      }
    },
    [expandedChapter, chapterKurals]
  );

  const showSearch = searchQuery.trim().length > 0;

  return (
    <main className="max-w-content mx-auto px-6 pt-10 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-dark dark:text-dark-fg">Explore</h1>
        <button
          onClick={() => setBoxContent(boxContent === "tamil" ? "transliteration" : "tamil")}
          className="text-xs px-2.5 py-1 rounded-full bg-emerald/15 dark:bg-emerald/20 text-emerald hover:bg-emerald/25 dark:hover:bg-emerald/30 transition-colors"
        >
          {boxContent === "tamil" ? "English" : "தமிழ்"}
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search kurals, chapters, or enter a number…"
          className="w-full bg-white dark:bg-dark-subtle border border-dark/10 dark:border-dark-fg/20 rounded-xl px-4 py-3 pl-10 text-sm text-dark dark:text-dark-fg placeholder:text-dark/40 dark:placeholder:text-dark-fg/50 focus:outline-none focus:border-emerald/50 focus:ring-1 focus:ring-emerald/30 dark:focus:ring-emerald/40"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/40 dark:text-dark-fg/50"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* Search results */}
      {showSearch ? (
        <div>
          {isSearching ? (
            <p className="text-sm text-dark/50 dark:text-dark-fg/50 text-center py-8">
              Searching…
            </p>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-dark/50 dark:text-dark-fg/50 text-center py-8">
              No results found
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-dark/50 dark:text-dark-fg/50 mb-2">
                {searchResults.length} result{searchResults.length !== 1 && "s"}
              </p>
              {searchResults.map((k) => (
                <Link
                  key={k.id}
                  href={`/kural/${k.id}`}
                  onClick={emitNavStart}
                  className="block bg-white dark:bg-dark-subtle border border-dark/10 dark:border-dark-fg/20 rounded-xl p-4 hover:border-emerald/30 dark:hover:border-emerald/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs text-dark/50 dark:text-dark-fg/60${boxContent === "tamil" ? " font-tamil" : ""}`}>
                      {boxContent === "tamil" ? BOOK_NAMES[k.book]?.tamil : BOOK_NAMES[k.book]?.english} ·{" "}
                      {boxContent === "tamil" ? k.chapter_name_tamil : k.chapter_name_english}
                    </span>
                    <span className="text-xs text-emerald font-medium">
                      #{k.id}
                    </span>
                  </div>
                  {boxContent === "tamil" ? (
                    <p className="font-tamil text-sm leading-relaxed text-dark dark:text-dark-fg mb-1">
                      {k.kural_tamil}
                    </p>
                  ) : (
                    <p className="font-serif text-base italic text-dark dark:text-dark-fg mb-1 leading-relaxed">
                      {k.transliteration}
                    </p>
                  )}
                  <p className="text-xs text-dark/60 dark:text-dark-fg/65 line-clamp-2">
                    {boxContent === "tamil" ? getSolomonTamil(k) : k.meaning_english}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Book tabs */}
          <div className="flex gap-1 mb-6 border-b border-dark/10 dark:border-dark-fg/20">
            {BOOKS.map((book) => {
              const isActive = activeBook === book;
              return (
                <button
                  key={book}
                  onClick={() => setActiveBook(book)}
                  className={`relative flex-1 py-3 text-sm font-medium text-center transition-colors ${
                    isActive ? "text-emerald" : "text-dark/50 dark:text-dark-fg/50"
                  }`}
                >
                  {BOOK_NAMES[book].english}
                  {isActive && (
                    <motion.div
                      layoutId="book-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Chapter list */}
          {loadingChapters ? (
            <p className="text-sm text-dark/50 dark:text-dark-fg/50 text-center py-8">Loading…</p>
          ) : (
            <div className="space-y-2">
              {chapters.map((ch) => {
                const isExpanded = expandedChapter === ch.chapter;
                const kurals = chapterKurals[ch.chapter];

                return (
                  <div
                    key={ch.chapter}
                    className="border border-dark/10 dark:border-dark-fg/20 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleChapter(ch.chapter)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-dark/2 dark:hover:bg-dark-fg/5 transition-colors"
                    >
                      <div>
                        {boxContent === "tamil" ? (
                          <p className="text-sm font-medium text-dark/80 dark:text-dark-fg/85 font-tamil">
                            {ch.chapter_name_tamil}
                          </p>
                        ) : (
                          <p className="text-sm font-medium text-dark/80 dark:text-dark-fg/85">
                            {ch.chapter_name_english}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-dark/40 dark:text-dark-fg/50">
                          Ch. {ch.chapter}
                        </span>
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-dark/40 dark:text-dark-fg/50 text-xs"
                        >
                          ▼
                        </motion.span>
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 space-y-2 border-t border-dark/5 dark:border-dark-fg/10 pt-3">
                            {!kurals ? (
                              <p className="text-xs text-dark/40 dark:text-dark-fg/50 py-2">
                                Loading…
                              </p>
                            ) : (
                              kurals.map((k) => (
                                <Link
                                  key={k.id}
                                  href={`/kural/${k.id}`}
                                  onClick={emitNavStart}
                                  className="block py-2 border-b border-dark/5 dark:border-dark-fg/10 last:border-0 hover:bg-emerald/5 dark:hover:bg-emerald/10 rounded px-2 -mx-2 transition-colors"
                                >
                                  {boxContent === "tamil" ? (
                                    <p className="font-tamil text-sm leading-relaxed text-dark dark:text-dark-fg">
                                      {k.kural_tamil}
                                    </p>
                                  ) : (
                                    <p className="font-serif text-base italic text-dark dark:text-dark-fg leading-relaxed">
                                      {k.transliteration}
                                    </p>
                                  )}
                                  <p className="text-xs text-dark/50 dark:text-dark-fg/60 mt-1 line-clamp-1">
                                    #{k.id} · {boxContent === "tamil" ? getSolomonTamil(k) : k.meaning_english}
                                  </p>
                                </Link>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
