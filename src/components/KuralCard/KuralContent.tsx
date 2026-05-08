"use client";

import { getSolomonTamil } from "@/lib/types";
import type { Kural } from "@/lib/types";

interface KuralContentProps {
  kural: Kural;
  boxContent: string;
  prefsReady: boolean;
  kuralReady: boolean;
  fadingOut: boolean;
}

export default function KuralContent({ kural, boxContent, prefsReady, kuralReady, fadingOut }: KuralContentProps) {
  const isTamil = boxContent === "tamil";
  const contentVisible = prefsReady && kuralReady;
  const opacity = fadingOut || !contentVisible ? 0 : 1;

  return (
    <div className="my-auto py-2">
      <div
        style={{ opacity, transition: "opacity 0.25s ease" }}
        aria-hidden={!contentVisible || fadingOut}
      >
        {/* Editorial decorative line — top */}
        <div className="divider-editorial mx-auto mb-8 w-12" />

        {/* Kural text */}
        <div className="text-center mb-8 px-2">
          {isTamil ? (
            <p className="font-kural-tamil font-bold text-dark dark:text-dark-fg whitespace-pre-line text-balance">
              {kural.kural_tamil}
            </p>
          ) : (
            <p className="font-serif text-3xl font-bold text-dark dark:text-dark-fg whitespace-pre-line leading-tight tracking-normal text-balance">
              {kural.transliteration}
            </p>
          )}
        </div>

        {/* Editorial decorative line — bottom */}
        <div className="divider-editorial mx-auto mb-8 w-12" />

        {/* Insight */}
        <div className="bg-emerald/8 dark:bg-emerald/10 backdrop-blur-sm rounded-lg px-6 py-5 shadow-sm dark:shadow-none border border-emerald/10 dark:border-emerald/20 text-center">
          <p
            className={`text-xs uppercase tracking-widest text-emerald/70 dark:text-emerald mb-3 font-medium ${isTamil ? "font-tamil text-sm" : ""}`}
          >
            {isTamil ? "பொருள்" : "Insight"}
          </p>
          <p
            className={`font-serif leading-relaxed text-dark/80 dark:text-dark-fg/85 ${isTamil ? "font-tamil text-sm" : "text-base"}`}
          >
            {isTamil ? getSolomonTamil(kural) : kural.meaning_english}
          </p>
        </div>
      </div>
    </div>
  );
}
