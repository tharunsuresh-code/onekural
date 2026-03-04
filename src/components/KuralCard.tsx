"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import type { Kural } from "@/lib/types";
import { BOOK_NAMES, getSolomonTamil } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import { getDailyKuralId } from "@/lib/kurals";
import { usePreferences } from "@/lib/preferences";
import JournalEditor from "./JournalEditor";
import ShareCard from "./ShareCard";
import ExplanationSheet from "./ExplanationSheet";
import OnboardingHint from "./OnboardingHint";
import ThemeSwitcher from "./ThemeSwitcher";
import { useAudio } from "@/lib/audio";

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
  const [showExplanation, setShowExplanation] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isPlaying, play, stop } = useAudio();
  const { boxContent, setBoxContent } = usePreferences();

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

      // Horizontal swipes: prev/next kural
      if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        navigateKural("next");
      } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        navigateKural("prev");
      }
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    },
    [navigateKural, x, kural.id]
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
          {/* Theme switcher */}
          <ThemeSwitcher />

          {/* Centered brand */}
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-wide">
              <span className="text-emerald">One</span><span className="text-dark dark:text-dark-fg">Kural</span>
            </h1>
            {kural.id === localDailyKuralId && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-emerald/80 dark:text-emerald/90 font-medium mt-1">
                  Today&apos;s Kural
                </p>
                <p className="text-xs text-dark/40 dark:text-dark-fg/50 mt-0.5" suppressHydrationWarning>{dateStr}</p>
              </>
            )}
          </div>
          {/* Kural number badge pinned to the right */}
          <Link
            href={`/kural/${kural.id}`}
            className="absolute right-0 top-0 text-xs bg-emerald/10 dark:bg-emerald/20 text-emerald border border-emerald/30 dark:border-emerald/40 rounded-full px-3 py-1 font-medium"
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
              <span className="text-xs text-dark/50 dark:text-dark-fg/60 tracking-wide">
                {bookName} · {kural.chapter_name_english}
              </span>
            </div>
            <button
              onClick={() => setBoxContent(boxContent === "tamil" ? "transliteration" : "tamil")}
              className="text-emerald/70 dark:text-emerald/80 hover:text-emerald dark:hover:text-emerald active:text-emerald transition-colors"
              title="Swap"
            >
              <svg width="30" height="20" viewBox="0 0 30 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6h22" /><path d="M19 2l5 4-5 4" />
                <path d="M28 14H6" /><path d="M11 10l-5 4 5 4" />
              </svg>
            </button>
          </div>

          {/* Editorial decorative line — top */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="divider-editorial mx-auto mb-8 w-12"
          />

          {/* Kural text — typography hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-8 px-2"
          >
            {boxContent === "tamil" ? (
              <p className="font-kural-tamil font-bold text-dark dark:text-dark-fg whitespace-pre-line text-balance">
                {kural.kural_tamil}
              </p>
            ) : (
              <p className="font-serif text-3xl font-bold text-dark dark:text-dark-fg whitespace-pre-line leading-tight tracking-normal text-balance">
                {kural.transliteration}
              </p>
            )}
          </motion.div>

          {/* Editorial decorative line — bottom */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="divider-editorial mx-auto mb-8 w-12"
          />

          {/* Insight section — refined explanation */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-emerald/8 dark:bg-emerald/10 backdrop-blur-sm rounded-lg px-6 py-5 shadow-sm dark:shadow-none border border-emerald/10 dark:border-emerald/20 text-center"
          >
            <p className="text-xs uppercase tracking-widest text-emerald/70 dark:text-emerald mb-3 font-medium">Insight</p>
            <p className={`font-serif text-base leading-relaxed text-dark/80 dark:text-dark-fg/85 ${boxContent === "tamil" ? "font-tamil" : ""}`}>
              {boxContent === "tamil" ? getSolomonTamil(kural) : kural.meaning_english}
            </p>
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setShowExplanation(true)}
                className="text-xs text-emerald/60 dark:text-emerald/70 hover:text-emerald transition-colors"
              >
                More ↓
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Navigation row */}
        <div className="flex items-center justify-between py-3">
          <button
            onClick={() => navigateKural("prev")}
            className="flex items-center gap-1.5 text-sm text-dark/40 dark:text-dark-fg/50 hover:text-dark/70 dark:hover:text-dark-fg/80 active:text-dark dark:active:text-dark-fg transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1L1 7.5L7 14" />
            </svg>
            <span className="text-xs">#{prevId}</span>
          </button>
          <span className="text-xs text-dark/25 dark:text-dark-fg/30">{kural.id} / 1330</span>
          <button
            onClick={() => navigateKural("next")}
            className="flex items-center gap-1.5 text-sm text-dark/40 dark:text-dark-fg/50 hover:text-dark/70 dark:hover:text-dark-fg/80 active:text-dark dark:active:text-dark-fg transition-colors"
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
          className="flex items-center justify-between pt-4 border-t border-dark/10 dark:border-dark-fg/10"
        >
          <button
            onClick={() => isPlaying ? stop() : play(kural.kural_tamil)}
            className={`text-sm flex items-center gap-1.5 transition-colors ${
              isPlaying ? "text-emerald" : "text-dark/50 dark:text-dark-fg/50"
            }`}
          >
            <span>{isPlaying ? "■" : "♪"}</span> {isPlaying ? "Stop" : "Listen"}
          </button>
          <button
            onClick={() => toggleFavorite(kural.id)}
            className={`text-sm flex items-center gap-1.5 transition-colors ${
              faved ? "text-deep-red dark:text-deep-red/80" : "text-dark/50 dark:text-dark-fg/50"
            }`}
          >
            <span>{faved ? "♥" : "♡"}</span> Favourite
          </button>
          <button
            onClick={() => setShowJournal(true)}
            className="text-sm text-dark/50 dark:text-dark-fg/50 flex items-center gap-1.5"
          >
            <span>✎</span> Journal
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="text-sm text-dark/50 dark:text-dark-fg/50 flex items-center gap-1.5"
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

      {showExplanation && (
        <ExplanationSheet kural={kural} onClose={() => setShowExplanation(false)} />
      )}

      <OnboardingHint />
    </>
  );
}
