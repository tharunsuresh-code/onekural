"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";

// useLayoutEffect fires before paint (client only); fall back to useEffect on SSR
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Kural } from "@/lib/types";
import { BOOK_NAMES, getSolomonTamil } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import { getDailyKuralId } from "@/lib/kurals";
import { usePreferences } from "@/lib/preferences";
import ThemeSwitcher from "./ThemeSwitcher";

const JournalEditor = dynamic(() => import("./JournalEditor"));
const ShareCard = dynamic(() => import("./ShareCard"));
const ExplanationSheet = dynamic(() => import("./ExplanationSheet"));
const OnboardingHint = dynamic(() => import("./OnboardingHint"), { ssr: false });
import { useAudio } from "@/lib/audio";
import { MAX_KURAL_ID } from "@/lib/constants";

interface KuralCardProps {
  initialKural: Kural;
  mode?: "home" | "detail";
  dailyKuralId?: number;
  adjacentKurals?: Record<string, Kural>;
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

export default function KuralCard({ initialKural, mode = "detail", dailyKuralId, adjacentKurals }: KuralCardProps) {
  const router = useRouter();
  const isHome = mode === "home";

  const [kural, setKural] = useState<Kural>(initialKural);
  const [localDailyKuralId, setLocalDailyKuralId] = useState(dailyKuralId ?? 0);
  const [dateStr, setDateStr] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isPlaying, play, stop } = useAudio();
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const audioUnavailableTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { boxContent, setBoxContent, prefsReady } = usePreferences();

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-200, 0, 200], [-5, 0, 5]);

  // Prefetch cache: id → Kural. Populated in background after each navigation.
  const prefetchCache = useRef<Map<number, Kural>>(new Map());

  // Prefetch prev + next whenever the current kural changes.
  useEffect(() => {
    const prefetch = (id: number) => {
      if (id < 1 || id > MAX_KURAL_ID) return;
      if (prefetchCache.current.has(id)) return;
      fetchKural(id).then((k) => { if (k) prefetchCache.current.set(id, k); });
    };
    const prevId = kural.id > 1 ? kural.id - 1 : MAX_KURAL_ID;
    const nextId = kural.id < MAX_KURAL_ID ? kural.id + 1 : 1;
    prefetch(prevId);
    prefetch(nextId);
  }, [kural.id]);

  // Home-only: correct server/client date mismatch before first paint (no flash)
  useIsomorphicLayoutEffect(() => {
    if (!isHome) return;
    const localDate = new Date().toLocaleDateString("en-CA");
    const localId = getDailyKuralId(localDate);
    setLocalDailyKuralId(localId);
    setDateStr(new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
    if (localId !== initialKural.id) {
      // Use server-prefetched adjacent kurals to correct instantly (no network fetch).
      // Falls back to fetching if the date is somehow not covered.
      const prefetched = adjacentKurals?.[localDate];
      if (prefetched) {
        setKural(prefetched);
      } else {
        fetchKural(localId).then((k) => { if (k) setKural(k); });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Home-only: midnight rollover + home-icon reset
  useEffect(() => {
    if (!isHome) return;
    const localDate = new Date().toLocaleDateString("en-CA");

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const nowLocal = new Date().toLocaleDateString("en-CA");
      const loadedDate = sessionStorage.getItem("kural-date");
      if (!loadedDate || loadedDate === nowLocal) return;
      // Date rolled over — update in-place without a full page reload
      sessionStorage.setItem("kural-date", nowLocal);
      const todayId = getDailyKuralId(nowLocal);
      setLocalDailyKuralId(todayId);
      setDateStr(new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
      fetchKural(todayId).then((k) => { if (k) setKural(k); });
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
      const cached = prefetchCache.current.get(nextId);
      const nextKural = cached ?? await fetchKural(nextId);
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

  // Keyboard arrow navigation (desktop)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigateKural("prev");
      else if (e.key === "ArrowRight") navigateKural("next");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigateKural]);

  const isTamil = boxContent === "tamil";
  const bookName = BOOK_NAMES[kural.book]?.[isTamil ? "tamil" : "english"] ?? "";
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
                <p className={`text-[10px] uppercase tracking-widest text-emerald/80 dark:text-emerald/90 font-medium mt-1 ${kural.id === localDailyKuralId ? "" : "invisible"}`}>
                  Today&apos;s Kural
                </p>
                <p className={`text-xs text-dark/40 dark:text-dark-fg/50 mt-0.5 ${kural.id === localDailyKuralId ? "" : "invisible"}`}>{dateStr}</p>
              </div>
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
            </>
          )}
        </motion.div>

        {/* Chapter badge + lang switch — fixed above scroll area, never moves */}
        <div
          className={`flex items-center justify-between mb-3 transition-opacity duration-300 ${prefsReady ? "opacity-100" : "opacity-0"}`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald inline-block" />
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

        {/* Non-scrolling wrapper — skeleton is absolute here so it always covers
            the visible viewport area, even when the card content is scrolled. */}
        <div className="relative flex-1 min-h-0">

        {/* Swipeable card
            — no justify-center: use my-auto on inner wrapper instead so that
              centering works when content is short, but content is scrollable
              (not clipped) when font size is large. */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.15, right: 0.15 }}
          dragSnapToOrigin
          onDragEnd={handleDragEnd}
          style={{ x, opacity, rotate }}
          className="h-full overflow-y-auto flex flex-col"
        >
          {/* my-auto centres the block when it fits; collapses to 0 when overflowing */}
          <div className="my-auto py-2">
            {/* Editorial decorative line — top (static: outside keyed div to prevent
                Firefox sub-pixel flicker during opacity crossfade on 1x displays) */}
            <div className="divider-editorial mx-auto mb-8 w-12" />

            <AnimatePresence mode="wait">
            <motion.div
              key={kural.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Kural text */}
              <div className="text-center mb-8 px-2">
                {boxContent === "tamil" ? (
                  <p className="font-kural-tamil font-bold text-dark dark:text-dark-fg whitespace-pre-line text-balance">
                    {kural.kural_tamil}
                  </p>
                ) : (
                  <p className="font-serif text-3xl font-bold text-dark dark:text-dark-fg whitespace-pre-line leading-tight tracking-normal text-balance">
                    {kural.transliteration}
                  </p>
                )}
              </div>

              {/* Insight */}
              <div className="bg-emerald/8 dark:bg-emerald/10 backdrop-blur-sm rounded-lg px-6 py-5 shadow-sm dark:shadow-none border border-emerald/10 dark:border-emerald/20 text-center">
                <p className={`text-xs uppercase tracking-widest text-emerald/70 dark:text-emerald mb-3 font-medium ${boxContent === "tamil" ? "font-tamil text-sm" : ""}`}>
                  {boxContent === "tamil" ? "பொருள்" : "Insight"}
                </p>
                <p className={`font-serif leading-relaxed text-dark/80 dark:text-dark-fg/85 ${boxContent === "tamil" ? "font-tamil text-sm" : "text-base"}`}>
                  {boxContent === "tamil" ? getSolomonTamil(kural) : kural.meaning_english}
                </p>
              </div>
            </motion.div>
            </AnimatePresence>

            {/* Editorial decorative line — bottom (static: outside keyed div, same reason) */}
            <div className="divider-editorial mx-auto mt-8 w-12" />
          </div>
        </motion.div>

          {/* Slow-network skeleton — absolute on the non-scrolling wrapper so it
              always covers the visible area regardless of scroll position */}
          <AnimatePresence>
            {isAnimating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: 0.5 }}
                className="absolute inset-0 z-10 flex flex-col pointer-events-none bg-[var(--bg-base)] overflow-hidden"
                aria-hidden
              >
                <div className="my-auto space-y-8">
                  {/* Top divider */}
                  <div className="skeleton-shimmer h-px w-12 mx-auto" />

                  {/* Kural text lines */}
                  <div className="flex flex-col items-center gap-3 px-2">
                    <div className="skeleton-shimmer h-7 w-4/5 rounded" />
                    <div className="skeleton-shimmer h-7 w-3/4 rounded" />
                    <div className="skeleton-shimmer h-7 w-2/3 rounded" />
                  </div>

                  {/* Bottom divider */}
                  <div className="skeleton-shimmer h-px w-12 mx-auto" />

                  {/* Insight box */}
                  <div className="rounded-lg px-6 py-5 border border-emerald/10 dark:border-emerald/20 space-y-3">
                    <div className="skeleton-shimmer h-3 w-14 mx-auto rounded" />
                    <div className="skeleton-shimmer h-4 w-full rounded" />
                    <div className="skeleton-shimmer h-4 w-5/6 mx-auto rounded" />
                    <div className="skeleton-shimmer h-4 w-4/6 mx-auto rounded" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tap for Explanation — fixed above nav row, never moves */}
        <button
          onClick={() => setShowExplanation(true)}
          className="w-full flex flex-col items-center gap-1.5 py-2 hover:opacity-60 active:opacity-40 transition-opacity"
        >
          <span className="text-xs uppercase tracking-widest text-dark/40 dark:text-dark-fg/40 font-medium">
            Tap for Explanation
          </span>
        </button>

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
          <div className="relative">
            <button
              onClick={async () => {
                if (isPlaying) { stop(); return; }
                const ok = await play(kural.kural_tamil);
                if (!ok) {
                  if (audioUnavailableTimer.current) clearTimeout(audioUnavailableTimer.current);
                  setAudioUnavailable(true);
                  audioUnavailableTimer.current = setTimeout(() => setAudioUnavailable(false), 3500);
                }
              }}
              className={`text-sm flex items-center gap-1.5 transition-colors ${
                isPlaying ? "text-emerald" : "text-dark/50 dark:text-dark-fg/50"
              }`}
            >
              <span>{isPlaying ? "■" : "♪"}</span> {isPlaying ? "Stop" : "Listen"}
            </button>
            <AnimatePresence>
              {audioUnavailable && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 text-center text-[11px] leading-tight bg-dark/90 dark:bg-dark-fg/90 text-dark-fg dark:text-dark rounded-lg px-3 py-2 pointer-events-none"
                >
                  Tamil voice not available on this device
                </motion.p>
              )}
            </AnimatePresence>
          </div>
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
