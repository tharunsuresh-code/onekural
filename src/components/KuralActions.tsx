"use client";

import { useState, useCallback } from "react";
import { useFavorites } from "@/lib/favorites";
import JournalEditor from "./JournalEditor";
import type { Kural } from "@/lib/types";

interface KuralActionsProps {
  kural: Kural;
}

export default function KuralActions({ kural }: KuralActionsProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showJournal, setShowJournal] = useState(false);

  const faved = isFavorite(kural.id);

  const handleShare = useCallback(async () => {
    const link = `${window.location.origin}/kural/${kural.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Thirukkural #${kural.id}`,
          text: kural.meaning_english,
          url: link,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    } else {
      try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
    }
  }, [kural.id, kural.meaning_english]);

  return (
    <>
      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={() => toggleFavorite(kural.id)}
          className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border transition-colors ${
            faved
              ? "border-deep-red/30 bg-deep-red/5 text-deep-red"
              : "border-dark/15 text-dark/50 hover:border-emerald/30"
          }`}
        >
          <span>{faved ? "♥" : "♡"}</span> Favourite
        </button>
        <button
          onClick={() => setShowJournal(true)}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border border-dark/15 text-dark/50 hover:border-emerald/30 transition-colors"
        >
          <span>✎</span> Journal
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border border-dark/15 text-dark/50 hover:border-emerald/30 transition-colors"
        >
          <span>↑</span> Share
        </button>
      </div>

      {showJournal && (
        <JournalEditor kural={kural} onClose={() => setShowJournal(false)} />
      )}
    </>
  );
}
