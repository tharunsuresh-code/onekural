"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Chapter, Kural } from "@/lib/types";
import { BOOK_NAMES } from "@/lib/types";

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

  // Debounced search
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setSearchResults([]);
      setIsSearching(false);
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
      <h1 className="text-xl font-semibold text-dark mb-6">Explore</h1>

      {/* Search bar */}
      <div className="relative mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search kurals, chapters…"
          className="w-full bg-white border border-dark/10 rounded-xl px-4 py-3 pl-10 text-sm text-dark placeholder:text-dark/40 focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/30"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/40"
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
            <p className="text-sm text-dark/50 text-center py-8">
              Searching…
            </p>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-dark/50 text-center py-8">
              No results found
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-dark/50 mb-2">
                {searchResults.length} result{searchResults.length !== 1 && "s"}
              </p>
              {searchResults.map((k) => (
                <Link
                  key={k.id}
                  href={`/kural/${k.id}`}
                  className="block bg-white border border-dark/10 rounded-xl p-4 hover:border-saffron/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-dark/50">
                      {BOOK_NAMES[k.book]?.english} ·{" "}
                      {k.chapter_name_english}
                    </span>
                    <span className="text-xs text-saffron font-medium">
                      #{k.id}
                    </span>
                  </div>
                  <p className="font-tamil text-sm leading-relaxed text-dark mb-1">
                    {k.kural_tamil}
                  </p>
                  <p className="text-xs text-dark/60 line-clamp-2">
                    {k.meaning_english}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Book tabs */}
          <div className="flex gap-1 mb-6 border-b border-dark/10">
            {BOOKS.map((book) => {
              const isActive = activeBook === book;
              return (
                <button
                  key={book}
                  onClick={() => setActiveBook(book)}
                  className={`relative flex-1 py-3 text-sm font-medium text-center transition-colors ${
                    isActive ? "text-saffron" : "text-dark/50"
                  }`}
                >
                  {BOOK_NAMES[book].english}
                  {isActive && (
                    <motion.div
                      layoutId="book-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Chapter list */}
          {loadingChapters ? (
            <p className="text-sm text-dark/50 text-center py-8">Loading…</p>
          ) : (
            <div className="space-y-2">
              {chapters.map((ch) => {
                const isExpanded = expandedChapter === ch.chapter;
                const kurals = chapterKurals[ch.chapter];

                return (
                  <div
                    key={ch.chapter}
                    className="border border-dark/10 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleChapter(ch.chapter)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-dark/80">
                          {ch.chapter_name_english}
                        </p>
                        <p className="text-xs text-dark/40 font-tamil mt-0.5">
                          {ch.chapter_name_tamil}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-dark/40">
                          Ch. {ch.chapter}
                        </span>
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-dark/40 text-xs"
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
                          <div className="px-4 pb-3 space-y-2 border-t border-dark/5 pt-3">
                            {!kurals ? (
                              <p className="text-xs text-dark/40 py-2">
                                Loading…
                              </p>
                            ) : (
                              kurals.map((k) => (
                                <Link
                                  key={k.id}
                                  href={`/kural/${k.id}`}
                                  className="block py-2 border-b border-dark/5 last:border-0 hover:bg-saffron/5 rounded px-2 -mx-2 transition-colors"
                                >
                                  <p className="font-tamil text-sm leading-relaxed text-dark">
                                    {k.kural_tamil}
                                  </p>
                                  <p className="text-xs text-dark/50 mt-1 line-clamp-1">
                                    #{k.id} · {k.meaning_english}
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
