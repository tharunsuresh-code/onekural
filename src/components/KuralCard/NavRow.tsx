"use client";

import { MAX_KURAL_ID } from "@/lib/constants";

interface NavRowProps {
  currentId: number;
  onNavigate: (direction: "prev" | "next") => void;
}

export default function NavRow({ currentId, onNavigate }: NavRowProps) {
  const prevId = currentId > 1 ? currentId - 1 : MAX_KURAL_ID;
  const nextId = currentId < MAX_KURAL_ID ? currentId + 1 : 1;

  return (
    <div className="flex-shrink-0 flex items-center justify-between py-3">
      <button
        onClick={() => onNavigate("prev")}
        className="flex items-center gap-1.5 text-sm text-dark/40 dark:text-dark-fg/50 hover:text-dark/70 dark:hover:text-dark-fg/80 active:text-dark dark:active:text-dark-fg transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 1L1 7.5L7 14" />
        </svg>
        <span className="text-xs">#{prevId}</span>
      </button>
      <span className="text-xs text-dark/25 dark:text-dark-fg/30">{currentId} / 1330</span>
      <button
        onClick={() => onNavigate("next")}
        className="flex items-center gap-1.5 text-sm text-dark/40 dark:text-dark-fg/50 hover:text-dark/70 dark:hover:text-dark-fg/80 active:text-dark dark:active:text-dark-fg transition-colors"
      >
        <span className="text-xs">#{nextId}</span>
        <svg width="16" height="16" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 1L8 7.5L2 14" />
        </svg>
      </button>
    </div>
  );
}
