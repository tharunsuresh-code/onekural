"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import type { Kural } from "@/lib/types";
import { BOOK_NAMES } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import { getDailyKuralId } from "@/lib/kurals";
import { usePreferences } from "@/lib/preferences";
import JournalEditor from "./JournalEditor";
import ShareCard from "./ShareCard";
import CommentariesSheet from "./CommentariesSheet";
import OnboardingHint from "./OnboardingHint";

interface KuralCardProps {
  initialKural: Kural;
  dailyKuralId: number;
}

async function fetchKural(id: number): Promise<Kural | null> {
  if (id < 1 || id > 1330) return null;
  try {
    const res = await fetch(`/api/kural/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default function KuralCard({ initialKural, dailyKuralId }: KuralCardProps) {
  const [kural, setKural] = useState<Kural>(initialKural);
  const [localDailyKuralId, setLocalDailyKuralId] = useState(dailyKuralId);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCommentaries, setShowCommentaries] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { displayMode, boxContent, setBoxContent } = usePreferences();

  // Horizontal swipe only — no y motion value so card never moves vertically
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-200, 0, 200], [-5, 0, 5]);

  // Midnight local-timezone rollover + initial kural correction
  useEffect(() => {
    const localDate = new Date().toLocaleDateString("en-CA");
    const localId = getDailyKuralId(localDate);
    setLocalDailyKuralId(localId);
    if (localId !== initialKural.id) {
      fetchKural(localId).then((k) => { if (k) setKural(k); });
    }

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const nowLocal = new Date().toLocaleDateString("en-CA");
      const loadedDate = sessionStorage.getItem("kural-date");
      if (loadedDate && loadedDate !== nowLocal) window.location.reload();
    };
    sessionStorage.setItem("kural-date", localDate);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateKural = useCallback(
    async (direction: "prev" | "next") => {
      if (isAnimating) return;
      const nextId =
        direction === "next"
          ? kural.id < 1330 ? kural.id + 1 : 1
          : kural.id > 1 ? kural.id - 1 : 1330;

      setIsAnimating(true);
      const nextKural = await fetchKural(nextId);
      if (nextKural) setKural(nextKural);
      setIsAnimating(false);
    },
    [kural.id, isAnimating]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
      const threshold = 50;
      const velocityThreshold = 300;

      // Swipe up: open commentaries (disabled in English-only mode)
      const isVertical = Math.abs(info.offset.y) > Math.abs(info.offset.x);
      if (displayMode !== "english" && isVertical && (info.offset.y < -threshold || info.velocity.y < -velocityThreshold)) {
        setShowCommentaries(true);
        return;
      }

      // Horizontal swipes: prev/next kural
      if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        navigateKural("next");
      } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        navigateKural("prev");
      }
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    },
    [navigateKural, x, kural.id, displayMode]
  );

  const bookName = BOOK_NAMES[kural.book]?.english ?? "";
  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const faved = isFavorite(kural.id);
  const prevId = kural.id > 1 ? kural.id - 1 : 1330;
  const nextId = kural.id < 1330 ? kural.id + 1 : 1;

  return (
    <>
      <main className="relative flex flex-col h-dvh max-w-content mx-auto px-6 pt-14 pb-nav select-none">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative flex justify-center mb-6"
        >
          {/* Centered brand */}
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-wide">
              <span className="text-saffron">One</span><span className="text-dark">Kural</span>
            </h1>
            {kural.id === localDailyKuralId && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-saffron/80 font-medium mt-1">
                  Today&apos;s Kural
                </p>
                <p className="text-xs text-dark/40 mt-0.5" suppressHydrationWarning>{dateStr}</p>
              </>
            )}
          </div>
          {/* Kural number badge pinned to the right */}
          <Link
            href={`/kural/${kural.id}`}
            className="absolute right-0 top-0 text-xs bg-saffron/10 text-saffron border border-saffron/30 rounded-full px-3 py-1 font-medium"
          >
            #{kural.id}
          </Link>
        </motion.div>

        {/* Swipeable card — horizontal drag only, card never moves vertically */}
        <motion.div
          key={kural.id}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={{ left: 0.15, right: 0.15, top: 0, bottom: 0 }}
          dragSnapToOrigin
          onDragEnd={handleDragEnd}
          style={{ x, opacity, rotate }}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 flex flex-col justify-center"
        >
          {/* Chapter badge + swap button on same row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-deep-red inline-block" />
              <span className="text-xs text-dark/50 tracking-wide">
                {bookName} · {kural.chapter_name_english}
              </span>
            </div>
            {displayMode !== "english" && (
              <button
                onClick={() => setBoxContent(boxContent === "tamil" ? "transliteration" : "tamil")}
                className="text-saffron/70 hover:text-saffron active:text-saffron transition-colors"
                title="Swap"
              >
                <svg width="30" height="20" viewBox="0 0 30 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6h22" /><path d="M19 2l5 4-5 4" />
                  <path d="M28 14H6" /><path d="M11 10l-5 4 5 4" />
                </svg>
              </button>
            )}
          </div>

          {/* Kural box — full-bleed lines with warm fill */}
          <div className="relative -mx-6 px-6 py-4 mb-4 text-center">
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(244,165,40,0.07) 0%, rgba(244,165,40,0.12) 50%, rgba(244,165,40,0.07) 100%)" }} />
            <div className="absolute top-0 left-0 right-0 h-px bg-saffron/50" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-saffron/50" />
            {displayMode === "english" ? (
              <p className="relative text-sm text-dark/70 italic leading-relaxed whitespace-pre-line">
                {kural.scholars.find(s => s.name === "Couplet")?.commentary ?? kural.meaning_english}
              </p>
            ) : boxContent === "tamil" ? (
              <p className="relative font-tamil text-lg leading-loose text-dark whitespace-pre-line">{kural.kural_tamil}</p>
            ) : (
              <p className="relative text-xl text-dark/70 italic whitespace-pre-line leading-relaxed">{kural.transliteration}</p>
            )}
          </div>

          {/* Below-box content per mode */}
          {displayMode === "english" && (
            <p className="text-base text-dark/80 leading-relaxed">
              {kural.scholars.find(s => s.name === "Explanation")?.commentary ?? ""}
            </p>
          )}
          {displayMode === "tamil" && (
            <>
              <div className="w-10 h-0.5 bg-saffron mb-4 rounded-full mx-auto" />
              {boxContent === "tamil" ? (
                <p className="text-base text-dark/60 italic whitespace-pre-line leading-relaxed text-center mb-4">
                  {kural.transliteration}
                </p>
              ) : (
                <p className="font-tamil text-sm leading-relaxed text-dark/70 whitespace-pre-line text-center mb-4">
                  {kural.kural_tamil}
                </p>
              )}
            </>
          )}
          {displayMode === "both" && (
            <p className="text-base text-dark/80 leading-relaxed">
              {kural.meaning_english}
            </p>
          )}

          {/* Tap hint for commentaries — hidden in English-only mode */}
          {displayMode !== "english" && (
            <button
              onClick={() => setShowCommentaries(true)}
              className="mt-4 flex flex-col items-center gap-1 w-full opacity-30 hover:opacity-60 transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 15l-6-6-6 6" />
              </svg>
              <span className="text-xs tracking-wide">Scholars</span>
            </button>
          )}
        </motion.div>

        {/* Navigation row */}
        <div className="flex items-center justify-between py-3">
          <button
            onClick={() => navigateKural("prev")}
            className="flex items-center gap-1.5 text-sm text-dark/40 hover:text-dark/70 active:text-dark transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1L1 7.5L7 14" />
            </svg>
            <span className="text-xs">#{prevId}</span>
          </button>
          <span className="text-xs text-dark/25">{kural.id} / 1330</span>
          <button
            onClick={() => navigateKural("next")}
            className="flex items-center gap-1.5 text-sm text-dark/40 hover:text-dark/70 active:text-dark transition-colors"
          >
            <span className="text-xs">#{nextId}</span>
            <svg width="16" height="16" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 1L8 7.5L2 14" />
            </svg>
          </button>
        </div>

        {/* Action row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex items-center justify-between pt-4 border-t border-dark/10"
        >
          <button
            onClick={() => toggleFavorite(kural.id)}
            className={`text-sm flex items-center gap-1.5 transition-colors ${
              faved ? "text-deep-red" : "text-dark/50"
            }`}
          >
            <span>{faved ? "♥" : "♡"}</span> Favourite
          </button>
          <button
            onClick={() => setShowJournal(true)}
            className="text-sm text-dark/50 flex items-center gap-1.5"
          >
            <span>✎</span> Journal
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="text-sm text-dark/50 flex items-center gap-1.5"
          >
            <span>↑</span> Share
          </button>
        </motion.div>

        {/* Privacy link — visually hidden, required for Google OAuth verification */}
        <Link href="/privacy" className="sr-only">Privacy Policy</Link>
      </main>

      {showJournal && (
        <JournalEditor kural={kural} onClose={() => setShowJournal(false)} />
      )}

      {showShare && (
        <ShareCard kural={kural} onClose={() => setShowShare(false)} />
      )}

      <CommentariesSheet
        kural={kural}
        open={showCommentaries}
        onClose={() => setShowCommentaries(false)}
      />

      <OnboardingHint />
    </>
  );
}
