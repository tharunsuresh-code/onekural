"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import type { Kural } from "@/lib/types";

export default function FavoritesPage() {
  const { favorites, loaded } = useFavorites();
  const [kurals, setKurals] = useState<Kural[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loaded) return;
    if (favorites.length === 0) {
      setKurals([]);
      setLoading(false);
      return;
    }

    // Fetch all favorited kurals
    Promise.all(
      favorites.map((id) =>
        fetch(`/api/kural/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      setKurals(results.filter(Boolean));
      setLoading(false);
    });
  }, [favorites, loaded]);

  return (
    <main className="max-w-content mx-auto px-6 pt-10 pb-24">
      <Link
        href="/profile"
        className="inline-flex items-center text-sm text-dark/50 mb-6 hover:text-saffron transition-colors"
      >
        ← Profile
      </Link>

      <h1 className="text-xl font-semibold text-dark mb-6">My Favourites</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
        </div>
      ) : kurals.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-dark/50 text-sm">No favourites yet</p>
          <p className="text-dark/30 text-xs mt-1">
            Tap the heart on any kural to save it here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {kurals.map((kural) => (
            <Link
              key={kural.id}
              href={`/kural/${kural.id}`}
              className="block border border-dark/10 rounded-xl p-4 hover:border-saffron/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-dark/40">
                  {kural.chapter_name_english}
                </span>
                <span className="text-xs text-saffron font-medium">
                  #{kural.id}
                </span>
              </div>
              <p className="font-tamil text-base leading-relaxed text-dark mb-2">
                {kural.kural_tamil}
              </p>
              <p className="text-xs text-dark/60 leading-relaxed line-clamp-2">
                {kural.meaning_english}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
