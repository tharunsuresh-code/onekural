"use client";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { MAX_KURAL_ID } from "@/lib/constants";

// useLayoutEffect fires before the browser paints (client-only);
// fall back to useEffect on the server so SSR doesn't warn.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface KuralCardProps {
  initialKural: Kural;
  mode?: "home" | "detail";
  dailyKuralId?: number;
}

async function fetchKural(id: number): Promise<Kural | null> {
  if (id < 1 || id > MAX_KURAL_ID) return null;
  try {
    const res = await fetch(`/api/kural/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default function KuralCard({ initialKural, mode = "detail", dailyKuralId }: KuralCardProps) {
  const router = useRouter();
  const isHome = mode === "home";

  const [kural, setKural] = useState<Kural>(initialKural);
  const [localDailyKuralId, setLocalDailyKuralId] = useState(dailyKuralId ?? 0);
  // True while we're fetching the client-corrected daily kural (server/client date mismatch).
  // Starts false so SSR and initial hydration agree; useLayoutEffect sets it before first paint.
  const [kuralLoading, setKuralLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isPlaying, play, stop } = useAudio();
  const { boxContent, setBoxContent, prefsReady } = usePreferences();

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-200, 0, 200], [-5, 0, 5]);

  // Correct the kural BEFORE the first browser paint so users never see the stale
  // server-cached kural. This fires when the server's IST date still differs from
  // the client's local date (e.g. non-IST timezones or a very brief cache window).
  const localDate = new Date().toLocaleDateString("en-CA");
  useIsomorphicLayoutEffect(() => {
    if (!isHome) return;
    const localId = getDailyKuralId(localDate);
    setLocalDailyKuralId(localId);
    if (localId !== initialKural.id) {
      setKuralLoading(true);
      fetchKural(localId).then((k) => {
        if (k) setKural(k);
        setKuralLoading(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Home-only: midnight rollover + home-icon reset
  useEffect(() => {
    if (!isHome) return;

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const nowLocal = new Date().toLocaleDateString("en-CA");
      const loadedDate = sessionStorage.getItem("kural-date");
      if (loadedDate && loadedDate !== nowLocal) window.location.reload();
    };
    sessionStorage.setItem("kural-date", localDate);
    document.addEventListener("visibilitychange", handleVisibility);

    const handleGoHome = () => {
      const todayId = getDailyKuralId(new Date().toLocaleDateString("en-CA"));
      fetchKural(todayId).then((k) => { if (k) setKural(k); });
      setShowJournal(false);
      setShowShare(false);
      setShowExplanation(false);
    };
    window.addEventListener("onekural:go-home", handleGoHome);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("onekural:go-home", handleGoHome);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateKural = useCallback(
    async (direction: "prev" | "next") => {
      if (isAnimating) return;
      const nextId =
        direction === "next"
          ? kural.id < MAX_KURAL_ID ? kural.id + 1 : 1
          : kural.id > 1 ? kural.id - 1 : MAX_KURAL_ID;

      setIsAnimating(true);
      const nextKural = await fetchKural(nextId);
      if (nextKural) setKural(nextKural);
      setIsAnimating(false);
    },
    [kural.id, isAnimating]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const threshold = 50;
      const velocityThreshold = 300;

      if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        navigateKural("next");
      } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        navigateKural("prev");
      }
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    },
    [navigateKural, x]
  );

  const isTamil = boxContent === "tamil";
  const bookName = BOOK_NAMES[kural.book]?.[isTamil ? "tamil" : "english"] ?? "";
  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const faved = isFavorite(kural.id);
  const prevId = kural.id > 1 ? kural.id - 1 : MAX_KURAL_ID;
  const nextId = kural.id < MAX_KURAL_ID ? kural.id + 1 : 1;

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
          {isHome ? (
            <>
              <ThemeSwitcher />
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
              <Link
                href={`/kural/${kural.id}`}
                className="absolute right-0 top-0 text-xs bg-emerald/10 dark:bg-emerald/20 text-emerald border border-emerald/30 dark:border-emerald/40 rounded-full px-3 py-1 font-medium"
              >
                #{kural.id}
              </Link>
            </>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-xl font-bold tracking-wide">
                  <span className="text-emerald">One</span><span className="text-dark dark:text-dark-fg">Kural</span>
                </h1>
              </div>
              <button
                onClick={() => router.back()}
                className="absolute left-0 top-0 text-sm text-dark/50 dark:text-dark-fg/50 hover:text-emerald transition-colors"
              >
                ← Back
              </button>
              <span className="absolute right-0 top-0 text-xs bg-emerald/10 dark:bg-emerald/20 text-emerald border border-emerald/30 dark:border-emerald/40 rounded-full px-3 py-1 font-medium">
                #{kural.id}
              </span>
            </>
          )}
        </motion.div>

        {/* Swipeable card
            — no justify-center: use my-auto on inner wrapper instead so that
              centering works when content is short, but content is scrollable
              (not clipped) when font size is large. */}
        <motion.div
          key={kural.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.15, right: 0.15 }}
          dragSnapToOrigin
          onDragEnd={handleDragEnd}
          style={{ x, opacity, rotate }}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 min-h-0 overflow-y-auto flex flex-col"
        >
          {/* my-auto centres the block when it fits; collapses to 0 when overflowing */}
          <div className={`my-auto${kuralLoading ? " invisible" : ""}`}>
            {/* Chapter badge + swap button */}
            <div className={`flex items-center justify-between mb-4${!prefsReady ? " invisible" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-deep-red inline-block" />
                <span className="text-xs text-dark/50 dark:text-dark-fg/60 tracking-wide">
                  {bookName} · {isTamil ? kural.chapter_name_tamil : kural.chapter_name_english}
                </span>
              </div>
              <button
                data-lang-toggle
                onClick={() => setBoxContent(boxContent === "tamil" ? "transliteration" : "tamil")}
                className="text-xs px-2.5 py-1 rounded-full bg-emerald/15 dark:bg-emerald/20 text-emerald hover:bg-emerald/25 dark:hover:bg-emerald/30 transition-colors"
              >
                {boxContent === "tamil" ? "English" : "தமிழ்"}
              </button>
            </div>

            {/* Editorial decorative line — top */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="divider-editorial mx-auto mb-8 w-12"
            />

            {/* Kural text */}
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

            {/* Insight */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-emerald/8 dark:bg-emerald/10 backdrop-blur-sm rounded-lg px-6 py-5 shadow-sm dark:shadow-none border border-emerald/10 dark:border-emerald/20 text-center"
            >
              <p className={`text-xs uppercase tracking-widest text-emerald/70 dark:text-emerald mb-3 font-medium ${boxContent === "tamil" ? "font-tamil text-sm" : ""}`}>
                {boxContent === "tamil" ? "பொருள்" : "Insight"}
              </p>
              <p className={`font-serif leading-relaxed text-dark/80 dark:text-dark-fg/85 ${boxContent === "tamil" ? "font-tamil text-sm" : "text-base"}`}>
                {boxContent === "tamil" ? getSolomonTamil(kural) : kural.meaning_english}
              </p>
            </motion.div>

            {/* Explanation hint */}
            <motion.button
              onClick={() => setShowExplanation(true)}
              initial={prefsReady ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="w-full flex flex-col items-center gap-1.5 mt-4 py-3 hover:opacity-60 active:opacity-40 transition-opacity"
            >
              <span className="text-xs uppercase tracking-widest text-dark/40 dark:text-dark-fg/40 font-medium">
                Tap for Explanation
              </span>
            </motion.button>
          </div>
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

        {isHome && <Link href="/privacy" className="sr-only">Privacy Policy</Link>}
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

      {isHome && <OnboardingHint />}
    </>
  );
}
