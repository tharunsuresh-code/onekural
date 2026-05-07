"use client";

import { BOOK_NAMES } from "@/lib/types";
import type { Kural } from "@/lib/types";

interface MetaBarProps {
  kural: Kural;
  boxContent: string;
  prefsReady: boolean;
  onToggleLang: () => void;
}

export default function MetaBar({ kural, boxContent, prefsReady, onToggleLang }: MetaBarProps) {
  const isTamil = boxContent === "tamil";
  const bookName = BOOK_NAMES[kural.book]?.[isTamil ? "tamil" : "english"] ?? "";

  return (
    <div className={`flex items-center justify-between mb-3 ${prefsReady ? "" : "invisible"}`}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald inline-block" />
        <span className="text-xs text-dark/50 dark:text-dark-fg/60 tracking-wide">
          {bookName} · {isTamil ? kural.chapter_name_tamil : kural.chapter_name_english}
        </span>
      </div>
      <button
        data-lang-toggle
        onClick={onToggleLang}
        className="text-xs px-2.5 py-1 rounded-full bg-emerald/15 dark:bg-emerald/20 text-emerald hover:bg-emerald/25 dark:hover:bg-emerald/30 transition-colors"
      >
        {boxContent === "tamil" ? "English" : "தமிழ்"}
      </button>
    </div>
  );
}
