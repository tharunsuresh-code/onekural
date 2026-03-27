"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import { usePreferences } from "@/lib/preferences";
import { getSolomonTamil } from "@/lib/types";
import type { Kural } from "@/lib/types";

export default function FavoritesPage() {
  const { favorites, loaded } = useFavorites();
  const { boxContent } = usePreferences();
  const [kurals, setKurals] = useState<Kural[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;

  useEffect(() => {
    if (!loaded) return;
    if (favorites.length === 0) {
      setKurals([]);
      setLoading(false);
      return;
    }

    // Fetch all favorited kurals in one request
    fetch(`/api/kurals/batch?ids=${favorites.join(",")}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((results) => {
        setKurals(Array.isArray(results) ? results : []);
        setPage(0);
        setLoading(false);
      })
      .catch(() => {
        setKurals([]);
        setLoading(false);
      });
  }, [favorites, loaded]);

  return (
    <main className="h-dvh overflow-y-auto max-w-content mx-auto px-6 pt-10 pb-nav">
      <Link
        href="/profile"
        className="inline-flex items-center text-sm text-dark/50 dark:text-dark-fg/60 mb-6 hover:text-emerald transition-colors"
      >
        ← Profile
      </Link>

      <h1 className="text-xl font-semibold text-dark dark:text-dark-fg mb-6">My Favourites</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      ) : kurals.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-dark/50 dark:text-dark-fg/60 text-sm">No favourites yet</p>
          <p className="text-dark/30 dark:text-dark-fg/40 text-xs mt-1">
            Tap the heart on any kural to save it here
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {kurals.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((kural) => (
              <Link
                key={kural.id}
                href={`/kural/${kural.id}`}
                className="block border border-dark/10 dark:border-dark-fg/20 rounded-xl p-4 hover:border-emerald/30 dark:hover:border-emerald/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs text-dark/40 dark:text-dark-fg/50${boxContent === "tamil" ? " font-tamil" : ""}`}>
                    {boxContent === "tamil" ? kural.chapter_name_tamil : kural.chapter_name_english}
                  </span>
                  <span className="text-xs text-emerald font-medium">
                    #{kural.id}
                  </span>
                </div>
                {boxContent === "tamil" ? (
                  <p className="font-tamil text-base leading-relaxed text-dark dark:text-dark-fg mb-2">
                    {kural.kural_tamil}
                  </p>
                ) : (
                  <p className="font-serif text-base italic leading-relaxed text-dark dark:text-dark-fg mb-2">
                    {kural.transliteration}
                  </p>
                )}
                <p className="text-xs text-dark/60 dark:text-dark-fg/65 leading-relaxed line-clamp-2">
                  {boxContent === "tamil" ? getSolomonTamil(kural) : kural.meaning_english}
                </p>
              </Link>
            ))}
          </div>
          {kurals.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-6 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-dark/10 dark:border-dark-fg/20 text-dark/50 dark:text-dark-fg/60 disabled:opacity-30 hover:border-emerald/30 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-dark/40 dark:text-dark-fg/50">
                {page + 1} / {Math.ceil(kurals.length / PAGE_SIZE)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(kurals.length / PAGE_SIZE) - 1, p + 1))}
                disabled={page >= Math.ceil(kurals.length / PAGE_SIZE) - 1}
                className="px-3 py-1.5 rounded-lg border border-dark/10 dark:border-dark-fg/20 text-dark/50 dark:text-dark-fg/60 disabled:opacity-30 hover:border-emerald/30 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
